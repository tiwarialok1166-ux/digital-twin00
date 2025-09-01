// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  document.getElementById("viewer").clientWidth /
    document.getElementById("viewer").clientHeight,
  0.1,
  1000
);
camera.position.set(2, 2, 5);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(
  document.getElementById("viewer").clientWidth,
  document.getElementById("viewer").clientHeight
);
document.getElementById("viewer").innerHTML = ""; // clear "Loading…" text
document.getElementById("viewer").appendChild(renderer.domElement);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040, 1.5));

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Load GLB model
const loader = new THREE.GLTFLoader();
loader.load(
  "/static/model.glb",
  function (gltf) {
    const model = gltf.scene;

    // Auto-center model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Scale model to fit viewer
    const size = box.getSize(new THREE.Vector3()).length();
    const scale = 2.5 / size;
    model.scale.set(scale, scale, scale);

    scene.add(model);
  },
  undefined,
  function (error) {
    console.error("Error loading model:", error);
  }
);

// Resize handler
window.addEventListener("resize", () => {
  camera.aspect =
    document.getElementById("viewer").clientWidth /
    document.getElementById("viewer").clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(
    document.getElementById("viewer").clientWidth,
    document.getElementById("viewer").clientHeight
  );
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// -----------------------
// Fetch specs.json
// -----------------------
fetch("/api/specs")
  .then((res) => res.json())
  .then((data) => {
    document.getElementById("specs").textContent = JSON.stringify(
      data,
      null,
      2
    );
  });

// -----------------------
// Fetch sensor data (refresh every 5s)
// -----------------------
function loadSensors() {
  fetch("/api/sensors")
    .then((res) => res.json())
    .then((data) => {
      document.getElementById("sensors").textContent = JSON.stringify(
        data,
        null,
        2
      );
    });
}
loadSensors();
setInterval(loadSensors, 5000);
