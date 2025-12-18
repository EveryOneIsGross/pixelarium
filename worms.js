// ============================================================================
// WORMS.JS - All worm-related functions extracted from game_logic.js
// ============================================================================

// SPAWNING AND BREEDING FUNCTIONS
// ============================================================================

function spawnSingleWorm(centerX, centerY) {
    // Find empty spaces around the click position for a single worm
    const spawnCandidates = [];

    // Check 5x5 area around click position
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            const x = centerX + dx;
            const y = centerY + dy;

            if (isValidPos(x, y) && grid[y][x] === EMPTY) {
                // Check if this position has surface contact
                if (hasValidSurface(x, y)) {
                    spawnCandidates.push({ x, y });
                }
            }
        }
    }

    // Spawn worm if enough empty spaces with surface contact
    if (spawnCandidates.length >= 3) {
        spawnThreePixelWorm(spawnCandidates, grid, inchwormLifeGrid);
    }
}

function spawnThreePixelWormWithMemory(spawnCandidates, grid, lifeGrid, parent1, parent2) {
    // Shuffle candidates to pick random positions
    const shuffled = [...spawnCandidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Try to find 3 connected positions
    for (let i = 0; i < shuffled.length - 2; i++) {
        const head = shuffled[i];

        // Find positions adjacent to head for body
        const bodyOptions = shuffled.filter(pos =>
            Math.abs(pos.x - head.x) <= 1 && Math.abs(pos.y - head.y) <= 1 &&
            !(pos.x === head.x && pos.y === head.y)
        );

        if (bodyOptions.length > 0) {
            const body = bodyOptions[0];

            // Find positions adjacent to body for tail
            const tailOptions = shuffled.filter(pos =>
                Math.abs(pos.x - body.x) <= 1 && Math.abs(pos.y - body.y) <= 1 &&
                !(pos.x === head.x && pos.y === head.y) &&
                !(pos.x === body.x && pos.y === body.y)
            );

            if (tailOptions.length > 0) {
                const tail = tailOptions[0];

                // Create the worm with inherited memory
                const wormId = nextWormId++;
                const defaultColors = {
                    tail: materialColors[INCHWORM].map(c => [...c]),
                    head: materialColors[INCHWORM_HEAD].map(c => [...c]),
                    body: materialColors[INCHWORM_BODY].map(c => [...c])
                };
                const worm = {
                    id: wormId,
                    head: { x: head.x, y: head.y },
                    body: { x: body.x, y: body.y },
                    tail: { x: tail.x, y: tail.y },
                    life: materials[INCHWORM].life,
                    onFire: false, // Fire status that persists until extinguished
                    direction: { x: 0, y: 0 },
                    memory: inheritMemory(parent1, parent2),
                    currentGoal: null,
                    blockedCounter: 0,
                    colors: defaultColors,
                    wasOnWater: false,
                    underHead: EMPTY
                };

                wormList.push(worm);
                attachAudioVoice(worm);

                // Place worm pixels
                grid[head.y][head.x] = INCHWORM_HEAD;
                grid[body.y][body.x] = INCHWORM_BODY;
                grid[tail.y][tail.x] = INCHWORM;

                lifeGrid[head.y][head.x] = worm.life;
                lifeGrid[body.y][body.x] = worm.life;
                lifeGrid[tail.y][tail.x] = worm.life;

                break;
            }
        }
    }
}

function spawnThreePixelWorm(spawnCandidates, grid, lifeGrid) {
    // Shuffle candidates to pick random positions
    const shuffled = [...spawnCandidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Try to find 3 connected positions
    for (let i = 0; i < shuffled.length - 2; i++) {
        const head = shuffled[i];

        // Find positions adjacent to head for body
        const bodyOptions = shuffled.filter(pos =>
            Math.abs(pos.x - head.x) <= 1 && Math.abs(pos.y - head.y) <= 1 &&
            !(pos.x === head.x && pos.y === head.y)
        );

        if (bodyOptions.length > 0) {
            const body = bodyOptions[0];

            // Find positions adjacent to body for tail
            const tailOptions = shuffled.filter(pos =>
                Math.abs(pos.x - body.x) <= 1 && Math.abs(pos.y - body.y) <= 1 &&
                !(pos.x === head.x && pos.y === head.y) &&
                !(pos.x === body.x && pos.y === body.y)
            );

            if (tailOptions.length > 0) {
                const tail = tailOptions[0];

                // Create the worm with unique default colors (deep clone)
                const wormId = nextWormId++;
                const defaultColors = {
                    tail: materialColors[INCHWORM].map(c => [...c]),          // deep-clone
                    head: materialColors[INCHWORM_HEAD].map(c => [...c]),
                    body: materialColors[INCHWORM_BODY].map(c => [...c])
                };
                // Founders start with base colors - inheritance happens in breeding

                const worm = {
                    id: wormId,
                    head: { x: head.x, y: head.y },
                    body: { x: body.x, y: body.y },
                    tail: { x: tail.x, y: tail.y },
                    life: materials[INCHWORM].life,
                    onFire: false, // Fire status that persists until extinguished
                    memory: [], // Array of movement memories: {position: {x, y}, movement: {dx, dy}, weight}
                    currentGoal: null, // Current movement intention: {dx, dy}
                    lastHeadPosition: null, // For stuck detection
                    colors: defaultColors, // Individual genetic colors
                    wasOnWater: false,
                    underHead: EMPTY
                };

                wormList.push(worm);
                attachAudioVoice(worm);

                // Place worm pixels
                grid[head.y][head.x] = INCHWORM_HEAD;
                grid[body.y][body.x] = INCHWORM_BODY;
                grid[tail.y][tail.x] = INCHWORM;

                // Clear color cache for new worm colors to show
                clearColorCache(head.x, head.y);
                clearColorCache(body.x, body.y);
                clearColorCache(tail.x, tail.y);

                lifeGrid[head.y][head.x] = worm.life;
                lifeGrid[body.y][body.x] = worm.life;
                lifeGrid[tail.y][tail.x] = worm.life;

                break;
            }
        }
    }
}

function spawnOffspringWithInheritedMemory(spawnCandidates, grid, lifeGrid, parent1, parent2) {
    // First spawn the worm using the existing logic
    const shuffled = [...spawnCandidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Try to find 3 connected positions
    for (let i = 0; i < shuffled.length - 2; i++) {
        const head = shuffled[i];

        const bodyOptions = shuffled.filter(pos =>
            Math.abs(pos.x - head.x) <= 1 && Math.abs(pos.y - head.y) <= 1 &&
            !(pos.x === head.x && pos.y === head.y)
        );

        if (bodyOptions.length > 0) {
            const body = bodyOptions[0];

            const tailOptions = shuffled.filter(pos =>
                Math.abs(pos.x - body.x) <= 1 && Math.abs(pos.y - body.y) <= 1 &&
                !(pos.x === head.x && pos.y === head.y) &&
                !(pos.x === body.x && pos.y === body.y)
            );

            if (tailOptions.length > 0) {
                const tail = tailOptions[0];

                // Create the offspring worm with genetic color inheritance
                const wormId = nextWormId++;

                // First inherit memory from parents
                const inheritedMemory = inheritMemoryFromParents(parent1, parent2);

                // Then calculate genetics and colors based on memory inheritance
                const genetics = calculateColorGenetics(parent1, parent2);
                const offspringColors = generateOffspringColors(parent1, parent2, genetics, inheritedMemory);

                const offspring = {
                    id: wormId,
                    head: { x: head.x, y: head.y },
                    body: { x: body.x, y: body.y },
                    tail: { x: tail.x, y: tail.y },
                    life: materials[INCHWORM].life,
                    onFire: false, // Fire status that persists until extinguished
                    memory: inheritedMemory, // Inherited memory from parents
                    currentGoal: null,
                    lastHeadPosition: null,
                    colors: offspringColors, // Individual genetic colors based on memory
                    wasOnWater: false,
                    underHead: EMPTY
                };

                wormList.push(offspring);
                attachAudioVoice(offspring);

                // Place worm pixels
                grid[head.y][head.x] = INCHWORM_HEAD;
                grid[body.y][body.x] = INCHWORM_BODY;
                grid[tail.y][tail.x] = INCHWORM;

                // Clear color cache for genetic colors to show
                clearColorCache(head.x, head.y);
                clearColorCache(body.x, body.y);
                clearColorCache(tail.x, tail.y);

                lifeGrid[head.y][head.x] = offspring.life;
                lifeGrid[body.y][body.x] = offspring.life;
                lifeGrid[tail.y][tail.x] = offspring.life;

                break;
            }
        }
    }
}

// GENETIC AND MEMORY FUNCTIONS
// ============================================================================

function calculateColorGenetics(parent1, parent2) {
    // Calculate color inheritance based on memory pattern differences
    const p1MemorySum = parent1.memory.reduce((sum, mem) => sum + mem.weight, 0);
    const p2MemorySum = parent2.memory.reduce((sum, mem) => sum + mem.weight, 0);

    // Calculate memory diversity (how varied their experiences are)
    const p1Diversity = parent1.memory.length > 0 ?
        Math.abs(Math.max(...parent1.memory.map(m => m.weight)) - Math.min(...parent1.memory.map(m => m.weight))) : 0;
    const p2Diversity = parent2.memory.length > 0 ?
        Math.abs(Math.max(...parent2.memory.map(m => m.weight)) - Math.min(...parent2.memory.map(m => m.weight))) : 0;

    // Color inheritance ratios based on memory strength and diversity
    const totalMemory = Math.abs(p1MemorySum) + Math.abs(p2MemorySum) + 1;
    const p1Influence = Math.abs(p1MemorySum) / totalMemory;
    const p2Influence = Math.abs(p2MemorySum) / totalMemory;

    // Mutation chance based on memory diversity difference
    const diversityDiff = Math.abs(p1Diversity - p2Diversity);
    const mutationChance = Math.min(0.3, diversityDiff * 0.05); // Max 30% mutation chance

    return {
        parent1Influence: p1Influence,
        parent2Influence: p2Influence,
        mutationChance: mutationChance
    };
}

function generateOffspringColors(parent1, parent2, genetics, inheritedMemory) {
    // Generate unique colors for offspring based on genetic mixing and memory inheritance
    // Start from parent colors if available, not global material colors
    const baseColors = {
        tail: parent1.colors ? parent1.colors.tail : materialColors[INCHWORM],
        head: parent1.colors ? parent1.colors.head : materialColors[INCHWORM_HEAD],
        body: parent1.colors ? parent1.colors.body : materialColors[INCHWORM_BODY]
    };

    // Calculate brightness modifier based on inherited memory quality
    const memoryWeightSum = inheritedMemory.reduce((sum, mem) => sum + mem.weight, 0);
    const avgMemoryWeight = inheritedMemory.length > 0 ? memoryWeightSum / inheritedMemory.length : 0;

    // If no meaningful memories, use parent memory summary for color inheritance
    let actualAvgWeight = avgMemoryWeight;
    if (inheritedMemory.length === 0) {
        const p1Sum = parent1.memory.reduce((sum, mem) => sum + mem.weight, 0);
        const p2Sum = parent2.memory.reduce((sum, mem) => sum + mem.weight, 0);
        const totalParentMemories = parent1.memory.length + parent2.memory.length;
        actualAvgWeight = totalParentMemories > 0 ? (p1Sum + p2Sum) / totalParentMemories : 0;
    }

    // Calculate hue bias based on food vs breeding success
    const foodPos = inheritedMemory.filter(m => m.kind === 'food' && m.weight > 0)
                                    .reduce((s, m) => s + m.weight, 0);
    const breedPos = inheritedMemory.filter(m => m.kind === 'breed' && m.weight > 0)
                                    .reduce((s, m) => s + m.weight, 0);
    const totalPos = foodPos + breedPos + 1e-6; // avoid division by zero
    const hueBias = (foodPos - breedPos) / totalPos; // +1 => all food, -1 => all breeding

    // Brightness adjustment: positive memories = lighter, negative = darker
    // Increased sensitivity for more visible inheritance
    let brightnessModifier = actualAvgWeight * 0.4; // Increased from 0.15 to 0.4

    // Force visible brightness shifts for inheritance
    if (Math.abs(brightnessModifier) < 0.15) {
        brightnessModifier = 0.15 * Math.sign(brightnessModifier || (Math.random()<0.5?1:-1));
    }

    // Cap at reasonable limits
    brightnessModifier = Math.max(-0.6, Math.min(0.6, brightnessModifier));

    // Define hue tint palettes
    const foodTint = [255, 195, 145];   // warmer, peachy-pink
    const breedTint = [200, 120, 255];  // cooler, lilac-pink
    const neutralTint = [255, 182, 193]; // standard light pink

    // Blend tints based on hue bias
    const blendTints = (tint1, tint2, bias) => {
        const absB = Math.abs(bias);
        return bias >= 0
            ? tint1.map((v, i) => Math.round(v * absB + tint2[i] * (1 - absB)))
            : tint2.map((v, i) => Math.round(v * absB + tint1[i] * (1 - absB)));
    };

    const baseTint = blendTints(foodTint, breedTint, hueBias);

    const offspringColors = {
        tail: [],
        head: [],
        body: []
    };

    // For each body part, create color variants by blending parents
    for (const [part, baseColorArray] of Object.entries(baseColors)) {
        for (let i = 0; i < 4; i++) {
            const p1Color = (parent1.colors ?? baseColors)[part][i];
            const p2Color = (parent2.colors ?? baseColors)[part][i];

            let color = [0, 0, 0, 255];
            // Blend parent colors based on memory influence
            for (let c = 0; c < 3; c++) { // RGB channels
                color[c] = Math.round(
                    p1Color[c] * genetics.parent1Influence +
                    p2Color[c] * genetics.parent2Influence
                );
            }

            // Apply hue tint based on food vs breeding bias
            for (let c = 0; c < 3; c++) {
                color[c] = Math.round(color[c] * 0.7 + baseTint[c] * 0.3); // 30% tint influence
            }

            // Apply brightness adjustment based on inherited memory patterns
            for (let c = 0; c < 3; c++) { // RGB channels
                if (brightnessModifier >= 0) {
                    // Lighten: move toward white (255)
                    color[c] = Math.round(color[c] + (255 - color[c]) * brightnessModifier);
                } else {
                    // Darken: move toward black (0)
                    color[c] = Math.round(color[c] * (1 + brightnessModifier));
                }
                color[c] = Math.max(0, Math.min(255, color[c]));
            }

            // Apply mutations based on memory diversity (smaller now that we have brightness)
            if (Math.random() < genetics.mutationChance) {
                // Mutate each RGB channel slightly
                for (let c = 0; c < 3; c++) {
                    const mutation = (Math.random() - 0.5) * 40; // ±20 per channel (reduced)
                    color[c] = Math.max(0, Math.min(255, color[c] + mutation));
                }
            }

            offspringColors[part].push(color);
        }
    }

    return offspringColors;
}

function inheritMemory(parent1, parent2) {
    // Combine memories from both parents
    const combinedMemory = [];

    // Take some memories from each parent
    const parent1Memories = parent1.memory.slice(-10); // Last 10 memories from parent1
    const parent2Memories = parent2.memory.slice(-10); // Last 10 memories from parent2

    // Interleave memories from both parents
    const maxLength = Math.max(parent1Memories.length, parent2Memories.length);
    for (let i = 0; i < maxLength; i++) {
        if (i < parent1Memories.length) {
            combinedMemory.push({ ...parent1Memories[i] });
        }
        if (i < parent2Memories.length && combinedMemory.length < 15) {
            combinedMemory.push({ ...parent2Memories[i] });
        }
    }

    // Add some mutation - randomly modify some inherited memories
    for (let memory of combinedMemory) {
        if (Math.random() < 0.1) { // 10% chance to mutate
            // Slightly modify the movement direction
            if (Math.random() < 0.5) {
                memory.movement.dx += Math.random() < 0.5 ? -1 : 1;
                memory.movement.dx = Math.max(-1, Math.min(1, memory.movement.dx));
            }
            if (Math.random() < 0.5) {
                memory.movement.dy += Math.random() < 0.5 ? -1 : 1;
                memory.movement.dy = Math.max(-1, Math.min(1, memory.movement.dy));
            }
        }
    }

    return combinedMemory;
}

function inheritMemoryFromParents(parent1, parent2) {
    // Get recent memories from each parent (both positive and negative for color inheritance)
    const parent1Recent = parent1.memory
        .slice(-10) // Last 10 memories
        .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)) // Sort by memory strength
        .slice(0, 8); // Top 8 strongest memories

    const parent2Recent = parent2.memory
        .slice(-10) // Last 10 memories
        .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)) // Sort by memory strength
        .slice(0, 8); // Top 8 strongest memories

    // Interleave memories from both parents
    const inheritedMemory = [];
    const maxLength = Math.max(parent1Recent.length, parent2Recent.length);

    for (let i = 0; i < maxLength && inheritedMemory.length < 16; i++) {
        if (i < parent1Recent.length) {
            inheritedMemory.push(mutateMemory(parent1Recent[i]));
        }
        if (i < parent2Recent.length && inheritedMemory.length < 16) {
            inheritedMemory.push(mutateMemory(parent2Recent[i]));
        }
    }

    return inheritedMemory;
}

