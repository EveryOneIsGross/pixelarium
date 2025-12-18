// ═══════════════════════════════════════════════════════════════
// CELLS.JS - Grid Physics & Material Interactions
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Grid State Variables
// ───────────────────────────────────────────────────────────────
let grid, fireLifeGrid, steamLifeGrid, acidLifeGrid, lavaLifeGrid, inchwormLifeGrid, waterTintGrid, imageData;
let gridA, gridB, fireLifeGridA, fireLifeGridB, steamLifeGridA, steamLifeGridB;
let acidLifeGridA, acidLifeGridB, lavaLifeGridA, lavaLifeGridB, inchwormLifeGridA, inchwormLifeGridB;
let waterTintGridA, waterTintGridB;
let tempCanvas, tempCtx; // Reusable canvas for rendering

// ───────────────────────────────────────────────────────────────
// Grid Initialization
// ───────────────────────────────────────────────────────────────
function initializeGrids() {
    // Create double buffer grid sets
    gridA = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(EMPTY));
    gridB = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(EMPTY));
    fireLifeGridA = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    fireLifeGridB = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    steamLifeGridA = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    steamLifeGridB = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    acidLifeGridA = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    acidLifeGridB = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    lavaLifeGridA = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    lavaLifeGridB = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    inchwormLifeGridA = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    inchwormLifeGridB = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    waterTintGridA = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    waterTintGridB = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));

    treeDecompositionGrid = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(0));
    colorCache = new Array(GRID_HEIGHT).fill().map(() => new Array(GRID_WIDTH).fill(null));

    // Initialize current grids to A set
    grid = gridA;
    fireLifeGrid = fireLifeGridA;
    steamLifeGrid = steamLifeGridA;
    acidLifeGrid = acidLifeGridA;
    lavaLifeGrid = lavaLifeGridA;
    inchwormLifeGrid = inchwormLifeGridA;
    waterTintGrid = waterTintGridA;

    // Create reusable canvas for rendering
    tempCanvas = document.createElement('canvas');
    tempCanvas.width = GRID_WIDTH;
    tempCanvas.height = GRID_HEIGHT;
    tempCtx = tempCanvas.getContext('2d');

    imageData = ctx.createImageData(GRID_WIDTH, GRID_HEIGHT);
}

// ───────────────────────────────────────────────────────────────
// Color Management
// ───────────────────────────────────────────────────────────────
function getRandomColor(material) {
    const colors = materialColors[material];
    return colors[0]; // Use first color consistently
}

function getWormColor(material, x, y) {
    // Find which worm this pixel belongs to
    const worm = wormList.find(w =>
        (w.head.x === x && w.head.y === y) ||
        (w.body.x === x && w.body.y === y) ||
        (w.tail.x === x && w.tail.y === y)
    );

    if (worm && worm.colors) {
        // Use the worm's individual genetic colors
        const partName = (() => {
            if (worm.head.x === x && worm.head.y === y) return 'head';
            if (worm.body.x === x && worm.body.y === y) return 'body';
            if (worm.tail.x === x && worm.tail.y === y) return 'tail';
            return 'tail';
        })();

        // Pick a variant that's stable for this pixel but differs across worms
        const colorVariants = worm.colors[partName];
        const idx = worm.id & 3;   // 0-3 stable per worm
        return colorVariants[idx];
    }

    // Fallback to default material colors
    return getRandomColor(material);
}

function getPixelColor(material, x, y) {
    // For worm pixels, ALWAYS use individual worm colors (no caching)
    if (material === INCHWORM || material === INCHWORM_HEAD || material === INCHWORM_BODY) {
        return getWormColor(material, x, y);
    }

    // For non-worm materials, use caching as before
    if (colorCache[y][x] && colorCache[y][x].material === material) {
        return colorCache[y][x].color;
    }

    // Generate new random color for new pixel and cache it
    const color = getRandomColor(material);
    colorCache[y][x] = { material, color };
    return color;
}

function clearColorCache(x, y) {
    if (colorCache && colorCache[y] && colorCache[y][x]) {
        colorCache[y][x] = null;
    }
}

// ───────────────────────────────────────────────────────────────
// Position & Validation
// ───────────────────────────────────────────────────────────────
function getGridPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((clientY - rect.top) / CELL_SIZE);
    return { x, y };
}

function isValidPos(x, y) {
    return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
}

function canPlaceTree(x, y, gridRef = grid) {
    if (!isValidPos(x, y) || gridRef[y][x] !== EMPTY) {
        return false;
    }
    return true;
}

