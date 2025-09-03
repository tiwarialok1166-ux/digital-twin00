// static/script.js
// ====== 3D Viewer with OrbitControls ======
(function initViewer() {
  const container = document.getElementById("viewer");
  if (!container) return;

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
  controls.autoRotate = false;

  // viewer UI
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

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);

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

// Utility: robust fetch JSON (returns parsed JSON or raw text)
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    // return raw text if not JSON
    return txt;
  }
}

// Format and rendering helpers
function formatCell(key, val) {
  if (val === null || val === undefined) return "-";
  if (key === "ts" || key === "ts_ms" || key.toLowerCase().includes("time")) {
    // handle numeric (unix seconds or ms) or iso strings
    if (typeof val === "number") {
      // heuristics: if > 1e12 probably ms
      if (val > 1e12) return new Date(val).toLocaleString();
      return new Date(val * 1000).toLocaleString();
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toLocaleString();
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function buildHeaderKeys(rows) {
  const set = new Set();
  rows.forEach(r => { if (r && typeof r === "object") Object.keys(r).forEach(k => set.add(k)); });
  return Array.from(set);
}

// Normalize the server payload into an array of row objects.
function normalizeSensorPayload(payload) {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload.filter(r => r && typeof r === "object");
  if (typeof payload === "object") {
    if (Array.isArray(payload.rows)) return payload.rows.filter(r => r && typeof r === "object");
    // single reading object
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

async function loadSpecs() {
  try {
    const data = await getJSON("/api/specs");
    const container = document.getElementById("specs");
    if (!container) return;
    if (!data || typeof data !== "object") {
      container.textContent = "No specs found.";
      return;
    }
    // Reuse renderKeyValueTable-like simple view:
    container.innerHTML = "";
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(data, null, 2);
    container.appendChild(pre);
  } catch (e) {
    const el = document.getElementById("specs");
    if (el) el.textContent = `Failed to load specs: ${e.message}`;
  }
}

async function loadSensors() {
  const container = document.getElementById("sensors");
  const status = document.getElementById("sensor-status");
  if (!container) return;

  try {
    const raw = await getJSON("/api/sensors");
    console.debug("raw /api/sensors ->", raw);

    // explicit error object
    if (raw && typeof raw === "object" && !Array.isArray(raw) && "error" in raw) {
      container.textContent = raw.error || "Sensor API error";
      if (status) status.textContent = `Last update failed: ${new Date().toLocaleTimeString()}`;
      return;
    }

    const rows = normalizeSensorPayload(raw);
    if (!rows.length) {
      container.textContent = "No sensor data available.";
      if (status) status.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
      return;
    }

    // sort newest-first by ts if present
    rows.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));

    const keys = buildHeaderKeys(rows);
    const table = document.createElement("table");
    table.className = "sensors";

    // header
    const htr = document.createElement("tr");
    keys.forEach(k => {
      const th = document.createElement("th"); th.textContent = k; htr.appendChild(th);
    });
    table.appendChild(htr);

    // rows
    rows.forEach(row => {
      const tr = document.createElement("tr");
      keys.forEach(k => {
        const td = document.createElement("td");
        td.textContent = formatCell(k, row?.[k]);
        tr.appendChild(td);

        // optional highlighting example:
        if (k === "temp" && typeof row?.[k] === "number") {
          if (row[k] > 80) td.style.background = "rgba(255, 80, 80, 0.12)";
          else if (row[k] > 70) td.style.background = "rgba(255, 200, 80, 0.12)";
        }
        if (k === "vibration_rms" && typeof row?.[k] === "number") {
          if (row[k] > 0.4) td.style.background = "rgba(255, 80, 80, 0.12)";
        }
      });
      table.appendChild(tr);
    });

    container.innerHTML = "";
    container.appendChild(table);
    if (status) status.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    container.textContent = `Failed to load sensors: ${e.message}`;
    const status = document.getElementById("sensor-status");
    if (status) status.textContent = `Last update failed: ${new Date().toLocaleTimeString()}`;
    console.error(e);
  }
}

loadSpecs();
loadSensors();
setInterval(loadSensors, 3000);