function mutateMemory(memory) {
    // Create a slightly mutated copy of the memory
    const mutated = {
        relativeElevation: memory.relativeElevation,
        localTreeDensity: memory.localTreeDensity,
        localPixelClass: memory.localPixelClass,
        movement: { dx: memory.movement.dx, dy: memory.movement.dy },
        weight: memory.weight,
        key: memory.key,
        kind: memory.kind
    };

    // 20% chance to mutate weight slightly
    if (Math.random() < 0.2) {
        const mutation = Math.random() < 0.5 ? -1 : 1;
        mutated.weight = Math.max(-5, Math.min(5, mutated.weight + mutation));
        // Update key if weight changed significantly
        mutated.key = `${mutated.relativeElevation},${mutated.localTreeDensity},${mutated.localPixelClass},${mutated.movement.dx},${mutated.movement.dy}`;
    }

    return mutated;
}

// BREEDING AND LIFECYCLE FUNCTIONS
// ============================================================================

function checkWormBreeding() {
    // Check every worm against every other worm for breeding opportunities
    for (let i = 0; i < wormList.length; i++) {
        for (let j = i + 1; j < wormList.length; j++) {
            const worm1 = wormList[i];
            const worm2 = wormList[j];

            // Check if worms are close enough to breed (any part within 2 pixels)
            if (areWormsClose(worm1, worm2)) {
                // Skip breeding if either worm is submerged.
                if (isWormSubmerged(worm1) || isWormSubmerged(worm2)) {
                    continue; // go check next pair
                }

                // Breeding conditions: both worms must be mature (lived at least 25 frames)
                const worm1Age = materials[INCHWORM].life - worm1.life;
                const worm2Age = materials[INCHWORM].life - worm2.life;

                // Simple breeding chance - just based on proximity and age
                let breedingChance = 0.08; // Base 8% chance

                if (worm1Age >= 25 && worm2Age >= 25 && Math.random() < breedingChance) {
                    // Attempt to breed
                    attemptWormBreeding(worm1, worm2);
                }
            }
        }
    }
}