function findNearestWater(x, y, maxDistance = 15) {
    let nearest = null;
    let minDistance = Infinity;

    for (let checkY = Math.max(0, y - maxDistance); checkY < Math.min(GRID_HEIGHT, y + maxDistance + 1); checkY++) {
        for (let checkX = Math.max(0, x - maxDistance); checkX < Math.min(GRID_WIDTH, x + maxDistance + 1); checkX++) {
            if (grid[checkY][checkX] === WATER) {
                const distanceSquared = (checkX - x) * (checkX - x) + (checkY - y) * (checkY - y);
                if (distanceSquared < minDistance) {
                    minDistance = distanceSquared;
                    nearest = { x: checkX, y: checkY, distance: Math.sqrt(distanceSquared) };
                }
            }
        }
    }

    return nearest;
}

function applyBurningWormFire() {
    // Overlay fire pixels on worms that are on fire
    for (const worm of wormList) {
        if (worm.onFire) {
            // Check if worm is touching water (will be extinguished this frame)
            let touchingWater = false;
            const parts = [worm.head, worm.body, worm.tail];

            for (const part of parts) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const checkX = part.x + dx;
                        const checkY = part.y + dy;
                        if (isValidPos(checkX, checkY) && grid[checkY][checkX] === WATER) {
                            touchingWater = true;
                            break;
                        }
                    }
                    if (touchingWater) break;
                }
                if (touchingWater) break;
            }

            // Don't place fire if worm is touching water (prevents deletion)
            if (!touchingWater) {
                // Place fire on each body part
                for (const part of parts) {
                    if (isValidPos(part.x, part.y)) {
                        // Save original worm cell type
                        const originalCell = grid[part.y][part.x];

                        // Only place fire if the cell is still a worm part
                        if (originalCell === INCHWORM || originalCell === INCHWORM_HEAD || originalCell === INCHWORM_BODY) {
                            grid[part.y][part.x] = FIRE;
                            fireLifeGrid[part.y][part.x] = materials[FIRE].life;
                        }
                    }
                }
            }
        }
    }
}

// ───────────────────────────────────────────────────────────────
// Material Placement
// ───────────────────────────────────────────────────────────────
function addMaterial(x, y, material, radius = 3) {
    // Special handling for worm spawning
    if (material === INCHWORM) {
        spawnSingleWorm(x, y);
        return;
    }

    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (isValidPos(nx, ny) && Math.sqrt(dx*dx + dy*dy) <= radius) {
                if ((grid[ny][nx] === EMPTY || material === ERASER) && Math.random() < 0.2) {
                    if (material === ERASER) {
                        // Eraser removes whatever is there
                        grid[ny][nx] = EMPTY;
                        fireLifeGrid[ny][nx] = 0;
                        steamLifeGrid[ny][nx] = 0;
                        acidLifeGrid[ny][nx] = 0;
                        lavaLifeGrid[ny][nx] = 0;
                        inchwormLifeGrid[ny][nx] = 0;
                        treeDecompositionGrid[ny][nx] = 0;
                    } else {
                        grid[ny][nx] = material;
                        if (material === FIRE) {
                            fireLifeGrid[ny][nx] = materials[FIRE].life;
                        } else if (material === STEAM) {
                            steamLifeGrid[ny][nx] = materials[STEAM].life;
                        } else if (material === ACID) {
                            acidLifeGrid[ny][nx] = materials[ACID].life;
                        } else if (material === DEAD_TREE) {
                            treeDecompositionGrid[ny][nx] = 180; // Start decomposition timer
                        }
                    }
                }
            }
        }
    }
}

