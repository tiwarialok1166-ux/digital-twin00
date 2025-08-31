// Load 3D model
const container = document.getElementById("model-container");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Add light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5,5,5).normalize();
scene.add(light);

// Load GLB model
const loader = new THREE.GLTFLoader();
loader.load("/model.glb", function(gltf){
    scene.add(gltf.scene);
    gltf.scene.scale.set(0.5,0.5,0.5);
    gltf.scene.position.set(0,0,0);
}, undefined, function(error){ console.error(error); });

camera.position.z = 5;

function animate(){
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Fetch machine specs
async function loadSpecs(){
    let res = await fetch("/api/specs");
    let data = await res.json();
    document.getElementById("specs").innerHTML =
        "<h3>📑 Machine Specs</h3><pre>"+JSON.stringify(data, null, 2)+"</pre>";
}

// Fetch live sensor data
async function loadSensorData(){
    let res = await fetch("/api/sensor-data");
    let data = await res.json();
    document.getElementById("sensor-data").innerHTML =
        "<h3>📊 Sensor Data</h3><pre>"+JSON.stringify(data, null, 2)+"</pre>";
}

setInterval(loadSensorData, 3000); // update every 3s
loadSpecs();
