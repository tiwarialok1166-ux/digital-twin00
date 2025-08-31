// Setup 3D Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("model-container").appendChild(renderer.domElement);

// Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5).normalize();
scene.add(light);

// Load 3D Model
const loader = new THREE.GLTFLoader();
loader.load('/static/model.glb', function(gltf) {
    scene.add(gltf.scene);
    gltf.scene.scale.set(2, 2, 2);
    camera.position.z = 5;
}, undefined, function(error) {
    console.error("Error loading model:", error);
});

// Animate
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Fetch specs.json
fetch('/static/specs.json')
    .then(response => response.json())
    .then(data => {
        const specsDiv = document.getElementById("specs");
        specsDiv.innerHTML = "<h3>Machine Specs</h3>";
        for (let key in data) {
            specsDiv.innerHTML += `<p><b>${key}:</b> ${data[key]}</p>`;
        }
    });

// Fetch live sensor data every 2 seconds
function fetchSensorData() {
    fetch('/api/sensor-data')
        .then(response => response.json())
        .then(data => {
            const sensorDiv = document.getElementById("sensor-data");
            sensorDiv.innerHTML = "<h3>Live Sensor Data</h3>";
            for (let key in data) {
                sensorDiv.innerHTML += `<p><b>${key}:</b> ${data[key]}</p>`;
            }
        });
}
setInterval(fetchSensorData, 2000);
