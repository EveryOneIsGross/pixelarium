// ═══════════════════════════════════════════════════════════════
// STATE.JS - Global State & Constants
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Canvas & Rendering Context
// ───────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ───────────────────────────────────────────────────────────────
// Grid Configuration
// ───────────────────────────────────────────────────────────────
const CELL_SIZE = 3;

// Use visualViewport for mobile Safari compatibility
const getViewportDimensions = () => {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    return { width: vw, height: vh };
};

const { width: viewportWidth, height: viewportHeight } = getViewportDimensions();
let GRID_WIDTH = Math.floor(viewportWidth / CELL_SIZE);
let GRID_HEIGHT = Math.floor(viewportHeight / CELL_SIZE);

canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;

// ───────────────────────────────────────────────────────────────
// Material Type Constants
// ───────────────────────────────────────────────────────────────
const EMPTY = 0;
const SAND = 1;
const WATER = 2;
const FIRE = 3;
const DIRT = 4;
const TREE = 5;
const GLASS = 6;
const STEAM = 7;
const ACID = 8;
const ERASER = 9;
const DEAD_TREE = 10;
const LAVA = 11;
const INCHWORM = 12;
const INCHWORM_HEAD = 13;
const INCHWORM_BODY = 14;

// ───────────────────────────────────────────────────────────────
// Material Properties
// ───────────────────────────────────────────────────────────────
const materials = {
    [EMPTY]: { density: 0, flammable: false, liquid: false },
    [SAND]: { density: 3, flammable: false, liquid: false },
    [WATER]: { density: 2, flammable: false, liquid: true },
    [FIRE]: { density: 1, flammable: false, liquid: false, life: 60 },
    [DIRT]: { density: 4, flammable: false, liquid: false },
    [TREE]: { density: 5, flammable: true, liquid: false },
    [GLASS]: { density: 8, flammable: false, liquid: false },
    [STEAM]: { density: 0.5, flammable: false, liquid: false, life: 120 },
    [ACID]: { density: 2.5, flammable: false, liquid: true, life: 90 },
    [ERASER]: { density: 1, flammable: false, liquid: false },
    [DEAD_TREE]: { density: 5, flammable: true, liquid: false },
    [LAVA]: { density: 4, flammable: false, liquid: true },
    [INCHWORM]: { density: 1, flammable: true, liquid: false, life: 300 },
    [INCHWORM_HEAD]: { density: 1, flammable: true, liquid: false, life: 300 },
    [INCHWORM_BODY]: { density: 1, flammable: true, liquid: false, life: 300 }
};

// ───────────────────────────────────────────────────────────────
// Material Colors (RGB variants)
// ───────────────────────────────────────────────────────────────
const materialColors = {
    [EMPTY]: [[0, 0, 0, 255]],
    [SAND]: [
        [220, 184, 112, 255],
        [210, 174, 102, 255],
        [200, 164, 92, 255],
        [190, 154, 82, 255]
    ],
    [WATER]: [
        [74, 144, 226, 255],
        [64, 134, 216, 255],
        [84, 154, 236, 255],
        [54, 124, 206, 255]
    ],
    [FIRE]: [
        [255, 107, 53, 255],
        [255, 140, 0, 255],
        [255, 69, 0, 255],
        [255, 165, 0, 255]
    ],
    [DIRT]: [
        [139, 69, 19, 255],
        [160, 82, 45, 255],
        [101, 67, 33, 255],
        [120, 75, 25, 255]
    ],
    [TREE]: [
        [34, 139, 34, 255],
        [46, 125, 50, 255],
        [56, 142, 60, 255],
        [27, 94, 32, 255]
    ],
    [GLASS]: [
        [180, 220, 240, 200],
        [170, 210, 230, 200],
        [190, 230, 250, 200],
        [160, 200, 220, 200]
    ],
    [STEAM]: [
        [240, 240, 240, 150],
        [230, 230, 230, 140],
        [250, 250, 250, 160],
        [220, 220, 220, 130]
    ],
    [ACID]: [
        [50, 255, 50, 255],
        [40, 245, 40, 255],
        [60, 255, 60, 255],
        [30, 235, 30, 255]
    ],
    [ERASER]: [
        [255, 100, 255, 255],
        [245, 90, 245, 255],
        [255, 110, 255, 255],
        [235, 80, 235, 255]
    ],
    [DEAD_TREE]: [
        [101, 67, 33, 255],
        [120, 75, 25, 255],
        [90, 60, 30, 255],
        [110, 70, 35, 255]
    ],
    [LAVA]: [
        [255, 69, 0, 255],
        [255, 140, 0, 255],
        [255, 99, 71, 255],
        [220, 20, 60, 255]
    ],
    [INCHWORM]: [
        [255, 182, 193, 255], // Light pink
        [255, 105, 180, 255], // Hot pink
        [255, 20, 147, 255],  // Deep pink
        [255, 192, 203, 255]  // Pink
    ],
    [INCHWORM_HEAD]: [
        [199, 21, 133, 255],  // Medium violet red (darker pink for head)
        [219, 112, 147, 255], // Pale violet red
        [208, 32, 144, 255],  // Violet red
        [186, 85, 211, 255]   // Medium orchid
    ],
    [INCHWORM_BODY]: [
        [255, 20, 147, 255],  // Deep pink (bright pink for body)
        [255, 105, 180, 255], // Hot pink
        [255, 182, 193, 255], // Light pink
        [255, 160, 122, 255]  // Light salmon pink
    ]
};

