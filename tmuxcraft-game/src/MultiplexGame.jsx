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

  // Helper function to check if ranges collectively cover the target segment
  const isContinuouslyCovered = useCallback((targetStart, targetEnd, ranges, tolerance) => {
    if (ranges.length === 0) return false;

    // Sort ranges by start position
    ranges.sort((a, b) => a.start - b.start);

    // Check if ranges cover [targetStart, targetEnd] continuously
    let covered = targetStart;

    for (const range of ranges) {
      // If there's a gap, we're not covered
      if (range.start > covered + tolerance) return false;

      // Extend coverage to the end of this range
      covered = Math.max(covered, range.end);

      // If we've covered past the target end, we're done
      if (covered >= targetEnd - tolerance) return true;
    }

    return false;
  }, []);

  // Check if a line segment is covered by pane boundaries
  const isSegmentCovered = useCallback((segment) => {
    const tolerance = 0.001; // Small tolerance for floating point comparison

    if (segment.type === 'vertical') {
      // Collect all y-ranges of panes that have a boundary at segment.position
      const coverageRanges = panes
        .filter(pane =>
          Math.abs(pane.x1 - segment.position) < tolerance ||
          Math.abs(pane.x2 - segment.position) < tolerance
        )
        .map(pane => ({ start: pane.y1, end: pane.y2 }));

      return isContinuouslyCovered(segment.start, segment.end, coverageRanges, tolerance);
    } else {
      // Horizontal line - collect all x-ranges
      const coverageRanges = panes
        .filter(pane =>
          Math.abs(pane.y1 - segment.position) < tolerance ||
          Math.abs(pane.y2 - segment.position) < tolerance
        )
        .map(pane => ({ start: pane.x1, end: pane.x2 }));

      return isContinuouslyCovered(segment.start, segment.end, coverageRanges, tolerance);
    }
  }, [panes, isContinuouslyCovered]);

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

  // Delete the active pane (tmux-style: expand adjacent pane to fill space)
  const deletePane = useCallback(() => {
    // Can't delete if it's the only pane
    if (panes.length <= 1) return;

    const activePane = panes.find(p => p.id === activePaneId);
    if (!activePane) return;

    const tolerance = 0.001;

    // Find adjacent panes (panes that share an edge with the active pane)
    const adjacentPanes = panes.filter(p => {
      if (p.id === activePaneId) return false;

      // Check if they share a vertical edge (left or right)
      const sharesLeft = Math.abs(p.x2 - activePane.x1) < tolerance &&
        p.y1 < activePane.y2 && p.y2 > activePane.y1;
      const sharesRight = Math.abs(p.x1 - activePane.x2) < tolerance &&
        p.y1 < activePane.y2 && p.y2 > activePane.y1;

      // Check if they share a horizontal edge (top or bottom)
      const sharesTop = Math.abs(p.y2 - activePane.y1) < tolerance &&
        p.x1 < activePane.x2 && p.x2 > activePane.x1;
      const sharesBottom = Math.abs(p.y1 - activePane.y2) < tolerance &&
        p.x1 < activePane.x2 && p.x2 > activePane.x1;

      return sharesLeft || sharesRight || sharesTop || sharesBottom;
    });

    if (adjacentPanes.length === 0) {
      // No adjacent panes, just delete it
      setPanes(prevPanes => {
        const newPanes = prevPanes.filter(p => p.id !== activePaneId);
        if (newPanes.length > 0) {
          setActivePaneId(newPanes[0].id);
        }
        return newPanes;
      });
      return;
    }

    // Pick the first adjacent pane to expand (tmux typically chooses based on direction)
    const expandingPane = adjacentPanes[0];

    setPanes(prevPanes => {
      return prevPanes.map(p => {
        if (p.id === expandingPane.id) {
          // Expand this pane to fill the deleted pane's space
          const newPane = { ...p };

          // Check which edge is shared and expand accordingly
          if (Math.abs(p.x2 - activePane.x1) < tolerance) {
            // Expanding pane is to the left, extend its right edge
            newPane.x2 = activePane.x2;
          } else if (Math.abs(p.x1 - activePane.x2) < tolerance) {
            // Expanding pane is to the right, extend its left edge
            newPane.x1 = activePane.x1;
          } else if (Math.abs(p.y2 - activePane.y1) < tolerance) {
            // Expanding pane is above, extend its bottom edge
            newPane.y2 = activePane.y2;
          } else if (Math.abs(p.y1 - activePane.y2) < tolerance) {
            // Expanding pane is below, extend its top edge
            newPane.y1 = activePane.y1;
          }

          return newPane;
        }
        return p;
      }).filter(p => p.id !== activePaneId);
    });

    // Set focus to the expanding pane
    setActivePaneId(expandingPane.id);
  }, [panes, activePaneId]);

  // Navigate to adjacent pane in a direction (with wrapping like tmux)
  const navigatePane = useCallback((direction) => {
    const activePane = panes.find(p => p.id === activePaneId);
    if (!activePane) return;

    const tolerance = 0.001;
    const centerX = (activePane.x1 + activePane.x2) / 2;
    const centerY = (activePane.y1 + activePane.y2) / 2;

    let candidates = [];

    if (direction === 'left') {
      // Find panes to the left (their right edge touches our left edge)
      candidates = panes.filter(p =>
        p.id !== activePaneId &&
        Math.abs(p.x2 - activePane.x1) < tolerance &&
        p.y1 < activePane.y2 && p.y2 > activePane.y1
      );

      // If no candidates and we're at the left edge, wrap to the right
      if (candidates.length === 0 && activePane.x1 < tolerance) {
        candidates = panes.filter(p =>
          p.id !== activePaneId &&
          Math.abs(p.x1 - 1) < tolerance && // Rightmost panes
          p.y1 < activePane.y2 && p.y2 > activePane.y1
        );
      }
    } else if (direction === 'right') {
      candidates = panes.filter(p =>
        p.id !== activePaneId &&
        Math.abs(p.x1 - activePane.x2) < tolerance &&
        p.y1 < activePane.y2 && p.y2 > activePane.y1
      );

      // If no candidates and we're at the right edge, wrap to the left
      if (candidates.length === 0 && Math.abs(activePane.x2 - 1) < tolerance) {
        candidates = panes.filter(p =>
          p.id !== activePaneId &&
          p.x1 < tolerance && // Leftmost panes
          p.y1 < activePane.y2 && p.y2 > activePane.y1
        );
      }
    } else if (direction === 'up') {
      candidates = panes.filter(p =>
        p.id !== activePaneId &&
        Math.abs(p.y2 - activePane.y1) < tolerance &&
        p.x1 < activePane.x2 && p.x2 > activePane.x1
      );

      // If no candidates and we're at the top edge, wrap to the bottom
      if (candidates.length === 0 && activePane.y1 < tolerance) {
        candidates = panes.filter(p =>
          p.id !== activePaneId &&
          Math.abs(p.y1 - 1) < tolerance && // Bottom panes
          p.x1 < activePane.x2 && p.x2 > activePane.x1
        );
      }
    } else if (direction === 'down') {
      candidates = panes.filter(p =>
        p.id !== activePaneId &&
        Math.abs(p.y1 - activePane.y2) < tolerance &&
        p.x1 < activePane.x2 && p.x2 > activePane.x1
      );

      // If no candidates and we're at the bottom edge, wrap to the top
      if (candidates.length === 0 && Math.abs(activePane.y2 - 1) < tolerance) {
        candidates = panes.filter(p =>
          p.id !== activePaneId &&
          p.y1 < tolerance && // Top panes
          p.x1 < activePane.x2 && p.x2 > activePane.x1
        );
      }
    }

    if (candidates.length > 0) {
      // Pick the closest candidate
      setActivePaneId(candidates[0].id);
    }
  }, [panes, activePaneId]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+q: vertical split
      if (e.altKey && e.key === 'q') {
        e.preventDefault();
        splitVertical();
      }
      // Alt+w: horizontal split
      else if (e.altKey && e.key === 'w') {
        e.preventDefault();
        splitHorizontal();
      }
      // Alt+c: delete pane
      else if (e.altKey && e.key === 'c') {
        e.preventDefault();
        deletePane();
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
  }, [splitHorizontal, splitVertical, deletePane, navigatePane]);

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
        <div className="control-item">Alt+Q: Split Vertical</div>
        <div className="control-item">Alt+W: Split Horizontal</div>
        <div className="control-item">Alt+C: Delete Pane</div>
        <div className="control-item">Alt+HJKL: Navigate Panes</div>
      </div>
    </div>
  );
}

export default MultiplexGame;
