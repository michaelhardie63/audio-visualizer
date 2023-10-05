let scene, camera, renderer;
let geometry, material, particles;
let analyser, data;
let micStream;

document.getElementById('startButton').addEventListener('click', async function() {
    this.disabled = true; // Disable the button after it's clicked
    await Tone.start(); // Required to start the Tone.js context
    await setup();
});

async function setup() {
    // Set up the Three.js scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create the particle system
    geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        vertices.push(x, y, z);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    material = new THREE.PointsMaterial({ size: 1, color: 0xffffff });
    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 5;

    // Tone.js setup for audio input
    micStream = new Tone.UserMedia();

    try {
        await micStream.open();
        analyser = new Tone.Analyser("waveform", 1024);
        micStream.connect(analyser);
    } catch (err) {
        console.error("Error accessing microphone:", err);
    }

    animate();
}

function animate() {
    requestAnimationFrame(animate);

    // Update particle positions based on audio input
    data = analyser.getValue();
    for (let i = 0; i < particles.geometry.attributes.position.array.length; i += 3) {
        if (data[i / 3] !== undefined) {
            particles.geometry.attributes.position.array[i + 1] = data[i / 3] * 10;  // amplify effect
        }
    }
    particles.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}

// Resize canvas when the window is resized
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

setup();
