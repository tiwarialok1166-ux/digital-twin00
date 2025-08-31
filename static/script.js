import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.0/examples/jsm/loaders/GLTFLoader.js';

// Scene setup
const container = document.getElementById('model-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(2, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Light
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
light.position.set(0, 20, 0);
scene.add(light);

// GLTF Model Loader
const loader = new GLTFLoader();
loader.load('/static/machine.glb', (gltf) => {
  scene.add(gltf.scene);
}, undefined, (error) => {
  console.error("Error loading GLTF:", error);
});

// Render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// Fake sensor data fetch (update dynamically)
function updateSensorData() {
  document.getElementById('specs').innerHTML = `
    <h3>⚙ Machine Specs</h3>
    <p>Power: 200 kW</p>
    <p>RPM: 15,000</p>
  `;

  document.getElementById('sensor-data').innerHTML = `
    <h3>📊 Live Sensor Data</h3>
    <p>Temperature: ${(20 + Math.random() * 10).toFixed(1)} °C</p>
    <p>Vibration: ${(Math.random() * 5).toFixed(2)} mm/s</p>
    <p>Torque: ${(50 + Math.random() * 20).toFixed(2)} Nm</p>
  `;
}
setInterval(updateSensorData, 2000);
