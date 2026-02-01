# Player Controls - Fixed Bottom Bar

## TL;DR

> **Quick Summary**: Add a fixed-bottom player control bar with transport controls (play/pause, stop, skip), seek bar, time/measure display, and A-B loop functionality.
> 
> **Deliverables**:
> - Fixed-bottom player bar with all transport controls
> - Seek bar with position tracking and loop markers
> - Time and measure display
> - A-B loop with two-click mode
> - Remove redundant sidebar transport controls
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential (dependencies between tasks)
> **Critical Path**: HTML structure → CSS → Helper functions → Event handlers → Integration

---

## Context

### Original Request
Create player controls with: seek bar, skip forward/back buttons, loop section (A-B repeat), current time/duration display, measure number display, skip by measure, play/pause and stop. Fixed at bottom of screen.

### Interview Summary
**Key Discussions**:
- Skip amount: 1 measure per click
- A-B loop: Two-click mode (first click = A, second = B)
- Play/Pause: Combined toggle button
- Stop behavior: Reset to start (or to A point if loop active)
- Time display: Both time and measures - "1:23 (M. 12) / 4:56 (M. 48)"
- Loop indicator: Both markers on seek bar AND text display "Loop: M.4 → M.8"
- Style: Full-featured, touch-friendly

### Metis Review
**Identified Gaps** (addressed):
- Total duration calculation: Use last timelineRows entry + last event duration
- End-of-track behavior: Tone.Transport stops; handle in updatePlaybackHighlight
- Loop edge cases: A=B allowed (single measure), auto-swap if B < A, explicit Clear button
- Seek mechanics: Continuous (not snapped), dragging during playback allowed
- Sidebar buttons: Remove entirely

---

## Work Objectives

### Core Objective
Add a fixed-bottom player control bar that provides comprehensive playback control including seek, skip by measure, and A-B loop functionality.

### Concrete Deliverables
- `index.html`: New `<footer class="player-bar">` element with all controls
- `style.css`: Player bar styles (fixed positioning, responsive, touch-friendly)
- `main.js`: Helper functions, loop state, event handlers, RAF integration

### Definition of Done
- [x] Player bar visible at bottom when score is loaded
- [x] Play/Pause toggles playback state correctly
- [x] Stop resets to start (or loop A point)
- [x] Skip forward/back moves by 1 measure
- [x] Seek bar tracks playback position in real-time
- [x] Time display shows "1:23 (M. 12) / 4:56 (M. 48)" format
- [x] A-B loop works with two-click mode
- [x] Loop markers visible on seek bar
- [x] Loop text display shows "Loop: M.4 → M.8"
- [x] Clear loop button removes loop
- [x] Sidebar Play/Stop buttons removed
- [x] Touch-friendly (44px minimum touch targets)
- [x] Responsive at 480px, 720px, 900px viewports

### Must Have
- Fixed position at bottom of screen
- Play/Pause toggle button
- Stop button (reset to start or A point)
- Skip back/forward by 1 measure
- Seek bar with real-time position tracking
- Time display with both time and measure
- A-B loop with markers on seek bar
- Loop text display
- Clear loop button

### Must NOT Have (Guardrails)
- Keyboard shortcuts
- Waveform visualization
- Drag-and-drop measure markers
- Tempo control in player bar (keep in sidebar)
- Volume/mixer in player bar (keep in sidebar)
- Playback rate/pitch shifting
- Save/load loop presets
- Bookmarks or "recently used positions"
- Time tooltips on hover
- Persist loop markers to localStorage

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (no test framework set up)
- **User wants tests**: Manual verification via Playwright
- **Framework**: none
- **QA approach**: Manual verification with Playwright browser automation

---

## Execution Strategy

### Task Flow (Sequential)

