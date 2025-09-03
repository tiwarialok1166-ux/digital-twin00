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

// Utility: fetch JSON
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Utility: render key-value table (handles nested objects)
function renderKeyValueTable(containerId, obj) {
  const container = document.getElementById(containerId);
  if (!obj || Object.keys(obj).length === 0) {
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
    if (typeof val === "object" && val !== null) {
      // render nested objects recursively
      const subTable = document.createElement("table");
      subTable.className = "specs";
      Object.entries(val).forEach(([subKey, subVal]) => {
        const subTr = document.createElement("tr");
        subTr.innerHTML = `<th>${subKey}</th><td>${typeof subVal === "object" ? JSON.stringify(subVal) : subVal}</td>`;
        subTable.appendChild(subTr);
      });
      td.appendChild(subTable);
    } else {
      td.textContent = val;
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
    document.getElementById("specs").textContent = `Failed to load specs: ${e.message}`;
  }
}

// -------- sensors --------
async function loadSensors() {
  try {
    const data = await getJSON("/api/sensors");

    // Ensure we always work with an array
    if (!Array.isArray(data)) {
      document.getElementById("sensors").textContent =
        "Unexpected response from server.";
      console.error("API /api/sensors returned:", data);
      return;
    }

    if (data.length === 0) {
      document.getElementById("sensors").textContent =
        "No sensor rows found.";
      return;
    }

    // Render table
    const container = document.getElementById("sensors");
    const table = document.createElement("table");
    table.className = "sensors";

    // header
    const header = document.createElement("tr");
    Object.keys(data[0]).forEach((k) => {
      const th = document.createElement("th");
      th.textContent = k;
      header.appendChild(th);
    });
    table.appendChild(header);

    // rows
    data.forEach((row) => {
      const tr = document.createElement("tr");
      Object.entries(row).forEach(([k, val]) => {
        const td = document.createElement("td");

        // Special case: convert timestamp
        if (k === "ts" && typeof val === "number") {
          td.textContent = new Date(val * 1000).toLocaleString();
        } else {
          td.textContent =
            val === null || val === undefined
              ? "-"
              : typeof val === "object"
              ? JSON.stringify(val)
              : val;
        }

        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    container.innerHTML = "";
    container.appendChild(table);
  } catch (e) {
    document.getElementById("sensors").textContent =
      `Failed to load sensors: ${e.message}`;
  }
}

// -------- init --------
loadSpecs();
loadSensors();
setInterval(loadSensors, 3000);
