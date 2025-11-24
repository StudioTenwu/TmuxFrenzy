import { useState, useEffect, useCallback, useRef } from 'react';
import ConfigUploader from './ConfigUploader';
import './Game.css';

const CELL_SIZE = 240; // Size of each grid square in pixels 
const BLOCK_SPEED = 600; // ms per grid cell

// Default keybindings (tmux format)
const DEFAULT_KEYBINDINGS = {
  left: 'M-h',
  down: 'M-j',
  up: 'M-k',
  right: 'M-l',
};

function Game() {
  // Player position in grid coordinates (starts at center of new map)
  const [playerPos, setPlayerPos] = useState({ x: 2, y: 0 });

  // Camera offset (keeps player centered)
  const [cameraOffset, setCameraOffset] = useState({ x: 2 * CELL_SIZE, y: 0 });

  // Blocks (obstacles) - each has {id, x, y, direction}
  const [blocks, setBlocks] = useState([]);

  // Debug: Log whenever blocks state changes
  useEffect(() => {
    console.log(`[Blocks State] Updated - now ${blocks.length} blocks:`, blocks);
  }, [blocks]);

  // Tutorial state
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hintText, setHintText] = useState('');

  // Track which directions have been used (for first-time hints)
  const [usedDirections, setUsedDirections] = useState({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  // Keybindings (tmux format)
  const [keybindings, setKeybindings] = useState(DEFAULT_KEYBINDINGS);

  // Death/respawn state
  const [isDying, setIsDying] = useState(false);
  const [deathProgress, setDeathProgress] = useState(0);

  const tutorialTimerRef = useRef(null);
  const audioRef = useRef(null);
  const beatDataRef = useRef(null);
  const nextBeatIndexRef = useRef(0);
  const gameStartTimeRef = useRef(null);

  // Sine wave animation for border
  const [waveOffset, setWaveOffset] = useState(0);

  // Beat indicator pulse
  const [beatPulse, setBeatPulse] = useState(false);

  // Initialize and play background music + load beat data
  useEffect(() => {
    const audio = new Audio('/background_music.mp3');
    audio.loop = true;
    audio.volume = 0.3; // Set volume to 30%
    audioRef.current = audio;

    // Load beat data (with cache busting)
    fetch(`/beat_data.json?t=${Date.now()}`, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        beatDataRef.current = data;
        console.log(`Loaded ${data.beats.length} beats at ${data.tempo.toFixed(1)} BPM`);
        console.log(`  - First beat at: ${data.beats[0].toFixed(1)}ms (${(data.beats[0]/1000).toFixed(2)}s)`);
        console.log(`  - Source: ${data.source || 'unknown'}`);

        // Verify we got manual annotations
        if (data.beats[0] > 2800 && data.beats[0] < 2810 && data.beats.length === 413) {
          console.log('  ✓ Manual annotations loaded successfully!');
        } else if (data.beats[0] > 1090 && data.beats[0] < 1100) {
          console.warn('  ⚠ WARNING: ML-detected beats loaded (not manual annotations)');
          console.warn('  ⚠ Try hard refresh: Ctrl+Shift+R');
        }
      })
      .catch(err => console.error('Failed to load beat data:', err));

    // Play audio (with error handling for autoplay restrictions)
    const playAudio = async () => {
      try {
        await audio.play();
        gameStartTimeRef.current = Date.now();
        console.log('Game started, music playing');
      } catch (err) {
        console.log('Audio autoplay blocked. User interaction required.');
      }
    };

    playAudio();

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  // Animate wave offset
  useEffect(() => {
    const animationFrame = requestAnimationFrame(function animate() {
      setWaveOffset(prev => (prev + 0.3) % 240); // Shift wave continuously (1.5x speed)
      requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Generate sine wave path
  const generateWavePath = useCallback((side, offset = 0) => {
    const amplitude = 2.5; // Wave height
    const period = 120; // Wave length (doubled)
    // Extra large padding to account for glow filter (stdDeviation=4) + stroke width (3px)
    // Glow can extend ~12-15px beyond the path, so use generous padding
    const padding = 20;
    const points = [];

    if (side === 'top') {
      // Reversed for clockwise flow (right to left)
      for (let x = 0; x <= CELL_SIZE; x += 2) {
        const y = padding + amplitude * Math.sin(((x - offset) / period) * Math.PI * 2);
        points.push(`${x + padding},${y}`);
      }
      return `M ${points.join(' L ')}`;
    } else if (side === 'bottom') {
      // Normal direction (left to right) for clockwise flow
      for (let x = 0; x <= CELL_SIZE; x += 2) {
        const y = CELL_SIZE + padding + amplitude * Math.sin(((x + offset) / period) * Math.PI * 2);
        points.push(`${x + padding},${y}`);
      }
      return `M ${points.join(' L ')}`;
    } else if (side === 'left') {
      // Normal direction (bottom to top) for clockwise flow
      for (let y = 0; y <= CELL_SIZE; y += 2) {
        const x = padding + amplitude * Math.sin(((y + offset) / period) * Math.PI * 2);
        points.push(`${x},${y + padding}`);
      }
      return `M ${points.join(' L ')}`;
    } else if (side === 'right') {
      // Reversed for clockwise flow (top to bottom)
      for (let y = 0; y <= CELL_SIZE; y += 2) {
        const x = CELL_SIZE + padding + amplitude * Math.sin(((y - offset) / period) * Math.PI * 2);
        points.push(`${x},${y + padding}`);
      }
      return `M ${points.join(' L ')}`;
    }
  }, []);

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

    // New map shape (compact diamond/kite pattern):
    //  aa       row -2: x=1,2
    //  aaaa     row -1: x=1,2,3,4
    //   aaa     row  0: x=2,3,4
    //   aaaa    row  1: x=2,3,4,5
    //  aa       row  2: x=1,2

    // Row -2 (top)
    cells.add('1,-2');
    cells.add('2,-2');

    // Row -1
    cells.add('1,-1');
    cells.add('2,-1');
    cells.add('3,-1');
    cells.add('4,-1');

    // Row 0 (starting position at 2,0)
    cells.add('2,0');
    cells.add('3,0');
    cells.add('4,0');

    // Row 1
    cells.add('2,1');
    cells.add('3,1');
    cells.add('4,1');
    cells.add('5,1');

    // Row 2 (bottom)
    cells.add('1,2');
    cells.add('2,2');

    console.log('[Map] Traversable cells:', Array.from(cells).sort());
    return cells;
  });

  // Check if a cell is traversable
  const isTraversable = useCallback((x, y) => {
    return traversableCells.has(`${x},${y}`);
  }, [traversableCells]);

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

  // Spawn a block above or to the right of player
  const spawnBlock = useCallback(() => {
    // Randomly choose to spawn above or to the right
    const spawnAbove = Math.random() < 0.5;

    if (spawnAbove) {
      // Spawn above player, moving down
      // Add some horizontal variance (-2 to +2)
      const variance = Math.floor(Math.random() * 5) - 2;
      const spawnX = playerPos.x + variance;
      const spawnY = playerPos.y - 5; // 5 cells above

      return {
        id: Date.now() + Math.random(),
        x: spawnX,
        y: spawnY,
        direction: 'down',
      };
    } else {
      // Spawn to the right of player, moving left
      // Add some vertical variance (-2 to +2)
      const variance = Math.floor(Math.random() * 5) - 2;
      const spawnX = playerPos.x + 5; // 5 cells to the right
      const spawnY = playerPos.y + variance;

      return {
        id: Date.now() + Math.random(),
        x: spawnX,
        y: spawnY,
        direction: 'left',
      };
    }
  }, [playerPos]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log(`[KeyPress] Key: ${e.key}, Alt: ${e.altKey}, Ctrl: ${e.ctrlKey}, Shift: ${e.shiftKey}`);

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

      console.log(`[Movement] Trying to move ${direction}: (${playerPos.x},${playerPos.y}) → (${newX},${newY})`);
      console.log(`[Movement] isTraversable(${newX},${newY}):`, isTraversable(newX, newY));

      // Only move if the target cell is traversable
      if (isTraversable(newX, newY)) {
        console.log(`[Movement] ✓ Move allowed!`);
        setPlayerPos({ x: newX, y: newY });
        // Update camera to follow player
        setCameraOffset({ x: newX * CELL_SIZE, y: newY * CELL_SIZE });

        // Show hint on first use of each direction
        if (direction && !usedDirections[direction]) {
          const directionKeyMap = {
            left: keybindings.left,
            right: keybindings.right,
            up: keybindings.up,
            down: keybindings.down,
          };

          setHintText(formatKeybinding(directionKeyMap[direction]));
          setUsedDirections(prev => ({ ...prev, [direction]: true }));

          // Hide hint after 2 seconds
          setTimeout(() => setHintText(''), 2000);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, isTraversable, keybindings, matchesKeybinding, usedDirections, formatKeybinding]);

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
          setBlocks([{ id: Date.now(), x: 0, y: 5, direction: 'up' }]);
        }, 1000);
        break;

      case 2:
        // Step 2: Spawn blocks from top to teach left key
        setHintText(formatKeybinding(keybindings.left) || 'Alt+h');
        tutorialTimerRef.current = setTimeout(() => {
          setBlocks([{ id: Date.now(), x: 0, y: -5, direction: 'down' }]);
        }, 1000);
        break;

      case 3:
        // Step 3: Spawn blocks to teach right key
        setHintText(formatKeybinding(keybindings.right) || 'Alt+l');
        tutorialTimerRef.current = setTimeout(() => {
          setBlocks([{ id: Date.now(), x: -2, y: -3, direction: 'right' }]);
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

  // Block movement is now inline in beat handler to avoid React batching issues

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
        // Animation complete - respawn at starting position
        setPlayerPos({ x: 2, y: 0 });
        setCameraOffset({ x: 2 * CELL_SIZE, y: 0 * CELL_SIZE });
        setIsDying(false);
        setDeathProgress(0);
        setBlocks([]); // Clear blocks on respawn
      }
    };

    requestAnimationFrame(animate);
  }, [isDying]);

  // Beat-synchronized block spawning
  useEffect(() => {
    if (!beatDataRef.current || !gameStartTimeRef.current) {
      console.log('[Beat Spawn] Waiting for beat data and game start...');
      console.log('  - beatDataRef.current:', beatDataRef.current ? 'loaded' : 'null');
      console.log('  - gameStartTimeRef.current:', gameStartTimeRef.current);
      return; // Wait for beat data to load and game to start
    }

    console.log('[Beat Spawn] Starting beat spawn system');
    console.log('  - Total beats:', beatDataRef.current.beats.length);
    console.log('  - First beat at:', beatDataRef.current.beats[0], 'ms');
    console.log('  - Tempo:', beatDataRef.current.tempo, 'BPM');

    const checkBeatSpawn = () => {
      const currentTime = Date.now() - gameStartTimeRef.current;
      const beats = beatDataRef.current.beats;

      // Check if we've reached the next beat
      if (nextBeatIndexRef.current < beats.length) {
        const nextBeatTime = beats[nextBeatIndexRef.current];

        if (currentTime >= nextBeatTime) {
          console.log(`[Beat ${nextBeatIndexRef.current}] ♪ BEAT at ${currentTime.toFixed(0)}ms (expected: ${nextBeatTime.toFixed(0)}ms)`);

          // CRITICAL: Move blocks AND spawn in SINGLE setState to avoid React batching issues
          const newBlock = spawnBlock();
          const isDownbeat = beatDataRef.current.downbeats.includes(nextBeatTime);
          const extraBlock = isDownbeat && Math.random() < 0.5 ? spawnBlock() : null;

          setBlocks(prevBlocks => {
            // FIRST: Move all existing blocks
            const movedBlocks = prevBlocks.map(block => {
              let newX = block.x;
              let newY = block.y;

              switch (block.direction) {
                case 'up': newY = block.y - 1; break;
                case 'down': newY = block.y + 1; break;
                case 'left': newX = block.x - 1; break;
                case 'right': newX = block.x + 1; break;
              }

              if (block.id === prevBlocks[0]?.id) {
                console.log(`  [Move] (${block.x},${block.y}) → (${newX},${newY}) [${block.direction}]`);
              }

              return { ...block, x: newX, y: newY };
            }).filter(block => {
              // Remove blocks too far from player
              const distX = Math.abs(block.x - playerPos.x);
              const distY = Math.abs(block.y - playerPos.y);
              return distX < 20 && distY < 20;
            });

            // SECOND: Add new block(s) to the moved blocks
            const blocksToAdd = [newBlock, extraBlock].filter(b => b !== null);
            if (blocksToAdd.length > 0) {
              console.log(`  [Spawn] ${blocksToAdd.length} new block(s)`);
            }

            return [...movedBlocks, ...blocksToAdd];
          });

          // Trigger beat pulse animation
          setBeatPulse(true);
          setTimeout(() => setBeatPulse(false), 100);

          nextBeatIndexRef.current++;
        }
      } else {
        // Song finished, loop beats
        console.log('[Beat Spawn] Song finished, looping...');
        nextBeatIndexRef.current = 0;
        gameStartTimeRef.current = Date.now();
      }
    };

    // Check for beats more frequently for precision
    const beatCheckInterval = setInterval(checkBeatSpawn, 50); // Check every 50ms

    return () => {
      console.log('[Beat Spawn] Cleaning up beat spawn interval');
      clearInterval(beatCheckInterval);
    };
  }, [spawnBlock, playerPos]); // playerPos for distance filtering

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

          // Check which side this cell is adjacent to player (if any)
          let adjacentSide = null;
          if (!isPlayer) {
            if (cell.x === playerPos.x - 1 && cell.y === playerPos.y) adjacentSide = 'left';
            else if (cell.x === playerPos.x + 1 && cell.y === playerPos.y) adjacentSide = 'right';
            else if (cell.y === playerPos.y - 1 && cell.x === playerPos.x) adjacentSide = 'top';
            else if (cell.y === playerPos.y + 1 && cell.x === playerPos.x) adjacentSide = 'bottom';
          }

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
              className={`grid-cell ${isPlayer ? 'active' : ''} ${adjacentSide ? `adjacent-${adjacentSide}` : ''} ${isPlayer && isDying ? 'dying' : ''}`}
              style={{
                left: `${cell.x * CELL_SIZE}px`,
                top: `${cell.y * CELL_SIZE}px`,
                width: `${CELL_SIZE}px`,
                height: `${CELL_SIZE}px`,
                transform: transform,
                opacity: isPlayer && isDying ? 1 - deathProgress : 1,
              }}
            >
              {isPlayer && !isDying && (
                <svg
                  className="wavy-border"
                  width={CELL_SIZE + 40}
                  height={CELL_SIZE + 40}
                  viewBox={`0 0 ${CELL_SIZE + 40} ${CELL_SIZE + 40}`}
                  style={{
                    position: 'absolute',
                    top: -20,
                    left: -20,
                    pointerEvents: 'none',
                    overflow: 'visible',
                    zIndex: 100
                  }}
                >
                  <defs>
                    <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--purple-lighter)" />
                      <stop offset="50%" stopColor="var(--purple-light)" />
                      <stop offset="100%" stopColor="var(--purple-lighter)" />
                    </linearGradient>
                    {/* Enhanced multi-layer glow filter for bloom effect */}
                    <filter id="waveGlow" x="-100%" y="-100%" width="300%" height="300%">
                      {/* Inner bright glow */}
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1"/>
                      {/* Middle soft glow */}
                      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2"/>
                      {/* Outer bloom */}
                      <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur3"/>
                      {/* Far ambient light */}
                      <feGaussianBlur in="SourceGraphic" stdDeviation="25" result="blur4"/>
                      <feMerge>
                        <feMergeNode in="blur4"/>
                        <feMergeNode in="blur3"/>
                        <feMergeNode in="blur2"/>
                        <feMergeNode in="blur1"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Top wave */}
                  <path d={generateWavePath('top', waveOffset)} fill="none" stroke="url(#borderGradient)" strokeWidth="3" filter="url(#waveGlow)" />
                  {/* Right wave */}
                  <path d={generateWavePath('right', waveOffset)} fill="none" stroke="url(#borderGradient)" strokeWidth="3" filter="url(#waveGlow)" />
                  {/* Bottom wave */}
                  <path d={generateWavePath('bottom', waveOffset)} fill="none" stroke="url(#borderGradient)" strokeWidth="3" filter="url(#waveGlow)" />
                  {/* Left wave */}
                  <path d={generateWavePath('left', waveOffset)} fill="none" stroke="url(#borderGradient)" strokeWidth="3" filter="url(#waveGlow)" />
                </svg>
              )}
            </div>
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
            title={`Block at (${block.x}, ${block.y}) moving ${block.direction}`}
          >
            {/* Debug: show position */}
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              color: 'white',
              fontSize: '12px',
              fontFamily: 'monospace',
              textShadow: '0 0 3px black',
              pointerEvents: 'none'
            }}>
              ({block.x},{block.y})
            </div>
          </div>
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

      {/* Beat indicator */}
      <div className={`beat-indicator ${beatPulse ? 'pulse' : ''}`}>
        <div className="beat-icon">♪</div>
      </div>

    </div>
  );
}

export default Game;
