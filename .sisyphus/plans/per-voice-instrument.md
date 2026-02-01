# Per-Voice Instrument Selection

## TL;DR

> **Quick Summary**: Change instrument selection from global (one instrument for all voices) to per-voice. In Simple view, "My Voice" and "Other Voices" each have their own instrument selector. In Advanced view, each individual voice has its own selector.
> 
> **Deliverables**:
> - Per-voice `instrument` property in voice state
> - Instrument dropdown in each voice control row
> - "Other Voices" instrument selector that syncs all non-user voices
> - "Mixed" indicator when voices have different instruments
> - localStorage persistence for per-voice instrument choices
> - Vitest infrastructure for testing
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

---

## Context

### Original Request
User wants instrument selection to be per-voice instead of global. In Simple view, "My Voice" and "Other Voices" each get their own instrument selector. In Advanced view, each individual voice gets its own selector.

### Interview Summary
**Key Discussions**:
- **Default instrument**: All voices start with Piano
- **Persistence**: Per-voice instrument choices persist in localStorage
- **Simple→Advanced transition**: Voices inherit their current instrument setting
- **Instrument follows voice slot**: When changing "My Voice" assignment, instrument stays with the voice, doesn't follow user
- **Mixed instruments display**: In Simple view, show "Mixed" when voices have different instruments

**Research Findings**:
- Tech stack: Vanilla JS + Vite + Tone.js (no framework)
- Each voice already has independent `Tone.Sampler`, `Gain`, `Panner` chain
- `createVoiceState()` currently reads global `state.instrument` - needs per-voice parameter
- Existing instrument change handler pattern can be adapted for single-voice changes
- No test infrastructure exists - will set up vitest

### Metis Review
**Identified Gaps** (addressed):
- What happens when user changes "My Voice" assignment → Instrument follows voice slot
- What to show in Simple view when instruments are mixed → Show "Mixed" indicator
- Edge case: only one voice (no "Other Voices") → Hide the Other Voices section
- localStorage key format → Use JSON object keyed by voice shortName

---

## Work Objectives

### Core Objective
Enable per-voice instrument selection with Simple/Advanced view modes, persisted to localStorage.

### Concrete Deliverables
- `voice.instrument` property on each voice state object
- Instrument dropdown in `createVoiceControlRow()` 
- "Other Voices" instrument dropdown with "Mixed" indicator
- `voiceInstruments` localStorage key with JSON object
- Global instrument selector removed from header
- Vitest test setup with unit and integration tests

### Definition of Done
- [x] In Advanced view, each voice row has an instrument dropdown
- [x] Changing a voice's instrument loads new samples for that voice only
- [x] In Simple view, "My Voice" has its own instrument dropdown
- [x] In Simple view, "Other Voices" has an instrument dropdown that syncs all non-user voices
- [x] When "Other Voices" have different instruments, dropdown shows "Mixed"
- [x] Per-voice instruments persist in localStorage and restore on page load
- [x] Global instrument selector is removed from header
- [x] All tests pass: `npm test`

### Must Have
- Per-voice `instrument` property (default: `"piano"`)
- Instrument dropdown per voice in Advanced view
- Grouped "Other Voices" instrument dropdown in Simple view
- "Mixed" indicator in Simple view when voices differ
- localStorage persistence keyed by voice shortName
- Test infrastructure (vitest)

### Must NOT Have (Guardrails)
- DO NOT add new instruments to INSTRUMENTS constant
- DO NOT change audio routing chain (sampler→gain→panner→destination)
- DO NOT add instrument presets/groupings ("All strings", etc.)
- DO NOT add per-note instrument selection
- DO NOT show instrument icons in timeline
- DO NOT add undo/history for instrument changes
- DO NOT add transition animations between instruments

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO
- **User wants tests**: YES (set up infrastructure)
- **Framework**: vitest
- **QA approach**: TDD after test setup + Playwright for UI verification

### Test Setup Task
- Install: `npm install -D vitest`
- Config: Create `vitest.config.js`
- Verify: `npm test` runs without error
- Example: Create `src/__tests__/example.test.js`

### Automated Verification
Each TODO includes executable verification:
- **Unit tests**: vitest for pure functions
- **UI tests**: Playwright for browser interactions
- **State verification**: Console assertions in dev tools

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Set up vitest infrastructure [no dependencies]

