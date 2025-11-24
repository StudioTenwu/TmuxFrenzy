# Beat Sync Debugging Guide

## 🐛 Current Status

The beat synchronization system has been instrumented with comprehensive debug logging to identify why enemies aren't moving.

## 📊 Debug Logging Added

### Console Output You Should See:

1. **Audio/Beat Data Loading:**
   ```
   Loaded 419 beats at 123.0 BPM
   Game started, music playing
   ```

2. **Beat Spawn System Initialization:**
   ```
   [Beat Spawn] Starting beat spawn system
     - Total beats: 419
     - First beat at: 1091.3378684807255 ms
     - Tempo: 123.046875 BPM
   ```

3. **Beat Spawning (every ~480ms):**
   ```
   [Beat 0] Spawning at 1091ms (beat time: 1091ms)
     - Block spawned: {id: ..., x: 5, y: 0, direction: 'left'}
   [Blocks State] Updated - now 1 blocks: [{...}]
   ```

4. **Block Movement (every 600ms):**
   ```
   [Block Movement] Setting up continuous movement interval
   [Block Movement] Moved 1 blocks
   ```

5. **Collision Detection:**
   ```
   (Should show collision messages when player hits a block)
   ```

## 🧪 Testing Steps

### Step 1: Open the Test Page
```bash
# Make sure dev server is running
npm run dev

# Open in browser:
http://localhost:5173/test_beat_sync.html
```

This standalone test page will verify:
- ✅ Beat data file exists
- ✅ Audio file exists
- ✅ JSON structure is valid
- ✅ Beat timing synchronization works

### Step 2: Test the Game with Console Open
```bash
# Open the actual game
http://localhost:5173/

# Open browser console (F12) and watch for logs
```

### Step 3: Check Each System

**Expected Console Output Order:**
1. `[Block Movement] Setting up continuous movement interval`
2. `Loaded 419 beats at 123.0 BPM`
3. `Game started, music playing`
4. `[Beat Spawn] Starting beat spawn system`
5. After ~1 second: `[Beat 0] Spawning at ...`
6. `[Blocks State] Updated - now 1 blocks`
7. Every 600ms: `[Block Movement] Moved N blocks`

## 🔍 Common Issues to Check

### Issue 1: Beat Data Not Loading
**Symptoms:**
```
[Beat Spawn] Waiting for beat data and game start...
  - beatDataRef.current: null
```

**Fixes:**
- Check `public/beat_data.json` exists
- Verify fetch isn't blocked (CORS, 404)
- Check browser Network tab for failed requests

### Issue 2: Game Start Time Not Set
**Symptoms:**
```
[Beat Spawn] Waiting for beat data and game start...
  - gameStartTimeRef.current: null
```

**Fixes:**
- Check if audio playback was blocked (autoplay policy)
- Try clicking on the page first
- Check browser console for audio errors

### Issue 3: Blocks Spawn But Don't Move
**Symptoms:**
```
[Beat 0] Spawning at 1091ms (beat time: 1091ms)
[Blocks State] Updated - now 1 blocks: [...]
(No movement logs after this)
```

**Fixes:**
- Check if `[Block Movement] Setting up continuous movement interval` appears
- Verify `BLOCK_SPEED` constant is defined (should be 600)
- Check if interval is being cleared prematurely

### Issue 4: No Blocks Spawning
**Symptoms:**
```
[Beat Spawn] Starting beat spawn system
(No beat spawn logs after waiting 1+ seconds)
```

**Fixes:**
- Check current time is advancing: add `console.log(currentTime)` in checkBeatSpawn
- Verify `nextBeatIndexRef.current` is 0
- Check if `spawnBlock()` is returning valid objects

## 🧰 Manual Tests

### Test 1: Force Spawn a Block
Add to browser console:
```javascript
// Force spawn a test block
window.testBlock = () => {
  const block = {
    id: Date.now(),
    x: 0,
    y: -5,
    direction: 'down'
  };
  console.log('Manual test block:', block);
  // You'll need to access the setBlocks from React DevTools
};
```

### Test 2: Check Beat Timing Accuracy
In console during gameplay:
```javascript
// Check if we're hitting beats at the right time
let lastBeatTime = Date.now();
setInterval(() => {
  const now = Date.now();
  console.log('Time since last check:', now - lastBeatTime, 'ms');
  lastBeatTime = now;
}, 500);
```

### Test 3: Verify Block State
Using React DevTools:
1. Open React DevTools
2. Find the `Game` component
3. Inspect `blocks` state
4. Should update every beat

## 📝 Key Code Locations

### Beat Data Loading
- **File**: `src/Game.jsx`
- **Lines**: 54-87
- **Function**: Audio initialization + fetch beat data

### Beat Spawning Logic
- **File**: `src/Game.jsx`
- **Lines**: 523-589
- **Function**: `checkBeatSpawn()` inside useEffect

### Block Movement Logic
- **File**: `src/Game.jsx`
- **Lines**: 435-492
- **Function**: setInterval with setBlocks

### Block Spawn Function
- **File**: `src/Game.jsx`
- **Lines**: 295-327
- **Function**: `spawnBlock()`

## 🎯 Expected Behavior

Once working correctly:
1. Music starts playing
2. Beat indicator (♪) pulses every ~480ms
3. Blue blocks spawn at player position ± 5 cells
4. Blocks move toward player at 600ms per cell
5. Player dies on collision, respawns at origin

## 🚨 Critical Dependency Check

The block movement useEffect should have minimal dependencies:
```javascript
useEffect(() => {
  // Movement interval setup
}, [playerPos]); // Only re-create when player moves
```

NOT:
```javascript
}, [blocks, playerPos]); // ❌ Would recreate interval constantly
```

## 📞 Still Not Working?

If blocks still aren't moving after checking all the above:

1. **Check the browser console** - paste all logs here
2. **Run test page** - does beat detection work there?
3. **Verify files exist**:
   ```bash
   ls -lh public/beat_data.json public/background_music.mp3
   ```
4. **Check for JavaScript errors** in console (red text)
5. **Try different browser** (Chrome/Firefox/Safari)

## 🔬 Advanced Debugging

### Enable React DevTools Profiler
1. Install React DevTools extension
2. Open Profiler tab
3. Record a session
4. Check if `setBlocks` is being called

### Network Tab Debugging
1. Open Network tab (F12)
2. Refresh page
3. Check for:
   - `beat_data.json` (should be 200 OK, ~13KB)
   - `background_music.mp3` (should be 200 OK, ~5.8MB)

### Performance Tab
1. Open Performance tab
2. Record for 5 seconds
3. Check if intervals are running:
   - Should see setInterval callbacks every 50ms (beat check)
   - Should see setInterval callbacks every 600ms (block movement)

---

**After debugging, when it works, remove/reduce the console.log statements for production!**