// ───────────────────────────────────────────────────────────────
// Main Simulation Update
// ───────────────────────────────────────────────────────────────
function updateSimulation() {
    if (isPaused) return;

    // Continuous material placement while mouse is held down
    if (isMouseDown && isValidPos(mouseX, mouseY)) {
        // Add material every few frames for continuous flow
        if (treeUpdateCounter % 1 === 0) { // Every 3 frames
            addMaterial(mouseX, mouseY, selectedMaterial, brushSize);
        }
    }

    // Process generators - add material continuously
    generators.forEach(generator => {
        if (treeUpdateCounter % 3 === 0) { // Every 3 frames for slower generation
            addMaterial(generator.x, generator.y, generator.material, generator.radius);
        }
    });

    // Increment tree update counter
    treeUpdateCounter++;


    // Process tree growth (fractal growth) - DISABLED during grid processing
    // This will be handled after the new grid is created

    // Process tree behavior (movement toward water, death)
    updateTreeBehavior();

    // Process worm behavior
    updateWorms();

    // Place fire on burning worms
    applyBurningWormFire();

    // Process tree decomposition
    updateTreeDecomposition();

    // Get the alternate grid set and clear it for next frame
    let newGrid, newFireLifeGrid, newSteamLifeGrid, newAcidLifeGrid, newLavaLifeGrid, newInchwormLifeGrid, newWaterTintGrid;

    if (currentGridSet === 'A') {
        newGrid = gridB;
        newFireLifeGrid = fireLifeGridB;
        newSteamLifeGrid = steamLifeGridB;
        newAcidLifeGrid = acidLifeGridB;
        newLavaLifeGrid = lavaLifeGridB;
        newInchwormLifeGrid = inchwormLifeGridB;
        newWaterTintGrid = waterTintGridB;
    } else {
        newGrid = gridA;
        newFireLifeGrid = fireLifeGridA;
        newSteamLifeGrid = steamLifeGridA;
        newAcidLifeGrid = acidLifeGridA;
        newLavaLifeGrid = lavaLifeGridA;
        newInchwormLifeGrid = inchwormLifeGridA;
        newWaterTintGrid = waterTintGridA;
    }

    // Clear the grids
    for (let y = 0; y < GRID_HEIGHT; y++) {
        newGrid[y].fill(EMPTY);
        newFireLifeGrid[y].fill(0);
        newSteamLifeGrid[y].fill(0);
        newAcidLifeGrid[y].fill(0);
        newLavaLifeGrid[y].fill(0);
        newInchwormLifeGrid[y].fill(0);
        newWaterTintGrid[y].fill(0);
    }

    let fallingWaterThisFrame = 0;      // reset every frame

    // Process from bottom to top, left to right
    for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = grid[y][x];

            if (cell === EMPTY) continue;

            // Try to move particle
            let destX = x, destY = y;

            // Only isolated tree pixels fall (not connected forest structures)
            if (cell === TREE && y < GRID_HEIGHT - 1) {
                // Count adjacent trees to determine if truly isolated
                let adjacentTreeCount = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (isValidPos(nx, ny) && grid[ny][nx] === TREE) {
                            adjacentTreeCount++;
                        }
                    }
                }

                // Only isolated tree pixels (0 neighbors) fall
                if (adjacentTreeCount === 0 && grid[y + 1][x] === EMPTY && Math.random() < 0.5) {
                    // Isolated tree pixel falls down
                    destY = y + 1;
                }
                // Try diagonal fall for isolated trees
                else if (adjacentTreeCount === 0 && Math.random() < 0.3) {
                    const leftDiag = x > 0 ? grid[y + 1][x - 1] : null;
                    const rightDiag = x < GRID_WIDTH - 1 ? grid[y + 1][x + 1] : null;

                    if (leftDiag === EMPTY && rightDiag === EMPTY) {
                        const dir = Math.random() < 0.5 ? -1 : 1;
                        destX = x + dir;
                        destY = y + 1;
                    } else if (leftDiag === EMPTY) {
                        destX = x - 1;
                        destY = y + 1;
                    } else if (rightDiag === EMPTY) {
                        destX = x + 1;
                        destY = y + 1;
                    }
                }
            }

            // Individual worm parts don't move on their own - handled by updateWorms()
            else if (cell === INCHWORM || cell === INCHWORM_HEAD || cell === INCHWORM_BODY) {
                // Worm parts are moved by the worm system, just copy them
                // Individual parts don't have independent physics
            }

            // ── ACID movement (lighter than water) ─────────────────────────
            else if (cell === ACID) {
                // fall into EMPTY
                if (y < GRID_HEIGHT-1 && grid[y+1][x] === EMPTY) {
                    destY = y + 1;
                }
                // sit / slide on WATER surface (don't sink)
                else if (y < GRID_HEIGHT-1 && grid[y+1][x] === WATER) {
                    // occasional sideways slide along the surface
                    if (Math.random() < 0.6) {
                        const dir = Math.random() < 0.5 ? -1 : 1;
                        const nx = x + dir;
                        if (isValidPos(nx,y) && grid[y][nx] === EMPTY && grid[y][nx] !== GLASS) destX = nx;
                    }
                    // stay put otherwise
                }
                // diagonal tumble around obstacles (like water)
                else if (Math.random() < 0.7) {
                    const leftEmpty  = x>0 && y<GRID_HEIGHT-1 && grid[y+1][x-1] === EMPTY;
                    const rightEmpty = x<GRID_WIDTH-1 && y<GRID_HEIGHT-1 && grid[y+1][x+1] === EMPTY;
                    if (leftEmpty && rightEmpty) {
                        destX = x + (Math.random()<0.5?-1:1); destY = y+1;
                    } else if (leftEmpty) {
                        destX = x-1; destY = y+1;
                    } else if (rightEmpty) {
                        destX = x+1; destY = y+1;
                    }
                }
            }

            // Handle falling for falling materials
            else if (y < GRID_HEIGHT - 1 && (cell === SAND || cell === DIRT || cell === WATER || cell === LAVA)) {
                // Water + dirt interaction
                if (cell === WATER && grid[y + 1][x] === DIRT && Math.random() < 0.02) {
                    // Check if growth path is clear (no glass blocking upward growth)
                    if (y > 0 && grid[y - 1][x] !== GLASS) {
                        // Water hits dirt - both become tree
                        newGrid[y + 1][x] = TREE;
                        startTreeGrowth(x, y);
                        continue; // Water is consumed
                    }
                }

                // Check if can fall down (water falls faster by skipping multiple cells)
                if (cell === WATER && grid[y + 1][x] === EMPTY) {
                    // Water tries to fall multiple cells at once
                    let fallDistance = 1;
                    while (y + fallDistance + 1 < GRID_HEIGHT &&
                            grid[y + fallDistance + 1][x] === EMPTY &&
                            fallDistance < 3) { // Max fall distance of 3
                        fallDistance++;
                    }
                    destY = y + fallDistance;
                    fallingWaterThisFrame++;
                }
                else if (grid[y + 1][x] === EMPTY) {
                    destY = y + 1;
                }
                // Sand and dirt sink through water (density-based)
                else if ((cell === SAND || cell === DIRT) && grid[y + 1][x] === WATER) {
                    destY = y + 1;
                }
                // Try diagonal fall for all falling materials including water
                else if ((cell === SAND || cell === DIRT || cell === WATER || cell === LAVA) && Math.random() < 0.7) {
                    const leftDiag = x > 0 ? grid[y + 1][x - 1] : null;
                    const rightDiag = x < GRID_WIDTH - 1 ? grid[y + 1][x + 1] : null;

                    // Check what can fall diagonally
                    const canFallLeft = leftDiag === EMPTY ||
                        ((cell === SAND || cell === DIRT) && leftDiag === WATER);
                    const canFallRight = rightDiag === EMPTY ||
                        ((cell === SAND || cell === DIRT) && rightDiag === WATER);

                    if (canFallLeft && canFallRight) {
                        const dir = Math.random() < 0.5 ? -1 : 1;
                        destX = x + dir;
                        destY = y + 1;
                    } else if (canFallLeft) {
                        destX = x - 1;
                        destY = y + 1;
                    } else if (canFallRight) {
                        destX = x + 1;
                        destY = y + 1;
                    }
                }
                // Water horizontal flow when blocked (faster spreading)
                else if (cell === WATER && Math.random() < 0.8) { // Increased from 0.4 to 0.8
                    // Water spreads multiple cells horizontally
                    const directions = [];
                    if (x > 0 && grid[y][x - 1] === EMPTY) directions.push(-1);
                    if (x < GRID_WIDTH - 1 && grid[y][x + 1] === EMPTY) directions.push(1);

                    if (directions.length > 0) {
                        const dir = directions[Math.floor(Math.random() * directions.length)];
                        let spreadDistance = 1;

                        // Try to spread multiple cells at once
                        while (x + (dir * (spreadDistance + 1)) >= 0 &&
                                x + (dir * (spreadDistance + 1)) < GRID_WIDTH &&
                                grid[y][x + (dir * (spreadDistance + 1))] === EMPTY &&
                                spreadDistance < 2) { // Max spread distance of 2
                            spreadDistance++;
                        }
                        destX = x + (dir * spreadDistance);
                    }
                }
                // Lava horizontal flow (slower than water)
                else if (cell === LAVA && Math.random() < 0.3) {
                    if (x > 0 && grid[y][x - 1] === EMPTY && Math.random() < 0.5) {
                        destX = x - 1;
                    } else if (x < GRID_WIDTH - 1 && grid[y][x + 1] === EMPTY) {
                        destX = x + 1;
                    }
                }
            }

            // Steam rises
            else if (cell === STEAM && y > 0 && Math.random() < 0.4) {
                if (grid[y - 1][x] === EMPTY) {
                    destY = y - 1;

                    // Steam also moves horizontally while rising if on glass surface
                    // Check if standing on glass
                    if (y < GRID_HEIGHT - 1 && grid[y + 1][x] === GLASS && Math.random() < 0.5) {
                        // Try to move horizontally while rising
                        const directions = [];
                        if (x > 0 && grid[y - 1][x - 1] === EMPTY) directions.push(-1);
                        if (x < GRID_WIDTH - 1 && grid[y - 1][x + 1] === EMPTY) directions.push(1);

                        if (directions.length > 0) {
                            const dir = directions[Math.floor(Math.random() * directions.length)];
                            destX = x + dir;
                        }
                    }
                }
                // Steam spreads sideways if can't rise
                else if (Math.random() < 0.3) {
                    if (x > 0 && grid[y][x - 1] === EMPTY && Math.random() < 0.5) {
                        destX = x - 1;
                    } else if (x < GRID_WIDTH - 1 && grid[y][x + 1] === EMPTY) {
                        destX = x + 1;
                    }
                }
            }

            // Fire rises slightly
            else if (cell === FIRE && y > 0 && Math.random() < 0.1) {
                if (grid[y - 1][x] === EMPTY) {
                    destY = y - 1;
                }
            }

            // Place particle in destination
            const destContent = newGrid[destY][destX];

            // Check if can displace what's at destination
            const canDisplace = destContent === EMPTY ||
                ((cell === SAND || cell === DIRT) && destContent === WATER);

            if (canDisplace) {
                newGrid[destY][destX] = cell;

                // If displacing water, place it at original position
                if (destContent === WATER && newGrid[y][x] === EMPTY) {
                    newGrid[y][x] = WATER;
                }

                // Copy life values
                if (cell === FIRE) {
                    const newLife = Math.max(0, fireLifeGrid[y][x] - 1);
                    if (newLife > 0) {
                        newFireLifeGrid[destY][destX] = newLife;
                    } else {
                        newGrid[destY][destX] = EMPTY; // Fire dies
                    }
                } else if (cell === STEAM) {
                    const newLife = Math.max(0, steamLifeGrid[y][x] - 1);
                    if (newLife > 0) {
                        newSteamLifeGrid[destY][destX] = newLife;
                    } else {
                        newGrid[destY][destX] = EMPTY; // Steam dissipates
                    }
                } else if (cell === ACID) {
                    const newLife = Math.max(0, acidLifeGrid[y][x] - 1);
                    if (newLife > 0) {
                        newAcidLifeGrid[destY][destX] = newLife;
                    } else {
                        newGrid[destY][destX] = EMPTY; // Acid evaporates
                    }
                } else if (cell === INCHWORM || cell === INCHWORM_HEAD || cell === INCHWORM_BODY) {
                    // Worm parts don't age individually - handled by worm system
                    newInchwormLifeGrid[destY][destX] = inchwormLifeGrid[y][x];
                }
            } else {
                // Can't displace, try to place in original position
                if (newGrid[y][x] === EMPTY) {
                    newGrid[y][x] = cell;
                    // Copy life values to original position
                    if (cell === FIRE) newFireLifeGrid[y][x] = fireLifeGrid[y][x];
                    if (cell === STEAM) newSteamLifeGrid[y][x] = steamLifeGrid[y][x];
                    if (cell === ACID) newAcidLifeGrid[y][x] = acidLifeGrid[y][x];
                    if (cell === INCHWORM || cell === INCHWORM_HEAD || cell === INCHWORM_BODY) {
                        newInchwormLifeGrid[y][x] = inchwormLifeGrid[y][x];
                    }
                }
            }
        }
    }

    // Second pass: Handle interactions and transformations
    let splashTriggered = false;
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = newGrid[y][x];

            // Fire interactions
            if (cell === FIRE) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (isValidPos(nx, ny)) {
                            const neighbor = newGrid[ny][nx];

                            // Fire spreads to flammable materials (trees and dead trees, but not worms)
                            if (materials[neighbor]?.flammable &&
                                neighbor !== INCHWORM && neighbor !== INCHWORM_HEAD && neighbor !== INCHWORM_BODY &&
                                Math.random() < 0.05) {
                                newGrid[ny][nx] = FIRE;
                                newFireLifeGrid[ny][nx] = materials[FIRE].life;
                                // Clear decomposition timer if burning dead tree
                                if (neighbor === DEAD_TREE) {
                                    treeDecompositionGrid[ny][nx] = 0;
                                }

                                // Create steam when plants burn (moisture release)
                                if (neighbor === TREE || neighbor === DEAD_TREE) {
                                    // Try to place steam in nearby empty spaces
                                    let steamCreated = false;
                                    for (let steamDy = -1; steamDy <= 1 && !steamCreated; steamDy++) {
                                        for (let steamDx = -1; steamDx <= 1 && !steamCreated; steamDx++) {
                                            const steamX = nx + steamDx;
                                            const steamY = ny + steamDy;
                                            if (isValidPos(steamX, steamY) &&
                                                newGrid[steamY][steamX] === EMPTY &&
                                                Math.random() < 0.3) {
                                                newGrid[steamY][steamX] = STEAM;
                                                newSteamLifeGrid[steamY][steamX] = materials[STEAM].life;
                                                steamCreated = true;
                                            }
                                        }
                                    }
                                }
                            }
                            // Fire turns sand to glass
                            else if (neighbor === SAND && Math.random() < 0.02) {
                                newGrid[ny][nx] = GLASS;
                            }
                            // Fire turns water to steam
                            else if (neighbor === WATER && Math.random() < 0.08) {
                                newGrid[ny][nx] = STEAM;
                                newSteamLifeGrid[ny][nx] = materials[STEAM].life;
                                if (!splashTriggered) {
                                    triggerSplashAccent(2, null, 'steamHiss'); // Fire + water = medium splash
                                    splashTriggered = true;
                                }
                            }
                        }
                    }
                }
            }

            // Water interactions
            else if (cell === WATER) {
                // Water extinguishes fire
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (isValidPos(nx, ny) && newGrid[ny][nx] === FIRE && Math.random() < 0.3) {
                            newGrid[ny][nx] = EMPTY;
                            newFireLifeGrid[ny][nx] = 0;
                            if (!splashTriggered) {
                                triggerSplashAccent(3, null, 'steamHiss'); // Water extinguishing fire = big splash
                                splashTriggered = true;
                            }
                        }
                    }
                }

            }

            // Dirt interactions
            else if (cell === DIRT) {
                // Check for neighboring water to sprout trees
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue; // Skip self
                        const nx = x + dx;
                        const ny = y + dy;
                        if (isValidPos(nx, ny) && newGrid[ny][nx] === WATER && Math.random() < 0.008) {
                            // Check if growth path is clear (no glass blocking upward growth)
                            const growthY = y - 1;
                            if (isValidPos(x, growthY) && newGrid[growthY][x] !== GLASS) {
                                // Convert dirt to tree and consume water
                                newGrid[y][x] = TREE;
                                newGrid[ny][nx] = EMPTY; // Consume the water
                                startTreeGrowth(x, growthY); // Start fractal growth upward
                                if (!splashTriggered) {
                                    triggerSplashAccent(1, null, 'waterDrop'); // Water + dirt = small splash
                                    splashTriggered = true;
                                }

                                break; // Only one tree per dirt particle
                            }
                        }
                    }
                }
            }


            // Water, dirt, and tree interactions (inchworm spawning)
            else if (cell === WATER || cell === DIRT || cell === TREE) {
                // Check if water, dirt, and tree are all touching
                let hasWater = false, hasDirt = false, hasTree = false;

                // Check adjacent cells for the other two materials
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (isValidPos(nx, ny)) {
                            const neighbor = newGrid[ny][nx];
                            if (neighbor === WATER) hasWater = true;
                            if (neighbor === DIRT) hasDirt = true;
                            if (neighbor === TREE) hasTree = true;
                        }
                    }
                }

                // Only proceed if all three materials are touching
                if (hasWater && hasDirt && hasTree) {
                    // Count connected pixels of current material type using flood fill
                    const connectedCount = countConnectedPixels(x, y, cell, newGrid);

                    // Spawn inchworm if more than 4 connected pixels of this type
                    if (connectedCount > 4 && Math.random() < 0.005) {
                        // Find an empty adjacent spot to spawn inchworm
                        const spawnCandidates = [];
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = x + dx;
                                const ny = y + dy;
                                if (isValidPos(nx, ny) && newGrid[ny][nx] === EMPTY) {
                                    spawnCandidates.push({ x: nx, y: ny });
                                }
                            }
                        }

                        if (spawnCandidates.length >= 3) {
                            // Spawn a 3-pixel worm
                            spawnThreePixelWorm(spawnCandidates, newGrid, newInchwormLifeGrid);
                        }
                    }
                }
            }

            // Steam interactions
            else if (cell === STEAM) {
                // Steam condenses to water when touching glass
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (isValidPos(nx, ny) && newGrid[ny][nx] === GLASS && Math.random() < 0.15) {
                            // Convert steam to water
                            newGrid[y][x] = WATER;
                            newSteamLifeGrid[y][x] = 0; // Clear steam life
                            break; // Only one conversion per steam particle
                        }
                    }
                }
            }

            /* ── ACID ↔ WATER dilution ───────────────────────────── */
            else if (cell === ACID) {
                const lifeHere = newAcidLifeGrid[y][x];

                /* count water neighbours */
                let waterNbrs = 0, totalNbrs = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx, ny = y + dy;
                        if (!isValidPos(nx, ny)) continue;

                        totalNbrs++;
                        if (newGrid[ny][nx] === WATER) {
                            waterNbrs++;
                            /* only tint water above or to the sides (floating contamination) */
                            if (dy <= 0) { // up or horizontal, not down
                                newWaterTintGrid[ny][nx] = 15;     // start as subtle blend, not full intensity
                            }
                        }
                    }
                }

                /* weaken this acid pixel only if water is the majority */
                let remaining = lifeHere;
                if (waterNbrs > totalNbrs / 0.5) {
                    const decay = waterNbrs * 2;              // tweak to taste
                    remaining = lifeHere - decay;
                }

                remaining = Math.max(0, remaining);
                newAcidLifeGrid[y][x] = remaining;
                if (remaining === 0) {
                    /* fully neutralised → becomes normal water */
                    newGrid[y][x] = WATER;
                    newWaterTintGrid[y][x] = 5;              // slight tint residue
                    if (!splashTriggered) {
                        triggerSplashAccent(1.5, null, 'acidFizz'); // Acid neutralization modulation
                        splashTriggered = true;
                    }
                }

                // ── Corrosion (never attacks WATER or worms) ─────────
                for (let dy=-1; dy<=1; dy++){
                    for (let dx=-1; dx<=1; dx++){
                        if (dx===0 && dy===0) continue;
                        const nx = x+dx, ny = y+dy;
                        if (!isValidPos(nx,ny)) continue;
                        const n = newGrid[ny][nx];
                        // Don't corrode: empty, water, acid, glass, or worms
                        if (n===EMPTY || n===WATER || n===ACID || n===GLASS ||
                            n===INCHWORM || n===INCHWORM_HEAD || n===INCHWORM_BODY) continue;
                        if (Math.random() < 0.03) newGrid[ny][nx] = EMPTY;   // dissolve
                    }
                }
            }


            // Lava interactions
            else if (cell === LAVA) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (isValidPos(nx, ny)) {
                            const neighbor = newGrid[ny][nx];

                            // Lava burns flammable materials (but not worms)
                            if (materials[neighbor]?.flammable &&
                                neighbor !== INCHWORM && neighbor !== INCHWORM_HEAD && neighbor !== INCHWORM_BODY &&
                                Math.random() < 0.1) {
                                newGrid[ny][nx] = FIRE;
                                newFireLifeGrid[ny][nx] = materials[FIRE].life;
                                if (neighbor === DEAD_TREE) {
                                    treeDecompositionGrid[ny][nx] = 0;
                                }
                            }
                            // Lava turns water to steam instantly
                            else if (neighbor === WATER && Math.random() < 0.2) {
                                newGrid[ny][nx] = STEAM;
                                newSteamLifeGrid[ny][nx] = materials[STEAM].life;
                                if (!splashTriggered) {
                                    triggerSplashAccent(2.5, null, 'lavaBloop'); // Lava vaporizing water
                                    splashTriggered = true;
                                }
                            }
                            // Lava melts sand to glass
                            else if (neighbor === SAND && Math.random() < 0.05) {
                                newGrid[ny][nx] = GLASS;
                            }
                        }
                    }
                }
            }
        }
    }

    // Swap to the new grid set
    grid = newGrid;
    fireLifeGrid = newFireLifeGrid;
    steamLifeGrid = newSteamLifeGrid;
    acidLifeGrid = newAcidLifeGrid;
    lavaLifeGrid = newLavaLifeGrid;
    inchwormLifeGrid = newInchwormLifeGrid;
    waterTintGrid = newWaterTintGrid;

    // Toggle the current grid set
    currentGridSet = currentGridSet === 'A' ? 'B' : 'A';

    // Update water noise based on movement every 10 frames
    if (treeUpdateCounter % 10 === 0) {
        updateWaterNoise(fallingWaterThisFrame);
    }

    // Process water tint diffusion (lazy floating spread)
    const tintGrid = currentGridSet === 'A' ? waterTintGridA : waterTintGridB;
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (grid[y][x] === WATER && tintGrid[y][x] > 8) {
                if (Math.random() < 0.3) { // probabilistic spreading
                    const spreadTint = Math.floor(tintGrid[y][x] * 0.4);
                    const directions = [
                        {dx: -1, dy: 0}, // left
                        {dx: 1, dy: 0},  // right
                        {dx: 0, dy: -1}  // up
                    ];

                    for (const dir of directions) {
                        const nx = x + dir.dx, ny = y + dir.dy;
                        if (isValidPos(nx, ny) && grid[ny][nx] === WATER) {
                            if (tintGrid[ny][nx] < spreadTint) {
                                tintGrid[ny][nx] = spreadTint;
                            }
                        }
                    }
                }
            }
        }
    }

    // Process fractal tree growth
    const fractalGrid = grid.map(row => [...row]);

    for (let i = treeGrowthQueue.length - 1; i >= 0; i--) {
        const treeNode = treeGrowthQueue[i];
        if (!growFractalTree(treeNode, fractalGrid)) {
            treeGrowthQueue.splice(i, 1);
        }
    }

    // Copy fractal results back to main grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (fractalGrid[y][x] === TREE && grid[y][x] === EMPTY) {
                grid[y][x] = TREE;
            }
        }
    }

}