function areWormsClose(worm1, worm2) {
    // Check if any part of worm1 is within 2 pixels of any part of worm2
    const worm1Parts = [worm1.head, worm1.body, worm1.tail];
    const worm2Parts = [worm2.head, worm2.body, worm2.tail];

    for (const part1 of worm1Parts) {
        for (const part2 of worm2Parts) {
            const distance = Math.abs(part1.x - part2.x) + Math.abs(part1.y - part2.y);
            if (distance <= 2) {
                return true;
            }
        }
    }
    return false;
}

function attemptWormBreeding(worm1, worm2) {
    // Find breeding area - look for empty spaces near both worms
    const breedingCandidates = [];

    // Check area around both worms for empty spaces with surface contact
    const checkAreas = [
        [worm1.head, worm1.body, worm1.tail],
        [worm2.head, worm2.body, worm2.tail]
    ];

    for (const wormParts of checkAreas) {
        for (const part of wormParts) {
            // Check 3x3 area around each worm part
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const x = part.x + dx;
                    const y = part.y + dy;

                    if (isValidPos(x, y) && grid[y][x] === EMPTY) {
                        if (hasValidSurface(x, y) && !isCellWaterlogged(x, y)) {
                            breedingCandidates.push({ x, y });
                        }
                    }
                }
            }
        }
    }

    // Remove duplicates
    const uniqueCandidates = breedingCandidates.filter((candidate, index, arr) =>
        arr.findIndex(c => c.x === candidate.x && c.y === candidate.y) === index
    );

    // Spawn new worm if enough space
    if (uniqueCandidates.length >= 3) {
        spawnOffspringWithInheritedMemory(uniqueCandidates, grid, inchwormLifeGrid, worm1, worm2);

        // Play mating sounds for both parents
        playWormEvent(worm1, 'mating');
        playWormEvent(worm2, 'mating');

        // Record breeding success in memory (reward recent moves that led to breeding)
        recordBreedingSuccess(worm1);
        recordBreedingSuccess(worm2);

        // Reduce life of parent worms (breeding cost)
        worm1.life -= 15;
        worm2.life -= 15;
    } else {
        // Record breeding failure (not enough space)
        recordBreedingFailure(worm1);
        recordBreedingFailure(worm2);
    }
}

