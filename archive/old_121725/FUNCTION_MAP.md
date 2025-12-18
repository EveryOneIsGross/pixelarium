# Pixelarium Function & State Map

## Proposed Refactoring Structure

### 1. **state.js** - Global State & Constants

#### Core Canvas & Grid State
- `canvas` - Canvas DOM element
- `ctx` - 2D rendering context
- `CELL_SIZE` - Constant: 3
- `GRID_WIDTH` - Calculated grid width
- `GRID_HEIGHT` - Calculated grid height
- `currentGridSet` - Toggle between 'A' and 'B' grid sets
- `colorCache` - Cache for consistent material colors per position

#### Material Constants & Definitions
- `EMPTY`, `SAND`, `WATER`, `FIRE`, `DIRT`, `TREE`, `GLASS`, `STEAM`, `ACID`, `ERASER`, `DEAD_TREE`, `LAVA`, `INCHWORM`, `INCHWORM_HEAD`, `INCHWORM_BODY` - Material ID constants
- `materials` - Object mapping material IDs to names
- `materialColors` - RGB color definitions per material
- `materialPalette` - Color palette for materials

#### User Input State
- `selectedMaterial` - Currently selected material (default: SAND)
- `brushSize` - Current brush radius (default: 3)
- `isMouseDown` - Mouse button state
- `mouseX`, `mouseY` - Current mouse position
- `isPaused` - Simulation pause state
- `soundEnabled` - Audio enabled/disabled

#### Game Object State
- `wormList` - Array of all 3-pixel worms
- `nextWormId` - Auto-incrementing worm ID
- `treeGrowthQueue` - Queue for tree growth patterns
- `treeDecompositionGrid` - Grid tracking decomposing trees
- `treeUpdateCounter` - Counter for tree updates
- `generators` - Array storing generator positions and materials

#### Image Loading State
- `loadingIcons` - Array of loading animation characters
- `loadingIconIndex` - Current loading icon index
- `loadingInterval` - Loading animation interval reference

#### Functions in state.js
- `getViewportDimensions()` - Calculate viewport dimensions

---

### 2. **audio.js** - Audio System & Sound

#### Audio Context & Infrastructure
- `audioCtx` - Web Audio API context
- `master` - Master gain node
- `limiter` - Dynamics compressor/limiter
- `audioUnlocked` - Audio unlock state flag
- `needsGesture` - Gesture requirement flag

#### Water Noise System
- `noiseBuffer` - Pre-generated noise buffer
- `noiseFilter` - Biquad filter for water noise
- `waterNoiseGain` - Gain node for water noise
- `crossfade` - Crossfade gain node
- `smoothedWaterCover` - Smoothed water coverage value
- `waterNoiseStarted` - Water noise system running flag
- `currentWaterNodes` - Current water audio nodes
- `smoothedMovement` - Smoothed water movement value
- `lastWaterActivity` - Timestamp of last water activity
- `BASE_CUTOFF` - Base filter cutoff constant (1400 Hz)
- `TONE_TO_CUTOFF` - Cutoff adjustment per tone step (5 Hz)

#### Audio Cues & Material Tones
- `AUDIO_CUES` - Object defining all audio cue parameters
- `MATERIAL_TONE` - Material-specific tone frequencies

#### Worm Audio System
- `allocatedVoices` - Array of worm synth voices
- `MAX_SYNTH_VOICES` - Maximum simultaneous voices (16)
- `movementAudioCounter` - Counter for movement audio throttling

#### Functions in audio.js

##### Core Audio Setup
- `unlockAudio()` - Unlock audio context on user gesture

##### Synthesis Utilities
- `envelope({attack, decay, sustain, release}, gain)` - Create ADSR envelope
- `vibrato(osc, {freq, depth})` - Add vibrato to oscillator
- `smoothSet(param, value, t, ramp)` - Smooth parameter changes

##### Water Noise System
- `createWaterNoiseSystem()` - Initialize water noise audio chain
- `countWaterStats()` - Count water pixels and calculate density
- `calcAmbientCutoff()` - Calculate filter cutoff based on material tones
- `updateWaterNoise(falling)` - Update water noise based on simulation state
- `triggerSplashAccent(splashIntensity, waterPixels, cueName)` - Trigger water splash sounds
- `dispose(nodes, ...keys)` - Clean up audio nodes

