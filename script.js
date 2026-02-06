/***********************
 * SERIAL
 ***********************/
let port, reader;
const decoder = new TextDecoder();

document.getElementById("serialBtn").onclick = connectSerial;

/***********************
 * STATE
 ***********************/
let room = { w: 10, h: 10 };

let anchors = [
  { id: 'A', x: 0,  y: 0,  d: 0, color: '#ff5722' },
  { id: 'B', x: 10, y: 0,  d: 0, color: '#4caf50' },
  { id: 'C', x: 0,  y: 10, d: 0, color: '#9c27b0' }
];

let master = { x: 10, y: 10 };
let ue = { x: 5, y: 5, z: 0.3 };

/***********************
 * CANVAS
 ***********************/
const canvas = document.getElementById("roomCanvas");
const ctx = canvas.getContext("2d");
const info = document.getElementById("ue-coords");
const margin = 60;

/***********************
 * COORDINATE MAPPING
 * (0,0) bottom-left
 ***********************/
function mapXY(x, y) {
  const W = canvas.width - 2 * margin;
  const H = canvas.height - 2 * margin;

  return {
    px: margin + (x / room.w) * W,
    py: margin + (1 - y / room.h) * H
  };
}

/***********************
 * DRAW
 ***********************/
function drawRoom() {
  const p0 = mapXY(0, 0);
  const p1 = mapXY(room.w, 0);
  const p2 = mapXY(room.w, room.h);
  const p3 = mapXY(0, room.h);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p0.px, p0.py);
  ctx.lineTo(p1.px, p1.py);
  ctx.lineTo(p2.px, p2.py);
  ctx.lineTo(p3.px, p3.py);
  ctx.closePath();
  ctx.stroke();
}

function drawPoint(x, y, color, label) {
  const p = mapXY(x, y);
  ctx.beginPath();
  ctx.arc(p.px, p.py, 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#000";
  ctx.fillText(label, p.px + 10, p.py - 10);
}

/***********************
 * TRILATERATION (2D)
 ***********************/
function trilaterate() {
  const dA = anchors[0].d;
  const dB = anchors[1].d;
  const dC = anchors[2].d;
  if (dA <= 0 || dB <= 0 || dC <= 0) return;

  ue.x = (dA*dA - dB*dB + room.w*room.w) / (2 * room.w);
  ue.y = (dA*dA - dC*dC + room.h*room.h) / (2 * room.h);
}

/***********************
 * BEARING
 ***********************/
function bearing() {
  let a = Math.atan2(ue.y - master.y, ue.x - master.x) * 180 / Math.PI;
  return a < 0 ? a + 360 : a;
}

/***********************
 * RENDER
 ***********************/
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoom();

  anchors.forEach(a =>
    drawPoint(a.x, a.y, a.color, `A${a.id}`)
  );

  drawPoint(master.x, master.y, "#000", "MASTER");
  drawPoint(ue.x, ue.y, "#2196f3", "UE");

  info.innerHTML = `
UE: (${ue.x.toFixed(2)}, ${ue.y.toFixed(2)}, ${ue.z})<br>
DIST: A=${anchors[0].d.toFixed(2)} 
      B=${anchors[1].d.toFixed(2)} 
      C=${anchors[2].d.toFixed(2)}<br>
DIR from MASTER: ${bearing().toFixed(1)}°
`;
}

/***********************
 * SERIAL PARSE
 ***********************/
async function connectSerial() {
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 });
  reader = port.readable.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    parseSerial(decoder.decode(value));
  }
}

function parseSerial(data) {
  data.split("\n").forEach(line => {
    if (line.startsWith("DIST")) {
      const p = line.split(" ");
      anchors[0].d = +p[1];
      anchors[1].d = +p[2];
      anchors[2].d = +p[3];
      trilaterate();
      render();
    }
  });
}

/***********************
 * APPLY CONFIG
 ***********************/
document.getElementById("apply").onclick = () => {
  room.w = +roomW.value;
  room.h = +roomH.value;

  anchors[0].x = +ax.value; anchors[0].y = +ay.value;
  anchors[1].x = +bx.value; anchors[1].y = +by.value;
  anchors[2].x = +cx.value; anchors[2].y = +cy.value;

  master.x = +mx.value;
  master.y = +my.value;

  render();
};

/***********************
 * START
 ***********************/
render();
