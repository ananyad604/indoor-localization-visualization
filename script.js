/***********************
 * GLOBAL STATE
 ***********************/
let room = { w: 10, h: 10 };

let anchors = [
  { id: 'A', x: 0,  y: 0,  z: 0, color: '#ff5722', d: 0 },
  { id: 'B', x: 10, y: 0,  z: 0, color: '#4caf50', d: 0 },
  { id: 'C', x: 0,  y: 10, z: 0, color: '#9c27b0', d: 0 }
];

let master = { x: 10, y: 10, z: 0 };
let ue     = { x: 5,  y: 5,  z: 0.3 };

/***********************
 * CANVAS
 ***********************/
const canvas = document.getElementById("roomCanvas");
const ctx = canvas.getContext("2d");
const info = document.getElementById("ue-coords");

const margin = 50;

/***********************
 * ROOM → CANVAS (XY ONLY)
 ***********************/
function project(x, y) {
  const drawW = canvas.width  - 2 * margin;
  const drawH = canvas.height - 2 * margin;

  return {
    x: margin + (x / room.w) * drawW,
    y: margin + ((room.h - y) / room.h) * drawH
  };
}

/***********************
 * DRAWING
 ***********************/
function drawRoom() {
  const p0 = project(0, 0);
  const p1 = project(room.w, 0);
  const p2 = project(room.w, room.h);
  const p3 = project(0, room.h);

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

function drawPoint(p, label, color, r = 9) {
  const s = project(p.x, p.y);

  ctx.beginPath();
  ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#222";
  ctx.stroke();

  ctx.fillStyle = "#000";
  ctx.font = "12px Arial";
  ctx.fillText(`${label} (z=${p.z}m)`, s.x + 8, s.y - 8);
}

/***********************
 * RENDER
 ***********************/
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawRoom();

  anchors.forEach(a =>
    drawPoint(a, `A${a.id}`, a.color)
  );

  drawPoint(master, "MASTER", "#000", 11);
  drawPoint(ue, "UE", "#2196f3");

  info.innerHTML = `
UE Position: (${ue.x.toFixed(2)}, ${ue.y.toFixed(2)}, ${ue.z.toFixed(2)}) m<br>
Distances: A=${anchors[0].d.toFixed(2)} 
B=${anchors[1].d.toFixed(2)} 
C=${anchors[2].d.toFixed(2)}<br>
Direction from MASTER: ${bearing().toFixed(1)}°
`;
}

/***********************
 * MATH
 ***********************/
function trilaterate2D() {
  const dA = anchors[0].d;
  const dB = anchors[1].d;
  const dC = anchors[2].d;
  if (dA <= 0 || dB <= 0 || dC <= 0) return;

  ue.x = (dA*dA - dB*dB + room.w*room.w) / (2 * room.w);
  ue.y = (dA*dA - dC*dC + room.h*room.h) / (2 * room.h);
}

function bearing() {
  let a = Math.atan2(ue.y - master.y, ue.x - master.x) * 180 / Math.PI;
  return a < 0 ? a + 360 : a;
}

/***********************
 * SERIAL INPUT
 ***********************/
function parseSerial(data) {
  data.split("\n").forEach(l => {
    if (l.startsWith("DIST")) {
      const p = l.split(" ");
      anchors[0].d = +p[1];
      anchors[1].d = +p[2];
      anchors[2].d = +p[3];
      trilaterate2D();
      render();
    }
  });
}

/***********************
 * APPLY CONFIG
 ***********************/
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

/***********************
 * START
 ***********************/
render();