```
Task 1: Add helper functions to main.js
    ↓
Task 2: Add loop state to main.js state object
    ↓
Task 3: Add player bar HTML to index.html
    ↓
Task 4: Add player bar CSS to style.css
    ↓
Task 5: Add player bar element references in main.js
    ↓
Task 6: Implement Play/Pause toggle
    ↓
Task 7: Implement Stop button
    ↓
Task 8: Implement Skip forward/back
    ↓
Task 9: Implement Seek bar with position tracking
    ↓
Task 10: Implement Time/Measure display
    ↓
Task 11: Implement A-B Loop functionality
    ↓
Task 12: Remove sidebar Play/Stop buttons
    ↓
Task 13: Show/hide player bar based on score ready state
    ↓
Task 14: Test all controls via Playwright
```

**Critical Path**: All tasks are sequential due to dependencies.

---

## TODOs

- [x] 1. Add helper functions for measure/duration calculations

  **What to do**:
  - Add `getMeasureStartSeconds(measureNumber)` - returns seconds for measure start
  - Add `getTotalDuration()` - returns total score duration in seconds
  - Add `getCurrentMeasure()` - returns current measure based on Transport position
  - Add `getTotalMeasures()` - returns total number of measures
  - Place these after existing utility functions (around line 490)

  **Must NOT do**:
  - Modify existing functions
  - Change state structure (yet)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused code additions
  - **Skills**: `[]`
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 8, 9, 10, 11
  - **Blocked By**: None

  **References**:
  - `src/main.js:223-242` - state object structure
  - `src/main.js:1012-1017` - timelineRows structure with timeBeats, timeSeconds, measure
  - `src/main.js:1000-1020` - buildTimelineRows function

  **Acceptance Criteria**:
  ```bash
  # Verify functions added and no syntax errors
  npm run build 2>&1 | grep -E "(error|Error)" && echo "FAIL" || echo "PASS"
  ```

  **Commit**: NO (groups with 2)

---

- [x] 2. Add loop state to state object

  **What to do**:
  - Add `loopA: null` to state object (measure number or null)
  - Add `loopB: null` to state object (measure number or null)
  - Add `loopASeconds: null` for cached seconds value
  - Add `loopBSeconds: null` for cached seconds value

  **Must NOT do**:
  - Add any other state properties
  - Modify existing state properties

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 11
  - **Blocked By**: None

  **References**:
  - `src/main.js:223-242` - state object location

  **Acceptance Criteria**:
  ```bash
  npm run build 2>&1 | grep -E "(error|Error)" && echo "FAIL" || echo "PASS"
  ```

  **Commit**: YES
  - Message: `feat(player): add helper functions and loop state`
  - Files: `src/main.js`

---

- [x] 3. Add player bar HTML structure

  **What to do**:
  - Add `<footer id="playerBar" class="player-bar" hidden>` before closing `</body>`
  - Structure:
    ```html
    <footer id="playerBar" class="player-bar" hidden>
      <div class="player-bar__controls">
        <button id="skipBackButton" class="player-bar__btn" title="Skip back 1 measure">⏮</button>
        <button id="playPauseButton" class="player-bar__btn player-bar__btn--primary" title="Play/Pause">▶</button>
        <button id="playerStopButton" class="player-bar__btn" title="Stop">⏹</button>
        <button id="skipForwardButton" class="player-bar__btn" title="Skip forward 1 measure">⏭</button>
      </div>
      <div class="player-bar__seek">
        <div class="player-bar__seek-track">
          <div id="loopMarkerA" class="player-bar__marker player-bar__marker--a" hidden></div>
          <div id="loopMarkerB" class="player-bar__marker player-bar__marker--b" hidden></div>
          <input type="range" id="seekBar" class="player-bar__seek-input" min="0" max="100" value="0" step="0.1">
        </div>
      </div>
      <div class="player-bar__time">
        <span id="currentTime">0:00 (M. 1)</span>
        <span class="player-bar__time-separator">/</span>
        <span id="totalTime">0:00 (M. 1)</span>
      </div>
      <div class="player-bar__loop">
        <button id="setLoopButton" class="player-bar__btn player-bar__btn--small" title="Set loop point">A/B</button>
        <span id="loopDisplay" class="player-bar__loop-display" hidden>Loop: --</span>
        <button id="clearLoopButton" class="player-bar__btn player-bar__btn--small" title="Clear loop" hidden>✕</button>
      </div>
    </footer>
    ```
  - Remove existing Play/Stop buttons from sidebar (lines 58-59)

  **Must NOT do**:
  - Add inline styles
  - Add event handlers in HTML

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: None

  **References**:
  - `index.html:58-59` - existing Play/Stop buttons to remove
  - `index.html` - overall structure

  **Acceptance Criteria**:
  ```bash
  # Verify HTML is valid (no unclosed tags)
  grep -c "player-bar" index.html | grep -q "1" && echo "PASS: player-bar found" || echo "FAIL"
  ```

  **Commit**: NO (groups with 4)

