# TMuxCraft Game

A vim-style navigation game with tmux keybinding integration powered by Claude AI.

## Features

- **Grid-based navigation** with hollow purple squares (Tokyo Night theme)
- **Dynamic keybindings** that adapt to your tmux configuration
- **Tutorial sequence** that teaches you the controls through gameplay
- **Camera system** that follows the player
- **Claude API integration** for parsing tmux configs

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your API Key

Edit the `.env` file and add your Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
```

### 3. Run the Application

You need to run both the frontend and backend:

**Terminal 1 - Frontend (Vite dev server):**
```bash
npm run dev
```

**Terminal 2 - Backend (API server):**
```bash
npm run server
```

The game will be available at: `http://localhost:5173/`
The API server runs at: `http://localhost:3001/`

## How to Play

### Default Controls

- **Alt + h** - Move left
- **Alt + j** - Move down
- **Alt + k** - Move up
- **Alt + l** - Move right

### Upload Your tmux Config

1. Click "Upload tmux config" in the top right
2. Select your tmux configuration file (e.g., `~/.tmux.conf`)
3. The game will automatically parse your keybindings using Claude AI
4. Controls will update to match your tmux pane navigation keys!

### Example tmux Config

If your tmux config has:
```tmux
bind -n M-h select-pane -L
bind -n M-j select-pane -D
bind -n M-k select-pane -U
bind -n M-l select-pane -R
```

The game uses Alt+h/j/k/l (default).

But if you have custom bindings like:
```tmux
bind -n C-Left select-pane -L
bind -n C-Down select-pane -D
bind -n C-Up select-pane -U
bind -n C-Right select-pane -R
```

The game will adapt to those keys!

## Tutorial

The game includes a tutorial that teaches you:
1. Moving down (first hint)
2. Moving up (when block approaches from below)
3. Moving left (when block comes from above)
4. Moving right (when block comes from the side)

## Technical Details

- **Frontend**: React + Vite
- **Backend**: Express.js
- **AI**: Claude 3.5 Sonnet via Anthropic API
- **Theme**: Tokyo Night color scheme
- **Grid System**: Dynamic camera tracking with BFS-based reachability
- **Keybinding Parser**: Supports tmux formats (M-x, C-x, etc.)

## Color Scheme (Tokyo Night)

- Background: `#1a1b26`
- Regular cells: `#5a4a7a` (dark purple)
- Active cell: `#d4bbff` (light purple with glow)
- Blocks: `#7dcfff` (cyan-blue)
- Text: `#c0caf5`

## Project Structure

```
tmuxcraft-game/
├── src/
│   ├── Game.jsx          # Main game component
│   ├── Game.css          # Game styling
│   ├── ConfigUploader.jsx # tmux config upload UI
│   └── ConfigUploader.css
├── server.js             # Backend API for Claude
├── .env                  # API key configuration
└── package.json
```

## Development

The game uses React hooks for state management and includes:
- BFS algorithm for reachable cell detection
- Dynamic keybinding system
- Grid-snapping block movement
- Tutorial progression system

Enjoy playing TMuxCraft! 🎮