function recordBreedingSuccess(worm) {
    // Reward recent movements that led to successful breeding
    const recentMoves = worm.memory.slice(-3); // Last 3 moves led to breeding
    for (const memory of recentMoves) {
        memory.weight += 2; // Breeding success bonus
        memory.weight = Math.min(5, memory.weight); // Cap at 5
    }
}

function recordBreedingFailure(worm) {
    // Penalize recent movements that led to failed breeding attempt
    const recentMoves = worm.memory.slice(-2); // Last 2 moves led to failed breeding
    for (const memory of recentMoves) {
        memory.weight -= 1; // Breeding failure penalty
        memory.weight = Math.max(-5, memory.weight); // Cap at -5
    }
}

function isWormSubmerged(worm, waterThreshold = 6) {
    // Count WATER vs AIR (EMPTY) neighbours around all three segments.
    let waterContacts = 0;
    let airContacts   = 0;

    const parts = [worm.head, worm.body, worm.tail];
    for (const p of parts) {
        for (let dy=-1; dy<=1; dy++) {
            for (let dx=-1; dx<=1; dx++) {
                if (dx===0 && dy===0) continue;
                const nx = p.x + dx, ny = p.y + dy;
                if (!isValidPos(nx,ny)) continue;
                const c = grid[ny][nx];
                if (c === WATER) waterContacts++;
                else if (c === EMPTY || c === STEAM) airContacts++;
            }
        }
    }
    // submerged if lots of water *and* almost no air
    return waterContacts >= waterThreshold && airContacts < 3;
}

function isCellWaterlogged(x,y,limit=5){
    let w=0;
    for (let dy=-1; dy<=1; dy++){
        for (let dx=-1; dx<=1; dx++){
            if (dx===0 && dy===0) continue;
            const nx=x+dx, ny=y+dy;
            if (!isValidPos(nx,ny)) continue;
            if (grid[ny][nx] === WATER) w++;
        }
    }
    return w >= limit;
}

// MAIN UPDATE AND MOVEMENT FUNCTIONS
// ============================================================================

function updateWorms(deltaTime = 16.67) {
    // Early exit if no worms
    if (wormList.length === 0) {
        wormProcessIndex = 0;
        return;
    }

    // Accumulate time for breeding checks (frame-rate independent)
    wormBreedingAccumulatedTime += deltaTime;
    if (wormBreedingAccumulatedTime >= WORM_BREEDING_CHECK_INTERVAL) {
        checkWormBreeding();
        wormBreedingAccumulatedTime = 0; // Reset after breeding check
    }

    // Accumulate time for worm updates (frame-rate independent)
    wormAccumulatedTime += deltaTime;

    // Only process worm updates when enough time has accumulated
    if (wormAccumulatedTime < WORM_UPDATE_INTERVAL) {
        return; // Skip this frame, not enough time has passed
    }

    // Calculate how many update cycles have accumulated
    const updateCycles = Math.floor(wormAccumulatedTime / WORM_UPDATE_INTERVAL);
    wormAccumulatedTime -= updateCycles * WORM_UPDATE_INTERVAL; // Keep remainder

    // Process all worms for each accumulated update cycle
    for (let cycle = 0; cycle < updateCycles; cycle++) {
        // Process each worm once per cycle
        for (let i = wormList.length - 1; i >= 0; i--) {
            const worm = wormList[i];

            // Age the worm (now happens at fixed rate regardless of framerate)
            worm.life--;

            // Apply damage from dangerous materials
            applyEnvironmentalDamage(worm);

            if (worm.life <= 0) {
                // Remove dead worm
                removeWorm(worm);
                wormList.splice(i, 1);
                continue;
            }

            // Check if worm died (in water/lava or eaten)
            if (!isWormAlive(worm)) {
                removeWorm(worm);
                wormList.splice(i, 1);
                continue;
            }

            // Move the worm (now happens at fixed rate)
            moveWorm(worm);
        }
    }
}

function applyEnvironmentalDamage(worm) {
    // Check all body parts for dangerous materials nearby
    const bodyParts = [
        { x: worm.head.x, y: worm.head.y },
        { x: worm.body.x, y: worm.body.y },
        { x: worm.tail.x, y: worm.tail.y }
    ];

    let touchingFire = false;
    let touchingLava = false;
    let touchingAcid = false;
    let touchingWater = false;

    // Check adjacent cells for dangerous materials
    for (const part of bodyParts) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const checkX = part.x + dx;
                const checkY = part.y + dy;

                if (isValidPos(checkX, checkY)) {
                    const cell = grid[checkY][checkX];

                    if (cell === FIRE) touchingFire = true;
                    if (cell === LAVA) touchingLava = true;
                    if (cell === ACID) touchingAcid = true;
                    if (cell === WATER) touchingWater = true;
                }
            }
        }
    }

    // Apply fire ignition: worms touching fire or lava get set on fire
    if (touchingFire || touchingLava) {
        worm.onFire = true;
    }

    // Extinguish fire: worms touching water are no longer on fire
    if (touchingWater && worm.onFire) {
        worm.onFire = false;
    }

    // Apply damage
    if (touchingAcid) {
        worm.life -= 3; // Acid deals 3 damage per update
    }

    if (touchingFire) {
        worm.life -= 5; // Fire deals 5 damage per update when directly touching
    }

    if (touchingLava) {
        worm.life -= 10; // Lava deals heavy damage (10 per update)
    }

    if (worm.onFire) {
        worm.life -= 2; // Being on fire deals 2 damage per update (persistent)
    }
}

function isWormAlive(worm) {
    // Check if all parts of the worm still exist and aren't in deadly materials
    const headCell = grid[worm.head.y] && grid[worm.head.y][worm.head.x];
    const bodyCell = grid[worm.body.y] && grid[worm.body.y][worm.body.x];
    const tailCell = grid[worm.tail.y] && grid[worm.tail.y][worm.tail.x];

    return headCell === INCHWORM_HEAD &&
            bodyCell === INCHWORM_BODY &&
            tailCell === INCHWORM;
}

