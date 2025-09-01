// -------- 3D viewer --------
(function initViewer() {
  const container = document.getElementById("viewer");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6f7fb);

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 520;
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(100, 72, 300);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height);
  container.innerHTML = "";            // clear "Loading…" text
  container.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 8, 5);
  scene.add(dir);

  // Load model.glb from /static
  const loader = new THREE.GLTFLoader();
  const tryPaths = ["/static/model.glb", "/static/model.gltf"]; // fallback if user uploaded gltf

  function loadNext(i) {
    if (i >= tryPaths.length) {
      console.error("3D model not found at /static/model.glb or /static/model.gltf");
      container.innerHTML = "<div class='muted'>3D model not found.</div>";
      return;
    }
    loader.load(
      tryPaths[i],
      (gltf) => {
        const root = gltf.scene;
        // reasonable defaults
        root.scale.set(1, 1, 1);
        root.position.set(0, 0, 0);
        scene.add(root);

        gentle idle rotation
        function animate() {
          requestAnimationFrame(animate);
          root.rotation.y += 0.005;
          renderer.render(scene, camera);
        }
        animate();
      },
      undefined,
      () => loadNext(i + 1) // try next path
    );
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


// -------- API helpers --------
async function getJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

// -------- specs --------
async function loadSpecs() {
  try {
    const data = await getJSON("/api/specs");
    document.getElementById("specs").textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    document.getElementById("specs").textContent = `Failed to load specs: ${e.message}`;
    console.error(e);
  }
}

// -------- sensors (scraped JSON) --------
async function loadSensors() {
  try {
    const data = await getJSON("/api/sensors");
    document.getElementById("sensors").textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    document.getElementById("sensors").textContent = `Failed to load sensors: ${e.message}`;
    console.error(e);
  }
}

loadSpecs();
loadSensors();
setInterval(loadSensors, 3000); // realtime refresh (no page reload)