##### Audio Cues
- `playCue(name, detuneSemis)` - Play one-shot audio cue

##### Worm Audio
- `attachAudioVoice(worm)` - Attach FM synth voice to worm
- `playWormMovement(worm, moveData)` - Update worm audio during movement
- `playWormEvent(worm, eventType)` - Play worm event sounds (eat, reproduce, death, etc.)
- `reallocateVoiceToSilentWorm()` - Reallocate silent voices to active worms

---

### 3. **cells.js** - Cell/Material Physics & Grid Operations

#### Grid Initialization
- `initializeGrids()` - Initialize all grid arrays

#### Color & Rendering Helpers
- `getRandomColor(material)` - Get random color variant for material
- `getWormColor(material, x, y)` - Get color for worm pixel
- `getPixelColor(material, x, y)` - Get color for any pixel
- `clearColorCache(x, y)` - Clear cached color at position
- `colorDistance(rgb1, rgb2)` - Calculate Euclidean color distance
- `findClosestMaterial(rgb)` - Find material ID from RGB color

#### Position & Validation
- `getGridPos(clientX, clientY)` - Convert client coords to grid position
- `isValidPos(x, y)` - Check if position is within grid bounds

#### Material Placement
- `addMaterial(x, y, material, radius)` - Add material to grid with brush
- `canPlaceTree(x, y, gridRef)` - Check if tree can be placed at position

#### Simulation Update
- `updateSimulation()` - Main simulation step (physics, interactions, materials)

#### Rendering
- `renderGrid()` - Render grid to canvas

#### Image Processing
- `ditherImage(imageData, width, height)` - Dither image to material palette
- `mapImageToCanvas(imageData, startX, startY)` - Map image pixels to grid

---

### 4. **trees.js** - Tree Growth & Decomposition

#### Tree Management
- `startTreeGrowth(x, y)` - Initialize tree growth at position
- `growFractalTree(treeNode, workingGrid)` - Recursive fractal tree growth
- `updateTreeDecomposition()` - Update decomposing dead trees
- `updateTreeBehavior()` - Update tree growth and lifecycle

#### Tree Queries
- `countNearbyTrees(x, y, radius)` - Count trees in radius
- `calculateLocalTreeDensity(x, y)` - Calculate tree density around position
- `findTreeCluster(worm)` - Find nearest tree cluster from worm position

---

### 5. **worms.js** - Worm AI, Movement & Lifecycle

#### Worm Spawning
- `spawnSingleWorm(centerX, centerY)` - Spawn single worm at position
- `spawnThreePixelWorm(spawnCandidates, grid, lifeGrid)` - Spawn 3-pixel worm
- `spawnThreePixelWormWithMemory(spawnCandidates, grid, lifeGrid, parent1, parent2)` - Spawn worm with inherited memory
- `spawnOffspringWithInheritedMemory(spawnCandidates, grid, lifeGrid, parent1, parent2)` - Spawn offspring with genetics

#### Worm Genetics & Memory
- `calculateColorGenetics(parent1, parent2)` - Calculate color inheritance
- `generateOffspringColors(parent1, parent2, genetics, inheritedMemory)` - Generate offspring colors
- `inheritMemory(parent1, parent2)` - Inherit memory from parents
- `inheritMemoryFromParents(parent1, parent2)` - Alternative memory inheritance
- `mutateMemory(memory)` - Apply mutations to memory

#### Worm Lifecycle
- `updateWorms()` - Update all worms (movement, aging, death)
- `isWormAlive(worm)` - Check if worm's pixels still exist
- `removeWorm(worm)` - Remove dead worm and convert to acid

#### Worm Movement & AI
- `moveWorm(worm)` - Main worm movement logic
- `generateMovementGoal(worm)` - Generate movement goal based on state
- `selectBestMove(worm, availableMoves)` - Select optimal move
- `selectMemoryWeightedMove(worm, moves)` - Select move weighted by memory
- `executeWormMove(worm, selectedMove)` - Execute selected move
- `handleStuckWorm(worm, wasStuck)` - Handle stuck worm behavior

