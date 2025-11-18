import { useState, useEffect, useCallback, useRef } from 'react';
import ConfigUploader from './ConfigUploader';
import './Game.css';

const CELL_SIZE = 240; // Size of each grid square in pixels (4x bigger)
const BLOCK_SPEED = 600; // ms per grid cell

// Default keybindings (tmux format)
const DEFAULT_KEYBINDINGS = {
  left: 'M-h',
  down: 'M-j',
  up: 'M-k',
  right: 'M-l',
};

function Game() {
  // Player position in grid coordinates
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });

  // Camera offset (keeps player centered)
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });

  // Blocks (obstacles)
  const [blocks, setBlocks] = useState([]);

  // Tutorial state
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hintText, setHintText] = useState('alt + j');

  // Keybindings (tmux format)
  const [keybindings, setKeybindings] = useState(DEFAULT_KEYBINDINGS);

  // Death/respawn state
  const [isDying, setIsDying] = useState(false);
  const [deathProgress, setDeathProgress] = useState(0);

  const tutorialTimerRef = useRef(null);

  // Convert tmux notation to human-readable format
  const formatKeybinding = useCallback((binding) => {
    if (!binding) return '';

    // M-x → Alt+x, C-x → Ctrl+x, S-x → Shift+x
    const modifierMap = {
      'M': 'Alt',
      'C': 'Ctrl',
      'S': 'Shift',
      'Super': 'Super',
    };

    const parts = binding.split('-');
    if (parts.length < 2) return binding;

    const modifier = modifierMap[parts[0]] || parts[0];
    const key = parts[1];

    return `${modifier}+${key}`;
  }, []);

  // Parse tmux keybinding to JavaScript event format
  const parseKeybinding = useCallback((binding) => {
    if (!binding) return null;

    // M-x = Alt+x, C-x = Ctrl+x
    const parts = binding.split('-');
    const modifier = parts[0];
    const key = parts[1]?.toLowerCase();

    return {
      key,
      altKey: modifier === 'M',
      ctrlKey: modifier === 'C',
      shiftKey: modifier === 'S',
    };
  }, []);

  // Check if event matches a keybinding
  const matchesKeybinding = useCallback((event, binding) => {
    const parsed = parseKeybinding(binding);
    if (!parsed) return false;

    return (
      event.key.toLowerCase() === parsed.key &&
      event.altKey === parsed.altKey &&
      event.ctrlKey === parsed.ctrlKey &&
      event.shiftKey === parsed.shiftKey
    );
  }, [parseKeybinding]);

  // Update hint text when keybindings change
  useEffect(() => {
    if (tutorialStep === 0) {
      setHintText(formatKeybinding(keybindings.down) || 'Alt+j');
    }
  }, [keybindings, tutorialStep, formatKeybinding]);

  // Define traversable cells - using a Set for O(1) lookup
  // Format: "x,y" as string key
  const [traversableCells] = useState(() => {
    const cells = new Set();

    // Create a weird-shaped pattern
    // Starting area
    cells.add('0,0');
    cells.add('1,0');

    // Path going down and to the right
    for (let i = 0; i <= 3; i++) {
      cells.add(`${i},${i + 1}`);
      cells.add(`${i + 1},${i + 1}`);
    }

    // Branch to the left
    cells.add('-1,2');
    cells.add('-2,2');
    cells.add('-2,3');
    cells.add('-3,3');
    cells.add('-3,4');

    // Weird appendage going up from start
    cells.add('0,-1');
    cells.add('1,-1');
    cells.add('1,-2');
    cells.add('2,-2');
    cells.add('2,-3');

    // Another branch from the main path
    cells.add('3,3');
    cells.add('4,3');
    cells.add('5,3');
    cells.add('5,4');
    cells.add('5,5');
    cells.add('6,5');

    // Connect bottom area
    cells.add('4,5');
    cells.add('3,5');
    cells.add('3,6');
    cells.add('2,6');
    cells.add('2,7');
    cells.add('1,7');
    cells.add('0,7');

    // Lower left area
    cells.add('-1,5');
    cells.add('-1,6');
    cells.add('-2,6');

    return cells;
  });

  // Check if a cell is traversable
  const isTraversable = useCallback((x, y) => {
    return traversableCells.has(`${x},${y}`);
  }, [traversableCells]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      let newX = playerPos.x;
      let newY = playerPos.y;
      let validKey = false;
      let direction = null;

      // Check which direction key was pressed
      if (matchesKeybinding(e, keybindings.left)) {
        newX = playerPos.x - 1;
        validKey = true;
        direction = 'left';
      } else if (matchesKeybinding(e, keybindings.down)) {
        newY = playerPos.y + 1;
        validKey = true;
        direction = 'down';
      } else if (matchesKeybinding(e, keybindings.up)) {
        newY = playerPos.y - 1;
        validKey = true;
        direction = 'up';
      } else if (matchesKeybinding(e, keybindings.right)) {
        newX = playerPos.x + 1;
        validKey = true;
        direction = 'right';
      }

      if (!validKey) return;

      // Prevent default browser shortcuts
      e.preventDefault();

      // Only move if the target cell is traversable
      if (isTraversable(newX, newY)) {
        setPlayerPos({ x: newX, y: newY });
        // Update camera to follow player
        setCameraOffset({ x: newX * CELL_SIZE, y: newY * CELL_SIZE });

        // Tutorial progression
        if (tutorialStep === 0 && direction === 'down') {
          setTutorialStep(1);
        } else if (tutorialStep === 1 && direction === 'up') {
          setTutorialStep(2);
        } else if (tutorialStep === 2 && direction === 'left') {
          setTutorialStep(3);
        } else if (tutorialStep === 3 && direction === 'right') {
          setTutorialStep(4);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, isTraversable, tutorialStep, keybindings, matchesKeybinding]);

  // Tutorial sequence
  useEffect(() => {
    if (tutorialTimerRef.current) {
      clearTimeout(tutorialTimerRef.current);
    }

    switch (tutorialStep) {
      case 0:
        // Step 0: Show down key hint
        setHintText(formatKeybinding(keybindings.down) || 'Alt+j');
        break;

      case 1:
        // Step 1: Spawn block coming from bottom, show up key
        setHintText(formatKeybinding(keybindings.up) || 'Alt+k');
        tutorialTimerRef.current = setTimeout(() => {
          setBlocks([{ id: Date.now(), x: 0, y: 5 }]);
        }, 1000);
        break;

      case 2:
        // Step 2: Spawn blocks from top to teach left key
        setHintText(formatKeybinding(keybindings.left) || 'Alt+h');
        tutorialTimerRef.current = setTimeout(() => {
          setBlocks([{ id: Date.now(), x: 0, y: -5 }]);
        }, 1000);
        break;

      case 3:
        // Step 3: Spawn blocks to teach right key
        setHintText(formatKeybinding(keybindings.right) || 'Alt+l');
        tutorialTimerRef.current = setTimeout(() => {
          setBlocks([{ id: Date.now(), x: -2, y: -3 }]);
        }, 1000);
        break;

      case 4:
        // Tutorial complete!
        setHintText('');
        break;

      default:
        break;
    }

    return () => {
      if (tutorialTimerRef.current) {
        clearTimeout(tutorialTimerRef.current);
      }
    };
  }, [tutorialStep, keybindings, formatKeybinding]);

  // Block movement (snap to grid)
  useEffect(() => {
    if (blocks.length === 0) return;

    const interval = setInterval(() => {
      setBlocks(prevBlocks => {
        return prevBlocks.map(block => {
          // Move block toward player
          let newX = block.x;
          let newY = block.y;

          if (tutorialStep === 1) {
            // Move up
            newY = block.y - 1;
          } else if (tutorialStep === 2) {
            // Move down
            newY = block.y + 1;
          } else if (tutorialStep === 3) {
            // Move right
            newX = block.x + 1;
          }

          return { ...block, x: newX, y: newY };
        });
      });
    }, BLOCK_SPEED);

    return () => clearInterval(interval);
  }, [blocks, tutorialStep]);

  // Collision detection with blocks
  useEffect(() => {
    if (isDying) return; // Don't check collisions while dying

    for (const block of blocks) {
      if (block.x === playerPos.x && block.y === playerPos.y) {
        // Collision detected! Start death animation
        setIsDying(true);
        setDeathProgress(0);
        break;
      }
    }
  }, [blocks, playerPos, isDying]);

  // Death animation and respawn
  useEffect(() => {
    if (!isDying) return;

    const animationDuration = 1000; // 1 second
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      setDeathProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - respawn
        setPlayerPos({ x: 0, y: 0 });
        setCameraOffset({ x: 0, y: 0 });
        setIsDying(false);
        setDeathProgress(0);
        setBlocks([]); // Clear blocks on respawn
      }
    };

    requestAnimationFrame(animate);
  }, [isDying]);

  // Get all reachable cells from player position using BFS
  const getReachableCells = useCallback(() => {
    const reachable = new Set();
    const queue = [{ x: playerPos.x, y: playerPos.y }];
    const visited = new Set([`${playerPos.x},${playerPos.y}`]);

    while (queue.length > 0) {
      const current = queue.shift();
      reachable.add(`${current.x},${current.y}`);

      // Check all 4 directions
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ];

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key) && isTraversable(neighbor.x, neighbor.y)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    return reachable;
  }, [playerPos, isTraversable]);

  // Get cells to render (only reachable cells)
  const getCellsToRender = useCallback(() => {
    const reachable = getReachableCells();
    const cells = [];

    for (const cellKey of reachable) {
      const [x, y] = cellKey.split(',').map(Number);
      cells.push({ x, y });
    }

    return cells;
  }, [getReachableCells]);

  const cellsToRender = getCellsToRender();

  return (
    <div className="game-container">
      <div
        className="game-world"
        style={{
          transform: `translate(${-cameraOffset.x}px, ${-cameraOffset.y}px)`
        }}
      >
        {/* Render grid cells */}
        {cellsToRender.map(cell => {
          const isPlayer = cell.x === playerPos.x && cell.y === playerPos.y;

          // Calculate death animation transform
          let transform = '';
          if (isPlayer && isDying) {
            const frequency = 8; // Number of oscillations
            const amplitude = 20; // Max displacement in pixels
            const sineWave = Math.sin(deathProgress * frequency * Math.PI * 2) * amplitude * (1 - deathProgress);
            const scale = 1 - deathProgress * 0.5; // Shrink as dying
            const rotation = deathProgress * 720; // Rotate 2 full turns
            transform = `translate(${sineWave}px, ${sineWave * 0.5}px) scale(${scale}) rotate(${rotation}deg)`;
          }

          return (
            <div
              key={`${cell.x},${cell.y}`}
              className={`grid-cell ${isPlayer ? 'active' : ''} ${isPlayer && isDying ? 'dying' : ''}`}
              style={{
                left: `${cell.x * CELL_SIZE}px`,
                top: `${cell.y * CELL_SIZE}px`,
                width: `${CELL_SIZE}px`,
                height: `${CELL_SIZE}px`,
                transform: transform,
                opacity: isPlayer && isDying ? 1 - deathProgress : 1,
              }}
            />
          );
        })}

        {/* Render blocks */}
        {blocks.map(block => (
          <div
            key={block.id}
            className="block"
            style={{
              left: `${block.x * CELL_SIZE}px`,
              top: `${block.y * CELL_SIZE}px`,
              width: `${CELL_SIZE}px`,
              height: `${CELL_SIZE}px`,
            }}
          />
        ))}
      </div>

      {/* Tutorial hint text */}
      {hintText && (
        <div className="hint-text">
          {hintText}
        </div>
      )}

      {/* Config uploader */}
      <ConfigUploader onKeybindingsUpdate={setKeybindings} />

      {/* Keybindings display */}
      <div className="keybindings-display">
        <div className="keybinding-item">← {formatKeybinding(keybindings.left)}</div>
        <div className="keybinding-item">↓ {formatKeybinding(keybindings.down)}</div>
        <div className="keybinding-item">↑ {formatKeybinding(keybindings.up)}</div>
        <div className="keybinding-item">→ {formatKeybinding(keybindings.right)}</div>
      </div>

    </div>
  );
}

export default Game;