---

- [x] 4. Add player bar CSS styles

  **What to do**:
  - Add `.player-bar` styles: fixed bottom, full width, z-index 100, background matching app theme
  - Add `.player-bar__controls` flexbox for transport buttons
  - Add `.player-bar__btn` styles: 44px min touch target, consistent with existing `.btn` patterns
  - Add `.player-bar__btn--primary` for play/pause highlight
  - Add `.player-bar__seek` and `.player-bar__seek-track` for seek bar container
  - Add `.player-bar__marker` for A/B loop markers (absolute positioned)
  - Add `.player-bar__time` for time display
  - Add `.player-bar__loop` for loop controls
  - Add `body { padding-bottom: 70px; }` to prevent content occlusion
  - Add responsive styles for 480px, 720px viewports

  **Must NOT do**:
  - Create separate CSS file
  - Add animations beyond simple transitions
  - Change existing styles

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: CSS styling requires visual design sensibility
  - **Skills**: `["frontend-ui-ux"]`
    - Reason: Player bar needs to look polished and be touch-friendly

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Tasks 5-13
  - **Blocked By**: Task 3

  **References**:
  - `src/style.css` - existing styles, BEM patterns, color variables
  - `src/style.css` - `.btn` styles for consistency
  - `src/style.css` - responsive breakpoints (900px, 720px, 480px)

  **Acceptance Criteria**:
  ```bash
  npm run build 2>&1 | grep -E "(error|Error)" && echo "FAIL" || echo "PASS"
  ```
  
  **Playwright verification**:
  ```
  1. Navigate to http://localhost:5173
  2. Select a score to load
  3. Assert: #playerBar is visible at bottom of viewport
  4. Assert: #playerBar has position: fixed
  5. Set viewport to 480x800
  6. Assert: Player bar buttons are at least 44x44px
  ```

  **Commit**: YES
  - Message: `feat(player): add player control bar UI`
  - Files: `index.html`, `src/style.css`

---

- [x] 5. Add player bar element references in main.js

  **What to do**:
  - Add to `elements` object:
    ```javascript
    playerBar: document.getElementById("playerBar"),
    playPauseButton: document.getElementById("playPauseButton"),
    playerStopButton: document.getElementById("playerStopButton"),
    skipBackButton: document.getElementById("skipBackButton"),
    skipForwardButton: document.getElementById("skipForwardButton"),
    seekBar: document.getElementById("seekBar"),
    currentTime: document.getElementById("currentTime"),
    totalTime: document.getElementById("totalTime"),
    setLoopButton: document.getElementById("setLoopButton"),
    clearLoopButton: document.getElementById("clearLoopButton"),
    loopDisplay: document.getElementById("loopDisplay"),
    loopMarkerA: document.getElementById("loopMarkerA"),
    loopMarkerB: document.getElementById("loopMarkerB"),
    ```
  - Remove references to old `playButton` and `stopButton`

  **Must NOT do**:
  - Add event listeners yet
  - Change any functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Tasks 6-13
  - **Blocked By**: Task 3

  **References**:
  - `src/main.js:197-213` - existing elements object

  **Acceptance Criteria**:
  ```bash
  npm run build 2>&1 | grep -E "(error|Error)" && echo "FAIL" || echo "PASS"
  ```

  **Commit**: NO (groups with next)