#### Worm Perception & Queries
- `findNearestFood(worm)` - Find nearest food source
- `isWormSubmerged(worm, waterThreshold)` - Check if worm is in water
- `findNearbyWorms(x, y, radius)` - Find worms within radius

#### Worm Breeding
- `checkWormBreeding()` - Check for breeding opportunities
- `areWormsClose(worm1, worm2)` - Check if two worms are adjacent
- `attemptWormBreeding(worm1, worm2)` - Attempt breeding between worms
- `recordBreedingSuccess(worm)` - Update memory on successful breeding
- `recordBreedingFailure(worm)` - Update memory on failed breeding

#### Worm Memory & Learning
- `recordMovementMemory(worm, move, success)` - Record movement outcome in memory

#### Environment Queries (used by worms)
- `calculateRelativeElevation(x, y)` - Calculate elevation relative to surroundings
- `calculateSurfaceContactQuality(x, y, worm)` - Calculate surface contact score
- `hasValidSurface(x, y, options)` - Check for valid surface below position
- `isCellWaterlogged(x, y, limit)` - Check if cell has too much water
- `sampleLocalPixelClass(x, y)` - Sample material distribution around position
- `findNearestWater(x, y, maxDistance)` - Find nearest water pixel
- `countConnectedPixels(startX, startY, material, grid)` - Count connected pixels of material

---

### 6. **ui.js** - User Interface & Controls

#### Material Selection
- `selectMaterial(materialName)` - Select material for brush

#### Grid Control
- `clearGrid()` - Clear entire grid

#### Canvas Management
- `resizeCanvas()` - Resize canvas to viewport

#### Simulation Control
- `togglePause()` - Toggle simulation pause
- `toggleSound()` - Toggle sound on/off

#### Brush Controls
- `increaseBrushSize()` - Increase brush radius
- `decreaseBrushSize()` - Decrease brush radius

#### Menu Control
- `toggleMenu()` - Toggle menu visibility

#### Loading UI
- `showLoading()` - Show loading indicator
- `hideLoading()` - Hide loading indicator

---

### 7. **main.js** - Game Loop & Initialization

#### Main Loop
- `gameLoop()` - Main game loop (update & render)

#### Event Listeners & Initialization
- Mouse/touch event listeners
- Canvas resize observers
- Image paste handlers
- Audio unlock handlers

---

## Summary of Proposed File Structure

```
pixelarium/
├── pixel_live.html          # Main HTML
├── state.js                 # Global state, constants, material definitions
├── audio.js                 # Audio system, synthesis, water noise, worm voices
├── cells.js                 # Grid operations, physics, material interactions
├── trees.js                 # Tree growth, decomposition, queries
├── worms.js                 # Worm AI, movement, genetics, breeding, memory
├── ui.js                    # UI controls, input handling
└── main.js                  # Game loop, initialization, event wiring
```

---

## Notes on Refactoring

1. **Dependencies**: The modules will need to be loaded in order:
   - `state.js` first (defines all constants and state)
   - `audio.js` (depends on state)
   - `cells.js` (depends on state, audio)
   - `trees.js` (depends on state, cells)
   - `worms.js` (depends on state, audio, cells, trees)
   - `ui.js` (depends on state, cells)
   - `main.js` last (orchestrates everything)

2. **Shared State**: Many functions mutate shared arrays (`grid`, `lifeGrid`, `wormList`, etc.). You'll need to either:
   - Keep shared state in `state.js` and import/export it
   - Use a state management pattern (object/class)
   - Pass state explicitly as function parameters

3. **Audio Context**: The `audioCtx` is global and shared across many functions. Consider wrapping it in an audio manager object.

4. **Circular Dependencies**: Watch for circular imports, especially between:
   - `worms.js` ↔ `audio.js` (worms trigger sounds, sounds need worm data)
   - `cells.js` ↔ `worms.js` (worms are cells, cells spawn worms)

5. **Event Handlers**: HTML onclick handlers reference functions by name. You'll need to either:
   - Expose functions globally (`window.togglePause = togglePause`)
   - Attach listeners programmatically in `main.js`
