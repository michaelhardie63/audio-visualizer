let scene, camera, renderer;
let geometry, material, particles;
let analyser, data;
let micStream;

const LOUDNESS_THRESHOLD = 0.01; // Adjust this value to fine-tune sensitivity
const MAX_PARTICLES = 1000;

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
    for (let i = 0; i < MAX_PARTICLES; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        vertices.push(x, y, z);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const alphas = new Float32Array(MAX_PARTICLES).fill(0);
    geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));

    material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) }
        },
        vertexShader: `
            attribute float alpha;
            varying float vAlpha;
            void main() {
                vAlpha = alpha;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 1.0;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying float vAlpha;
            void main() {
                gl_FragColor = vec4(color, vAlpha);
            }
        `,
        transparent: true
    });

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

    data = analyser.getValue();
    const avgAmplitude = data.reduce((acc, val) => acc + Math.abs(val), 0) / data.length;
    const alphas = particles.geometry.attributes.alpha.array;

    if (avgAmplitude > LOUDNESS_THRESHOLD) {
        spawnParticles();
        for (let i = 0; i < MAX_PARTICLES; i++) {
            alphas[i] = Math.min(1.0, alphas[i] + 0.05);  // Increase opacity
        }
    } else {
        for (let i = 0; i < MAX_PARTICLES; i++) {
            alphas[i] *= 0.95;  // Decrease opacity over time
        }
    }

    particles.geometry.attributes.alpha.needsUpdate = true;
    particles.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
    
}

function spawnParticles() {
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < MAX_PARTICLES; i += 3) {
        if (Math.random() < 0.1) { // Probability to spawn a new particle
            positions[i] = (Math.random() - 0.5) * 200; // x
            positions[i + 1] = (Math.random() - 0.5) * 200; // y
            positions[i + 2] = (Math.random() - 0.5) * 200; // z
        } else {
            positions[i + 1] += (Math.random() - 0.5) * 10; // Oscillate y position
        }
    }
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
