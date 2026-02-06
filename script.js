/*************************************************
 * GLOBAL STATE
 *************************************************/
let room = { w: 10, h: 10 };

let anchors = [
  { id: 'A', x: 0,  y: 0,  z: 0, color: '#ff5722', rssi: 0, d: 0 },
  { id: 'B', x: 8,  y: 0,  z: 0, color: '#4caf50', rssi: 0, d: 0 },
  { id: 'C', x: 0,  y: 8,  z: 0, color: '#9c27b0', rssi: 0, d: 0 }
];

let master = { x: 5, y: 1, z: 1.0 };
let ue = { x: 0, y: 0, z: 0.3 };

/*************************************************
 * CANVAS
 *************************************************/
const canvas = document.getElementById("roomCanvas");
const ctx = canvas.getContext("2d");
const info = document.getElementById("ue-coords");

/*************************************************
 * CORRECT 3D → 2D PROJECTION
 * Bottom-left = (0,0)
 *************************************************/
function project3D(x, y, z) {
  const scale = 40;

  // Cartesian → screen
  const sx = (x - y) * scale + canvas.width / 2;
  const sy = canvas.height - ((x + y) * scale * 0.5 + z * scale);

  return { x: sx, y: sy };
}

/*************************************************
 * DRAWING
 *************************************************/
function drawNode(o, label, r, color) {
  const p = project3D(o.x, o.y, o.z);

  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.font = "12px Arial";
  ctx.fillText(label, p.x + 8, p.y - 8);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  anchors.forEach(a =>
    drawNode(a, `A${a.id} z=${a.z}`, 10, a.color)
  );

  drawNode(master, "MASTER", 12, "#000");
  drawNode(ue, "UE", 10, "#2196f3");

  info.innerHTML = `
    <b>UE Position</b>: (${ue.x.toFixed(2)}, ${ue.y.toFixed(2)}, ${ue.z.toFixed(2)})<br>
    <b>RSSI</b>: 
      A=${anchors[0].rssi} dBm, 
      B=${anchors[1].rssi} dBm, 
      C=${anchors[2].rssi} dBm<br>
    <b>Distances</b>: 
      A=${anchors[0].d.toFixed(2)} m, 
      B=${anchors[1].d.toFixed(2)} m, 
      C=${anchors[2].d.toFixed(2)} m<br>
    <b>Direction from Master</b>: ${computeBearing().toFixed(1)}°
  `;
}

/*************************************************
 * MATH
 *************************************************/
function trilaterate2D() {
  const L = room.w;

  const dA = anchors[0].d;
  const dB = anchors[1].d;
  const dC = anchors[2].d;

  if (dA <= 0 || dB <= 0 || dC <= 0) return;

  const x = (dA*dA - dB*dB + L*L) / (2 * L);
  const y = (dA*dA - dC*dC + L*L) / (2 * L);

  ue.x = clamp(x, 0, room.w);
  ue.y = clamp(y, 0, room.h);
}

function computeBearing() {
  const dx = ue.x - master.x;
  const dy = ue.y - master.y;

  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  return angle;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/*************************************************
 * SERIAL COMMUNICATION (WEB SERIAL)
 *************************************************/
let port, reader;
const decoder = new TextDecoder();

document.getElementById("serialBtn").onclick = async () => {
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 });
  reader = port.readable.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    parseSerial(decoder.decode(value));
  }
};

function parseSerial(data) {
  data.split("\n").forEach(line => {
    line = line.trim();

    // DIST dA dB dC
    if (line.startsWith("DIST")) {
      const p = line.split(" ");
      anchors[0].d = parseFloat(p[1]);
      anchors[1].d = parseFloat(p[2]);
      anchors[2].d = parseFloat(p[3]);

      trilaterate2D();
      render();
    }

    // RSSI rA rB rC
    if (line.startsWith("RSSI")) {
      const p = line.split(" ");
      anchors[0].rssi = parseFloat(p[1]);
      anchors[1].rssi = parseFloat(p[2]);
      anchors[2].rssi = parseFloat(p[3]);
    }
  });
}

/*************************************************
 * APPLY CONFIG
 *************************************************/
document.getElementById("applyConfig").onclick = () => {
  room.w = +roomWidth.value;
  room.h = +roomHeight.value;

  anchors[0].x = +ax.value; anchors[0].y = +ay.value; anchors[0].z = +az.value;
  anchors[1].x = +bx.value; anchors[1].y = +by.value; anchors[1].z = +bz.value;
  anchors[2].x = +cx.value; anchors[2].y = +cy.value; anchors[2].z = +cz.value;

  master.x = +mx.value;
  master.y = +my.value;
  master.z = +mz.value;

  ue.z = +uez.value;

  render();
};

/*************************************************
 * START
 *************************************************/
render();