function removeWorm(worm) {
    // Convert dead worm pixels to acid
    if (isValidPos(worm.head.x, worm.head.y) && grid[worm.head.y][worm.head.x] === INCHWORM_HEAD) {
        grid[worm.head.y][worm.head.x] = ACID;
        acidLifeGrid[worm.head.y][worm.head.x] = materials[ACID].life;
        inchwormLifeGrid[worm.head.y][worm.head.x] = 0;
    }
    if (isValidPos(worm.body.x, worm.body.y) && grid[worm.body.y][worm.body.x] === INCHWORM_BODY) {
        grid[worm.body.y][worm.body.x] = ACID;
        acidLifeGrid[worm.body.y][worm.body.x] = materials[ACID].life;
        inchwormLifeGrid[worm.body.y][worm.body.x] = 0;
    }
    if (isValidPos(worm.tail.x, worm.tail.y) && grid[worm.tail.y][worm.tail.x] === INCHWORM) {
        grid[worm.tail.y][worm.tail.x] = ACID;
        acidLifeGrid[worm.tail.y][worm.tail.x] = materials[ACID].life;
        inchwormLifeGrid[worm.tail.y][worm.tail.x] = 0;
    }

    // Play dying sound and cleanup persistent voice
    if (worm.voice) {
        playWormEvent(worm, 'dying');

        // Remove from allocated voices immediately to free up slot
        const voiceIndex = allocatedVoices.indexOf(worm);
        if (voiceIndex > -1) {
            allocatedVoices.splice(voiceIndex, 1);

            // Try to reallocate the freed voice to a silent worm
            reallocateVoiceToSilentWorm();
        }

        // Clean up persistent oscillators after envelope decay
        if (worm.voice.hasVoice) {
            const now = audioCtx.currentTime;
            const dyingDuration = 0.4; // Match dying sound duration
            const fadeBuffer = 0.05; // Small buffer for fade
            const SILENCE = 0.002; // -54 dB threshold
            const offTime = now + dyingDuration + fadeBuffer + 0.1; // After envelope silent

            // Fade out voice gain smoothly before stopping
            worm.voice.voiceGain.gain.cancelScheduledValues(now + dyingDuration);
            worm.voice.voiceGain.gain.setValueAtTime(worm.voice.voiceGain.gain.value, now + dyingDuration);
            worm.voice.voiceGain.gain.exponentialRampToValueAtTime(0.001, now + dyingDuration + fadeBuffer);

            // Schedule oscillator stops only after envelope is silent
            ['carrier1', 'carrier2', 'modulator'].forEach(name => {
                const osc = worm.voice[name];
                if (osc) osc.stop(offTime);
            });

            // Clear hasVoice flag and cleanup nodes to prevent memory leaks
            setTimeout(() => {
                if (worm.voice) {
                    // Disconnect and nullify oscillators
                    dispose(worm.voice,'carrier1','carrier2','modulator');
                    worm.voice.hasVoice = false;
                }
            }, (dyingDuration + fadeBuffer + 0.1 + 0.01) * 1000);
        }
    }
}

function moveWorm(worm) {
    // Set movement goal based on memory and environment
    if (!worm.currentGoal) {
        worm.currentGoal = generateMovementGoal(worm);
    }

    // Periodically generate new goals to prevent getting stuck in loops
    if (worm.memory.length > 0 && Math.random() < 0.05) {
        const newGoal = generateMovementGoal(worm);
        if (newGoal) {
            worm.currentGoal = newGoal;
        }
    }

    // Check if worm needs to fall (no solid support)
    // A worm is unsupported if it has no solid ground contact (not just any surface)
    let hasSolidGroundSupport = false;

    // Check for solid surfaces nearby
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const checkX = worm.head.x + dx;
            const checkY = worm.head.y + dy;

            if (isValidPos(checkX, checkY)) {
                const cell = grid[checkY][checkX];

                // Only count solid surfaces for support (not other worms)
                if (cell === SAND || cell === DIRT || cell === GLASS ||
                    cell === TREE || cell === DEAD_TREE || cell === WATER) {
                    // Skip surfaces above the worm (they don't provide support)
                    if (checkY >= worm.head.y) {
                        hasSolidGroundSupport = true;
                        break;
                    }
                }
            }
        }
        if (hasSolidGroundSupport) break;
    }

    const isUnsupported = !hasSolidGroundSupport;

    const allMoves = [];

    // If unsupported, prioritize falling moves
    if (isUnsupported) {
        // Add falling options
        const fallCandidates = [
            { x: worm.head.x, y: worm.head.y + 1 },     // Straight down
            { x: worm.head.x - 1, y: worm.head.y + 1 }, // Down-left
            { x: worm.head.x + 1, y: worm.head.y + 1 }  // Down-right
        ];

        for (const candidate of fallCandidates) {
            if (isValidPos(candidate.x, candidate.y)) {
                const targetCell = grid[candidate.y][candidate.x];
                const isOwnBodyPart = (candidate.x === worm.body.x && candidate.y === worm.body.y) ||
                                        (candidate.x === worm.tail.x && candidate.y === worm.tail.y);

                if (!isOwnBodyPart && (targetCell === EMPTY || targetCell === TREE || targetCell === WATER)) {
                    allMoves.push({
                        x: candidate.x,
                        y: candidate.y,
                        dx: candidate.x - worm.head.x,
                        dy: candidate.y - worm.head.y,
                        eatsTree: targetCell === TREE,
                        floatsOnWater: targetCell === WATER,
                        isFalling: true
                    });
                }
            }
        }
    }

    // Add regular surface-following moves
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const newX = worm.head.x + dx;
            const newY = worm.head.y + dy;

            if (isValidPos(newX, newY)) {
                const targetCell = grid[newY][newX];

                // Skip own body parts
                const isOwnBodyPart = (newX === worm.body.x && newY === worm.body.y) ||
                                        (newX === worm.tail.x && newY === worm.tail.y);

                if (!isOwnBodyPart && (targetCell === EMPTY || targetCell === TREE || targetCell === WATER ||
                                                (targetCell === DIRT && newY < worm.head.y) ||
                                                (targetCell === SAND && newY < worm.head.y))) { // Allow dirt/sand swapping for upward movement
                    // For non-falling moves, require surface contact (worms can't fly)
                    // Special case: if worm head is already at bottom, treat bottom row as having valid surface
                    const isWormAtBottom = worm.head.y === GRID_HEIGHT - 1;
                    const checkBottomAsFloor = isWormAtBottom && newY === GRID_HEIGHT - 1;

                    if (checkBottomAsFloor || hasValidSurface(newX, newY, { includeWorms: false })) {
                        // Also check that the worm itself will have support after moving
                        // A worm needs at least one solid contact point to crawl
                        let hasSolidSupport = false;

                        // Special case: bottom edge of canvas acts as floor (provides support)
                        if (newY === GRID_HEIGHT - 1) {
                            hasSolidSupport = true;
                        } else {
                            // Check for solid ground/surfaces around the new position
                            for (let sdy = -1; sdy <= 1; sdy++) {
                                for (let sdx = -1; sdx <= 1; sdx++) {
                                    if (sdx === 0 && sdy === 0) continue;

                                    const supportX = newX + sdx;
                                    const supportY = newY + sdy;

                                    if (isValidPos(supportX, supportY)) {
                                        const supportCell = grid[supportY][supportX];

                                        // Count solid surfaces only (no worms as structural support)
                                        if (supportCell === SAND || supportCell === DIRT || supportCell === GLASS ||
                                            supportCell === TREE || supportCell === DEAD_TREE || supportCell === WATER) {
                                            hasSolidSupport = true;
                                            break;
                                        }
                                    }
                                }
                                if (hasSolidSupport) break;
                            }
                        }

                        // Only allow crawling moves with proper support
                        if (hasSolidSupport) {
                            allMoves.push({
                                x: newX,
                                y: newY,
                                dx: dx,
                                dy: dy,
                                eatsTree: targetCell === TREE,
                                floatsOnWater: targetCell === WATER,
                                displacesDirt: targetCell === DIRT,
                                displacesSand: targetCell === SAND,
                                isFalling: false
                            });
                        }
                    }
                }
            }
        }
    }

    // Check if worm is in same position as last turn (stuck)
    const currentHeadPos = `${worm.head.x},${worm.head.y}`;
    const wasStuck = worm.lastHeadPosition === currentHeadPos;

    // Worms ALWAYS move when any options exist - never stop!
    if (allMoves.length > 0) {
        selectedMove = selectBestMove(worm, allMoves);

        // Force selection if no move was chosen (shouldn't happen with good logic)
        if (!selectedMove) {
            selectedMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        }
    } else {
        // No moves available - use emergency maneuvers
        handleStuckWorm(worm, wasStuck);
        return;
    }

    // Execute the selected move
    if (selectedMove) {
        executeWormMove(worm, selectedMove);
    }
}

