// ═══════════════════════════════════════════════════════════════
// UI.JS - User Interface Controls
// ═══════════════════════════════════════════════════════════════

function clearGrid() {
    initializeGrids();
    treeGrowthQueue = [];
    generators = [];
    treeUpdateCounter = 0;
}

function resizeCanvas() {
    const { width: viewportWidth, height: viewportHeight } = getViewportDimensions();
    const newGridWidth = Math.floor(viewportWidth / CELL_SIZE);
    const newGridHeight = Math.floor(viewportHeight / CELL_SIZE);

    // Only resize if dimensions actually changed
    if (newGridWidth !== GRID_WIDTH || newGridHeight !== GRID_HEIGHT) {
        // Store old grid data
        const oldGrid = grid;
        const oldFireLife = fireLifeGrid;
        const oldSteamLife = steamLifeGrid;
        const oldAcidLife = acidLifeGrid;
        const oldLavaLife = lavaLifeGrid;
        const oldInchwormLife = inchwormLifeGrid;
        const oldTreeDecomp = treeDecompositionGrid;
        const oldColorCache = colorCache;
        const oldWidth = GRID_WIDTH;
        const oldHeight = GRID_HEIGHT;

        // Update dimensions
        GRID_WIDTH = newGridWidth;
        GRID_HEIGHT = newGridHeight;
        canvas.width = GRID_WIDTH * CELL_SIZE;
        canvas.height = GRID_HEIGHT * CELL_SIZE;

        // Store current grid set before reinitializing
        const oldCurrentGridSet = currentGridSet;

        // Initialize new grids
        initializeGrids();

        // Restore the current grid set
        currentGridSet = oldCurrentGridSet;

        // Copy over existing data if possible
        if (oldGrid) {
            const copyWidth = Math.min(oldWidth, GRID_WIDTH);
            const copyHeight = Math.min(oldHeight, GRID_HEIGHT);

            for (let y = 0; y < copyHeight; y++) {
                for (let x = 0; x < copyWidth; x++) {
                    // Copy to both grid sets to maintain double buffer consistency
                    gridA[y][x] = oldGrid[y][x];
                    gridB[y][x] = oldGrid[y][x];
                    fireLifeGridA[y][x] = oldFireLife[y][x];
                    fireLifeGridB[y][x] = oldFireLife[y][x];
                    steamLifeGridA[y][x] = oldSteamLife[y][x];
                    steamLifeGridB[y][x] = oldSteamLife[y][x];
                    acidLifeGridA[y][x] = oldAcidLife[y][x];
                    acidLifeGridB[y][x] = oldAcidLife[y][x];
                    lavaLifeGridA[y][x] = oldLavaLife[y][x];
                    lavaLifeGridB[y][x] = oldLavaLife[y][x];
                    inchwormLifeGridA[y][x] = oldInchwormLife[y][x];
                    inchwormLifeGridB[y][x] = oldInchwormLife[y][x];
                    treeDecompositionGrid[y][x] = oldTreeDecomp[y][x];
                    colorCache[y][x] = oldColorCache[y][x];
                }
            }

            // Set current grid pointers to the correct set
            if (currentGridSet === 'A') {
                grid = gridA;
                fireLifeGrid = fireLifeGridA;
                steamLifeGrid = steamLifeGridA;
                acidLifeGrid = acidLifeGridA;
                lavaLifeGrid = lavaLifeGridA;
                inchwormLifeGrid = inchwormLifeGridA;
            } else {
                grid = gridB;
                fireLifeGrid = fireLifeGridB;
                steamLifeGrid = steamLifeGridB;
                acidLifeGrid = acidLifeGridB;
                lavaLifeGrid = lavaLifeGridB;
                inchwormLifeGrid = inchwormLifeGridB;
            }
        }
    }
}

function togglePause() {
    isPaused = !isPaused;
    const pauseButton = document.querySelector('[onclick="togglePause()"]');
    pauseButton.textContent = isPaused ? '▶' : '■';

    // Immediately trigger audio update when pausing
    if (isPaused) {
        updateWaterNoise(0); // Force stop when pausing
    }
}

function toggleMenu() {
    const toggleableElements = document.querySelectorAll('.toggleable');
    const isCollapsed = toggleableElements[0].style.display === 'none';

    toggleableElements.forEach(element => {
        element.style.display = isCollapsed ? 'flex' : 'none';
    });
}

function increaseBrushSize() {
    brushSize = Math.min(brushSize + 1, 10); // Cap at 10
    document.getElementById('brushSizeDisplay').textContent = brushSize;
}

function decreaseBrushSize() {
    brushSize = Math.max(brushSize - 1, 1); // Min size 1
    document.getElementById('brushSizeDisplay').textContent = brushSize;
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundButton = document.getElementById('soundToggle');

    if (soundEnabled) {
        master.gain.value = 0.4; // Restore volume
        soundButton.textContent = '♪';
        soundButton.style.background = '#444';
    } else {
        master.gain.value = 0; // Mute
        soundButton.textContent = '×';
        soundButton.style.background = '#666';
    }
}

function selectMaterial(materialName) {
    const materialMap = { SAND, WATER, FIRE, DIRT, TREE, GLASS, STEAM, ACID, ERASER, DEAD_TREE, LAVA, INCHWORM };
    selectedMaterial = materialMap[materialName];

    // Update UI
    document.querySelectorAll('.material-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
}

function showLoading() {
    const pauseBtn = document.querySelector('[onclick="togglePause()"]');
    if (pauseBtn) {
        loadingIconIndex = 0;
        pauseBtn.textContent = loadingIcons[loadingIconIndex];
        loadingInterval = setInterval(() => {
            loadingIconIndex = (loadingIconIndex + 1) % loadingIcons.length;
            pauseBtn.textContent = loadingIcons[loadingIconIndex];
        }, 200);
    }
}

function hideLoading() {
    const pauseBtn = document.querySelector('[onclick="togglePause()"]');
    if (pauseBtn) {
        clearInterval(loadingInterval);
        pauseBtn.textContent = isPaused ? '▶' : '■';
    }
}
