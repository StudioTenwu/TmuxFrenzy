# TMuxCraft Game

Two addictive games that teach tmux navigation through interactive gameplay, powered by Claude AI for config parsing.

## 🎮 Game Modes

### 1. Grid Navigator (`/`)
A fast-paced dodge game where you navigate a weird-shaped grid while avoiding incoming blocks. Features beautiful animated sine wave borders on the player cell and progressively increasing difficulty.

**Objective**: Navigate the grid and dodge blue blocks as long as possible.

### 2. Terminal Multiplexer (`/multiplex`)
A puzzle game that teaches terminal multiplexing concepts through spatial challenges. Split your terminal panes to align boundaries with target lines.

**Objective**: Split your terminal panes until the boundaries perfectly match the target line pattern shown on screen.

---

## ✨ Features

### Grid Navigator
- **Animated Sine Wave Borders**: Smooth, flowing purple sine waves that create a mesmerizing border around the player cell
- **Dynamic Block Spawning**: Blocks spawn from above and to the right with randomized patterns
- **Death Animations**: Cinematic death sequence with rotation, scaling, and sine wave displacement
- **Camera System**: Smooth camera tracking that keeps the player centered
- **BFS-Optimized Rendering**: Only renders cells reachable from the player position
- **Weird-Shaped Grid**: Navigate through an asymmetric, branching grid layout
- **tmux Keybinding Integration**: Automatically adapts to your tmux configuration

### Terminal Multiplexer
- **Fraction-Based Pane System**: Precise pane positioning using 0-1 fractional coordinates
- **Split Operations**: Horizontal (hotdog) and vertical (hamburger) splits always divide exactly in half
- **Intelligent Coverage Detection**: Real-time green/red feedback showing which parts of the target line are covered
- **Bent Line Challenges**: Progressively complex bent lines requiring strategic pane splitting
- **Pane Navigation**: Navigate between adjacent panes with vim-style hjkl movement
- **Dynamic Level Generation**: Randomly generated levels that increase in complexity

### Shared Features
- **Tokyo Night Theme**: Beautiful dark purple color scheme throughout
- **Custom Keybindings**: Upload your tmux config and the games adapt to your personal bindings
- **Claude AI Parser**: Uses Claude 3 Opus to intelligently parse tmux configurations
- **Responsive Controls**: Smooth, low-latency input handling

---

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

The backend uses the Anthropic API to parse tmux configurations. You have two options:

**Option A: Environment Variable (Recommended)**
```bash
export ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
```

**Option B: .env File**
```bash
# Create .env in project root
echo "ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here" > .env
```

Get your API key from: https://console.anthropic.com/settings/keys

### 3. Run the Application

You need two terminal windows:

**Terminal 1 - Frontend (Vite dev server):**
```bash
npm run dev
```

**Terminal 2 - Backend (API server):**
```bash
npm run server
```

The games will be available at:
- **Grid Navigator**: `http://localhost:5173/`
- **Terminal Multiplexer**: `http://localhost:5173/multiplex`

API server runs at: `http://localhost:3001/`

---

## 🎯 How to Play

### Grid Navigator (`/`)

#### Default Controls
- **Alt+h** - Move left
- **Alt+j** - Move down
- **Alt+k** - Move up
- **Alt+l** - Move right

#### Gameplay
1. Start at the origin (0, 0) on a weird-shaped grid
2. Blue blocks spawn above (moving down) and to the right (moving left) every 0.8 seconds
3. Navigate the grid to dodge blocks
4. Blocks spawn within a 2-cell radius with random variance
5. If a block reaches your position, you die and respawn at origin
6. Your cell features animated purple sine waves flowing clockwise

#### Tips
- Blocks move at constant speed (600ms per cell)
- Only cells connected to your position are rendered
- The grid has branches and dead ends - learn the layout!
- Watch for blocks spawning from multiple directions

### Terminal Multiplexer (`/multiplex`)

