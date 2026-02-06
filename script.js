/*************************************************
 * GLOBAL STATE
 *************************************************/
let room = { w: 10, h: 10 };

let anchors = [
  { id: 'A', x: 0, y: 0, z: 0, color: '#ff5722', rssi: 0, d: 0 },
  { id: 'B', x: 8, y: 0, z: 0, color: '#4caf50', rssi: 0, d: 0 },
  { id: 'C', x: 0, y: 8, z: 0, color: '#9c27b0', rssi: 0, d: 0 }
];

let master = { x: 5, y: 1, z: 1 };
let ue = { x: 0, y: 0, z: 0.3 };

/*************************************************
 * CANVAS
 *************************************************/
const canvas = document.getElementById("roomCanvas");
const ctx = canvas.getContext("2d");
const info = document.getElementById("ue-coords");

/*************************************************
 * PROJECTION (CORRECT CARTESIAN → CANVAS)
 * (0,0,0) bottom-left
 *************************************************/
function project(x, y, z) {
  const scale = 50;   // pixels per meter
  const margin = 50;

  const px = margin + x * scale;
  const py = canvas.height - margin - y * scale - z * scale;

  return { x: px, y: py };
}

/*************************************************
 * DRAWING HELPERS
 *************************************************/
function drawPoint(o, label, r, c) {
  const p = project(o.x, o.y, o.z);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = c;
  ctx.fill();
  ctx.strokeStyle = "#222";
  ctx.stroke();
  ctx.fillStyle = "#000";
  ctx.font = "12px Arial";
  ctx.fillText(label, p.x + 8, p.y - 8);
}

function drawRoom() {
  const p0 = project(0, 0, 0);
  const p1 = project(room.w, 0, 0);
  const p2 = project(room.w, room.h, 0);
  const p3 = project(0, room.h, 0);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.closePath();
  ctx.stroke();
}

/*************************************************
 * RENDER LOOP
 *************************************************/
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawRoom();

  anchors.forEach(a =>
    drawPoint(a, `A${a.id} (${a.z}m)`, 10, a.color)
  );

  drawPoint(master, "MASTER", 12, "#000");
  drawPoint(ue, "UE", 10, "#2196f3");

  updateInfo();
}

/*************************************************
 * INFO PANEL
 *************************************************/
function updateInfo() {
  info.innerHTML = `
UE Position: (${ue.x.toFixed(2)}, ${ue.y.toFixed(2)}, ${ue.z.toFixed(2)}) m<br>
RSSI: A=${anchors[0].rssi} B=${anchors[1].rssi} C=${anchors[2].rssi}<br>
Distances: A=${anchors[0].d.toFixed(2)} B=${anchors[1].d.toFixed(2)} C=${anchors[2].d.toFixed(2)}<br>
Direction from Master: ${bearing().toFixed(1)}°
`;
}

/*************************************************
 * MATH
 *************************************************/
function trilaterate2D() {
  const dA = anchors[0].d;
  const dB = anchors[1].d;
  const dC = anchors[2].d;
  const L = room.w;

  if (dA <= 0 || dB <= 0 || dC <= 0) return;

  ue.x = (dA*dA - dB*dB + L*L) / (2*L);
  ue.y = (dA*dA - dC*dC + L*L) / (2*L);
}

function bearing() {
  let a = Math.atan2(ue.y - master.y, ue.x - master.x) * 180 / Math.PI;
  return a < 0 ? a + 360 : a;
}

/*************************************************
 * SERIAL (WEB SERIAL API)
 *************************************************/
let port, reader;
const decoder = new TextDecoder();

document.getElementById("serialBtn").onclick = async () => {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    reader = port.readable.getReader();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parseSerial(decoder.decode(value));
    }
  } catch (e) {
    console.error("Serial error:", e);
  }
};

function parseSerial(data) {
  data.split("\n").forEach(line => {
    line = line.trim();

    if (line.startsWith("RSSI")) {
      const p = line.split(" ");
      anchors[0].rssi = +p[1];
      anchors[1].rssi = +p[2];
      anchors[2].rssi = +p[3];
    }

    if (line.startsWith("DIST")) {
      const p = line.split(" ");
      anchors[0].d = +p[1];
      anchors[1].d = +p[2];
      anchors[2].d = +p[3];

      trilaterate2D();
      render();
    }
  });
}

/*************************************************
 * APPLY INPUTS FROM UI
 *************************************************/
document.getElementById("applyConfig").onclick = () => {
  room.w = +roomWidth.value;
  room.h = +roomHeight.value;

  anchors[0].x = +ax.value; anchors[0].y = +ay.value; anchors[0].z = +az.value;
  anchors[1].x = +bx.value; anchors[1].y = +by.value; anchors[1].z = +bz.value;
  anchors[2].x = +cx.value; anchors[2].y = +cy.value; anchors[2].z = +cz.value;

  master.x = +mx.value; master.y = +my.value; master.z = +mz.value;
  ue.z = +uez.value;

  render();
};

/*************************************************
 * START
 *************************************************/
render();