---

- [x] 6. Implement Play/Pause toggle functionality

  **What to do**:
  - Add click handler for `playPauseButton`
  - If not playing: call `startPlayback()`, change icon to ❚❚
  - If playing: pause transport (`Tone.Transport.pause()`), change icon to ▶
  - Update `startPlayback()` to set button icon to ❚❚
  - Update `stopPlayback()` to set button icon to ▶
  - Remove old playButton/stopButton event handlers

  **Must NOT do**:
  - Change startPlayback/stopPlayback core logic
  - Add keyboard shortcuts

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 7
  - **Blocked By**: Task 5

  **References**:
  - `src/main.js:1141-1151` - startPlayback function
  - `src/main.js:1153-1170` - stopPlayback function
  - `src/main.js:1248-1256` - existing button handlers to remove

  **Acceptance Criteria**:
  **Playwright verification**:
  ```
  1. Navigate to http://localhost:5173
  2. Select a score
  3. Click #playPauseButton
  4. Assert: Tone.Transport.state === 'started' via page.evaluate
  5. Assert: #playPauseButton shows pause icon (textContent or class)
  6. Click #playPauseButton again
  7. Assert: Tone.Transport.state === 'paused'
  8. Assert: #playPauseButton shows play icon
  ```

  **Commit**: NO (groups with 7, 8)

---

- [x] 7. Implement Stop button functionality

  **What to do**:
  - Add click handler for `playerStopButton`
  - If loop active (state.loopA !== null): reset to loopASeconds
  - Else: reset to 0
  - Call `stopPlayback()` or reset Transport position
  - Ensure play/pause button shows ▶

  **Must NOT do**:
  - Clear the loop on stop
  - Add confirmation dialog

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 6

  **References**:
  - `src/main.js:1153-1170` - stopPlayback function

  **Acceptance Criteria**:
  **Playwright verification**:
  ```
  1. Start playback, wait 3 seconds
  2. Click #playerStopButton
  3. Assert: Tone.Transport.seconds === 0 (or loopASeconds if loop set)
  4. Assert: #playPauseButton shows play icon
  ```

  **Commit**: NO (groups with 8)

---

- [x] 8. Implement Skip forward/back by measure

  **What to do**:
  - Add click handler for `skipBackButton`:
    - Get current measure via `getCurrentMeasure()`
    - If measure > 0, seek to `getMeasureStartSeconds(measure - 1)`
    - Else stay at 0
  - Add click handler for `skipForwardButton`:
    - Get current measure
    - If measure < totalMeasures - 1, seek to `getMeasureStartSeconds(measure + 1)`
    - Else stay at current position
  - Use `Tone.Transport.seconds = newPosition` to seek

  **Must NOT do**:
  - Add debouncing (allow rapid clicks)
  - Skip multiple measures per click

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 7

  **References**:
  - Helper functions from Task 1
  - `src/main.js` - Tone.Transport usage patterns

  **Acceptance Criteria**:
  **Playwright verification**:
  ```
  1. Load score, start at beginning (M. 1)
  2. Click #skipForwardButton
  3. Assert: getCurrentMeasure() === 1 (0-indexed, so measure 2)
  4. Click #skipBackButton
  5. Assert: getCurrentMeasure() === 0 (back to measure 1)
  6. Click #skipBackButton at M.1
  7. Assert: Still at measure 0 (doesn't go negative)
  ```

  **Commit**: YES
  - Message: `feat(player): implement transport controls (play/pause, stop, skip)`
  - Files: `src/main.js`

---

