Worm System Documentation

  Cellular Automata States

  The worm system uses three distinct cellular automata states to represent a multi-pixel organism:

  const INCHWORM = 12;      // Tail segment (basic worm pixel)
  const INCHWORM_HEAD = 13; // Head segment (movement control)
  const INCHWORM_BODY = 14; // Body segment (middle connection)

  Worm Structure & Properties

  Each worm is a 3-pixel entity with the following data structure:

  const worm = {
      id: wormId,                    // Unique identifier
      head: { x: headX, y: headY },  // Head position (movement leader)
      body: { x: bodyX, y: bodyY },  // Body position (connector)
      tail: { x: tailX, y: tailY },  // Tail position (follower)
      life: 300,                     // Health/lifespan (decreases over time)
      direction: { x: 0, y: 0 },     // Current movement direction
      memory: [],                    // Movement history for learning
      currentGoal: null,             // Current movement objective
      blockedCounter: 0              // Frames spent unable to move
  };

  Memory System

  Worms maintain a learning memory system that records movement patterns:

  // Memory structure
  memory: [
      {
          position: { x: posX, y: posY },    // Where the movement occurred
          movement: { dx: deltaX, dy: deltaY } // What movement was made
      }
      // ... up to 32 recent memories
  ]

  Memory Logic:
  - Records every successful movement with position + direction
  - Limited to last 32 movements to prevent unlimited growth
  - Used to prefer familiar movement patterns at known positions
  - Inherited from parents during breeding with 10% mutation rate

  Movement Priority System

  Worms follow a strict 3-tier priority system for movement decisions:

  Priority 1: Energy Cost (Food Seeking)

  // Always prioritize moves that consume trees (food)
  const foodMoves = headMoves.filter(move => move.eatsTree);
  if (foodMoves.length > 0) {
      return selectMoveWithMemory(worm, foodMoves);
  }

  Priority 2: Memory-Based Movement

  // Prefer movements used before at the same position
  const positionMemory = worm.memory.find(mem =>
      mem.position.x === worm.head.x && mem.position.y === worm.head.y
  );
  if (positionMemory && matches_current_move) {
      score += 3; // Strong preference for familiar moves
  }

  Priority 3: Goal-Directed Intent

  // Follow current movement goal if no food/memory preference
  if (move.dx === worm.currentGoal.dx && move.dy === worm.currentGoal.dy) {
      worm.currentGoal = generateMovementGoal(worm); // Generate new goal
      return goalMove;
  }

  Goal Generation Logic

  Goals are dynamically generated based on available moves and environmental factors:

  function generateMovementGoal(worm) {
      // 1. Find actually available moves (surface contact required)
      const availableMoves = getValidMovesWithSurfaceContact(worm);

      // 2. Bias toward nearby food sources (5x5 search radius)
      const foodDirection = findNearestFood(worm);
      if (foodDirection) {
          const foodMoves = availableMoves.filter(move =>
              alignsWithDirection(move, foodDirection)
          );
          if (foodMoves.length > 0) return randomChoice(foodMoves);
      }

      // 3. Continue recent movement patterns from memory
      if (worm.memory.length > 3) {
          const recentPattern = calculateAverageRecentMovement(worm);
          const patternMoves = availableMoves.filter(move =>
              alignsWithPattern(move, recentPattern)
          );
          if (patternMoves.length > 0) return randomChoice(patternMoves);
      }

      // 4. Random exploration
      return randomChoice(availableMoves);
  }

  Movement Mechanics

  Surface Contact Requirement

  Worms can only move to positions that have solid surface contact:

  function hasValidSurface(x, y) {
      // Check 3x3 area around position for solid materials
      for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
              const cell = grid[sy][sx];
              if (cell === SAND || cell === DIRT || cell === GLASS ||
                  cell === TREE || cell === DEAD_TREE) {
                  return true; // Surface contact found
              }
          }
      }
      return false; // No surface contact
  }

  Falling Behavior with Head Wiggle

  When no surface moves are available, worms attempt to fall with anti-blocking behavior:

  const fallCandidates = [
      { x: worm.head.x, y: worm.head.y + 1 },     // Straight down (primary)
      { x: worm.head.x - 1, y: worm.head.y + 1 }, // Down-left wiggle
      { x: worm.head.x + 1, y: worm.head.y + 1 }  // Down-right wiggle
  ];

  Movement Execution

  Worms move by shifting their segments in sequence:

  // Worm movement: tail → body → head → new position
  const oldTail = worm.tail;
  const oldBody = worm.body;
  const oldHead = worm.head;

  // Update positions
  worm.tail = oldBody;    // Tail follows body
  worm.body = oldHead;    // Body follows head
  worm.head = selectedMove; // Head moves to new position

  Blocking & Adaptation Logic

  When worms cannot move, they employ adaptive strategies:

  if (headMoves.length === 0) {
      worm.blockedCounter++;

      // Generate new goal immediately when blocked
      if (worm.blockedCounter >= 1) {
          const newGoal = generateMovementGoal(worm);
          if (newGoal) {
              worm.currentGoal = newGoal;
          } else {
              worm.currentGoal = null; // Allow falling behavior
          }
          worm.blockedCounter = 0;
      }
  }

  Breeding System

  Worms reproduce when specific conditions are met:

  Breeding Conditions:
  - Two worms within 2 pixels of each other (any body part)
  - Both worms aged ≥25 frames (sexual maturity)
  - 8% chance per frame when conditions met
  - Requires ≥3 empty spaces with surface contact nearby

  Memory Inheritance:
  function inheritMemory(parent1, parent2) {
      const combinedMemory = [...parent1.memory, ...parent2.memory];
      const inheritedMemory = [];

      // Take recent memories from both parents
      for (const memory of combinedMemory.slice(-10)) {
          // 10% mutation rate on inherited memories
          if (Math.random() < 0.1) {
              memory.movement.dx += Math.random() < 0.5 ? -1 : 1;
              memory.movement.dy += Math.random() < 0.5 ? -1 : 1;
          }
          inheritedMemory.push(memory);
      }

      return inheritedMemory;
  }

  Life Cycle & Death

  Aging:
  - Worms start with 300 life points
  - Lose 1 life point per frame
  - Breeding costs 15 life points per parent

  Death Conditions:
  - Life reaches 0 (natural aging)
  - Body parts destroyed by environmental hazards
  - When eaten by other materials

  Death Behavior:
  function removeWorm(worm) {
      // Convert dead worm pixels to acid (decomposition)
      grid[worm.head.y][worm.head.x] = ACID;
      grid[worm.body.y][worm.body.x] = ACID;
      grid[worm.tail.y][worm.tail.x] = ACID;
      acidLifeGrid[y][x] = materials[ACID].life; // 300 frames
  }

  Anti-Clustering Mechanisms

  To prevent worms from getting stuck in groups:

  1. Immediate Goal Regeneration: New goals generated after 1 blocked frame
  2. Random Goal Injection: 10% chance per frame to generate new goal regardless of state
  3. Food-Seeking Priority: Always prioritizes food moves over other behaviors
  4. Memory-Based Exploration: Uses past successful moves to find new paths

  This creates emergent flocking and foraging behaviors while maintaining individual agency and preventing deadlocks.