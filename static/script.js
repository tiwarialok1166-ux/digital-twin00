import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  60, // narrower FOV so object looks more natural
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(3, 3, 3);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// Load Model
const loader = new GLTFLoader();
loader.load(
  './model.glb',
  function (gltf) {
    const model = gltf.scene;
    scene.add(model);

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Center the model
    model.position.sub(center);

    // Adjust camera distance to fit model
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));

    cameraZ *= 1.5; // add margin
    camera.position.set(cameraZ, cameraZ, cameraZ);
    camera.lookAt(0, 0, 0);

    controls.target.set(0, 0, 0);
    controls.update();
  },
  undefined,
  function (error) {
    console.error("Error loading model:", error);
  }
);

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
