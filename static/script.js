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

// ====== API helper ======
async function getJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

// ====== Render table (flat JSON arrays) ======
function renderTable(containerId, data) {
  const container = document.getElementById(containerId);
  if (!Array.isArray(data) || data.length === 0) {
    container.textContent = "No data available.";
    return;
  }
  const table = document.createElement("table");
  table.className = containerId;

  // header
  const header = document.createElement("tr");
  Object.keys(data[0]).forEach((key) => {
    const th = document.createElement("th");
    th.textContent = key;
    header.appendChild(th);
  });
  table.appendChild(header);

  // rows
  data.forEach((row) => {
    const tr = document.createElement("tr");
    Object.values(row).forEach((val) => {
      const td = document.createElement("td");
      td.textContent = typeof val === "object" ? JSON.stringify(val) : val;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  container.innerHTML = "";
  container.appendChild(table);
}

// ====== Specs ======
async function loadSpecs() {
  const el = document.getElementById("specs");
  try {
    const data = await getJSON("/api/specs");
    renderTable("specs", [data.product, data.electrical_specs, data.mechanical_specs, data.performance, data.construction]);
  } catch (e) {
    el.textContent = `Failed to load specs: ${e.message}`;
  }
}

// ====== Sensors ======
async function loadSensors() {
  const el = document.getElementById("sensors");
  const statusEl = document.getElementById("sensor-status");
  try {
    const data = await getJSON("/api/sensors");
    renderTable("sensors", data.rows || data); // support both formats
    statusEl.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    el.textContent = `Failed to load sensors: ${e.message}`;
    statusEl.textContent = "";
  }
}

// Kick off
loadSpecs();
loadSensors();
setInterval(loadSensors, 3000);