#### Controls
- **Alt+q** - Split horizontally (hotdog style - creates top/bottom panes)
- **Alt+w** - Split vertically (hamburger style - creates left/right panes)
- **Alt+h** - Navigate to left pane
- **Alt+j** - Navigate to bottom pane
- **Alt+k** - Navigate to top pane
- **Alt+l** - Navigate to right pane

#### Gameplay
1. Start with one full-screen terminal pane
2. A target line appears (shown in red) - it may bend and require multiple segments
3. Split panes using Alt+q (horizontal) or Alt+w (vertical)
4. Splits always divide the active pane exactly in half
5. When a pane boundary aligns with a line segment, it turns green
6. Complete the level by covering all line segments (all green)
7. Levels automatically progress with increasing complexity

#### Strategy
- Level 1: Simple vertical line at 0.5 (one split solves it)
- Level 2: L-shaped line requiring two splits
- Level 3+: Complex bent lines requiring strategic planning
- Think ahead - some lines require specific split sequences
- Use navigation (hjkl) to switch between panes before splitting

### Custom Keybindings

Both games support custom tmux keybindings:

1. Click **"Upload tmux config"** in the top right
2. Select your `~/.tmux.conf` file
3. Claude AI parses your `select-pane` bindings
4. Controls automatically update!

#### Example Configurations

**Standard tmux + vim:**
```tmux
bind -n M-h select-pane -L
bind -n M-j select-pane -D
bind -n M-k select-pane -U
bind -n M-l select-pane -R
```
→ Uses **Alt+hjkl** (default)

**Arrow keys with Ctrl:**
```tmux
bind -n C-Left select-pane -L
bind -n C-Down select-pane -D
bind -n C-Up select-pane -U
bind -n C-Right select-pane -R
```
→ Uses **Ctrl+Arrows**

**Prefix-based navigation:**
```tmux
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R
```
→ Uses **Prefix+hjkl** (where prefix is typically Ctrl+b or Ctrl+a)

---

## 🎨 Visual Design

### Color Scheme (Tokyo Night)
- **Background**: `#1a1b26` - Deep dark blue
- **Grid Borders**: `#5a4a7a` - Dark purple
- **Active Cell**: Animated gradient from `#d4bbff` to `#bb9af7` (purple)
- **Sine Wave Glow**: `feGaussianBlur` with `stdDeviation="4"`
- **Blocks**: `#7dcfff` - Bright cyan-blue with glow
- **Covered Lines**: `#9ece6a` - Success green
- **Uncovered Lines**: `#f7768e` - Warning red
- **Text**: `#c0caf5` - Light blue-gray

### Animation Details

#### Grid Navigator
- **Sine Wave Border** (Player cell):
  - 4 SVG paths (top, right, bottom, left)
  - Amplitude: 2.5px, Period: 120px
  - Animation: 0.2px offset per frame (slow, smooth flow)
  - Direction: Clockwise (top/right reversed)
  - Stroke: Linear gradient with glow filter

- **Death Animation**:
  - Duration: 1 second
  - Effects: Sine wave displacement, 720° rotation, 50% scale reduction, fade out
  - Red border pulse with triple box-shadow glow

- **Camera Tracking**:
  - 0.15s ease-out transition
  - Centers player in viewport
  - Smooth panning as player moves

#### Terminal Multiplexer
- **Active Pane Highlight**:
  - Purple border with 20px glow
  - Inset glow for depth effect
  - 0.2s smooth transition

- **Line Segment Feedback**:
  - 0.3s color transition (red → green)
  - Dual glow layers for visibility
  - 4px thickness for clarity

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: React 18 with Hooks
- **Build Tool**: Vite 7.2.2
- **Routing**: React Router v6
- **Styling**: CSS3 with CSS Variables
- **Animations**: RequestAnimationFrame + CSS Transitions

### Backend Stack
- **Server**: Express.js
- **AI Integration**: Anthropic SDK (Claude 3 Opus)
- **Config Parsing**: Natural language understanding via Claude API
- **CORS**: Enabled for local development

### Key Algorithms

