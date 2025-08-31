// ========== 3D MODEL SETUP ==========
const container = document.getElementById("model-container");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / 400, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(container.clientWidth, 400);
container.appendChild(renderer.domElement);

// Light
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

// Load GLTF Model
const loader = new THREE.GLTFLoader();
loader.load("/static/machine.glb", function (gltf) {
  scene.add(gltf.scene);
  camera.position.z = 5;
  animate();
}, undefined, function (error) {
  console.error("Error loading 3D model:", error);
});

// Render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// ========== FETCH MACHINE SPECS ==========
fetch("/static/specs.json")
  .then(response => response.json())
  .then(data => {
    let specsHtml = "<ul>";
    for (let key in data) {
      specsHtml += `<li><strong>${key}:</strong> ${data[key]}</li>`;
    }
    specsHtml += "</ul>";
    document.getElementById("specs").innerHTML = specsHtml;
  })
  .catch(err => {
    document.getElementById("specs").innerHTML = "❌ Failed to load machine specs.";
    console.error("Error fetching specs:", err);
  });

// ========== FETCH LIVE SENSOR DATA ==========
function fetchSensorData() {
  fetch("https://dataset1st.onrender.com/dashboard")
    .then(response => response.json())
    .then(data => {
      let sensorHtml = "<ul>";
      for (let key in data) {
        sensorHtml += `<li><strong>${key}:</strong> ${data[key]}</li>`;
      }
      sensorHtml += "</ul>";
      document.getElementById("sensor-data").innerHTML = sensorHtml;
    })
    .catch(err => {
      document.getElementById("sensor-data").innerHTML = "❌ Failed to load sensor data.";
      console.error("Error fetching sensor data:", err);
    });
}

// Fetch sensor data every 3 seconds
setInterval(fetchSensorData, 3000);
fetchSensorData(); // Initial call
