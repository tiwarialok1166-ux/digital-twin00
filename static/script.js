// ========== 3D Viewer ==========
const viewer = document.getElementById("viewer");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, viewer.clientWidth / viewer.clientHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(viewer.clientWidth, viewer.clientHeight);
viewer.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Light
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// Load GLB model
const loader = new THREE.GLTFLoader();
loader.load("/static/model.glb", (gltf) => {
  const model = gltf.scene;
  model.position.set(0, -1, 0);
  scene.add(model);

  // Auto center & scale
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());

  model.position.x += (model.position.x - center.x);
  model.position.y += (model.position.y - center.y);
  model.position.z += (model.position.z - center.z);

  const scale = 2 / size;
  model.scale.set(scale, scale, scale);
}, undefined, (error) => {
  console.error("Error loading GLB:", error);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = viewer.clientWidth / viewer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
});

// ========== Live Sensor Data ==========
const apiUrl = "https://dataset1st.onrender.com/dashboard";

async function fetchSensorData() {
  try {
    const res = await fetch(apiUrl);
    const htmlText = await res.text();

    // Parse HTML table from API
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const rows = doc.querySelectorAll("table tbody tr");

    const tbody = document.querySelector("#data-table tbody");
    tbody.innerHTML = "";

    rows.forEach(row => {
      const newRow = document.createElement("tr");
      row.querySelectorAll("td").forEach(td => {
        const newTd = document.createElement("td");
        newTd.textContent = td.textContent;
        newRow.appendChild(newTd);
      });
      tbody.appendChild(newRow);
    });

  } catch (err) {
    console.error("Error fetching sensor data:", err);
  }
}

// Fetch every 5s
fetchSensorData();
setInterval(fetchSensorData, 5000);
