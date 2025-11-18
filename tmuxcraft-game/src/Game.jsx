import { useState, useEffect, useCallback, useRef } from 'react';
import './Game.css';

const CELL_SIZE = 240; // Size of each grid square in pixels (4x bigger)
const BLOCK_SPEED = 600; // ms per grid cell

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

  const tutorialTimerRef = useRef(null);

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
      // Check if Alt key is pressed
      if (!e.altKey) return;

      let newX = playerPos.x;
      let newY = playerPos.y;

      switch (e.key.toLowerCase()) {
        case 'h': // Left
          newX = playerPos.x - 1;
          break;
        case 'j': // Down
          newY = playerPos.y + 1;
          break;
        case 'k': // Up
          newY = playerPos.y - 1;
          break;
        case 'l': // Right
          newX = playerPos.x + 1;
          break;
        default:
          return;
      }

      // Only move if the target cell is traversable
      if (isTraversable(newX, newY)) {
        e.preventDefault();
        setPlayerPos({ x: newX, y: newY });
        // Update camera to follow player
        setCameraOffset({ x: newX * CELL_SIZE, y: newY * CELL_SIZE });

        // Tutorial progression
        if (tutorialStep === 0 && e.key.toLowerCase() === 'j') {
          setTutorialStep(1);
        } else if (tutorialStep === 1 && e.key.toLowerCase() === 'k') {
          setTutorialStep(2);
        } else if (tutorialStep === 2 && e.key.toLowerCase() === 'h') {
          setTutorialStep(3);
        } else if (tutorialStep === 3 && e.key.toLowerCase() === 'l') {
          setTutorialStep(4);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, isTraversable, tutorialStep]);

  // Tutorial sequence
  useEffect(() => {
    if (tutorialTimerRef.current) {
      clearTimeout(tutorialTimerRef.current);
    }

    switch (tutorialStep) {
      case 0:
        // Step 0: Show "alt + j" hint
        setHintText('alt + j');
        break;

      case 1:
        // Step 1: Spawn block coming from bottom, show "alt + k"
        setHintText('alt + k');
        tutorialTimerRef.current = setTimeout(() => {
          setBlocks([{ id: Date.now(), x: 0, y: 5 }]);
        }, 1000);
        break;

      case 2:
        // Step 2: Spawn blocks from top to teach "alt + h"
        setHintText('alt + h');
        tutorialTimerRef.current = setTimeout(() => {
          setBlocks([{ id: Date.now(), x: 0, y: -5 }]);
        }, 1000);
        break;

      case 3:
        // Step 3: Spawn blocks to teach "alt + l"
        setHintText('alt + l');
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
  }, [tutorialStep]);

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
          return (
            <div
              key={`${cell.x},${cell.y}`}
              className={`grid-cell ${isPlayer ? 'active' : ''}`}
              style={{
                left: `${cell.x * CELL_SIZE}px`,
                top: `${cell.y * CELL_SIZE}px`,
                width: `${CELL_SIZE}px`,
                height: `${CELL_SIZE}px`,
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

      {/* Debug info */}
      <div className="debug-info">
        Position: ({playerPos.x}, {playerPos.y}) | Step: {tutorialStep}
      </div>
    </div>
  );
}

export default Game;
