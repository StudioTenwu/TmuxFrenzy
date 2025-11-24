// Test the coverage detection logic

function isContinuouslyCovered(targetStart, targetEnd, ranges, tolerance) {
  if (ranges.length === 0) return false;

  // Sort ranges by start position
  ranges.sort((a, b) => a.start - b.start);

  // Check if ranges cover [targetStart, targetEnd] continuously
  let covered = targetStart;

  for (const range of ranges) {
    // If there's a gap, we're not covered
    if (range.start > covered + tolerance) {
      console.log(`Gap found: range.start (${range.start}) > covered (${covered}) + tolerance (${tolerance})`);
      return false;
    }

    // Extend coverage to the end of this range
    covered = Math.max(covered, range.end);

    // If we've covered past the target end, we're done
    if (covered >= targetEnd - tolerance) return true;
  }

  console.log(`Final coverage (${covered}) < targetEnd (${targetEnd})`);
  return false;
}

// Test case: Level 1 with horizontal split then two vertical splits
console.log('\n=== Test Case: Level 1 line at x=0.5, y: 0-1 ===\n');

// Final pane configuration after splits:
const panes = [
  { id: 1, x1: 0, y1: 0, x2: 0.5, y2: 0.5 },      // Top-left
  { id: 2, x1: 0.5, y1: 0, x2: 1, y2: 0.5 },      // Top-right
  { id: 3, x1: 0, y1: 0.5, x2: 0.5, y2: 1 },      // Bottom-left
  { id: 4, x1: 0.5, y1: 0.5, x2: 1, y2: 1 },      // Bottom-right
];

// Target: vertical line at x=0.5 from y: 0 to 1
const segment = { type: 'vertical', position: 0.5, start: 0, end: 1 };
const tolerance = 0.001;

console.log('Panes:', panes);
console.log('Target segment:', segment);
console.log('');

// Filter panes that have a boundary at x=0.5
const coverageRanges = panes
  .filter(pane =>
    Math.abs(pane.x1 - segment.position) < tolerance ||
    Math.abs(pane.x2 - segment.position) < tolerance
  )
  .map(pane => ({ start: pane.y1, end: pane.y2 }));

console.log('Panes with boundary at x=0.5:');
panes.forEach(pane => {
  const hasX1 = Math.abs(pane.x1 - segment.position) < tolerance;
  const hasX2 = Math.abs(pane.x2 - segment.position) < tolerance;
  if (hasX1 || hasX2) {
    console.log(`  Pane ${pane.id}: x1=${pane.x1} ${hasX1 ? '✓' : ''}, x2=${pane.x2} ${hasX2 ? '✓' : ''}, y: ${pane.y1}-${pane.y2}`);
  }
});

console.log('\nCoverage ranges:', coverageRanges);
console.log('');

const result = isContinuouslyCovered(segment.start, segment.end, coverageRanges, tolerance);

console.log('Result:', result ? 'COVERED ✓' : 'NOT COVERED ✗');