// FOOD FINDING AND GOAL GENERATION FUNCTIONS
// ============================================================================

function findNearestFood(worm) {
    // Look for trees (food) in a 8x8 area around the worm
    const searchRadius = 8;
    let nearestFood = null;
    let minDistance = Infinity;

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            if (dx === 0 && dy === 0) continue;

            const checkX = worm.head.x + dx;
            const checkY = worm.head.y + dy;

            if (isValidPos(checkX, checkY) && grid[checkY][checkX] === TREE) {
                const distance = Math.abs(dx) + Math.abs(dy);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestFood = { dx: Math.sign(dx), dy: Math.sign(dy) };
                }
            }
        }
    }

    return nearestFood;
}

function generateMovementGoal(worm) {
    // Priority: Tree clusters → Nearest food → Exploration

    // First priority: Move toward dense tree clusters
    const treeCluster = findTreeCluster(worm);
    if (treeCluster) {
        return {
            dx: treeCluster.dx,
            dy: treeCluster.dy,
            isClusterSeeking: true,
            clusterDensity: treeCluster.density
        };
    }

    // Second priority: Move toward nearest single tree
    const foodDirection = findNearestFood(worm);
    if (foodDirection) {
        return { dx: foodDirection.dx, dy: foodDirection.dy };
    }

    // If no food nearby, create exploration goal based on memory
    if (worm.memory.length > 3) {
        const recentMoves = worm.memory.slice(-3);
        const avgDx = recentMoves.reduce((sum, m) => sum + m.movement.dx, 0) / recentMoves.length;
        const avgDy = recentMoves.reduce((sum, m) => sum + m.movement.dy, 0) / recentMoves.length;

        // Continue in similar direction
        return {
            dx: Math.sign(avgDx) || (Math.random() < 0.5 ? -1 : 1),
            dy: Math.sign(avgDy) || (Math.random() < 0.5 ? -1 : 1)
        };
    }

    // Random exploration direction
    return {
        dx: Math.random() < 0.5 ? -1 : 1,
        dy: Math.random() < 0.5 ? -1 : 1
    };
}

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

// MOVE SELECTION FUNCTIONS
// ============================================================================

function selectBestMove(worm, availableMoves) {
    // Rebalanced priority system: Tree clusters → Food → Surface contact → Falling

    if (availableMoves.length === 0) {
        return null;
    }

    // First priority: Food moves (eating is always top priority)
    const foodMoves = availableMoves.filter(move => move.eatsTree);
    if (foodMoves.length > 0) {
        return selectMemoryWeightedMove(worm, foodMoves);
    }

    // Second priority: Moves toward other worms (social attraction)
    const nearbyWorms = findNearbyWorms(worm.head.x, worm.head.y, 8);
    if (nearbyWorms.length > 0) {
        // Filter moves that go toward nearby worms
        const wormAttractionMoves = availableMoves.filter(move => {
            const movePos = { x: move.x, y: move.y };
            return nearbyWorms.some(nearby => {
                const currentDist = Math.abs(worm.head.x - nearby.part.x) + Math.abs(worm.head.y - nearby.part.y);
                const newDist = Math.abs(movePos.x - nearby.part.x) + Math.abs(movePos.y - nearby.part.y);
                return newDist < currentDist; // Move gets closer to worm
            });
        });

        if (wormAttractionMoves.length > 0) {
            return selectMemoryWeightedMove(worm, wormAttractionMoves);
        }
    }

    // Third priority: Moves toward tree clusters (but not falling)
    const nonFallingMoves = availableMoves.filter(move => !move.isFalling);
    if (nonFallingMoves.length > 0 && worm.currentGoal && worm.currentGoal.isClusterSeeking) {
        // Filter moves that go toward the cluster
        const clusterMoves = nonFallingMoves.filter(move =>
            Math.sign(move.dx) === Math.sign(worm.currentGoal.dx) ||
            Math.sign(move.dy) === Math.sign(worm.currentGoal.dy)
        );

        if (clusterMoves.length > 0) {
            return selectMemoryWeightedMove(worm, clusterMoves);
        }
    }

    // Fourth priority: Any surface-contact moves (avoid falling if possible)
    if (nonFallingMoves.length > 0) {
        return selectMemoryWeightedMove(worm, nonFallingMoves);
    }

    // Last resort: Falling moves (only when no surface contact possible)
    const fallingMoves = availableMoves.filter(move => move.isFalling);
    if (fallingMoves.length > 0) {
        return selectMemoryWeightedMove(worm, fallingMoves);
    }

    // Fallback
    return selectMemoryWeightedMove(worm, availableMoves);
}

function selectMemoryWeightedMove(worm, moves) {
    // Use memory to weight move selection, with goal influence and surface following
    if (moves.length === 0) {
        return null;
    }

    if (moves.length === 1) {
        return moves[0];
    }

    // Score moves based on memory, goals, and surface following
    const scoredMoves = moves.map(move => {
        let score = 1.0; // Base score

        // Special bias: if worm is at very bottom, strongly prefer escaping upward
        if (worm.head.y === GRID_HEIGHT - 1) {
            // Always prioritize upward moves when at bottom
            if (move.dy < 0) {
                score += 5.0; // Strong preference to climb up and escape the floor
            }
        }

        // Instant chemistry bias: prefer favorable pixel environments
        switch (sampleLocalPixelClass(move.x, move.y)) {
            case  2: score += 0.6; break; // rich in trees / dirt
            case  1: score += 0.3; break; // water present
            case -2: score -= 0.9; break; // acid / fire / lava nearby
        }

        // Surface following bonus: prefer moves that maintain contact with surfaces
        if (!move.isFalling) {
            const surfaceQuality = calculateSurfaceContactQuality(move.x, move.y, worm);
            score += surfaceQuality * 0.3; // Surface contact bonus
        }

        // Social attraction bonus: prefer moves toward nearby worms
        const nearbyWorms = findNearbyWorms(move.x, move.y, 6);
        if (nearbyWorms.length > 0) {
            // Stronger attraction to closer worms
            const attractionBonus = nearbyWorms.reduce((total, nearby) => {
                const attractionStrength = Math.max(0, 1 - (nearby.distance / 6)); // Stronger when closer
                return total + attractionStrength * 0.2; // Social attraction bonus
            }, 0);
            score += attractionBonus;
        }

        // Memory scoring: environmental context + movement matches
        if (worm.memory.length > 0) {
            const currentElevation = calculateRelativeElevation(worm.head.x, worm.head.y);
            const currentTreeDensity = calculateLocalTreeDensity(worm.head.x, worm.head.y);
            const localPixelClass = sampleLocalPixelClass(worm.head.x, worm.head.y);
            const moveKey = `${currentElevation},${currentTreeDensity},${localPixelClass},${move.dx},${move.dy}`;

            // Exact environmental context + movement match
            const exactMemory = worm.memory.find(mem => mem.key === moveKey);
            if (exactMemory) {
                score += exactMemory.weight;
            }

            // Similar environmental contexts (fuzzy matching)
            const similarContexts = worm.memory.filter(mem =>
                Math.abs(mem.relativeElevation - currentElevation) <= 1 &&
                Math.abs(mem.localTreeDensity - currentTreeDensity) <= 2 &&
                Math.abs(mem.localPixelClass - localPixelClass) <= 1 &&
                mem.movement.dx === move.dx && mem.movement.dy === move.dy
            );

            if (similarContexts.length > 0) {
                const avgWeight = similarContexts.reduce((sum, mem) => sum + mem.weight, 0) / similarContexts.length;
                score += avgWeight * 0.3; // Contextual similarity bonus
            }
        }

        // Goal alignment bonus (enhanced for cluster seeking)
        if (worm.currentGoal) {
            if (move.dx === worm.currentGoal.dx && move.dy === worm.currentGoal.dy) {
                if (worm.currentGoal.isClusterSeeking) {
                    score += 1.0; // Strong bonus for exact cluster direction
                } else {
                    score += 0.5; // Normal exact goal match
                }
            } else if (Math.sign(move.dx) === Math.sign(worm.currentGoal.dx) ||
                        Math.sign(move.dy) === Math.sign(worm.currentGoal.dy)) {
                if (worm.currentGoal.isClusterSeeking) {
                    score += 0.5; // Bonus for similar cluster direction
                } else {
                    score += 0.2; // Normal similar direction
                }
            }
        }

        // Extra bonus for moves toward tree clusters
        if (worm.currentGoal && worm.currentGoal.isClusterSeeking && !move.isFalling) {
            score += worm.currentGoal.clusterDensity || 0.3; // Density-based bonus
        }

        return { move, score };
    });

    // Ensure all scores are positive
    const minScore = Math.min(...scoredMoves.map(item => item.score));
    if (minScore <= 0) {
        scoredMoves.forEach(item => item.score += Math.abs(minScore) + 0.1);
    }

    // Weighted random selection
    const totalScore = scoredMoves.reduce((sum, item) => sum + item.score, 0);
    let random = Math.random() * totalScore;

    for (const item of scoredMoves) {
        random -= item.score;
        if (random <= 0) {
            return item.move;
        }
    }

    // Fallback
    return moves[Math.floor(Math.random() * moves.length)];
}

