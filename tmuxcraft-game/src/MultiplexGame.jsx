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

  // Get covered and uncovered sub-segments for a line segment
  const getSegmentCoverage = useCallback((segment) => {
    const tolerance = 0.001;
    let coverageRanges;

    if (segment.type === 'vertical') {
      coverageRanges = panes
        .filter(pane =>
          Math.abs(pane.x1 - segment.position) < tolerance ||
          Math.abs(pane.x2 - segment.position) < tolerance
        )
        .map(pane => ({ start: pane.y1, end: pane.y2 }));
    } else {
      coverageRanges = panes
        .filter(pane =>
          Math.abs(pane.y1 - segment.position) < tolerance ||
          Math.abs(pane.y2 - segment.position) < tolerance
        )
        .map(pane => ({ start: pane.x1, end: pane.x2 }));
    }

    // Sort and merge overlapping ranges
    coverageRanges.sort((a, b) => a.start - b.start);
    const mergedRanges = [];

    for (const range of coverageRanges) {
      if (mergedRanges.length === 0) {
        mergedRanges.push({ ...range });
      } else {
        const lastRange = mergedRanges[mergedRanges.length - 1];
        if (range.start <= lastRange.end + tolerance) {
          // Merge overlapping ranges
          lastRange.end = Math.max(lastRange.end, range.end);
        } else {
          mergedRanges.push({ ...range });
        }
      }
    }

    // Generate sub-segments with coverage status
    const subSegments = [];
    let currentPos = segment.start;

    for (const range of mergedRanges) {
      // Add uncovered segment before this range (if any)
      if (range.start > currentPos + tolerance) {
        subSegments.push({
          start: currentPos,
          end: range.start,
          covered: false
        });
      }

      // Add covered segment (clipped to segment bounds)
      const coveredStart = Math.max(currentPos, range.start);
      const coveredEnd = Math.min(segment.end, range.end);
      if (coveredEnd > coveredStart + tolerance) {
        subSegments.push({
          start: coveredStart,
          end: coveredEnd,
          covered: true
        });
      }

      currentPos = Math.max(currentPos, range.end);
    }

    // Add final uncovered segment (if any)
    if (currentPos < segment.end - tolerance) {
      subSegments.push({
        start: currentPos,
        end: segment.end,
        covered: false
      });
    }

    return subSegments;
  }, [panes]);

  // Check if a line segment is covered by pane boundaries
  const isSegmentCovered = useCallback((segment) => {
    const subSegments = getSegmentCoverage(segment);
    return subSegments.every(sub => sub.covered);
  }, [getSegmentCoverage]);

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

  // Delete the active pane (tmux-style: merge with adjacent sibling pane)
  const deletePane = useCallback(() => {
    // Can't delete if it's the only pane
    if (panes.length <= 1) return;

    const activePane = panes.find(p => p.id === activePaneId);
    if (!activePane) return;

    const tolerance = 0.001;

    // Find all adjacent panes and calculate shared edge lengths
    const adjacentPanes = panes
      .filter(p => p.id !== activePaneId)
      .map(p => {
        let sharedEdgeLength = 0;
        let direction = null;
        let edgeType = null;

        // Check vertical edges (left or right)
        if (Math.abs(p.x2 - activePane.x1) < tolerance) {
          // Left neighbor
          const overlapStart = Math.max(p.y1, activePane.y1);
          const overlapEnd = Math.min(p.y2, activePane.y2);
          if (overlapEnd > overlapStart) {
            sharedEdgeLength = overlapEnd - overlapStart;
            direction = 'left';
            edgeType = 'vertical';
          }
        } else if (Math.abs(p.x1 - activePane.x2) < tolerance) {
          // Right neighbor
          const overlapStart = Math.max(p.y1, activePane.y1);
          const overlapEnd = Math.min(p.y2, activePane.y2);
          if (overlapEnd > overlapStart) {
            sharedEdgeLength = overlapEnd - overlapStart;
            direction = 'right';
            edgeType = 'vertical';
          }
        }

        // Check horizontal edges (top or bottom)
        if (Math.abs(p.y2 - activePane.y1) < tolerance) {
          // Top neighbor
          const overlapStart = Math.max(p.x1, activePane.x1);
          const overlapEnd = Math.min(p.x2, activePane.x2);
          if (overlapEnd > overlapStart) {
            const length = overlapEnd - overlapStart;
            if (length > sharedEdgeLength) {
              sharedEdgeLength = length;
              direction = 'top';
              edgeType = 'horizontal';
            }
          }
        } else if (Math.abs(p.y1 - activePane.y2) < tolerance) {
          // Bottom neighbor
          const overlapStart = Math.max(p.x1, activePane.x1);
          const overlapEnd = Math.min(p.x2, activePane.x2);
          if (overlapEnd > overlapStart) {
            const length = overlapEnd - overlapStart;
            if (length > sharedEdgeLength) {
              sharedEdgeLength = length;
              direction = 'bottom';
              edgeType = 'horizontal';
            }
          }
        }

        return { pane: p, sharedEdgeLength, direction, edgeType };
      })
      .filter(item => item.sharedEdgeLength > 0);

    if (adjacentPanes.length === 0) {
      // No adjacent panes, shouldn't happen but handle gracefully
      setPanes(prevPanes => prevPanes.filter(p => p.id !== activePaneId));
      if (panes.length > 1) setActivePaneId(panes.find(p => p.id !== activePaneId).id);
      return;
    }

    // Sort by shared edge length (longest edge first) - this finds the "sibling" pane
    adjacentPanes.sort((a, b) => b.sharedEdgeLength - a.sharedEdgeLength);
    const { pane: expandingPane, direction } = adjacentPanes[0];

    setPanes(prevPanes => {
      return prevPanes.map(p => {
        if (p.id === expandingPane.id) {
          // Expand this pane to absorb the deleted pane
          const newPane = { ...p };

          switch (direction) {
            case 'left':
              // Expanding pane is to the left, extend right edge
              newPane.x2 = Math.max(newPane.x2, activePane.x2);
              break;
            case 'right':
              // Expanding pane is to the right, extend left edge
              newPane.x1 = Math.min(newPane.x1, activePane.x1);
              break;
            case 'top':
              // Expanding pane is above, extend bottom edge
              newPane.y2 = Math.max(newPane.y2, activePane.y2);
              break;
            case 'bottom':
              // Expanding pane is below, extend top edge
              newPane.y1 = Math.min(newPane.y1, activePane.y1);
              break;
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

        {/* Render target line segments with partial coverage */}
        {targetLine.map((segment, idx) => {
          const subSegments = getSegmentCoverage(segment);

          return subSegments.map((subSeg, subIdx) => {
            if (segment.type === 'vertical') {
              return (
                <div
                  key={`${idx}-${subIdx}`}
                  className={`line-segment ${subSeg.covered ? 'covered' : 'uncovered'}`}
                  style={{
                    left: `${segment.position * 100}%`,
                    top: `${subSeg.start * 100}%`,
                    width: '4px',
                    height: `${(subSeg.end - subSeg.start) * 100}%`,
                    transform: 'translateX(-2px)'
                  }}
                />
              );
            } else {
              return (
                <div
                  key={`${idx}-${subIdx}`}
                  className={`line-segment ${subSeg.covered ? 'covered' : 'uncovered'}`}
                  style={{
                    left: `${subSeg.start * 100}%`,
                    top: `${segment.position * 100}%`,
                    width: `${(subSeg.end - subSeg.start) * 100}%`,
                    height: '4px',
                    transform: 'translateY(-2px)'
                  }}
                />
              );
            }
          });
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