- [x] 9. Implement Seek bar with position tracking

  **What to do**:
  - Set seek bar max to `getTotalDuration()` when score loads
  - Add `input` event handler: `Tone.Transport.seconds = seekBar.value`
  - Modify `updatePlaybackHighlight()` to also update seek bar value
  - Only update seek bar if user is not dragging (track with mousedown/mouseup or pointerdown/pointerup)
  - Pause auto-scroll when seeking

  **Must NOT do**:
  - Snap to measures
  - Add tick marks
  - Add waveform

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 11 (markers)
  - **Blocked By**: Task 8

  **References**:
  - `src/main.js:1067-1108` - updatePlaybackHighlight RAF loop
  - Helper functions from Task 1

  **Acceptance Criteria**:
  **Playwright verification**:
  ```
  1. Load score
  2. Start playback, wait 2 seconds
  3. Assert: seekBar.value > 0
  4. Set seekBar.value to 50% of duration
  5. Dispatch input event
  6. Assert: Tone.Transport.seconds is approximately 50% of duration
  ```

  **Commit**: NO (groups with 10)

---

- [x] 10. Implement Time/Measure display

  **What to do**:
  - Create `formatTime(seconds)` helper: returns "M:SS" format
  - Create `formatTimeDisplay(seconds, measure)` helper: returns "M:SS (M. N)" format
  - Update `currentTime` element in RAF loop with current position
  - Update `totalTime` element when score loads
  - Handle measure display as 1-indexed for user (measure + 1)

  **Must NOT do**:
  - Show milliseconds
  - Show hours (assume < 1 hour)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 9

  **References**:
  - Helper functions from Task 1
  - `src/main.js:1067-1108` - RAF loop to modify

  **Acceptance Criteria**:
  **Playwright verification**:
  ```
  1. Load score
  2. Assert: #totalTime matches format "N:NN (M. N)"
  3. Start playback, wait 2 seconds
  4. Assert: #currentTime shows time > 0:00
  5. Assert: #currentTime matches regex /\d+:\d{2} \(M\. \d+\)/
  ```

  **Commit**: YES
  - Message: `feat(player): implement seek bar and time display`
  - Files: `src/main.js`

---

- [x] 11. Implement A-B Loop functionality

  **What to do**:
  - Track loop state: `null` (no loop), `'settingA'`, `'settingB'`, `'active'`
  - `setLoopButton` click:
    - If no loop: set A to current measure, show marker, change button to "Set B"
    - If A set: set B to current measure (auto-swap if B < A), show marker, activate loop
  - `clearLoopButton` click: clear both markers, reset state
  - Position markers on seek bar using percentage: `(measureStartSeconds / totalDuration) * 100`
  - Update `loopDisplay` text: "Loop: M.4 → M.8"
  - In RAF loop: if playing and position > loopBSeconds, seek to loopASeconds
  - `stopPlayback`: if loop active, reset to loopASeconds instead of 0

  **Must NOT do**:
  - Persist loop to localStorage
  - Allow dragging markers
  - Add loop count limit

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Moderate complexity with state management
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 9

  **References**:
  - Task 2 loop state additions
  - `src/main.js:1067-1108` - RAF loop to add loop check
  - Helper functions from Task 1

  **Acceptance Criteria**:
  **Playwright verification**:
  ```
  1. Load score, seek to measure 4
  2. Click #setLoopButton
  3. Assert: #loopMarkerA is visible
  4. Seek to measure 8
  5. Click #setLoopButton
  6. Assert: #loopMarkerB is visible
  7. Assert: #loopDisplay shows "Loop: M.4 → M.8"
  8. Start playback, seek past B point
  9. Wait 100ms
  10. Assert: Tone.Transport.seconds < loopBSeconds (looped back)
  11. Click #clearLoopButton
  12. Assert: #loopMarkerA is hidden
  13. Assert: #loopMarkerB is hidden
  ```

  **Commit**: YES
  - Message: `feat(player): implement A-B loop functionality`
  - Files: `src/main.js`

---

