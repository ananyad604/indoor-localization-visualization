/***********************
 * STATE
 ***********************/
let room = { w: 10, h: 10 };

let anchors = [
  { id: 'A', x: 0, y: 0, z: 0, color: '#ff5722', rssi: 0, d: 0 },
  { id: 'B', x: 8, y: 0, z: 0, color: '#4caf50', rssi: 0, d: 0 },
  { id: 'C', x: 0, y: 8, z: 0, color: '#9c27b0', rssi: 0, d: 0 }
];

let master = { x: 5, y: 1, z: 1 };
let ue = { x: 0, y: 0, z: 0.3 };

/***********************
 * CANVAS
 ***********************/
const canvas = document.getElementById("roomCanvas");
const ctx = canvas.getContext("2d");
const info = document.getElementById("ue-coords");

/***********************
 * 3D → 2D ISOMETRIC
 ***********************/
function project(x, y, z) {
  const s = 40;
  return {
    x: (x - y) * s + canvas.width / 2,
    y: canvas.height - ((x + y) * s * 0.5 + z * s)
  };
}

/***********************
 * DRAW
 ***********************/
function drawPoint(o, label, r, c) {
  const p = project(o.x, o.y, o.z);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = c;
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.fillText(label, p.x + 8, p.y - 8);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  anchors.forEach(a => drawPoint(a, `A${a.id}`, 10, a.color));
  drawPoint(master, "MASTER", 12, "#000");
  drawPoint(ue, "UE", 10, "#2196f3");

  info.innerHTML = `
UE: (${ue.x.toFixed(2)}, ${ue.y.toFixed(2)}, ${ue.z.toFixed(2)})
RSSI: A=${anchors[0].rssi} B=${anchors[1].rssi} C=${anchors[2].rssi}
DIST: A=${anchors[0].d.toFixed(2)} B=${anchors[1].d.toFixed(2)} C=${anchors[2].d.toFixed(2)}
DIR from MASTER: ${bearing().toFixed(1)}°
`;
}

/***********************
 * MATH
 ***********************/
function trilaterate() {
  const L = room.w;
  const dA = anchors[0].d;
  const dB = anchors[1].d;
  const dC = anchors[2].d;
  if (dA <= 0 || dB <= 0 || dC <= 0) return;

  ue.x = (dA*dA - dB*dB + L*L) / (2*L);
  ue.y = (dA*dA - dC*dC + L*L) / (2*L);
}

function bearing() {
  let a = Math.atan2(ue.y - master.y, ue.x - master.x) * 180 / Math.PI;
  return a < 0 ? a + 360 : a;
}

/***********************
 * SERIAL
 ***********************/
let port, reader;
const decoder = new TextDecoder();

document.getElementById("serialBtn").onclick = async () => {
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 });
  reader = port.readable.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    parse(decoder.decode(value));
  }
};

function parse(data) {
  data.split("\n").forEach(l => {
    l = l.trim();
    if (l.startsWith("DIST")) {
      const p = l.split(" ");
      anchors[0].d = +p[1];
      anchors[1].d = +p[2];
      anchors[2].d = +p[3];
      trilaterate();
      render();
    }
    if (l.startsWith("RSSI")) {
      const p = l.split(" ");
      anchors[0].rssi = +p[1];
      anchors[1].rssi = +p[2];
      anchors[2].rssi = +p[3];
    }
  });
}

/***********************
 * APPLY INPUTS
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

render();