#### Grid Navigator
```
BFS Reachability (getReachableCells):
- Start: Player position
- Expands: All 4 cardinal directions
- Returns: Set of "x,y" coordinate strings
- Used for: Rendering optimization (only reachable cells)

Block Spawning (spawnBlock):
- 50% spawn above: (playerX ± [0-2], playerY - 5) moving DOWN
- 50% spawn right: (playerX + 5, playerY ± [0-2]) moving LEFT
- Frequency: Every 800ms
- Cleanup: Remove when >20 cells from player

Sine Wave Generation (generateWavePath):
- Input: Side (top/right/bottom/left), offset
- Output: SVG path data string
- Formula: y = amplitude × sin((x / period) × 2π)
- Sampling: Every 2px for smooth curves
```

#### Terminal Multiplexer
```
Pane System:
- Coordinates: Fractions [0, 1] for x1, y1, x2, y2
- Full screen: { x1: 0, y1: 0, x2: 1, y2: 1 }
- Horizontal split: Divides at (y1 + y2) / 2
- Vertical split: Divides at (x1 + x2) / 2

Coverage Detection (isSegmentCovered):
- Vertical lines: Check if any pane has x1 or x2 at position
- Horizontal lines: Check if any pane has y1 or y2 at position
- Tolerance: 0.001 for floating-point precision
- Range check: Pane must span segment's start-end range

Line Generation (generateLine):
- Level 1: One straight line
- Level 2: Two-segment L-shape
- Level 3+: Random bent lines with 2-5 segments
- Constraint: Each segment 20-80% of screen width/height
```

### Performance Optimizations
1. **Lazy Rendering**: Only renders reachable grid cells (BFS optimization)
2. **Block Culling**: Removes blocks >20 cells from player
3. **Animation Batching**: Single requestAnimationFrame for sine wave updates
4. **Fraction Math**: Avoids pixel rounding errors in pane calculations
5. **Memoized Callbacks**: useCallback hooks prevent unnecessary re-renders

---

## 📁 Project Structure

```
tmuxcraft-game/
├── src/
│   ├── App.jsx                # Router setup (/, /multiplex)
│   ├── App.css                # Global styles
│   │
│   ├── Game.jsx               # Grid Navigator game logic
│   ├── Game.css               # Grid Navigator styles
│   │   ├── Sine wave border animations
│   │   ├── Death animation keyframes
│   │   └── Grid cell styling
│   │
│   ├── MultiplexGame.jsx      # Terminal Multiplexer logic
│   ├── MultiplexGame.css      # Terminal Multiplexer styles
│   │   ├── Pane rendering
│   │   ├── Line segment feedback
│   │   └── Active pane highlighting
│   │
│   ├── ConfigUploader.jsx     # tmux config upload UI
│   ├── ConfigUploader.css     # Upload button styling
│   │
│   ├── main.jsx               # React entry point
│   └── index.css              # Root styles + Tokyo Night theme
│
├── context/
│   └── codebase-guide.md      # Development documentation
│
├── server.js                  # Express backend + Claude API
│   ├── POST /api/parse-tmux-config
│   └── Uses claude-3-opus-20240229
│
├── .env.example               # API key template
├── .env                       # API key (gitignored)
├── .gitignore                 # Excludes node_modules, .env, dist
├── package.json               # Dependencies + scripts
└── vite.config.js             # Vite configuration
```

### Key Files Explained

**`src/Game.jsx` (637 lines)**
- Lines 18-24: Player position, camera offset, blocks state
- Lines 60-96: `generateWavePath()` - SVG sine wave path generator
- Lines 107-158: `traversableCells` - Weird-shaped grid definition
- Lines 247-279: `spawnBlock()` - Block spawning algorithm
- Lines 484-494: Continuous block spawning (800ms interval)
- Lines 555-595: SVG sine wave rendering

**`src/MultiplexGame.jsx` (314 lines)**
- Lines 6-8: Pane state (fraction-based coordinates)
- Lines 12-59: `generateLine()` - Bent line generation
- Lines 62-92: `isSegmentCovered()` - Coverage detection
- Lines 124-144: `splitHorizontal()` - Horizontal pane splitting
- Lines 147-167: `splitVertical()` - Vertical pane splitting
- Lines 170-215: `navigatePane()` - Adjacent pane navigation

