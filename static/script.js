 <script>
    // Load 3D Model
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(500, 500);
    document.getElementById("model").appendChild(renderer.domElement);

    const loader = new THREE.GLTFLoader();
    loader.load("/static/model.gltf", function (gltf) {
      scene.add(gltf.scene);
      camera.position.z = 5;
      function animate() {
        requestAnimationFrame(animate);
        gltf.scene.rotation.y += 0.01;
        renderer.render(scene, camera);
      }
      animate();
    }, undefined, function (error) {
      console.error("Error loading model:", error);
    });

    // Fetch machine specs
    fetch("/api/specs")
      .then(res => res.json())
      .then(data => {
        document.getElementById("specs").textContent = JSON.stringify(data, null, 2);
      });

    // Fetch live sensor data
    function loadSensors() {
      fetch("/api/sensors")
        .then(res => res.json())
        .then(data => {
          document.getElementById("sensors").textContent = JSON.stringify(data, null, 2);
        });
    }
    loadSensors();
    setInterval(loadSensors, 5000); // refresh every 5s
  </script>
