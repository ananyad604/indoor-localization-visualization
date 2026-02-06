/******************** STATE ********************/
let room = { w: 6, h: 6 };

let anchors = [
  { id: 'A', x: 0, y: 0, z: 0, color: '#ff5722' },
  { id: 'B', x: 6, y: 0, z: 0, color: '#4caf50' },
  { id: 'C', x: 0, y: 6, z: 0, color: '#9c27b0' }
];

let master = { x: 3, y: 3, z: 1.0 };

let ue = { x: 0, y: 0, z: 0.3 };

let dist = { A: 0, B: 0, C: 0 };

/******************** CANVAS ********************/
const canvas = document.getElementById("roomCanvas");
const ctx = canvas.getContext("2d");
const info = document.getElementById("ue-coords");

/******************** 3D → 2D PROJECTION ********************/
function project3D(x, y, z) {
  const isoX = (x - y) * 40 + canvas.width / 2;
  const isoY = (x + y) * 20 - z * 40 + 100;
  return { x: isoX, y: isoY };
}

/******************** DRAW ********************/
function drawNode(obj, label, r, color) {
  const p = project3D(obj.x, obj.y, obj.z);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.fillText(label, p.x + 10, p.y);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  anchors.forEach(a =>
    drawNode(a, `A${a.id} z=${a.z}`, 10, a.color)
  );

  drawNode(master, "MASTER", 12, "#000");
  drawNode(ue, "UE", 10, "#2196f3");

  info.innerText =
    `UE: (${ue.x.toFixed(2)}, ${ue.y.toFixed(2)}, ${ue.z.toFixed(2)})`;
}

/******************** MATH ********************/
function trilaterate2D() {
  const L = room.w;
  const x = (dist.A**2 - dist.B**2 + L**2) / (2 * L);
  const y = (dist.A**2 - dist.C**2 + L**2) / (2 * L);

  ue.x = clamp(x, 0, room.w);
  ue.y = clamp(y, 0, room.h);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/******************** SERIAL ********************/
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
    if (line.startsWith("DIST")) {
      const p = line.trim().split(" ");
      dist.A = +p[1];
      dist.B = +p[2];
      dist.C = +p[3];
      trilaterate2D();
      render();
    }
  });
}

/******************** APPLY CONFIG ********************/
document.getElementById("applyConfig").onclick = () => {
  room.w = +roomWidth.value;
  room.h = +roomHeight.value;
  ue.z = +uez.value;

  anchors[0].x = +ax.value; anchors[0].y = +ay.value; anchors[0].z = +az.value;
  anchors[1].x = +bx.value; anchors[1].y = +by.value; anchors[1].z = +bz.value;
  anchors[2].x = +cx.value; anchors[2].y = +cy.value; anchors[2].z = +cz.value;

  master.x = +mx.value;
  master.y = +my.value;
  master.z = +mz.value;

  render();
};

/******************** START ********************/
render();
