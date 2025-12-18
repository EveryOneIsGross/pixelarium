// ═══════════════════════════════════════════════════════════════
// TREES.JS - Tree Growth & Decomposition System
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Tree Growth Functions
// ───────────────────────────────────────────────────────────────

function startTreeGrowth(x, y) {
    if (isValidPos(x, y)) {
        treeGrowthQueue.push({
            x: x, y: y, direction: 0, length: Math.floor(Math.random() * 8) + 12,
            thickness: 3, generation: 0, age: 0
        });
    }
}

function growFractalTree(treeNode, workingGrid) {
    if (treeNode.age >= treeNode.length || !isValidPos(treeNode.x, treeNode.y)) {
        return false;
    }

    if (workingGrid[treeNode.y][treeNode.x] === GLASS) {
        return false;
    }

    // Calculate direction with some randomness
    let dx = 0, dy = -1;
    if (treeNode.direction === -1) { dx = -1; dy = -1; }
    if (treeNode.direction === 1) { dx = 1; dy = -1; }

    // Add random sway to make trees more natural
    if (Math.random() < 0.3) {
        dx += (Math.random() - 0.5) * 0.8;
    }

    const nextX = Math.floor(treeNode.x + dx);
    const nextY = treeNode.y + dy;

    if (!isValidPos(nextX, nextY) || workingGrid[nextY][nextX] === GLASS) {
        return false;
    }

    // Place tree pixels with thickness (trunk width)
    for (let t = 0; t < treeNode.thickness; t++) {
        const growX = Math.floor(treeNode.x + (Math.random() - 0.5) * treeNode.thickness);
        const growY = treeNode.y;

        if (isValidPos(growX, growY) && workingGrid[growY][growX] === EMPTY) {
            // Check if placing this pixel would cross glass
            let blocked = false;
            const steps = Math.abs(growX - treeNode.x);
            for (let step = 0; step <= steps; step++) {
                const checkX = treeNode.x + Math.sign(growX - treeNode.x) * step;
                if (isValidPos(checkX, growY) && workingGrid[growY][checkX] === GLASS) {
                    blocked = true;
                    break;
                }
            }

            if (!blocked) {
                workingGrid[growY][growX] = TREE;
            }
        }
    }

    treeNode.x = nextX;
    treeNode.y = nextY;
    treeNode.age++;

    // Create branches with varying probability based on thickness (thicker = more branching)
    const branchProbability = 0.2 + (treeNode.thickness * 0.1);
    if (treeNode.generation < 3 && treeNode.age > 3 && treeNode.age % 4 === 0 && Math.random() < branchProbability) {
        // Left branch
        if (Math.random() < 0.5) {
            treeGrowthQueue.push({
                x: treeNode.x, y: treeNode.y, direction: -1,
                length: Math.floor(treeNode.length * 0.7),
                thickness: Math.max(1, treeNode.thickness - 1),
                generation: treeNode.generation + 1, age: 0
            });
        }
        // Right branch
        if (Math.random() < 0.5) {
            treeGrowthQueue.push({
                x: treeNode.x, y: treeNode.y, direction: 1,
                length: Math.floor(treeNode.length * 0.7),
                thickness: Math.max(1, treeNode.thickness - 1),
                generation: treeNode.generation + 1, age: 0
            });
        }
    }

    return true;
}

// ───────────────────────────────────────────────────────────────
// Tree Query Functions
// ───────────────────────────────────────────────────────────────

function findTreeCluster(worm) {
    // Find the densest tree cluster within range
    const searchRadius = 7;
    let bestCluster = null;
    let maxDensity = 0;

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            if (dx === 0 && dy === 0) continue;

            const centerX = worm.head.x + dx;
            const centerY = worm.head.y + dy;

            if (isValidPos(centerX, centerY)) {
                // Count trees in 3x3 area around this center point
                let treeCount = 0;
                for (let cy = -1; cy <= 1; cy++) {
                    for (let cx = -1; cx <= 1; cx++) {
                        const checkX = centerX + cx;
                        const checkY = centerY + cy;
                        if (isValidPos(checkX, checkY) && grid[checkY][checkX] === TREE) {
                            treeCount++;
                        }
                    }
                }

                // Calculate density score (trees per distance)
                const distance = Math.abs(dx) + Math.abs(dy);
                const density = treeCount / Math.max(1, distance);

                if (density > maxDensity && treeCount >= 2) { // Need at least 2 trees to be a cluster
                    maxDensity = density;
                    bestCluster = {
                        dx: Math.sign(dx),
                        dy: Math.sign(dy),
                        density: density,
                        treeCount: treeCount
                    };
                }
            }
        }
    }

    return bestCluster;
}

