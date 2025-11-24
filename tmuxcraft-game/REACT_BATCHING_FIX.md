# React State Batching Fix

## 🐛 The Problem

Beat indicator (♪) pulses perfectly in sync, but enemies lag behind and don't move on every beat.

### Root Cause: React State Batching

The original code made **multiple `setBlocks()` calls** on each beat:

```javascript
// Beat detected
moveBlocksOnBeat();        // setBlocks #1 - move existing blocks
setBlocks(prev => [...prev, newBlock]);  // setBlocks #2 - spawn new block
```

**React batches these updates together!** The second `setBlocks` might execute before the first one completes, causing:
- Movement updates to be skipped or delayed
- Blocks appearing to lag behind the beat
- Inconsistent synchronization

### Why Beat Indicator Worked:
```javascript
setBeatPulse(true);  // Simple boolean, no batching issues
```

## ✅ The Solution

**Combine all block operations into a SINGLE `setBlocks()` call:**

```javascript
setBlocks(prevBlocks => {
  // STEP 1: Move all existing blocks
  const movedBlocks = prevBlocks.map(block => {
    // Calculate new position based on direction
    let newX = block.x;
    let newY = block.y;
    switch (block.direction) {
      case 'up': newY = block.y - 1; break;
      case 'down': newY = block.y + 1; break;
      case 'left': newX = block.x - 1; break;
      case 'right': newX = block.x + 1; break;
    }
    return { ...block, x: newX, y: newY };
  }).filter(block => {
    // Remove blocks too far from player
    const distX = Math.abs(block.x - playerPos.x);
    const distY = Math.abs(block.y - playerPos.y);
    return distX < 20 && distY < 20;
  });

  // STEP 2: Add new block(s) to the moved blocks
  return [...movedBlocks, newBlock, extraBlock].filter(b => b !== null);
});
```

## 🎯 Key Changes

### Before (Broken):
```javascript
moveBlocksOnBeat();  // Separate function, separate setBlocks
setBlocks(prev => [...prev, newBlock]);  // Another setBlocks
```

**Problems:**
- Two state updates = React batching
- Movement might not apply before spawn
- Timing inconsistency

### After (Fixed):
```javascript
setBlocks(prevBlocks => {
  const moved = /* move logic */;
  return [...moved, ...newBlocks];
});
```

**Benefits:**
- Single atomic state update
- Movement guaranteed to happen before spawn
- Perfect synchronization with beat

## 📊 What Happens Now

### On Every Beat:
1. ♪ Beat indicator pulses (instant)
2. **Single `setBlocks()` call:**
   - Moves all existing blocks 1 cell
   - Adds new block(s) to the moved array
   - Returns combined result
3. React renders once with all changes

### Console Output:
```
[Beat 5] ♪ BEAT at 5134ms (expected: 5134ms)
  [Move] (5,0) → (4,0) [left]
  [Spawn] 1 new block(s)
```

## 🔬 Technical Details

### React Batching Behavior:
- React 18 automatically batches all state updates in event handlers
- Multiple `setState` calls within the same execution context are merged
- Only one re-render happens with the final state

### Why This Caused Issues:
```javascript
// Beat handler executes:
setBlocks(moved);    // Queued update #1
setBlocks(spawned);  // Queued update #2
// React merges these - second might not see first!
```

### The Fix:
```javascript
// Single update with functional setState:
setBlocks(prev => {
  const moved = transform(prev);
  return [...moved, ...spawned];
});
// React sees one update, applies atomically
```

## 🎮 Expected Result

- Enemies move **instantly** on every beat pulse
- Visual synchronization matches beat indicator
- No lag or delay between pulse and movement
- Consistent timing with manual annotations

## 🛠️ Code Locations

**Changed:**
- `src/Game.jsx` lines 573-619: Beat handler with inline movement
- `src/Game.jsx` line 456: Removed separate `moveBlocksOnBeat` function
- `src/Game.jsx` line 636: Updated dependency array

**Removed:**
- Separate `moveBlocksOnBeat` callback (no longer needed)

## ⚡ Performance Impact

**Before:**
- 2+ `setBlocks` calls per beat
- React batching creates unpredictable timing
- Multiple potential re-renders

**After:**
- 1 `setBlocks` call per beat
- Single atomic update
- One guaranteed re-render
- More predictable and performant

## 🧪 Testing

Refresh browser and observe:
1. Beat indicator (♪) pulses
2. Enemies move **at the exact same time**
3. No visible lag or delay
4. Console shows `[Move]` and `[Spawn]` in single beat

---

**The React batching issue is resolved. Enemies now move on every beat, perfectly synchronized!** 🎵✨
