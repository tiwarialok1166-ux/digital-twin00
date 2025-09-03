// ====== 3D Viewer with OrbitControls ======
(function initViewer() {
  const container = document.getElementById("viewer");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6f7fb);

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 520;
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
  camera.position.set(50, 50, 400);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 8, 5);
  scene.add(dir);

  // Controls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = false; // off by default

  // viewer UI (auto-rotate toggle + reset)
  const ui = document.createElement("div");
  ui.className = "viewer-ui";
  ui.innerHTML = `
    <button id="toggle-rotate">Auto-rotate: Off</button>
    <button id="reset-view">Reset view</button>
  `;
  container.appendChild(ui);

  const btnRotate = ui.querySelector("#toggle-rotate");
  const btnReset = ui.querySelector("#reset-view");

  btnRotate.addEventListener("click", () => {
    controls.autoRotate = !controls.autoRotate;
    btnRotate.textContent = `Auto-rotate: ${controls.autoRotate ? "On" : "Off"}`;
  });

  btnReset.addEventListener("click", () => {
    camera.position.set(50, 50, 400);
    controls.target.set(0, 0, 0);
    controls.update();
  });

  // Load model
  const loader = new THREE.GLTFLoader();
  const tryPaths = ["/static/model.glb", "/static/model.gltf"];

  function loadNext(i) {
    if (i >= tryPaths.length) {
      container.innerHTML = "<div class='muted'>3D model not found.</div>";
      return;
    }
    loader.load(
      tryPaths[i],
      (gltf) => onModelLoad(gltf),
      undefined,
      () => loadNext(i + 1)
    );
  }

  function onModelLoad(gltf) {
    const root = gltf.scene;
    scene.add(root);

    // Center model
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);

    // Fit camera
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 2.0;
    camera.position.set(0, 0, cameraZ);
    camera.near = Math.max(0.1, maxDim / 1000);
    camera.far = cameraZ * 100;
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();

    animate();
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  loadNext(0);

  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();

// Utility: fetch JSON (falls back to text if response isn't valid JSON)
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  try {
    return await res.json();
  } catch {
    const txt = await res.text();
    // if backend returned "null" or plain text, pass it up
    return txt;
  }
}

// Utility: render key-value table (handles nested objects)
function renderKeyValueTable(containerId, obj) {
  const container = document.getElementById(containerId);
  if (!obj || typeof obj !== "object" || Object.keys(obj).length === 0) {
    container.textContent = "No data available.";
    return;
  }

  const table = document.createElement("table");
  table.className = "specs";

  Object.entries(obj).forEach(([key, val]) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = key;

    const td = document.createElement("td");
    if (val && typeof val === "object") {
      const subTable = document.createElement("table");
      subTable.className = "specs";
      Object.entries(val).forEach(([subKey, subVal]) => {
        const subTr = document.createElement("tr");
        subTr.innerHTML = `<th>${subKey}</th><td>${subVal && typeof subVal === "object" ? JSON.stringify(subVal) : subVal}</td>`;
        subTable.appendChild(subTr);
      });
      td.appendChild(subTable);
    } else {
      td.textContent = val ?? "-";
    }

    tr.appendChild(th);
    tr.appendChild(td);
    table.appendChild(tr);
  });

  container.innerHTML = "";
  container.appendChild(table);
}

// -------- specs --------
async function loadSpecs() {
  try {
    const data = await getJSON("/api/specs");
    renderKeyValueTable("specs", data);
  } catch (e) {
    const el = document.getElementById("specs");
    if (el) el.textContent = `Failed to load specs: ${e.message}`;
  }
}

/* ---------- SENSOR HELPERS ---------- */

// Normalize whatever the API returns into an array of row objects.
function normalizeSensorPayload(payload) {
  if (payload == null) return [];                  // null / undefined
  if (Array.isArray(payload)) {
    return payload.filter((row) => row && typeof row === "object");
  }
  if (typeof payload === "object") {
    if (Array.isArray(payload.rows)) {
      return payload.rows.filter((row) => row && typeof row === "object");
    }
    // Single reading object (e.g., from /api/sensors on main.py)
    if (Object.keys(payload).length > 0) return [payload];
    return [];
  }
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return normalizeSensorPayload(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

// Build a header that is the union of keys across all rows (not just the first).
function buildHeaderKeys(rows) {
  const set = new Set();
  rows.forEach((r) => r && Object.keys(r).forEach((k) => set.add(k)));
  return Array.from(set);
}

// Friendly cell formatting (convert ts, stringify objects, handle nulls)
function formatCell(key, val) {
  if (key === "ts") {
    if (typeof val === "number") return new Date(val * 1000).toLocaleString();
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toLocaleString();
  }
  if (val === null || val === undefined) return "-";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

/* ---------- SENSORS ---------- */
async function loadSensors() {
  const container = document.getElementById("sensors");
  const status = document.getElementById("sensor-status");

  try {
    const raw = await getJSON("/api/sensors");

    // If server gave an explicit error object
    if (raw && typeof raw === "object" && !Array.isArray(raw) && "error" in raw) {
      if (container) container.textContent = raw.error || "Sensor API error.";
      if (status) status.textContent = `Last update failed: ${new Date().toLocaleTimeString()}`;
      return;
    }

    const rows = normalizeSensorPayload(raw);

    if (!rows.length) {
      if (container) container.textContent = "No sensor data available.";
      if (status) status.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
      return;
    }

    // Optional: sort newest-first if ts is present
    rows.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));

    const keys = buildHeaderKeys(rows);
    if (!keys.length) {
      if (container) container.textContent = "No renderable fields in sensor data.";
      if (status) status.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
      return;
    }

    // Build table
    const table = document.createElement("table");
    table.className = "sensors";

    const header = document.createElement("tr");
    keys.forEach((k) => {
      const th = document.createElement("th");
      th.textContent = k;
      header.appendChild(th);
    });
    table.appendChild(header);

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      keys.forEach((k) => {
        const td = document.createElement("td");
        td.textContent = formatCell(k, row?.[k]);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    if (container) {
      container.innerHTML = "";
      container.appendChild(table);
    }
    if (status) status.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    const message = `Failed to load sensors: ${e.message}`;
    if (container) container.textContent = message;
    if (status) status.textContent = `Last update failed: ${new Date().toLocaleTimeString()}`;
    console.error(message);
  }
}

// -------- init --------
loadSpecs();
loadSensors();
setInterval(loadSensors, 3000);
