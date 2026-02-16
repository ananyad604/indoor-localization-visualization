import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/***********************
 * SERIAL
 ***********************/
let port, reader;
const decoder = new TextDecoder();

const serialBtn = document.getElementById("serialBtn");
if (serialBtn) serialBtn.onclick = connectSerial;

/***********************
 * STATE
 ***********************/
// Room Dimensions (meters) - X, Y(Depth), Z(Height) mapping
let room = { w: 10, h: 10, d: 10 };

let anchors = [
  { id: 'A', x: 0, y: 0, z: 0, d: 0, color: 0xff5722, mesh: null, group: null },
  { id: 'B', x: 10, y: 0, z: 10, d: 0, color: 0x4caf50, mesh: null, group: null },
  { id: 'C', x: 0, y: 10, z: 10, d: 0, color: 0x9c27b0, mesh: null, group: null },
  { id: 'D', x: 10, y: 10, z: 0, d: 0, color: 0xffc107, mesh: null, group: null }
];

let master = { x: 5, y: 0, z: 0, mesh: null };
let ue = { x: 5, y: 5, z: 5, mesh: null };
let simUE = { x: 5, y: 5, z: 5, mesh: null };

/***********************
 * THREE.JS SETUP
 ***********************/
const container = document.getElementById("roomContainer");
const width = 700;
const height = 700;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Camera
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
camera.position.set(20, 20, 20);
camera.lookAt(5, 5, 5);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.shadowMap.enabled = true;
container.innerHTML = '';
container.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(5, 0, 5); // Center of floor
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.zoomSpeed = 0.5; // Smoother zoom
controls.minDistance = 1;
controls.maxDistance = 100;
controls.update();

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 20, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 200;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
scene.add(directionalLight);

/***********************
 * HELPERS
 ***********************/
const roomGroup = new THREE.Group();
scene.add(roomGroup);

// Coordinate Mapping 
// Sim X -> Three X
// Sim Y -> Three Z
// Sim Z -> Three Y (Up)
function mapToThree(s) {
  return new THREE.Vector3(s.x, s.z, s.y);
}

// Text Sprite Helper
function createTextSprite(text, color = "black") {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 64;
  canvas.height = 64;
  context.fillStyle = color;
  context.font = "bold 48px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1, 1, 1);
  return sprite;
}

function createRoom() {
  roomGroup.clear();

  const w = room.w; // Sim X -> Three X
  const h = room.d; // Sim Z -> Three Y (Vertical)
  const d = room.h; // Sim Y -> Three Z (Depth)

  // Floor
  const floorGeo = new THREE.PlaneGeometry(w, d);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2; // Flat on XZ
  floor.position.set(w / 2, 0, d / 2);
  floor.receiveShadow = true;
  roomGroup.add(floor);

  // Grid
  const grid = new THREE.GridHelper(Math.max(w, d), Math.max(w, d));
  grid.position.set(w / 2, 0.01, d / 2);
  roomGroup.add(grid);

  // Wireframe Box
  const boxGeo = new THREE.BoxGeometry(w, h, d);
  const boxWire = new THREE.WireframeGeometry(boxGeo);
  const line = new THREE.LineSegments(boxWire);
  line.material.depthTest = false;
  line.material.opacity = 0.25;
  line.material.transparent = true;
  line.position.set(w / 2, h / 2, d / 2);
  roomGroup.add(line);

  // Auto-Fit Camera
  const center = new THREE.Vector3(w / 2, 0, d / 2);
  controls.target.copy(center);

  const maxDim = Math.max(w, h, d);
  const dist = maxDim * 2.5; // Enough distance for perspective

  // Set position relative to new center
  const angle = Math.PI / 4;
  camera.position.set(
    center.x + dist * Math.cos(angle),
    center.y + dist * 0.8,
    center.z + dist * Math.sin(angle)
  );

  // Scale controls limits
  controls.maxDistance = dist * 2;
  controls.minDistance = 1;
  controls.update();
}

// Anchors
anchors.forEach(a => {
  const group = new THREE.Group();

  const geo = new THREE.SphereGeometry(0.3, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: a.color });
  a.mesh = new THREE.Mesh(geo, mat);
  a.mesh.castShadow = true;
  group.add(a.mesh);

  // Label
  const label = createTextSprite(a.id);
  label.position.set(0, 0.8, 0); // Above sphere
  group.add(label);

  a.group = group; // Store group
  scene.add(group);
});

// Master
const masterGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const masterMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
master.mesh = new THREE.Mesh(masterGeo, masterMat);
scene.add(master.mesh);

// UE
const ueGeo = new THREE.SphereGeometry(0.4, 32, 32);
const ueMat = new THREE.MeshStandardMaterial({ color: 0x2196f3, emissive: 0x1565c0, emissiveIntensity: 0.5 });
ue.mesh = new THREE.Mesh(ueGeo, ueMat);
ue.mesh.castShadow = true;
scene.add(ue.mesh);

// Sim Truth
const simGeo = new THREE.SphereGeometry(0.25, 16, 16);
const simMat = new THREE.MeshStandardMaterial({ color: 0x999999, transparent: true, opacity: 0.6 });
simUE.mesh = new THREE.Mesh(simGeo, simMat);
scene.add(simUE.mesh);

createRoom();

/***********************
 * TRILATERATION & LOGIC
 ***********************/
const info = document.getElementById("ue-coords");

