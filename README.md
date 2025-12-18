# Pixelarium - Falling Sand Cellular Automata Game

A real-time physics simulation featuring falling sand mechanics, complex material interactions, and emergent behaviors. Built with HTML5 Canvas and JavaScript.

## 🎮 Controls

### Basic Controls
- **Left Click + Drag**: Paint selected material
- **Double Click**: Place persistent generator (continuously spawns material)
- **Double Click + Eraser**: Remove generators
- **Spacebar**: Pause/Resume simulation
- **Clear Button**: Reset entire simulation

### Material Selection
Click material buttons on the right side to select:
- **Sand** - Falls and settles
- **Water** - Flows and seeks lower levels  
- **Fire** - Spreads and burns materials
- **Dirt** - Solid foundation material
- **Tree** - Grows from dirt+water, burns
- **Glass** - Solid barrier, fire-resistant
- **Steam** - Rises up, condenses on glass
- **Acid** - Dissolves most materials
- **Lava** - Burns and melts materials
- **Worm** - Living creatures that move
- **Eraser** - Removes materials

## 🧬 Cellular Automata Rules

### Physics System
The simulation uses a **double-buffered grid** with density-based physics:

1. **First Pass**: Material movement based on density
2. **Second Pass**: Chemical interactions and transformations
3. **Third Pass**: Fractal tree growth processing

### Material Properties

| Material | Density | Flammable | Liquid | Special Properties |
|----------|---------|-----------|--------|-------------------|
| Empty | 0 | ❌ | ❌ | Void space |
| Sand | 3 | ❌ | ❌ | Falls, can be melted |
| Water | 2 | ❌ | ✅ | Flows, extinguishes fire |
| Fire | 1 | ❌ | ❌ | Life: 60 frames |
| Dirt | 4 | ❌ | ❌ | Can sprout trees |
| Tree | 5 | ✅ | ❌ | Grows, burns |
| Glass | 8 | ❌ | ❌ | Solid barrier |
| Steam | 0.5 | ❌ | ❌ | Life: 120 frames, rises |
| Acid | 2.5 | ❌ | ✅ | Life: 300 frames, corrosive |
| Lava | 4 | ❌ | ✅ | Burns and melts |
| Worm | 1 | ✅ | ❌ | Life: 300 frames, moves |

## 🔥 Material Interactions

### Fire Interactions
- **Fire + Flammable Materials** → Spreads (5% chance)
  - Trees, Dead Trees, Worms become Fire
- **Fire + Sand** → Glass (2% chance)
- **Fire + Water** → Steam (8% chance)
- **Fire + Tree/Dead Tree** → Creates steam nearby (30% chance)

### Water Interactions
- **Water + Fire** → Extinguishes fire (30% chance)
- **Water + Dirt** → Tree growth (0.8% chance)
  - Converts dirt to tree, consumes water
  - Starts fractal tree growth upward
  - Blocked by glass barriers

### Tree System
**Initial Growth (Dirt + Water)**:
- Dirt pixel touches water → converts to tree
- Starts fractal growth queue upward
- Glass blocks initial growth path

**Fractal Growth**:
- Queue-based branching system
- **Trunk thickness**: 3 → 2 → 1 (tapers)
- **Directions**: Up, up-left, up-right
- **Branching**: Creates left/right branches (20-50% chance based on thickness)
- **Glass blocking**: Stops when hitting glass barriers
- **Random sway**: Natural movement variation

### Steam Interactions
- **Steam + Glass** → Water (15% chance)
  - Condensation effect

### Acid Interactions
- **Acid + Most Materials** → Dissolves (3% chance)
- **Immune**: Glass, Fire, Empty, Acid itself

### Lava Interactions
- **Lava + Flammable** → Fire (10% chance)
- **Lava + Water** → Steam (20% chance)
- **Lava + Sand** → Glass (5% chance)

### Worm System
**Spawning**:
- **Water + Dirt + Tree** all touching → Spawns worms (0.5% chance)
- Requires 4+ connected pixels of triggering material
- Creates 3-pixel worms (head, body, tail)

**Behavior**:
- Move along surfaces using edge detection
- Fall when no surface moves available
- Age and die over time (300 frames)
- Can breed when multiple worms are near

## 🌳 Advanced Features

### Generator System
- **Double-click** to place persistent material generators
- Continuously spawn selected material every 3 frames
- **Hover** to see pulsing indicator border
- **Eraser + Double-click** to remove generators
- Perfect for creating steady material flows

### Glass Barriers
- **Highest density** (8) - doesn't fall
- **Fire resistant** - doesn't burn or melt
- **Blocks tree growth** - fractal trees respect glass boundaries
- **Steam condensation** - causes steam to turn to water
- **Acid resistant** - immune to acid corrosion

### Tree Growth Mechanics
**Resource-Based Growth**:
- Trees grow based on nearby water/dirt density
- Higher resource density = faster growth
- Consumes water when growing (30% chance)
- Multiple growth directions for organic shapes

**Fractal Structure**:
- Main trunk grows straight up (thickness 3)
- Branches grow diagonally (thickness 2, then 1)
- Up to 3 generations of branching
- Natural sway and variation in growth

## 🎯 Emergent Behaviors

### Ecosystem Dynamics
- **Fire spreads** through tree networks
- **Water management** affects tree growth
- **Acid rain** can dissolve landscapes
- **Steam cycles** create weather-like effects

### Complex Interactions
- **Dirt + Water + Trees** → Worm ecosystems
- **Fire + Trees** → Forest fires with steam
- **Lava + Various** → Volcanic effects
- **Glass barriers** → Controlled environments

### Creative Possibilities
- Build **glass containers** for controlled experiments
- Create **lava forges** that turn sand to glass
- Design **tree farms** with water irrigation
- Set up **generator networks** for automated systems

## 🏗️ Technical Implementation

### Performance Features
- **Double-buffered grids** prevent flickering
- **Efficient pixel processing** with optimized loops
- **Life-based systems** for temporary materials
- **Queue-based tree growth** for complex branching

### Rendering System
- **HTML5 Canvas** with pixel-perfect rendering
- **Color variation** for visual richness
- **Mobile touch support** for accessibility
- **Responsive design** adapts to window size

---

## 🚀 Getting Started

1. Open `pixelarium.html` in a web browser
2. Select a material from the right panel
3. Click and drag to paint
4. Double-click to place generators
5. Watch the cellular automata come to life!

Experiment with different material combinations to discover emergent behaviors and create complex simulations!