function calculateLocalTreeDensity(x, y) {
    // Count trees in 5x5 area around position
    let treeCount = 0;
    const radius = 2;

    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (isValidPos(x + dx, y + dy) && grid[y + dy][x + dx] === TREE) {
                treeCount++;
            }
        }
    }

    // Return density 0-25 (max trees in 5x5)
    return treeCount;
}

function countNearbyTrees(x, y, radius = 3) {
    let count = 0;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (isValidPos(nx, ny) && grid[ny][nx] === TREE) {
                count++;
            }
        }
    }
    return count;
}

function countConnectedPixels(startX, startY, material, grid) {
    // Use flood fill to count connected pixels of the same material
    const visited = new Set();
    const stack = [{ x: startX, y: startY }];
    let count = 0;

    while (stack.length > 0) {
        const { x, y } = stack.pop();
        const key = `${x},${y}`;

        if (visited.has(key) || !isValidPos(x, y) || grid[y][x] !== material) {
            continue;
        }

        visited.add(key);
        count++;

        // Add adjacent cells to stack
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                stack.push({ x: x + dx, y: y + dy });
            }
        }

        // Limit flood fill to prevent performance issues
        if (count > 50) break;
    }

    return count;
}

// ───────────────────────────────────────────────────────────────
// Tree Lifecycle Management
// ───────────────────────────────────────────────────────────────

function updateTreeDecomposition() {
    // Process decomposition every frame
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (grid[y][x] === DEAD_TREE && treeDecompositionGrid[y][x] > 0) {
                treeDecompositionGrid[y][x]--;

                // Convert to dirt when decomposition is complete
                if (treeDecompositionGrid[y][x] <= 0) {
                    grid[y][x] = DIRT;
                }
            }
        }
    }
}

