// ====== 3D Viewer with OrbitControls (stationary by default, user can rotate) ======
(function initViewer() {
  const container = document.getElementById("viewer");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6f7fb);

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 520;
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
  camera.position.set(0, 0, 300);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height);
  container.innerHTML = "";            // clear "Loading…"
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
  controls.autoRotate = false; // stationary by default
  controls.autoRotateSpeed = 1.0;
  controls.screenSpacePanning = false;

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

  let autoRotate = false;
  btnRotate.addEventListener("click", () => {
    autoRotate = !autoRotate;
    controls.autoRotate = autoRotate;
    btnRotate.textContent = `Auto-rotate: ${autoRotate ? "On" : "Off"}`;
  });

  function resetView(center) {
    // center: THREE.Vector3 (optional). If missing, attempt origin
    const c = center || new THREE.Vector3(0, 0, 0);
    // place camera a bit back along z
    const dist = Math.max(150, (camera.position.length() || 300));
    camera.position.set(c.x, c.y, c.z + dist);
    controls.target.copy(c);
    controls.update();
  }

  btnReset.addEventListener("click", () => resetView());

  // Load model
  const loader = new THREE.GLTFLoader();
  const tryPaths = ["/static/model.glb", "/static/model.gltf"];

  function loadNext(i) {
    if (i >= tryPaths.length) {
      console.error("3D model not found at /static/model.glb or /static/model.gltf");
      container.innerHTML = "<div class='muted'>3D model not found.</div>";
      return;
    }
    loader.load(
      tryPaths[i],
      (gltf) => onModelLoad(gltf),
      undefined,
      (err) => {
        console.warn("Failed to load", tryPaths[i], err);
        loadNext(i + 1);
      }
    );
  }

  function onModelLoad(gltf) {
    const root = gltf.scene || gltf.scenes[0];
    if (!root) {
      console.error("No scene in gltf");
      container.innerHTML = "<div class='muted'>Invalid 3D model.</div>";
      return;
    }
    // add to scene
    scene.add(root);

    // compute bounding box and center model at origin
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // move root so center is at origin
    root.position.x -= center.x;
    root.position.y -= center.y;
    root.position.z -= center.z;

    // adjust camera to fit the model
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 2.0; // margin
    camera.position.set(0, 0, cameraZ);
    camera.near = Math.max(0.1, maxDim / 1000);
    camera.far = cameraZ * 100;
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();

    // final render loop (no forced idle rotation — OrbitControls handles user rotation)
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  }

  loadNext(0);

  // handle resize
  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();


// ====== API helpers ======
async function getJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}


// ====== Specs rendering (table) ======
function renderSpecsContainer(data, container) {
  container.innerHTML = ""; // clear

  if (!data || typeof data !== "object") {
    container.textContent = "No specs available.";
    return;
  }

  const table = document.createElement("table");
  table.className = "specs";

  function renderValue(value) {
    if (value === null || value === undefined) return document.createTextNode(String(value));
    if (typeof value === "object") {
      // arrays or nested objects
      if (Array.isArray(value)) {
        const fragment = document.createElement("div");
        value.forEach((item, idx) => {
          const wrapper = document.createElement("div");
          wrapper.style.marginBottom = "8px";
          const title = document.createElement("div");
          title.style.fontWeight = "600";
          title.style.marginBottom = "4px";
          title.textContent = `· [${idx}]`;
          wrapper.appendChild(title);
          if (typeof item === "object") {
            wrapper.appendChild(renderInnerTable(item));
          } else {
            wrapper.appendChild(document.createTextNode(String(item)));
          }
          fragment.appendChild(wrapper);
        });
        return fragment;
      } else {
        return renderInnerTable(value);
      }
    }
    return document.createTextNode(String(value));
  }

  function renderInnerTable(obj) {
    const inner = document.createElement("table");
    inner.style.width = "100%";
    inner.style.borderCollapse = "collapse";
    for (const k of Object.keys(obj)) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = k;
      th.style.fontWeight = "600";
      th.style.padding = "4px 6px";
      const td = document.createElement("td");
      td.style.padding = "4px 6px";
      const v = obj[k];
      td.appendChild(renderValue(v));
      tr.appendChild(th);
      tr.appendChild(td);
      inner.appendChild(tr);
    }
    return inner;
  }

  for (const key of Object.keys(data)) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = key;
    th.style.fontWeight = "700";
    th.style.padding = "6px 8px";
    const td = document.createElement("td");
    td.style.padding = "6px 8px";
    td.appendChild(renderValue(data[key]));
    tr.appendChild(th);
    tr.appendChild(td);
    table.appendChild(tr);
  }

  container.appendChild(table);
}

async function loadSpecs() {
  const el = document.getElementById("specs");
  try {
    const data = await getJSON("/api/specs");
    if (data && data.error) {
      el.textContent = `Failed to load specs: ${data.error}`;
      console.error(data);
      return;
    }
    renderSpecsContainer(data, el);
  } catch (e) {
    el.textContent = `Failed to load specs: ${e.message}`;
    console.error(e);
  }
}


// ====== Sensors rendering (table, auto-refresh) ======
function renderSensors(data, container) {
  container.innerHTML = "";

  if (!data) {
    container.textContent = "No sensor data.";
    return;
  }
  if (data.error) {
    container.textContent = `Error: ${data.error}`;
    return;
  }

  const rows = data.rows || [];
  if (!Array.isArray(rows) || rows.length === 0) {
    container.textContent = "No sensor rows found.";
    return;
  }

  // gather all keys (union)
  const keys = new Set();
  rows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
  const headerKeys = Array.from(keys);

  const table = document.createElement("table");
  table.className = "sensors";

  // header
  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  headerKeys.forEach(k => {
    const th = document.createElement("th");
    th.textContent = k;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  // body
  const tbody = document.createElement("tbody");
  rows.forEach(row => {
    const tr = document.createElement("tr");
    headerKeys.forEach(k => {
      const td = document.createElement("td");
      td.textContent = row[k] !== undefined ? row[k] : "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.appendChild(table);
}

async function loadSensors() {
  const el = document.getElementById("sensors");
  const statusEl = document.getElementById("sensor-status");
  try {
    const data = await getJSON("/api/sensors");
    if (data && data.error) {
      el.textContent = `Failed to load sensors: ${data.error}`;
      statusEl.textContent = "";
      console.error(data);
      return;
    }
    renderSensors(data, el);
    statusEl.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    el.textContent = `Failed to load sensors: ${e.message}`;
    statusEl.textContent = "";
    console.error(e);
  }
}


// kick off
loadSpecs();
loadSensors();
setInterval(loadSensors, 3000); // refresh every 3s
