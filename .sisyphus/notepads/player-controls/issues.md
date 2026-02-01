# Player Controls Testing Issues

## Test Run Date
February 1, 2026

## Issues Found During Playwright Testing

### 1. **BLOCKING: Missing HTML Elements (FIXED)**
- **Status**: Fixed during testing
- **Description**: The `playerBar` footer element was not in the HTML file, despite the JavaScript expecting it
- **Impact**: App crashed on load with "Cannot read properties of null" error
- **Solution Applied**: Added the complete player bar footer HTML structure to `index.html` before `</body>` tag
- **Related Code**: Lines 95-119 in index.html

### 2. **BLOCKING: Missing instrumentSelect Element (FIXED)**
- **Status**: Fixed during testing
- **Description**: The `instrumentSelect` HTML element was referenced in `main.js` line 1579 but not in HTML
- **Impact**: App crashed with TypeError when trying to add event listener
- **Solution Applied**: Added `<select id="instrumentSelect">` with instrument options to header controls
- **Related Code**: Line 1579 in main.js, header score controls in index.html

### 3. **Critical: Stop Button Does Not Reset Position**
- **Status**: Issue Confirmed
- **Description**: Clicking the stop button does not reset playback position to 0 (or loop A point if loop is active)
- **Expected Behavior**: Position should reset to 0 (or loopASeconds if loop is set)
- **Actual Behavior**: Position remains at current location
- **Impact**: High - Core functionality broken
- **Evidence**: After clicking stop at position 26.7s, position remained at 26.7s. Display showed "0:32 (M. 8)" with seek bar at value 26.7
- **Related Code**: `src/main.js` - Stop button click handler (around line 1390)

### 4. **Critical: Skip Buttons Do Not Work**
- **Status**: Issue Confirmed
- **Description**: Skip forward/back buttons don't change the seek bar position
- **Expected Behavior**: Skip back should move to previous measure start, skip forward to next measure start
- **Actual Behavior**: Clicking buttons has no effect on position
- **Impact**: High - Feature non-functional
- **Evidence**: Tested at position 0 and 26.7s, skip forward button had no effect
- **Related Code**: `src/main.js` - Skip button click handlers (around lines 1370-1385)

### 5. **Major: Time Display Doesn't Update After Seek**
- **Status**: Issue Confirmed
- **Description**: When seek bar is programmatically set to a new value (e.g., 10 out of 26.7), the time display doesn't update
- **Expected Behavior**: Display should show time for the new seek position
- **Actual Behavior**: Display stuck at "0:32 (M. 8)" even after seeking to position 10
- **Impact**: Medium - Display is stale but seek bar itself works
- **Evidence**: Set seek bar value to 10, time display still showed "0:32 (M. 8)"
- **Related Code**: `src/main.js` - updatePlaybackHighlight RAF loop and seek input handler

## What's Working

### ✅ Fully Functional
1. **Player Bar Visibility** - Hidden until score loads, visible after load
2. **Play/Pause Toggle** - Button correctly toggles playback state and shows correct icon
3. **Player Bar Layout** - All controls visible at desktop (1920x1080), tablet (720x1280), and mobile (480x800)
4. **Responsive Design** - Controls remain accessible at all viewport sizes
5. **A-B Loop Functionality**:
   - Loop point A can be set (marker appears)
   - Loop point B can be set (marker appears)
   - Loop display text shows correct format: "Loop: M.2 → M.5"
   - Clear button hides all loop markers and display
   - Clear button is hidden/shown appropriately
6. **Seek Bar** - Value can be changed programmatically
7. **Touch Targets** - All buttons meet 44px minimum size requirement

### ⚠️ Partially Working
1. **Seek Bar** - Can change value but time display doesn't update
2. **Player Bar HTML/CSS** - Structure and styling are correct but needs HTML elements to be in place

## Test Coverage Summary

| Test | Status | Issues Found |
|------|--------|--------------|
| 1. Initial State (Player Bar Hidden) | ✅ PASS | None |
| 2. Score Load (Player Bar Visible) | ✅ PASS | Missing HTML elements (fixed) |
| 3. Play/Pause Button | ✅ PASS | None |
| 4. Stop Button | ❌ FAIL | Doesn't reset position |
| 5. Skip Buttons | ❌ FAIL | Don't change position |
| 6. Seek Bar | ⚠️ PARTIAL | Value works, display doesn't update |
| 7. A-B Loop | ✅ PASS | None |
| 8. Responsive Viewports | ✅ PASS | None |

## Recommendations

1. **Priority 1 (Critical)**: Fix stop button to reset position to 0 or loopASeconds
2. **Priority 1 (Critical)**: Fix skip buttons to move to previous/next measure
3. **Priority 2 (High)**: Fix time display to update after seek operations
4. **Priority 3 (Medium)**: Add unit tests for player controls to catch regressions

## Test Environment

- App URL: http://localhost:5173
- Browser: Playwright (Chromium)
- Viewports Tested:
  - Desktop: 1920x1080
  - Tablet: 720x1280
  - Mobile: 480x800
- Score Used: "Færðu mér ljósið" (5 voices, ~26 second duration)