function updateTreeBehavior() {
    // Rebuild tree list every 10 frames to capture new trees
    if (treeUpdateCounter % 10 === 0) {
        treesToProcess = [];

        // Find all tree positions
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (grid[y][x] === TREE) {
                    treesToProcess.push({ x, y });
                }
            }
        }

        // Shuffle the list to ensure fair distribution (no top-to-bottom bias)
        // Fisher-Yates shuffle
        for (let i = treesToProcess.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [treesToProcess[i], treesToProcess[j]] = [treesToProcess[j], treesToProcess[i]];
        }

        // Start from beginning after shuffle (all trees get fair chance)
        treeProcessIndex = 0;
    }

    // Process a batch of trees each frame (round-robin ensures all trees eventually checked)
    if (treesToProcess.length === 0) return;

    const batchSize = Math.min(treesPerFrame, treesToProcess.length);
    const endIndex = Math.min(treeProcessIndex + batchSize, treesToProcess.length);

    for (let i = treeProcessIndex; i < endIndex; i++) {
        const tree = treesToProcess[i];

        // Bounds check: skip if tree position is out of bounds (canvas was resized)
        if (!isValidPos(tree.x, tree.y)) continue;

        // Verify tree still exists at this position (it may have been removed)
        if (grid[tree.y][tree.x] !== TREE) continue;
        const waterInfo = findNearestWater(tree.x, tree.y);
        const nearbyTreeCount = countNearbyTrees(tree.x, tree.y);

        // Trees die only if isolated (1 neighbor) AND network lacks water access
        let adjacentTreeCount = 0;
        const adjacentTrees = [];

        // Count directly adjacent trees (1-pixel radius)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = tree.x + dx;
                const ny = tree.y + dy;
                if (isValidPos(nx, ny) && grid[ny][nx] === TREE) {
                    adjacentTreeCount++;
                    adjacentTrees.push({ x: nx, y: ny });
                }
            }
        }

        // Consider death if tree is isolated (0 neighbors) or end of branch (1 neighbor)
        if (adjacentTreeCount <= 1) {
            // Check if this tree or its network has water access
            let networkHasWater = false;

            // Check if this tree has water access
            if (waterInfo && waterInfo.distance <= 15) {
                networkHasWater = true;
            }

            // If has a neighbor, check if that neighbor has water access
            if (!networkHasWater && adjacentTrees.length > 0) {
                const neighbor = adjacentTrees[0];
                const neighborWater = findNearestWater(neighbor.x, neighbor.y);
                if (neighborWater && neighborWater.distance <= 15) {
                    networkHasWater = true;
                }
            }

            // Death rates: isolated trees (0 neighbors) die faster than end branches (1 neighbor)
            const deathChance = adjacentTreeCount === 0 ? 0.08 : 0.03; // 8% for isolated, 3% for end branches

            // Only die if isolated/end branch AND no water access in local network
            if (!networkHasWater && Math.random() < deathChance) {
                grid[tree.y][tree.x] = DEAD_TREE;
                treeDecompositionGrid[tree.y][tree.x] = 180;
                continue;
            }
        }

        // Determine growth behavior based on clustering
        const isClustered = nearbyTreeCount >= 3;
        const growthChance = isClustered ? 0.35 : 0.25; // Higher chance when clustered (increased from 0.12/0.08)

        // Trees grow toward water or branch when clustered
        if (waterInfo && waterInfo.distance <= 8 && Math.random() < growthChance) {
            const dx = waterInfo.x - tree.x;
            const dy = waterInfo.y - tree.y;

            // Normalize direction
            const dirX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
            const dirY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);

            const candidates = [];

            if (isClustered) {
                // When clustered, prefer branching in multiple directions
                // Add perpendicular directions to main growth
                if (dirX !== 0) {
                    candidates.push({ x: tree.x, y: tree.y - 1 }); // Up
                    candidates.push({ x: tree.x, y: tree.y + 1 }); // Down
                }
                if (dirY !== 0) {
                    candidates.push({ x: tree.x - 1, y: tree.y }); // Left
                    candidates.push({ x: tree.x + 1, y: tree.y }); // Right
                }

                // Also add diagonal branching
                candidates.push({ x: tree.x + dirX, y: tree.y - 1 });
                candidates.push({ x: tree.x + dirX, y: tree.y + 1 });
                candidates.push({ x: tree.x - dirX, y: tree.y - 1 });
                candidates.push({ x: tree.x - dirX, y: tree.y + 1 });

                // Still include main direction but with lower priority
                if (dirX !== 0) candidates.push({ x: tree.x + dirX, y: tree.y });
                if (dirY !== 0) candidates.push({ x: tree.x, y: tree.y + dirY });
            } else {
                // When not clustered, prefer growing toward water
                if (dirX !== 0) candidates.push({ x: tree.x + dirX, y: tree.y });
                if (dirY !== 0) candidates.push({ x: tree.x, y: tree.y + dirY });

                // Add adjacent empty spaces as backup
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        candidates.push({ x: tree.x + dx, y: tree.y + dy });
                    }
                }
            }

            // Shuffle candidates for randomness
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }

            // Try to grow to candidate positions
            let grownCount = 0;
            const maxGrowth = isClustered ? (Math.random() < 0.5 ? 3 : 2) : 2; // More growth when clustered (increased from 2/1 to 3/2)

            for (const candidate of candidates) {
                if (grownCount >= maxGrowth) break;

                if (isValidPos(candidate.x, candidate.y)) {
                    const targetCell = grid[candidate.y][candidate.x];

                    // Trees can grow into empty space, through dirt, or into water (aquatic growth)
                    if ((targetCell === EMPTY || targetCell === DIRT || targetCell === WATER) && targetCell !== GLASS) {
                        // Check if this position isn't too crowded
                        const nearbyAtCandidate = countNearbyTrees(candidate.x, candidate.y, 2);
                        if (nearbyAtCandidate < 8) { // Prevent overcrowding (reduced from 6 to allow denser growth)
                            // Only check for glass adjacency, not tree adjacency
                            let hasAdjacentGlass = false;
                            for (let checkDy = -1; checkDy <= 1; checkDy++) {
                                for (let checkDx = -1; checkDx <= 1; checkDx++) {
                                    const adjX = candidate.x + checkDx;
                                    const adjY = candidate.y + checkDy;
                                    if (isValidPos(adjX, adjY) && grid[adjY][adjX] === GLASS) {
                                        hasAdjacentGlass = true;
                                        break;
                                    }
                                }
                                if (hasAdjacentGlass) break;
                            }

                            if (!hasAdjacentGlass) {
                                grid[candidate.y][candidate.x] = TREE;
                                grownCount++;

                                // Add newly grown tree to processing list immediately
                                treesToProcess.push({ x: candidate.x, y: candidate.y });
                            }

                            // If growing through dirt, increase growth chance slightly (nutrient bonus)
                            if (targetCell === DIRT && Math.random() < 0.2 && grownCount < maxGrowth) {
                                // Bonus growth chance when consuming dirt
                                continue; // Try to grow one more time
                            }
                        }
                    }
                }
            }
        }
    }

    // Advance to next batch for next frame (round-robin processing)
    treeProcessIndex = endIndex;

    // Wrap around when we reach the end of the list
    if (treeProcessIndex >= treesToProcess.length) {
        treeProcessIndex = 0;
    }
}