// ───────────────────────────────────────────────────────────────
// Rendering
// ───────────────────────────────────────────────────────────────
function renderGrid() {
    // Clear image data
    for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 0;     // R
        imageData.data[i + 1] = 0; // G
        imageData.data[i + 2] = 0; // B
        imageData.data[i + 3] = 255; // A
    }

    // Draw grid to image data
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = grid[y][x];
            if (cell !== EMPTY) {
                const index = (y * GRID_WIDTH + x) * 4;
                let color = getPixelColor(cell, x, y);   // pass x,y so worm code can pick a variant

                // Modify fire color based on life
                if (cell === FIRE) {
                    const lifeRatio = fireLifeGrid[y][x] / materials[FIRE].life;
                    color = [
                        Math.floor(color[0] * lifeRatio),
                        Math.floor(color[1] * lifeRatio),
                        Math.floor(color[2] * lifeRatio),
                        255
                    ];
                }
                // Modify steam opacity based on life
                else if (cell === STEAM) {
                    const lifeRatio = steamLifeGrid[y][x] / materials[STEAM].life;
                    color = [
                        color[0],
                        color[1],
                        color[2],
                        Math.floor(color[3] * lifeRatio)
                    ];
                }
                // Modify acid intensity based on life
                else if (cell === ACID) {
                    let lifeRatio = acidLifeGrid[y][x] / materials[ACID].life;   // 0‑1
                    // keep at least 0.4 brightness, fade only the upper 60 %
                    const brightness = 0.8 + 0.6 * lifeRatio;                    // 0.4‑1
                    color = [
                        Math.floor(color[0] * brightness),
                        Math.floor(color[1] * brightness),
                        Math.floor(color[2] * brightness),
                        255
                    ];
                }
                // Water tint fades if the timer is running
                else if (cell === WATER) {
                    const currentTintGrid = (currentGridSet==='A' ? waterTintGridA : waterTintGridB);
                    const tint = currentTintGrid[y][x];
                    if (tint > 1) {
                        // blend base blue (r,g,b) with acid‑green (50,255,50)
                        const mix = tint / 40;                   // same constant used above
                        color = [
                            Math.round(color[0]*(1-mix) + 50*mix),
                            Math.round(color[1]*(1-mix) + 255*mix),
                            Math.round(color[2]*(1-mix) + 50*mix),
                            255
                        ];
                        // fade the timer
                        currentTintGrid[y][x] = tint-1;
                    }
                }

                imageData.data[index] = color[0];     // R
                imageData.data[index + 1] = color[1]; // G
                imageData.data[index + 2] = color[2]; // B
                imageData.data[index + 3] = color[3]; // A
            }
        }
    }

    // Use reusable temporary canvas for the pixel data
    tempCtx.putImageData(imageData, 0, 0);

    // Scale up to main canvas
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0, GRID_WIDTH, GRID_HEIGHT, 0, 0, canvas.width, canvas.height);

    // Draw generator indicators on top (only when hovering)
    generators.forEach(generator => {
        // Check if mouse is hovering over this generator
        const isHovering = Math.abs(mouseX - generator.x) <= generator.radius + 1 &&
                            Math.abs(mouseY - generator.y) <= generator.radius + 1;

        if (isHovering) {
            const screenX = generator.x * CELL_SIZE;
            const screenY = generator.y * CELL_SIZE;

            // Draw a pulsing border around generators
            const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5; // 0 to 1
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(
                screenX - generator.radius * CELL_SIZE,
                screenY - generator.radius * CELL_SIZE,
                (generator.radius * 2 + 1) * CELL_SIZE,
                (generator.radius * 2 + 1) * CELL_SIZE
            );
        }
    });
}