// Material palette for image processing
const materialPalette = {
    [SAND]: [220, 184, 112],
    [WATER]: [74, 144, 226],
    [FIRE]: [255, 107, 53],
    [DIRT]: [139, 69, 19],
    [TREE]: [34, 139, 34],
    [GLASS]: [180, 220, 240],
    [STEAM]: [240, 240, 240],
    [ACID]: [50, 255, 50],
    [LAVA]: [255, 69, 0]
};

// ───────────────────────────────────────────────────────────────
// User Input State
// ───────────────────────────────────────────────────────────────
let selectedMaterial = SAND;
let brushSize = 3;
let isMouseDown = false;
let mouseX = 0;
let mouseY = 0;
let isPaused = false;
let soundEnabled = true;

// ───────────────────────────────────────────────────────────────
// Grid State Management
// ───────────────────────────────────────────────────────────────
let currentGridSet = 'A'; // Toggle between A and B grid sets
let colorCache; // Cache for consistent material colors per position
let treeDecompositionGrid; // Managed in cells.js but declared here for global access

// Note: Grid variables (grid, gridA, gridB, fireLifeGrid, etc.) are declared and initialized in cells.js

// ───────────────────────────────────────────────────────────────
// Game Object State
// ───────────────────────────────────────────────────────────────
let wormList = []; // Track all 3-pixel worms
let nextWormId = 1;
let treeGrowthQueue = []; // Queue for tree growth patterns
let treeUpdateCounter = 0; // Counter for tree updates
let generators = []; // Array to store generator positions and materials

// Tree processing queue for amortized updates
let treesToProcess = []; // Cached list of tree positions
let treeProcessIndex = 0; // Current processing position in the queue
let treesPerFrame = 50; // Process this many trees per frame

// Worm processing queue for amortized updates
let wormsToProcess = []; // Cached list of worm objects
let wormProcessIndex = 0; // Current processing position in the queue
let wormsPerFrame = 10; // Process this many worms per frame

// Time-based worm update tracking (frame-rate independent)
let wormAccumulatedTime = 0; // Accumulated time in ms
let wormBreedingAccumulatedTime = 0; // Accumulated time for breeding checks
const WORM_UPDATE_INTERVAL = 100; // Update worms every 100ms (10 times per second)
const WORM_BREEDING_CHECK_INTERVAL = 500; // Check breeding every 500ms (twice per second)

// ───────────────────────────────────────────────────────────────
// Image Loading UI State
// ───────────────────────────────────────────────────────────────
const loadingIcons = ['↺', '↻', '↷', '↶'];
let loadingIconIndex = 0;
let loadingInterval = null;
