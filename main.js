// ═══════════════════════════════════════════════════════════════
// MAIN.JS - Game Loop & Event Handlers
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Initialization
// ───────────────────────────────────────────────────────────────
// Initialize grids after DOM and all modules are loaded
initializeGrids();

// ───────────────────────────────────────────────────────────────
// Mouse Event Handlers
// ───────────────────────────────────────────────────────────────

canvas.addEventListener('mousedown', (e) => {
    unlockAudio();
    isMouseDown = true;
    const pos = getGridPos(e.clientX, e.clientY);
    mouseX = pos.x;
    mouseY = pos.y;

    if (selectedMaterial === ERASER) {
        // Remove generator at this position
        generators = generators.filter(gen =>
            Math.abs(gen.x - pos.x) > 2 || Math.abs(gen.y - pos.y) > 2
        );
    }

    addMaterial(mouseX, mouseY, selectedMaterial, brushSize);
});

canvas.addEventListener('dblclick', (e) => {
    const pos = getGridPos(e.clientX, e.clientY);

    if (selectedMaterial !== ERASER) {
        // Add generator at this position
        generators.push({
            x: pos.x,
            y: pos.y,
            material: selectedMaterial,
            radius: brushSize
        });
    }
});

canvas.addEventListener('mousemove', (e) => {
    const pos = getGridPos(e.clientX, e.clientY);
    mouseX = pos.x;
    mouseY = pos.y;
    if (isMouseDown) {
        addMaterial(mouseX, mouseY, selectedMaterial, brushSize);
    }
});

canvas.addEventListener('mouseup', () => {
    isMouseDown = false;
});

canvas.addEventListener('mouseleave', () => {
    isMouseDown = false;
});

// ───────────────────────────────────────────────────────────────
// Touch Event Handlers (Mobile Support)
// ───────────────────────────────────────────────────────────────

canvas.addEventListener('touchstart', (e) => {
    unlockAudio();
    e.preventDefault(); // Prevent scrolling and other default behaviors
    isMouseDown = true;
    const touch = e.touches[0];
    const pos = getGridPos(touch.clientX, touch.clientY);
    mouseX = pos.x;
    mouseY = pos.y;
    addMaterial(mouseX, mouseY, selectedMaterial, brushSize);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    const pos = getGridPos(touch.clientX, touch.clientY);
    mouseX = pos.x;
    mouseY = pos.y;
    if (isMouseDown) {
        addMaterial(mouseX, mouseY, selectedMaterial, brushSize);
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isMouseDown = false;
});

canvas.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    isMouseDown = false;
});

// ───────────────────────────────────────────────────────────────
// Keyboard Event Handlers
// ───────────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    unlockAudio();
    if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
    }
});

// ───────────────────────────────────────────────────────────────
// Window Resize Handlers
// ───────────────────────────────────────────────────────────────

window.addEventListener('resize', resizeCanvas);

// Visual viewport resize event for mobile Safari
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeCanvas);
}

// ───────────────────────────────────────────────────────────────
// Image Paste Handler (Ctrl+V)
// ───────────────────────────────────────────────────────────────

document.addEventListener('paste', function(e) {
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            const reader = new FileReader();

            showLoading();

            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // Get current canvas dimensions
                    const { width: viewportWidth, height: viewportHeight } = getViewportDimensions();
                    const canvasWidth = Math.floor(viewportWidth / CELL_SIZE);
                    const canvasHeight = Math.floor(viewportHeight / CELL_SIZE);

                    // Create canvas to stretch image to canvas aspect ratio
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = canvasWidth;
                    tempCanvas.height = canvasHeight;

                    // Stretch image to fill canvas dimensions
                    tempCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                    const imageData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);

                    // Apply dithering
                    const ditheredData = ditherImage(imageData, canvasWidth, canvasHeight);

                    // Map to canvas (now 1:1 mapping)
                    mapImageToCanvas(ditheredData);

                    hideLoading();
                };
                img.src = event.target.result;
            };

            reader.readAsDataURL(file);
            break;
        }
    }
});

// ───────────────────────────────────────────────────────────────
// Main Game Loop
// ───────────────────────────────────────────────────────────────

let lastFrameTime = performance.now();
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS; // ~16.67ms per frame

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    // Pass deltaTime to simulation for frame-rate independent updates
    updateSimulation(deltaTime);
    renderGrid();
    requestAnimationFrame(gameLoop);
}

// ───────────────────────────────────────────────────────────────
// Initialization
// ───────────────────────────────────────────────────────────────

// Initial resize to set proper size
resizeCanvas();

// Start the simulation
gameLoop();
