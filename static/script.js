// Import GLTFLoader from Three.js examples (works with type="module")
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js";

// Scene setup
const container = document.getElementById("model-container");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5).normalize();
scene.add(light);

// Load GLB model
const loader = new GLTFLoader();
loader.load(
  "/static/model.glb",
  (gltf) => {
    scene.add(gltf.scene);
    gltf.scene.scale.set(0.5, 0.5, 0.5);
    gltf.scene.position.set(0, 0, 0);
  },
  undefined,
  (error) => {
    console.error("Error loading model:", error);
  }
);

camera.position.z = 5;

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// --- API Fetchers ---
// Fetch machine specs
async function loadSpecs() {
  try {
    let res = await fetch("/api/specs");
    let data = await res.json();
    document.getElementById("specs").innerHTML =
      "<h3>📑 Machine Specs</h3><pre>" +
      JSON.stringify(data, null, 2) +
      "</pre>";
  } catch (err) {
    console.error("Error fetching specs:", err);
  }
}

// Fetch live sensor data
async function loadSensorData() {
  try {
    let res = await fetch("/api/sensor-data");
    let data = await res.json();
    document.getElementById("sensor-data").innerHTML =
      "<h3>📊 Sensor Data</h3><pre>" +
      JSON.stringify(data, null, 2) +
      "</pre>";
  } catch (err) {
    console.error("Error fetching sensor data:", err);
  }
}

// Refresh data periodically
setInterval(loadSensorData, 3000);
loadSpecs();