**`server.js` (94 lines)**
- Lines 26-66: Claude API message construction
- Lines 68-78: JSON response parsing (handles markdown blocks)
- Prompt: Extracts select-pane bindings for all 4 directions

---

## 🧪 Development

### Running Tests
```bash
# Currently no tests - feel free to contribute!
```

### Debugging Tips
1. **Block spawning issues**: Check browser console for spawn attempt logs
2. **Keybinding conflicts**: Alt shortcuts may conflict with browser menus (use custom bindings)
3. **API errors**: Ensure backend is running and API key is valid
4. **Performance**: Enable React DevTools Profiler to analyze render performance

### Common Issues

**"Port 5173 is already in use"**
- Kill existing Vite process: `lsof -ti:5173 | xargs kill -9`
- Or let Vite use another port automatically

**"API key not found"**
- Verify `.env` file exists and contains `ANTHROPIC_API_KEY`
- Restart backend server after adding API key

**"Sine waves clipped at edges"**
- Already fixed! SVG filter region expanded to 200% (line 578 in Game.jsx)

**"Pane boundaries not detected"**
- Check tolerance value (0.001) in MultiplexGame.jsx:64
- Ensure fractions use floating-point division

### Adding New Features

#### New Block Movement Pattern
```javascript
// In src/Game.jsx, modify spawnBlock():
const spawnDiagonal = Math.random() < 0.33;
if (spawnDiagonal) {
  return {
    id: Date.now() + Math.random(),
    x: playerPos.x + 5,
    y: playerPos.y - 5,
    direction: 'diagonal' // Add diagonal movement logic
  };
}
```

#### New Line Pattern
```javascript
// In src/MultiplexGame.jsx, modify generateLine():
else if (levelNum === 4) {
  // Cross pattern
  return [
    { type: 'vertical', position: 0.5, start: 0, end: 1 },
    { type: 'horizontal', position: 0.5, start: 0, end: 1 }
  ];
}
```

---

## 🎓 Learning Outcomes

### What You'll Learn

**Grid Navigator:**
- Vim-style navigation (hjkl)
- Spatial awareness and prediction
- Grid-based coordinate systems
- Pattern recognition for block spawning
- Quick decision-making under pressure

**Terminal Multiplexer:**
- tmux split commands (horizontal vs vertical)
- Terminal pane layout strategies
- Fraction-based positioning concepts
- Navigating between panes efficiently
- Problem decomposition (complex lines → split sequences)

**Both Games:**
- Your personal tmux keybindings through muscle memory
- Alt/Ctrl/Shift modifier keys
- Grid navigation principles that transfer to terminal multiplexers
- Spatial problem-solving

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- [ ] Add sound effects and background music
- [ ] Implement high score system with localStorage
- [ ] Add more block movement patterns (diagonal, zigzag)
- [ ] Create level editor for Terminal Multiplexer
- [ ] Add colorblind-friendly themes
- [ ] Implement touch controls for mobile
- [ ] Add multiplayer mode
- [ ] Create achievement system
- [ ] Add difficulty settings

---

## 📝 License

MIT License - feel free to use this for learning or in your own projects!

---

## 🙏 Acknowledgments

- **Tokyo Night Theme** by [@enkia](https://github.com/enkia/tokyo-night-vscode-theme)
- **tmux** by Nicholas Marriott
- **Claude AI** by Anthropic
- **React** by Meta

---

## 🎮 Quick Start Commands

```bash
# Clone the repository
git clone <repo-url>
cd tmuxcraft-game

# Install dependencies
npm install

# Set up API key
export ANTHROPIC_API_KEY=your-key-here

# Run both servers (in separate terminals)
npm run dev      # Terminal 1
npm run server   # Terminal 2

# Play!
# Grid Navigator: http://localhost:5173/
# Terminal Multiplexer: http://localhost:5173/multiplex
```

---

**Ready to master tmux navigation through gameplay? Let's go! 🚀**
