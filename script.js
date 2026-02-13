// === CONFIGURATION ===
const ROOM_WIDTH_METERS = 6.0;
const ROOM_HEIGHT_METERS = 6.0;
const ANCHOR_NODES = [
    { id: 'A', x: 1.0, y: 1.0, color: '#FF5722' },
    { id: 'B', x: 5.0, y: 1.0, color: '#4CAF50' },
    { id: 'C', x: 3.0, y: 5.0, color: '#9C27B0' }
];

// User Equipment (UE) starting state
let ue = {
    x: 3.0,
    y: 3.0,
    color: '#2196F3',
    radius: 10,
    // Movement simulation variables
    dx: 0.02,
    dy: 0.03
};

// === SETUP ===
const canvas = document.getElementById('roomCanvas');
const ctx = canvas.getContext('2d');
const coordsDisplay = document.getElementById('ue-coords');

// Calculate scaling factor to fit room in canvas
// Canvas is 600px wide, Room is 6m wide -> 100 pixels per meter
const SCALE_X = canvas.width / ROOM_WIDTH_METERS;
const SCALE_Y = canvas.height / ROOM_HEIGHT_METERS;

// === HELPER FUNCTIONS ===

/**
 * Converts meters to screen pixels
 */
function toScreen(x, y) {
    return {
        // Standard Cartesian: (0,0) is bottom-left usually in physics, 
        // but canvas (0,0) is top-left.
        // Let's assume (0,0) is TOP-LEFT for simplicity in this visualization 
        // to match standard reading direction, or we can invert Y.
        // Let's use Top-Left as origin (0,0) for simplicity.
        px: x * SCALE_X,
        py: y * SCALE_Y
    };
}

/**
 * Draws a circle (Anchor or UE)
 */
function drawNode(x, y, color, label, isAnchor = false) {
    const pos = toScreen(x, y);

    ctx.beginPath();
    ctx.arc(pos.px, pos.py, isAnchor ? 15 : 10, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    // Draw Label
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Offset label slightly above for Anchors, below for UE
    ctx.fillText(label, pos.px, pos.py + (isAnchor ? -25 : 25));
}

/**
 * Main Drawing Loop
 */
function draw() {
    // 1. Clear Screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Anchors
    ANCHOR_NODES.forEach(anchor => {
        drawNode(anchor.x, anchor.y, anchor.color, `Anchor ${anchor.id}`, true);
    });

    // 3. Draw UE
    drawNode(ue.x, ue.y, ue.color, 'UE');

    // 4. Update UI Text
    coordsDisplay.textContent = `(${ue.x.toFixed(2)}, ${ue.y.toFixed(2)})`;
}

/**
 * Simulation Loop - Moves the UE automatically
 */
function update() {
    // Move UE
    ue.x += ue.dx;
    ue.y += ue.dy;

    // Bounce off walls
    if (ue.x <= 0 || ue.x >= ROOM_WIDTH_METERS) ue.dx *= -1;
    if (ue.y <= 0 || ue.y >= ROOM_HEIGHT_METERS) ue.dy *= -1;

    // Clamp values just in case
    ue.x = Math.max(0, Math.min(ROOM_WIDTH_METERS, ue.x));
    ue.y = Math.max(0, Math.min(ROOM_HEIGHT_METERS, ue.y));

    draw();
    requestAnimationFrame(update);
}

// === START ===
// Initial draw
draw();
// Start animation loop
update();
