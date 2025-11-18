import { useState, useEffect, useCallback } from 'react';
import './MultiplexGame.css';

function MultiplexGame() {
  // Panes: { id, x1, y1, x2, y2 } where coordinates are fractions [0, 1]
  const [panes, setPanes] = useState([
    { id: 1, x1: 0, y1: 0, x2: 1, y2: 1 } // Start with one full-screen pane
  ]);

  const [activePaneId, setActivePaneId] = useState(1);
  const [level, setLevel] = useState(1);

  // Generate a random bent line for the current level
  const generateLine = useCallback((levelNum) => {
    // Line segments: { type: 'vertical' | 'horizontal', position, start, end }
    // Start simple, get more complex with higher levels

    if (levelNum === 1) {
      // Simple: one vertical line at 0.5
      return [
        { type: 'vertical', position: 0.5, start: 0, end: 1 }
      ];
    } else if (levelNum === 2) {
      // L-shape: vertical then horizontal
      return [
        { type: 'vertical', position: 0.5, start: 0, end: 0.5 },
        { type: 'horizontal', position: 0.5, start: 0.5, end: 1 }
      ];
    } else {
      // Random bent line
      const numSegments = Math.min(2 + Math.floor(levelNum / 2), 5);
      const segments = [];
      let currentType = Math.random() < 0.5 ? 'vertical' : 'horizontal';
      let currentPos = Math.random() * 0.6 + 0.2; // 0.2 to 0.8
      let lastEnd = 0;

      for (let i = 0; i < numSegments; i++) {
        const segmentLength = (1 - lastEnd) / (numSegments - i) * (0.5 + Math.random() * 0.5);
        const end = Math.min(lastEnd + segmentLength, 1);

        segments.push({
          type: currentType,
          position: currentPos,
          start: lastEnd,
          end: end
        });

        lastEnd = end;
        // Switch direction and position
        currentType = currentType === 'vertical' ? 'horizontal' : 'vertical';
        currentPos = Math.random() * 0.6 + 0.2;
      }

      return segments;
    }
  }, []);

  const [targetLine, setTargetLine] = useState(() => generateLine(1));

  // Check if a line segment is covered by pane boundaries
  const isSegmentCovered = useCallback((segment) => {
    const tolerance = 0.001; // Small tolerance for floating point comparison

    if (segment.type === 'vertical') {
      // Check if any pane has a vertical boundary at segment.position
      // that covers the range [segment.start, segment.end]
      return panes.some(pane => {
        const hasVerticalBoundary =
          Math.abs(pane.x1 - segment.position) < tolerance ||
          Math.abs(pane.x2 - segment.position) < tolerance;

        if (!hasVerticalBoundary) return false;

        // Check if this boundary covers the segment's y range
        return pane.y1 <= segment.start + tolerance && pane.y2 >= segment.end - tolerance;
      });
    } else {
      // Horizontal line
      return panes.some(pane => {
        const hasHorizontalBoundary =
          Math.abs(pane.y1 - segment.position) < tolerance ||
          Math.abs(pane.y2 - segment.position) < tolerance;

        if (!hasHorizontalBoundary) return false;

        // Check if this boundary covers the segment's x range
        return pane.x1 <= segment.start + tolerance && pane.x2 >= segment.end - tolerance;
      });
    }
  }, [panes]);

  // Check if all segments are covered
  const isLineCovered = useCallback(() => {
    return targetLine.every(segment => isSegmentCovered(segment));
  }, [targetLine, isSegmentCovered]);

  // Level progression
  useEffect(() => {
    if (isLineCovered()) {
      const timer = setTimeout(() => {
        const nextLevel = level + 1;
        setLevel(nextLevel);
        setTargetLine(generateLine(nextLevel));
        // Reset to one pane
        setPanes([{ id: Date.now(), x1: 0, y1: 0, x2: 1, y2: 1 }]);
        setActivePaneId(Date.now());
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLineCovered, level, generateLine]);

  // Split active pane horizontally (Alt+q) - hotdog style
  const splitHorizontal = useCallback(() => {
    setPanes(prevPanes => {
      const activePane = prevPanes.find(p => p.id === activePaneId);
      if (!activePane) return prevPanes;

      const midY = (activePane.y1 + activePane.y2) / 2;
      const newId = Date.now();

      return [
        ...prevPanes.filter(p => p.id !== activePaneId),
        { ...activePane, y2: midY }, // Top half
        { id: newId, x1: activePane.x1, y1: midY, x2: activePane.x2, y2: activePane.y2 } // Bottom half
      ];
    });
  }, [activePaneId]);

  // Split active pane vertically (Alt+w) - hamburger style
  const splitVertical = useCallback(() => {
    setPanes(prevPanes => {
      const activePane = prevPanes.find(p => p.id === activePaneId);
      if (!activePane) return prevPanes;

      const midX = (activePane.x1 + activePane.x2) / 2;
      const newId = Date.now();

      return [
        ...prevPanes.filter(p => p.id !== activePaneId),
        { ...activePane, x2: midX }, // Left half
        { id: newId, x1: midX, y1: activePane.y1, x2: activePane.x2, y2: activePane.y2 } // Right half
      ];
    });
  }, [activePaneId]);

  // Navigate to adjacent pane in a direction
  const navigatePane = useCallback((direction) => {
    const activePane = panes.find(p => p.id === activePaneId);
    if (!activePane) return;

    const centerX = (activePane.x1 + activePane.x2) / 2;
    const centerY = (activePane.y1 + activePane.y2) / 2;

    let candidates = [];

    if (direction === 'left') {
      // Find panes to the left (their right edge touches our left edge)
      candidates = panes.filter(p =>
        p.id !== activePaneId &&
        Math.abs(p.x2 - activePane.x1) < 0.001 &&
        p.y1 < activePane.y2 && p.y2 > activePane.y1
      );
    } else if (direction === 'right') {
      candidates = panes.filter(p =>
        p.id !== activePaneId &&
        Math.abs(p.x1 - activePane.x2) < 0.001 &&
        p.y1 < activePane.y2 && p.y2 > activePane.y1
      );
    } else if (direction === 'up') {
      candidates = panes.filter(p =>
        p.id !== activePaneId &&
        Math.abs(p.y2 - activePane.y1) < 0.001 &&
        p.x1 < activePane.x2 && p.x2 > activePane.x1
      );
    } else if (direction === 'down') {
      candidates = panes.filter(p =>
        p.id !== activePaneId &&
        Math.abs(p.y1 - activePane.y2) < 0.001 &&
        p.x1 < activePane.x2 && p.x2 > activePane.x1
      );
    }

    if (candidates.length > 0) {
      // Pick the closest candidate
      setActivePaneId(candidates[0].id);
    }
  }, [panes, activePaneId]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+q: horizontal split
      if (e.altKey && e.key === 'q') {
        e.preventDefault();
        splitHorizontal();
      }
      // Alt+w: vertical split
      else if (e.altKey && e.key === 'w') {
        e.preventDefault();
        splitVertical();
      }
      // Alt+h: navigate left
      else if (e.altKey && e.key === 'h') {
        e.preventDefault();
        navigatePane('left');
      }
      // Alt+j: navigate down
      else if (e.altKey && e.key === 'j') {
        e.preventDefault();
        navigatePane('down');
      }
      // Alt+k: navigate up
      else if (e.altKey && e.key === 'k') {
        e.preventDefault();
        navigatePane('up');
      }
      // Alt+l: navigate right
      else if (e.altKey && e.key === 'l') {
        e.preventDefault();
        navigatePane('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [splitHorizontal, splitVertical, navigatePane]);

  return (
    <div className="multiplex-container">
      <div className="multiplex-world">
        {/* Render panes */}
        {panes.map(pane => (
          <div
            key={pane.id}
            className={`terminal-pane ${pane.id === activePaneId ? 'active' : ''}`}
            style={{
              left: `${pane.x1 * 100}%`,
              top: `${pane.y1 * 100}%`,
              width: `${(pane.x2 - pane.x1) * 100}%`,
              height: `${(pane.y2 - pane.y1) * 100}%`,
            }}
          />
        ))}

        {/* Render target line segments */}
        {targetLine.map((segment, idx) => {
          const isCovered = isSegmentCovered(segment);

          if (segment.type === 'vertical') {
            return (
              <div
                key={idx}
                className={`line-segment ${isCovered ? 'covered' : 'uncovered'}`}
                style={{
                  left: `${segment.position * 100}%`,
                  top: `${segment.start * 100}%`,
                  width: '4px',
                  height: `${(segment.end - segment.start) * 100}%`,
                  transform: 'translateX(-2px)'
                }}
              />
            );
          } else {
            return (
              <div
                key={idx}
                className={`line-segment ${isCovered ? 'covered' : 'uncovered'}`}
                style={{
                  left: `${segment.start * 100}%`,
                  top: `${segment.position * 100}%`,
                  width: `${(segment.end - segment.start) * 100}%`,
                  height: '4px',
                  transform: 'translateY(-2px)'
                }}
              />
            );
          }
        })}
      </div>

      {/* Level indicator */}
      <div className="level-display">Level {level}</div>

      {/* Controls hint */}
      <div className="controls-display">
        <div className="control-item">Alt+Q: Split Horizontal</div>
        <div className="control-item">Alt+W: Split Vertical</div>
        <div className="control-item">Alt+HJKL: Navigate Panes</div>
      </div>
    </div>
  );
}

export default MultiplexGame;