function trilaterate() {
  let validAnchors = anchors.filter(a => a.d > 0);
  if (validAnchors.length < 3) return;

  let est = { x: room.w / 2, y: room.h / 2, z: room.d / 2 };
  const learningRate = 0.1;
  const iterations = 50;

  for (let k = 0; k < iterations; k++) {
    let gradX = 0, gradY = 0, gradZ = 0;
    validAnchors.forEach(a => {
      const dx = est.x - a.x;
      const dy = est.y - a.y;
      const dz = est.z - a.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      const error = dist - a.d;

      gradX += error * (dx / dist);
      gradY += error * (dy / dist);
      gradZ += error * (dz / dist);
    });
    est.x -= learningRate * gradX / validAnchors.length;
    est.y -= learningRate * gradY / validAnchors.length;
    est.z -= learningRate * gradZ / validAnchors.length;
  }

  ue.x = est.x;
  ue.y = est.y;
  ue.z = est.z;
}

// Sim Loop
let simTimer = null;
let simStep = 0.2;

const simBtn = document.getElementById("simBtn");
if (simBtn) simBtn.onclick = toggleSimulation;

function toggleSimulation() {
  const btn = document.getElementById("simBtn");
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
    btn.innerText = "Simulate Movement";
    btn.style.backgroundColor = "#2196f3";
  } else {
    simUE.x = ue.x; simUE.y = ue.y; simUE.z = ue.z;
    simTimer = setInterval(updateSim, 50);
    btn.innerText = "Stop Simulation";
    btn.style.backgroundColor = "#f44336";
  }
}

function updateSim() {
  simUE.x += (Math.random() - 0.5) * simStep;
  simUE.y += (Math.random() - 0.5) * simStep;
  simUE.z += (Math.random() - 0.5) * simStep;

  if (simUE.x < 0) simUE.x = 0; if (simUE.x > room.w) simUE.x = room.w;
  if (simUE.y < 0) simUE.y = 0; if (simUE.y > room.h) simUE.y = room.h;
  if (simUE.z < 0) simUE.z = 0; if (simUE.z > room.d) simUE.z = room.d;

  anchors.forEach(a => {
    const dx = simUE.x - a.x;
    const dy = simUE.y - a.y;
    const dz = simUE.z - a.z;
    a.d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  });

  trilaterate();
}

function updateObjects() {
  // Sync Meshes with State
  anchors.forEach(a => {
    if (a.group) a.group.position.copy(mapToThree(a));
    else if (a.mesh) a.mesh.position.copy(mapToThree(a));
  });

  if (master.mesh) master.mesh.position.copy(mapToThree(master));
  if (ue.mesh) ue.mesh.position.copy(mapToThree(ue));

  if (simUE.mesh) {
    simUE.mesh.position.copy(mapToThree(simUE));
    simUE.mesh.visible = (simTimer !== null);
  }

  if (info) {
    info.innerHTML = `
        UE: (${ue.x.toFixed(2)}, ${ue.y.toFixed(2)}, ${ue.z.toFixed(2)})<br>
        DIST: A=${anchors[0].d.toFixed(2)} 
              B=${anchors[1].d.toFixed(2)} 
              C=${anchors[2].d.toFixed(2)}
              D=${anchors[3].d.toFixed(2)}<br>
        `;
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateObjects();
  renderer.render(scene, camera);
}
animate();

// Serial
async function connectSerial() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    reader = port.readable.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parseSerial(decoder.decode(value));
    }
  } catch (e) { console.error(e); }
}

function parseSerial(data) {
  data.split("\n").forEach(line => {
    if (line.startsWith("DIST")) {
      const p = line.split(" ");
      anchors[0].d = +p[1];
      anchors[1].d = +p[2];
      anchors[2].d = +p[3];
      if (p[4]) anchors[3].d = +p[4];
      trilaterate();
    }
  });
}

const applyBtn = document.getElementById("apply");
if (applyBtn) {
  applyBtn.onclick = () => {
    // Helper to clamp values
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    // Update Room Dimensions (Ensure > 0)
    let w = +document.getElementById("roomW").value || 1;
    let h = +document.getElementById("roomH").value || 1; // Sim Depth
    let d = +document.getElementById("roomD").value || 1; // Sim Height

    room.w = Math.max(1, w);
    room.h = Math.max(1, h); // Sim Depth
    room.d = Math.max(1, d); // Sim Height

    // Update Inputs with corrected values
    document.getElementById("roomW").value = room.w;
    document.getElementById("roomH").value = room.h;
    document.getElementById("roomD").value = room.d;

    // Update Anchors (Clamp to Room Dimensions)
    // X clamped to 0..room.w
    // Y clamped to 0..room.h (Sim Depth)
    // Z clamped to 0..room.d (Sim Height)
    const updateAnchor = (id, idx) => {
      let x = +document.getElementById(id + "x").value || 0;
      let y = +document.getElementById(id + "y").value || 0;
      let z = +document.getElementById(id + "z").value || 0;

      anchors[idx].x = clamp(x, 0, room.w);
      anchors[idx].y = clamp(y, 0, room.h);
      anchors[idx].z = clamp(z, 0, room.d);

      // Refresh inputs
      document.getElementById(id + "x").value = anchors[idx].x;
      document.getElementById(id + "y").value = anchors[idx].y;
      document.getElementById(id + "z").value = anchors[idx].z;
    };

    updateAnchor("a", 0);
    updateAnchor("b", 1);
    updateAnchor("c", 2);
    updateAnchor("d", 3);

    // Update Master
    let mx = +document.getElementById("mx").value || 0;
    let my = +document.getElementById("my").value || 0;
    let mz = +document.getElementById("mz").value || 0;

    master.x = clamp(mx, 0, room.w);
    master.y = clamp(my, 0, room.h);
    master.z = clamp(mz, 0, room.d);

    document.getElementById("mx").value = master.x;
    document.getElementById("my").value = master.y;
    document.getElementById("mz").value = master.z;

    createRoom();
  };
}