// MOVEMENT EXECUTION FUNCTIONS
// ============================================================================

function calculateSurfaceContactQuality(x, y, worm) {
    // Calculate how good the surface contact is at this position
    let quality = 0;
    let contactCount = 0;

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const sx = x + dx;
            const sy = y + dy;

            if (isValidPos(sx, sy)) {
                const cell = grid[sy][sx];

                // Check for solid surfaces
                if (cell === SAND || cell === DIRT || cell === GLASS ||
                    cell === TREE || cell === DEAD_TREE || cell === WATER) {
                    contactCount++;

                    // Prefer contact below and to sides (more stable)
                    if (sy >= y) quality += 1.0; // Below or same level
                    else quality += 0.5; // Above
                }

            }
        }
    }

    // Normalize quality by contact count (prefer multiple contact points)
    return contactCount > 0 ? quality / Math.max(1, contactCount) : 0;
}

function findNearbyWorms(x, y, radius = 5) {
    // Find other worms within the specified radius
    const nearbyWorms = [];

    for (const otherWorm of wormList) {
        // Check distance to all parts of the other worm
        const parts = [otherWorm.head, otherWorm.body, otherWorm.tail];
        for (const part of parts) {
            const distance = Math.abs(part.x - x) + Math.abs(part.y - y); // Manhattan distance
            if (distance <= radius) {
                nearbyWorms.push({
                    worm: otherWorm,
                    distance: distance,
                    part: part
                });
                break; // Only count each worm once
            }
        }
    }

    return nearbyWorms;
}

function executeWormMove(worm, selectedMove) {
    /* ── 0.  Play movement-triggered FM audio ──────────────────────────── */
    playWormMovement(worm, selectedMove);

    /* ── 1.  Memorise the cell we are about to step into ─────────────── */
    const nextSubstrate = grid[selectedMove.y][selectedMove.x];

    /* NEW ↓ – remember if we're about to walk into water */
    const willDisplaceWater = nextSubstrate === WATER;

    /* ── 2.  Log this movement for learning purposes ─────────────────── */
    const successType = selectedMove.eatsTree ? 'tree' : null;
    recordMovementMemory(worm, selectedMove, successType);

    /* ── 3.  Snapshot current segment positions ──────────────────────── */
    const oldTail = { ...worm.tail };
    const oldBody = { ...worm.body };
    const oldHead = { ...worm.head };

    /* ── 4.  Restore what the head had been covering ─────────────────── */
    grid[oldHead.y][oldHead.x] = worm.underHead ?? EMPTY;

    /* ── 5.  Clear the other two segments from the grid ──────────────── */
    grid[oldBody.y][oldBody.x] = EMPTY;
    grid[oldTail.y][oldTail.x] = EMPTY;
    inchwormLifeGrid[oldHead.y][oldHead.x] =
    inchwormLifeGrid[oldBody.y][oldBody.x] =
    inchwormLifeGrid[oldTail.y][oldTail.x] = 0;
    clearColorCache(oldHead.x, oldHead.y);
    clearColorCache(oldBody.x, oldBody.y);
    clearColorCache(oldTail.x, oldTail.y);

    /* ── 6.  Shift the segments ──────────────────────────────────────── */
    if (selectedMove.isFalling) {
        worm.head = selectedMove;
        worm.body = oldHead;
        worm.tail = oldBody;
    } else {
        worm.tail = oldBody;
        worm.body = oldHead;
        worm.head = selectedMove;
    }

    /* ── 7.  Special case: pushing dirt/sand upward -------------------- */
    if (grid[worm.head.y][worm.head.x] === DIRT) {
        grid[oldHead.y][oldHead.x] = DIRT;
        grid[worm.head.y][worm.head.x] = EMPTY;
    } else if (grid[worm.head.y][worm.head.x] === SAND) {
        grid[oldHead.y][oldHead.x] = SAND;
        grid[worm.head.y][worm.head.x] = EMPTY;
    }

    /* ── 8.  Stamp the worm's new pixels onto the grid ───────────────── */
    grid[worm.tail.y][worm.tail.x]  = INCHWORM;
    grid[worm.body.y][worm.body.x]  = INCHWORM_BODY;
    grid[worm.head.y][worm.head.x]  = INCHWORM_HEAD;
    clearColorCache(worm.tail.x, worm.tail.y);
    clearColorCache(worm.body.x, worm.body.y);
    clearColorCache(worm.head.x, worm.head.y);
    inchwormLifeGrid[worm.tail.y][worm.tail.x] =
    inchwormLifeGrid[worm.body.y][worm.body.x] =
    inchwormLifeGrid[worm.head.y][worm.head.x] = worm.life;

    /* NEW ↓ – put the displaced water where the tail just was */
    if (willDisplaceWater) {
        let wx = oldTail.x, wy = oldTail.y;

        if (grid[wy][wx] !== EMPTY) {
            // tail square got reused – look for a neighbouring empty one
            const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
            for (const [dx,dy] of dirs) {
                const tx = wx + dx, ty = wy + dy;
                if (isValidPos(tx,ty) && grid[ty][tx] === EMPTY) {
                    wx = tx; wy = ty; break;
                }
            }
        }
        if (grid[wy][wx] === EMPTY) {
            grid[wy][wx] = WATER;
            clearColorCache(wx, wy);
        }
    }

    /* ── 9.  Handle eating a tree pixel (energy gain) ────────────────── */
    if (selectedMove.eatsTree) {
        worm.life = Math.min(worm.life + 1, materials[INCHWORM].life * 1.2);
        playWormEvent(worm, 'eating');
    }

    /* ── 10.  House‑keeping for next turn ────────────────────────────── */
    worm.underHead = nextSubstrate;

    // Trigger material contact sound
    if (worm.voice && MATERIAL_TONE[nextSubstrate] && nextSubstrate !== worm.voice.lastMaterial) {
        playWormEvent(worm, 'material');
        worm.voice.lastMaterial = nextSubstrate;
    }

    worm.lastHeadPosition = `${worm.head.x},${worm.head.y}`;
}