// ───────────────────────────────────────────────────────────────
// Image Processing
// ───────────────────────────────────────────────────────────────
function colorDistance(rgb1, rgb2) {
    const dr = rgb1[0] - rgb2[0];
    const dg = rgb1[1] - rgb2[1];
    const db = rgb1[2] - rgb2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

function findClosestMaterial(rgb) {
    // Only treat pure black/very near-black as empty space (background)
    // Using a very low threshold to avoid catching dark materials
    const brightness = (rgb[0] + rgb[1] + rgb[2]) / 3;
    if (brightness < 10) {
        return EMPTY;
    }

    let closestMaterial = SAND;
    let closestDistance = Infinity;

    for (const [material, color] of Object.entries(materialPalette)) {
        const distance = colorDistance(rgb, color);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestMaterial = parseInt(material);
        }
    }

    return closestMaterial;
}

function ditherImage(imageData, width, height) {
    const data = new Uint8ClampedArray(imageData.data);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const oldR = data[idx];
            const oldG = data[idx + 1];
            const oldB = data[idx + 2];

            // Find closest material color
            const material = findClosestMaterial([oldR, oldG, oldB]);

            // Skip empty pixels (dark/black areas)
            if (material === EMPTY) {
                // Set to black
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
                continue;
            }

            const newColor = materialPalette[material];

            // Set new color
            data[idx] = newColor[0];
            data[idx + 1] = newColor[1];
            data[idx + 2] = newColor[2];

            // Calculate error
            const errR = oldR - newColor[0];
            const errG = oldG - newColor[1];
            const errB = oldB - newColor[2];

            // Distribute error to neighboring pixels
            const distributeError = (dx, dy, factor) => {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = (ny * width + nx) * 4;
                    data[nIdx] += errR * factor;
                    data[nIdx + 1] += errG * factor;
                    data[nIdx + 2] += errB * factor;
                }
            };

            distributeError(1, 0, 7/16);
            distributeError(-1, 1, 3/16);
            distributeError(0, 1, 5/16);
            distributeError(1, 1, 1/16);
        }
    }

    return new ImageData(data, width, height);
}

function mapImageToCanvas(imageData, startX = 0, startY = 0) {
    const { width, height } = imageData;
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;

            const r = data[srcIdx];
            const g = data[srcIdx + 1];
            const b = data[srcIdx + 2];
            const a = data[srcIdx + 3];

            // Skip transparent pixels
            if (a < 128) continue;

            const gridX = startX + x;
            const gridY = startY + y;

            if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
                const material = findClosestMaterial([r, g, b]);
                grid[gridY][gridX] = material;

                // Clear color cache for this pixel
                clearColorCache(gridX, gridY);
            }
        }
    }
}
