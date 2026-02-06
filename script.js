/*************************************************
 * SERIAL CONNECTION
 *************************************************/
let port, reader;
const textDecoder = new TextDecoder();

document.getElementById("serialBtn")
  .addEventListener("click", connectSerial);

/*************************************************
 * CONFIGURATION
 *************************************************/
const ROOM_WIDTH_METERS = 6.0;
const ROOM_HEIGHT_METERS = 6.0;

const ANCHOR_NODES = [
  { id: 'A', x: 0.0, y: 0.0, color: '#FF5722' },
  { id: 'B', x: ROOM_WIDTH_METERS, y: 0.0, color: '#4CAF50' },
  { id: 'C', x: 0.0, y: ROOM_HEIGHT_METERS, color: '#9C27B0' }
];

// Distances from Aggregator (meters)
let dA = 0, dB = 0, dC = 0;

// UE state
let ue = {
  x: 0.0,
  y: 0.0,
  color: '#2196F3',
  radius: 10
};

/*************************************************
 * CANVAS SETUP
 *************************************************/
const canvas = document.getElementById('roomCanvas');
const ctx = canvas.getContext('2d');
const coordsDisplay = document.getElementById('ue-coords');

const SCALE_X = canvas.width / ROOM_WIDTH_METERS;
const SCALE_Y = canvas.height / ROOM_HEIGHT_METERS;

/*************************************************
 * HELPERS
 *************************************************/
function toScreen(x, y) {
  return {
    px: x * SCALE_X,
    py: y * SCALE_Y
  };
}

function drawNode(x, y, color, label, isAnchor = false) {
  const p = toScreen(x, y);

  ctx.beginPath();
  ctx.arc(p.px, p.py, isAnchor ? 15 : 10, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.closePath();

  ctx.fillStyle = '#000';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, p.px, p.py + (isAnchor ? -25 : 25));
}

/*************************************************
 * DRAW LOOP
 *************************************************/
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ANCHOR_NODES.forEach(a =>
    drawNode(a.x, a.y, a.color, `Anchor ${a.id}`, true)
  );

  drawNode(ue.x, ue.y, ue.color, 'UE');

  coordsDisplay.innerHTML = `
    UE Position: (${ue.x.toFixed(2)}, ${ue.y.toFixed(2)}) m<br>
    Distances: A=${dA.toFixed(2)} m,
               B=${dB.toFixed(2)} m,
               C=${dC.toFixed(2)} m
  `;
}

/*************************************************
 * TRILATERATION (2D)
 *************************************************/
function trilaterate2D(d1, d2, d3, L) {
  const x = (d1*d1 - d2*d2 + L*L) / (2 * L);
  const y = (d1*d1 - d3*d3 + L*L) / (2 * L);
  return { x, y };
}

function updatePosition() {
  if (dA <= 0 || dB <= 0 || dC <= 0) return;

  const pos = trilaterate2D(dA, dB, dC, ROOM_WIDTH_METERS);

  ue.x = Math.max(0, Math.min(ROOM_WIDTH_METERS, pos.x));
  ue.y = Math.max(0, Math.min(ROOM_HEIGHT_METERS, pos.y));

  draw();
}

/*************************************************
 * SERIAL COMMUNICATION
 *************************************************/
async function connectSerial() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    reader = port.readable.getReader();
    console.log("Serial connected");

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const data = textDecoder.decode(value);
      parseSerial(data);
    }
  } catch (err) {
    console.error("Serial error:", err);
  }
}

function parseSerial(data) {
  const lines = data.split("\n");

  lines.forEach(line => {
    line = line.trim();
    if (line.startsWith("DIST")) {
      const p = line.split(" ");
      if (p.length === 4) {
        dA = parseFloat(p[1]);
        dB = parseFloat(p[2]);
        dC = parseFloat(p[3]);
        updatePosition();
      }
    }
  });
}

/*************************************************
 * START
 *************************************************/
draw();