Wave 2 (After Wave 1):
├── Task 2: Add instrument property to voice state [depends: 1]
└── Task 3: Modify createVoiceState to accept instrument param [depends: 1]

Wave 3 (After Wave 2):
├── Task 4: Add instrument dropdown to Advanced view [depends: 2, 3]
└── Task 5: Add localStorage persistence [depends: 2]

Wave 4 (After Wave 3):
└── Task 6: Add instrument dropdown to Simple view with Mixed indicator [depends: 4, 5]

Wave 5 (After Wave 4):
└── Task 7: Remove global instrument selector and cleanup [depends: 6]
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None (start first) |
| 2 | 1 | 4, 5 | 3 |
| 3 | 1 | 4 | 2 |
| 4 | 2, 3 | 6 | 5 |
| 5 | 2 | 6 | 4 |
| 6 | 4, 5 | 7 | None |
| 7 | 6 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | quick - simple config setup |
| 2 | 2, 3 | quick - small code changes |
| 3 | 4, 5 | unspecified-low - moderate UI/state work |
| 4 | 6 | unspecified-low - UI work with logic |
| 5 | 7 | quick - cleanup and removal |

---

## TODOs

### Task 1: Set up vitest test infrastructure

**What to do**:
- Install vitest as dev dependency
- Create vitest.config.js with jsdom environment
- Add test script to package.json
- Create example test file to verify setup works

**Must NOT do**:
- DO NOT add complex test utilities or mocking frameworks
- DO NOT add coverage reporting (out of scope)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Simple config file creation and npm install
- **Skills**: `[]`
  - No special skills needed for this task

**Parallelization**:
- **Can Run In Parallel**: NO (first task)
- **Parallel Group**: Wave 1
- **Blocks**: Tasks 2, 3
- **Blocked By**: None (can start immediately)

**References**:

**Pattern References**:
- `package.json` - Add test script following existing script patterns

**API/Type References**:
- None

**Test References**:
- None (this creates the test infrastructure)

**Documentation References**:
- Vitest docs: https://vitest.dev/guide/ - Basic setup

**External References**:
- Vitest with Vite: https://vitest.dev/guide/#configuring-vitest - Vite integration

**Acceptance Criteria**:

```bash
# Agent runs:
npm test
# Assert: Exit code 0
# Assert: Output contains "1 passed" or similar success indicator
```

**Evidence to Capture:**
- [x] Terminal output from `npm test` showing tests pass

**Commit**: YES
- Message: `feat(test): add vitest infrastructure`
- Files: `package.json`, `vitest.config.js`, `src/__tests__/example.test.js`
- Pre-commit: `npm test`

---

### Task 2: Add instrument property to voice state

**What to do**:
- Add `instrument: "piano"` property to voice state object returned by `createVoiceState()`
- Update any TypeScript/JSDoc types if present