- [x] 12. Remove sidebar Play/Stop buttons and update references

  **What to do**:
  - Remove old `playButton` and `stopButton` from elements object
  - Remove or update any remaining references to old buttons
  - Remove the buttons from index.html sidebar (should already be done in Task 3)
  - Update `startPlayback()` and `stopPlayback()` to use new button references
  - Ensure instrument change handler uses new button references

  **Must NOT do**:
  - Change core playback logic
  - Remove tempo controls

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 13
  - **Blocked By**: Task 11

  **References**:
  - `src/main.js:197-213` - elements object
  - `src/main.js:1141-1170` - startPlayback/stopPlayback
  - `src/main.js:1355-1415` - instrument change handler

  **Acceptance Criteria**:
  ```bash
  # No references to old playButton/stopButton
  grep -E "elements\.(playButton|stopButton)" src/main.js && echo "FAIL" || echo "PASS"
  npm run build 2>&1 | grep -E "(error|Error)" && echo "FAIL" || echo "PASS"
  ```

  **Commit**: NO (groups with 13)

---

- [x] 13. Show/hide player bar based on score ready state

  **What to do**:
  - In score load success: `elements.playerBar.hidden = false`
  - In `clearScore()`: `elements.playerBar.hidden = true`
  - Update total time display when score loads
  - Reset seek bar to 0 when score loads
  - Clear any active loop when score changes

  **Must NOT do**:
  - Animate show/hide
  - Persist visibility state

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 14
  - **Blocked By**: Task 12

  **References**:
  - `src/main.js:1215-1230` - clearScore function
  - `src/main.js:1330-1350` - score load success area

  **Acceptance Criteria**:
  **Playwright verification**:
  ```
  1. Navigate to http://localhost:5173
  2. Assert: #playerBar is hidden
  3. Select a score
  4. Wait for load
  5. Assert: #playerBar is visible
  6. Assert: #totalTime shows correct duration
  ```

  **Commit**: YES
  - Message: `feat(player): integrate player bar with score lifecycle`
  - Files: `src/main.js`, `index.html`

---

- [x] 14. Test all controls via Playwright

  **What to do**:
  - Run comprehensive Playwright test covering all features
  - Test at multiple viewports (1920x1080, 720x1280, 480x800)
  - Verify all acceptance criteria from previous tasks
  - Fix any issues found

  **Must NOT do**:
  - Skip any acceptance criteria
  - Ignore mobile viewport testing

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `["playwright"]`
    - Reason: Browser automation testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 13

  **References**:
  - All previous task acceptance criteria

  **Acceptance Criteria**:
  All previous task Playwright verifications pass.

  **Commit**: YES (if fixes needed)
  - Message: `fix(player): address issues found in testing`
  - Files: as needed

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `feat(player): add helper functions and loop state` | src/main.js | npm run build |
| 4 | `feat(player): add player control bar UI` | index.html, src/style.css | npm run build |
| 8 | `feat(player): implement transport controls` | src/main.js | npm run build |
| 10 | `feat(player): implement seek bar and time display` | src/main.js | npm run build |
| 11 | `feat(player): implement A-B loop functionality` | src/main.js | npm run build |
| 13 | `feat(player): integrate player bar with score lifecycle` | src/main.js, index.html | npm run build |
| 14 | `fix(player): address issues found in testing` | as needed | npm run build |

---

## Success Criteria

### Verification Commands
```bash
npm run build  # Expected: No errors
npm run dev    # Expected: App runs, player bar visible when score loaded
```

### Final Checklist
- [x] All "Must Have" features present
- [x] All "Must NOT Have" guardrails respected
- [x] Player bar fixed at bottom, visible when score loaded
- [x] All transport controls functional
- [x] Seek bar tracks playback in real-time
- [x] Time/measure display updates correctly
- [x] A-B loop works with markers and text display
- [x] Touch-friendly at 480px viewport
- [x] Build succeeds with no errors