function handleStuckWorm(worm, wasStuck) {
    // Simplified emergency movement for stuck worms
    if (!wasStuck) {
        // First time stuck - reverse direction by swapping head and tail
        const oldHead = { ...worm.head };
        const oldTail = { ...worm.tail };

        worm.head = oldTail;
        worm.tail = oldHead;

        // Update grid positions
        grid[worm.head.y][worm.head.x] = INCHWORM_HEAD;
        grid[worm.tail.y][worm.tail.x] = INCHWORM;
    } else {
        // Still stuck - cycle body positions as last resort
        const oldTail = { ...worm.tail };
        const oldBody = { ...worm.body };
        const oldHead = { ...worm.head };

        worm.head = oldBody;
        worm.body = oldTail;
        worm.tail = oldHead;

        // Update grid positions
        grid[worm.head.y][worm.head.x] = INCHWORM_HEAD;
        grid[worm.body.y][worm.body.x] = INCHWORM_BODY;
        grid[worm.tail.y][worm.tail.x] = INCHWORM;
    }

    worm.lastHeadPosition = `${worm.head.x},${worm.head.y}`;
}

// MEMORY AND ENVIRONMENTAL ANALYSIS FUNCTIONS
// ============================================================================

function calculateRelativeElevation(x, y) {
    // Calculate relative elevation: how many solid pixels are below vs above
    let below = 0, above = 0;

    for (let dy = 1; dy <= 3; dy++) { // Check 3 pixels below
        if (isValidPos(x, y + dy)) {
            const cell = grid[y + dy][x];
            if (cell === SAND || cell === DIRT || cell === GLASS ||
                cell === TREE || cell === DEAD_TREE) {
                below++;
            }
        }
    }

    for (let dy = 1; dy <= 3; dy++) { // Check 3 pixels above
        if (isValidPos(x, y - dy)) {
            const cell = grid[y - dy][x];
            if (cell === SAND || cell === DIRT || cell === GLASS ||
                cell === TREE || cell === DEAD_TREE) {
                above++;
            }
        }
    }

    // Return relative elevation: -3 (deep valley) to +3 (high peak)
    return below - above;
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

function sampleLocalPixelClass(x, y) {
    // Scan the Moore neighbourhood around (x,y) for chemical preference
    let score = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (!isValidPos(nx, ny)) continue;
            const c = grid[ny][nx];

            if (c === TREE || c === DIRT || c === DEAD_TREE) score += 2;
            else if (c === WATER)                                score += 1;
            else if (c === ACID || c === FIRE || c === LAVA)     score -= 4;
            // EMPTY / STEAM etc count as 0
        }
    }
    // Clamp to -4…4 so the key stays compact
    return Math.max(-4, Math.min(4, score));
}

function recordMovementMemory(worm, move, success = null) {
    // Record this movement in memory with environmental context instead of position
    let weight = 0;

    // Determine success/failure weight
    if (success === 'tree') {
        weight = 1; // Found food
    } else if (success === 'breeding') {
        weight = 2; // Successful breeding (higher reward)
    } else if (success === 'failed') {
        weight = -1; // No food found when expected, or failed to breed
    }
    // success === null means neutral move (no special outcome expected)

    // Calculate environmental features for generalizable memory
    const relativeElevation = calculateRelativeElevation(worm.head.x, worm.head.y);
    const localTreeDensity = calculateLocalTreeDensity(worm.head.x, worm.head.y);
    const localPixelClass = sampleLocalPixelClass(worm.head.x, worm.head.y);

    // Create memory key from environmental features instead of position
    const memoryKey = `${relativeElevation},${localTreeDensity},${localPixelClass},${move.dx},${move.dy}`;

    const memoryEntry = {
        relativeElevation: relativeElevation,
        localTreeDensity: localTreeDensity,
        localPixelClass: localPixelClass,
        movement: { dx: move.dx, dy: move.dy },
        weight: weight,
        key: memoryKey,
        kind: success === 'tree' ? 'food'
            : success === 'breeding' ? 'breed'
            : 'neutral'
    };

    // Check if we already have memory for this environmental context+movement combo
    const existingIndex = worm.memory.findIndex(mem => mem.key === memoryKey);

    if (existingIndex !== -1) {
        // Update existing memory weight (accumulate experience)
        worm.memory[existingIndex].weight += weight;
        // Cap weights at reasonable bounds
        worm.memory[existingIndex].weight = Math.max(-5, Math.min(5, worm.memory[existingIndex].weight));
    } else {
        // Add new memory entry
        worm.memory.push(memoryEntry);
    }

    // Limit memory size to prevent unlimited growth (keep last 32 memories)
    if (worm.memory.length > 32) {
        worm.memory.shift(); // Remove oldest memory
    }
}

function hasValidSurface(x, y, options = {}) {
    // Unified surface validation function
    // options: { includeWorms: boolean, excludeOwnBody: worm, supportOnly: boolean }
    const { includeWorms = false, excludeOwnBody = null, supportOnly = false } = options;

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const sx = x + dx;
            const sy = y + dy;

            if (isValidPos(sx, sy)) {
                const cell = grid[sy][sx];

                // Check solid surfaces
                if (cell === SAND || cell === DIRT || cell === GLASS ||
                    cell === TREE || cell === DEAD_TREE || cell === WATER) {
                    // For support checks, only count surfaces below or adjacent
                    if (supportOnly && sy < y) continue; // Skip surfaces above
                    return true;
                }

                // Check worm surfaces if requested
                if (includeWorms && (cell === INCHWORM || cell === INCHWORM_HEAD || cell === INCHWORM_BODY)) {
                    // If excluding own body, check if this is the worm's own body part
                    if (excludeOwnBody) {
                        const isOwnBodyPart = (sx === excludeOwnBody.head.x && sy === excludeOwnBody.head.y) ||
                                                (sx === excludeOwnBody.body.x && sy === excludeOwnBody.body.y) ||
                                                (sx === excludeOwnBody.tail.x && sy === excludeOwnBody.tail.y);
                        if (!isOwnBodyPart) {
                            if (supportOnly && sy < y) continue; // Skip surfaces above
                            return true;
                        }
                    } else {
                        if (supportOnly && sy < y) continue; // Skip surfaces above
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

// Note: findNearestWater is now in cells.js (shared utility function)