**Must NOT do**:
- DO NOT change how sampler is created yet (that's Task 3)
- DO NOT add UI changes (that's Task 4)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Single property addition to object literal
- **Skills**: `[]`
  - No special skills needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 3)
- **Blocks**: Tasks 4, 5
- **Blocked By**: Task 1

**References**:

**Pattern References**:
- `src/main.js:537-546` - Voice state object structure (where to add `instrument` property)

**API/Type References**:
- `src/main.js:151-207` - INSTRUMENTS constant (valid instrument keys: piano, violin, cello, organ, saxophone)

**Test References**:
- None yet (will be created)

**Documentation References**:
- None

**External References**:
- None

**WHY Each Reference Matters**:
- Line 537-546 shows exact structure of voice state object - add `instrument` property here
- INSTRUMENTS constant defines valid values for the new property

**Acceptance Criteria**:

```javascript
// Unit test (vitest):
// After creating a voice, verify it has instrument property
import { createVoiceState } from '../main.js';
const voice = createVoiceState(0, { short: 'T1', full: 'Tenor 1' });
expect(voice.instrument).toBe('piano');
```

```bash
# Agent runs:
npm test
# Assert: Test for instrument property passes
```

**Evidence to Capture:**
- [x] Test output showing voice.instrument exists and defaults to "piano"

**Commit**: YES
- Message: `feat(voice): add instrument property to voice state`
- Files: `src/main.js`, `src/__tests__/voice.test.js`
- Pre-commit: `npm test`

---

### Task 3: Modify createVoiceState to accept instrument parameter

**What to do**:
- Add optional `instrumentKey` parameter to `createVoiceState(voiceIndex, voiceName, instrumentKey = "piano")`
- Use the parameter to select instrument from INSTRUMENTS constant
- Configure Sampler with the passed instrument's URLs/baseUrl/release

**Must NOT do**:
- DO NOT change call sites yet (keep existing behavior)
- DO NOT add UI (that's Task 4)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Function signature change with default parameter
- **Skills**: `[]`
  - No special skills needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 2)
- **Blocks**: Task 4
- **Blocked By**: Task 1

**References**:

**Pattern References**:
- `src/main.js:524-547` - `createVoiceState()` function - modify signature and instrument selection
- `src/main.js:1635-1641` - How instrument change handler recreates voices with saved settings

**API/Type References**:
- `src/main.js:151-207` - INSTRUMENTS constant structure (name, source, baseUrl, urls, release)

**Test References**:
- Task 2's test can be extended

**Documentation References**:
- None

**External References**:
- Tone.js Sampler: https://tonejs.github.io/docs/14.7.77/Sampler - Constructor options

**WHY Each Reference Matters**:
- Line 524-547: The function to modify - currently reads `state.instrument`, should accept parameter
- Line 1635-1641: Pattern for recreating voice with specific settings - can reuse pattern
- INSTRUMENTS constant: Structure to access when selecting instrument

**Acceptance Criteria**:

```javascript
// Unit test (vitest):
// Verify createVoiceState uses passed instrument
const violinVoice = createVoiceState(0, { short: 'S1', full: 'Soprano 1' }, 'violin');
expect(violinVoice.instrument).toBe('violin');
// Verify sampler was created with violin URLs (mock Tone.Sampler to verify)
```

```bash
# Agent runs:
npm test
# Assert: Tests pass including instrument parameter test
```

**Evidence to Capture:**
- [x] Test output showing createVoiceState accepts and uses instrument parameter

**Commit**: YES
- Message: `feat(voice): parameterize instrument in createVoiceState`
- Files: `src/main.js`, `src/__tests__/voice.test.js`
- Pre-commit: `npm test`

---

### Task 4: Add instrument dropdown to Advanced view

**What to do**:
- Add instrument `<select>` dropdown to `createVoiceControlRow()` function
- Populate with options from INSTRUMENTS constant
- Add change handler that:
  1. Disposes old sampler
  2. Creates new sampler with selected instrument
  3. Preserves volume/pan/muted settings
  4. Updates voice.instrument property
- Wire up for Advanced view (each voice gets its own dropdown)

**Must NOT do**:
- DO NOT add to Simple view yet (that's Task 6)
- DO NOT add localStorage persistence yet (that's Task 5)
- DO NOT add "Mixed" indicator (that's Task 6)

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
  - Reason: Moderate UI work with event handling
- **Skills**: `[]`
  - No special skills needed - follows existing patterns

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 5)
- **Blocks**: Task 6
- **Blocked By**: Tasks 2, 3

**References**:

**Pattern References**:
- `src/main.js:673-760` - `createVoiceControlRow()` - add instrument dropdown here, follow existing control pattern
- `src/main.js:683-698` - Voice dropdown HTML pattern - follow for instrument dropdown
- `src/main.js:721-746` - Event listener pattern for voice controls (mute, volume, pan)
- `src/main.js:1606-1671` - Global instrument change handler - adapt logic for per-voice change

**API/Type References**:
- `src/main.js:151-207` - INSTRUMENTS constant (iterate to build dropdown options)

**Test References**:
- None yet for UI (will use Playwright)

**Documentation References**:
- None

**External References**:
- None

**WHY Each Reference Matters**:
- Line 673-760: The function to modify - add dropdown here following existing structure
- Line 683-698: HTML pattern for dropdowns - follow same style
- Line 721-746: Event listener pattern - follow for instrument change handler
- Line 1606-1671: Instrument swap logic to reuse - dispose old sampler, create new, preserve settings

**Acceptance Criteria**:

```
# Agent executes via Playwright:
1. Navigate to: http://localhost:5173
2. Select first score from dropdown
3. Wait for: voices to load (selector ".part" visible)
4. Click: button with text "Advanced"
5. Assert: Each ".part" row contains a select with instrument options
6. Select: "Violin" in first voice's instrument dropdown
7. Wait for: status text contains "Violin" or sampler loaded indicator
8. Assert: First voice instrument dropdown shows "Violin" selected
9. Screenshot: .sisyphus/evidence/task-4-advanced-instrument.png
```

```bash
# Agent runs test:
npm test
# Assert: All tests pass
```

**Evidence to Capture:**
- [x] Screenshot showing Advanced view with instrument dropdown per voice
- [x] Test output confirming instrument change updates voice state

**Commit**: YES
- Message: `feat(ui): add per-voice instrument dropdown in Advanced view`
- Files: `src/main.js`
- Pre-commit: `npm test`

---

### Task 5: Add localStorage persistence for per-voice instruments

**What to do**:
- Create `voiceInstruments` localStorage key storing JSON object: `{ "T1": "piano", "S1": "violin", ... }`
- On instrument change, update localStorage
- On score load, restore per-voice instruments from localStorage
- Default to "piano" if no saved preference

**Must NOT do**:
- DO NOT change UI (that's Task 4 and 6)
- DO NOT migrate old `instrument` localStorage key (can coexist temporarily)

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
  - Reason: State persistence with JSON serialization
- **Skills**: `[]`
  - No special skills needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 4)
- **Blocks**: Task 6
- **Blocked By**: Task 2

**References**:

**Pattern References**:
- `src/main.js:59-68` - `setUserVoice()` localStorage pattern (save and sync)
- `src/main.js:238-240` - State initialization from localStorage pattern
- `src/main.js:1356-1364` - Voice creation loop in `loadScoreFromText()` - restore instruments here

**API/Type References**:
- None

**Test References**:
- None yet (will create)

**Documentation References**:
- None

**External References**:
- None

**WHY Each Reference Matters**:
- Line 59-68: Pattern for localStorage save - follow same style
- Line 238-240: Pattern for reading localStorage on init - follow for voiceInstruments
- Line 1356-1364: Where voices are created on score load - apply saved instruments here

**Acceptance Criteria**:

```javascript
// Unit test (vitest):
// After changing T1 to violin:
localStorage.setItem('voiceInstruments', JSON.stringify({ T1: 'violin' }));
// Load score, verify T1 has violin instrument
```

```bash
# Agent runs in browser console (via Playwright evaluate):
# Set instrument for T1 to violin
# Reload page
# Verify T1 still has violin
localStorage.getItem('voiceInstruments')
# Assert: Contains "T1": "violin"
```

**Evidence to Capture:**
- [x] Test output showing instruments persist and restore correctly

**Commit**: YES
- Message: `feat(persistence): store per-voice instruments in localStorage`
- Files: `src/main.js`, `src/__tests__/persistence.test.js`
- Pre-commit: `npm test`

---

### Task 6: Add instrument dropdown to Simple view with Mixed indicator

**What to do**:
- Add instrument dropdown to "My Voice" row in Simple view
- Add instrument dropdown to "Other Voices" row in Simple view
- Check if all "Other Voices" have same instrument:
  - If same: show that instrument selected
  - If different: show "Mixed" option selected (disabled, informational)
- When "Other Voices" instrument changed, sync all non-user voices
- Hide "Other Voices" section if only one voice in score

**Must NOT do**:
- DO NOT add new instruments
- DO NOT change Advanced view (done in Task 4)

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
  - Reason: UI logic with conditional rendering
- **Skills**: `[]`
  - No special skills needed

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4 (sequential)
- **Blocks**: Task 7
- **Blocked By**: Tasks 4, 5

**References**:

**Pattern References**:
- `src/main.js:571-653` - `renderSimpleVoiceControls()` - modify to add instrument dropdowns
- `src/main.js:578-582` - "Other Voices" grouping logic - check instruments here for "Mixed"
- `src/main.js:610-639` - Event handlers for "Other Voices" controls - add instrument handler

**API/Type References**:
- `src/main.js:151-207` - INSTRUMENTS constant for dropdown options

**Test References**:
- Task 4 tests can inform patterns

**Documentation References**:
- None

**External References**:
- None

**WHY Each Reference Matters**:
- Line 571-653: The function to modify - add instrument dropdowns
- Line 578-582: How "Other Voices" are grouped - check their instruments for "Mixed"
- Line 610-639: Event handler pattern for syncing changes across all "Other Voices"

**Acceptance Criteria**:

```
# Agent executes via Playwright:
1. Navigate to: http://localhost:5173
2. Load a score with multiple voices
3. Assert: Simple view shows "My Voice" with instrument dropdown
4. Assert: "Other Voices" shows instrument dropdown
5. Change T1's instrument to Violin in Advanced view
6. Switch to Simple view
7. Assert: "Other Voices" dropdown shows "Mixed" (since one is Violin, others Piano)
8. Select "Cello" in "Other Voices" dropdown
9. Switch to Advanced view
10. Assert: All non-user voices show "Cello" selected
11. Screenshot: .sisyphus/evidence/task-6-simple-mixed.png
```

```
# Edge case - single voice:
1. Load a score with only 1 voice
2. Assert: "Other Voices" section is hidden or not present
```

**Evidence to Capture:**
- [x] Screenshot showing "Mixed" indicator in Simple view
- [x] Screenshot showing "Other Voices" syncing instruments

**Commit**: YES
- Message: `feat(ui): add instrument selection to Simple view with Mixed indicator`
- Files: `src/main.js`
- Pre-commit: `npm test`

---

### Task 7: Remove global instrument selector and cleanup

**What to do**:
- Remove `<select id="instrumentSelect">` from index.html header
- Remove `elements.instrumentSelect` from elements object in main.js
- Remove global `state.instrument` property
- Remove global instrument change event listener
- Remove old `instrument` localStorage key handling
- Update `initUserVoice()` to not set instrumentSelect.value

**Must NOT do**:
- DO NOT break existing functionality
- DO NOT remove INSTRUMENTS constant (still used)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Simple removal of unused code
- **Skills**: `[]`
  - No special skills needed

**Parallelization**:
- **Can Run In Parallel**: NO (final task)
- **Parallel Group**: Wave 5
- **Blocks**: None (final)
- **Blocked By**: Task 6

**References**:

**Pattern References**:
- `index.html:22-28` - Global instrument select to REMOVE
- `src/main.js:212` - `elements.instrumentSelect` reference to REMOVE
- `src/main.js:239` - `state.instrument` initialization to REMOVE
- `src/main.js:1606-1671` - Global instrument change handler to REMOVE
- `src/main.js:1674` - `initUserVoice()` instrumentSelect.value line to REMOVE

**API/Type References**:
- None

**Test References**:
- Run all tests to ensure nothing breaks

**Documentation References**:
- None

**External References**:
- None

**WHY Each Reference Matters**:
- All references point to code that should be removed - global instrument selection is now per-voice

**Acceptance Criteria**:

```
# Agent executes via Playwright:
1. Navigate to: http://localhost:5173
2. Assert: No element with id="instrumentSelect" exists in header
3. Load a score
4. Assert: Voices load correctly with per-voice instrument dropdowns
5. Assert: No JavaScript errors in console
6. Screenshot: .sisyphus/evidence/task-7-header-clean.png
```

```bash
# Agent runs:
npm test
# Assert: All tests pass
# Assert: No references to state.instrument in test failures
```

**Evidence to Capture:**
- [x] Screenshot showing header without global instrument selector
- [x] Test output showing all tests pass

**Commit**: YES
- Message: `refactor: remove global instrument selector`
- Files: `index.html`, `src/main.js`
- Pre-commit: `npm test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(test): add vitest infrastructure` | package.json, vitest.config.js, src/__tests__/example.test.js | npm test |
| 2 | `feat(voice): add instrument property to voice state` | src/main.js, src/__tests__/voice.test.js | npm test |
| 3 | `feat(voice): parameterize instrument in createVoiceState` | src/main.js, src/__tests__/voice.test.js | npm test |
| 4 | `feat(ui): add per-voice instrument dropdown in Advanced view` | src/main.js | npm test |
| 5 | `feat(persistence): store per-voice instruments in localStorage` | src/main.js, src/__tests__/persistence.test.js | npm test |
| 6 | `feat(ui): add instrument selection to Simple view with Mixed indicator` | src/main.js | npm test |
| 7 | `refactor: remove global instrument selector` | index.html, src/main.js | npm test |

---

## Success Criteria

### Verification Commands
```bash
npm test          # All unit tests pass
npm run dev       # App starts without errors
```

### Final Checklist
- [x] Per-voice instrument selection works in Advanced view
- [x] "My Voice" and "Other Voices" have separate instrument selectors in Simple view
- [x] "Mixed" indicator shows when voices have different instruments
- [x] Per-voice instruments persist across page reloads
- [x] Global instrument selector removed from header
- [x] All tests pass
- [x] No console errors
