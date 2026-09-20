import type * as ToneNs from "tone";
import type { AppState, AppElements, TimelineEvent, VoiceState, InstrumentKey, InstrumentConfig, VoiceName } from "../types";

interface VoicesDeps {
  Tone: typeof ToneNs;
  state: AppState;
  elements: AppElements;
  INSTRUMENTS: Record<InstrumentKey, InstrumentConfig>;
  saveVoiceInstrument: (shortName: string, instrumentKey: string) => void;
  setStoredUserVoice: (voice: string) => void;
  getStoredUserVoice: () => string;
}

interface VoicesApi {
  renderVoices: () => void;
  createVoiceState: (voiceIndex: number, voiceName: VoiceName, instrumentKey?: InstrumentKey) => VoiceState;
  applyVoiceSettings: (voice: VoiceState) => void;
  assignVoicesToNotes: () => void;
  analyzeVoiceNames: () => VoiceName[];
  parseVoicesString: (voicesStr?: string) => VoiceName[] | null;
  mapUserVoiceToScore: (userVoice: string, scoreVoices: Array<{ shortName: string }>) => string | null;
  applyUserVoiceMix: () => void;
  setUserVoice: (voice: string) => void;
  getUserVoice: () => string;
  formatPan: (pan: number) => string;
}

interface PartGroup {
  events: TimelineEvent[];
  xmlVoice: number;
  fromChordSplit: boolean;
}

interface VoiceStats {
  index: number;
  pitches: number[];
  median: number;
}

function initVoices(deps: VoicesDeps): VoicesApi {
  const {
    Tone,
    state,
    elements,
    INSTRUMENTS,
    saveVoiceInstrument,
    setStoredUserVoice,
    getStoredUserVoice
  } = deps;

  function parseVoicesString(voicesStr?: string): VoiceName[] | null {
    if (!voicesStr) return null;

    const counts: Record<string, number> = { S: 0, A: 0, T: 0, B: 0 };
    const result: VoiceName[] = [];

    for (const char of voicesStr.toUpperCase()) {
      if (counts[char] !== undefined) {
        counts[char]++;
      }
    }

    const needsNumber: Record<string, boolean> = {};
    for (const [type, count] of Object.entries(counts)) {
      needsNumber[type] = count > 1;
    }

    const currentNum: Record<string, number> = { S: 0, A: 0, T: 0, B: 0 };
    for (const char of voicesStr.toUpperCase()) {
      if (counts[char] !== undefined) {
        currentNum[char]++;
        if (needsNumber[char]) {
          result.push({ short: `${char}${currentNum[char]}`, full: `${fullName(char)} ${currentNum[char]}` });
        } else {
          result.push({ short: char, full: fullName(char) });
        }
      }
    }

    return result;
  }

  function fullName(char: string): string {
    const names: Record<"S" | "A" | "T" | "B", string> = { S: "Soprano", A: "Alto", T: "Tenor", B: "Bass" };
    return char in names ? names[char as keyof typeof names] : char;
  }

  function mapUserVoiceToScore(userVoice: string, scoreVoices: Array<{ shortName: string }>): string | null {
    const userBase = userVoice.charAt(0);
    const userNum = userVoice.length > 1 ? parseInt(userVoice.charAt(1), 10) : 1;

    const exactMatch = scoreVoices.find((v) => v.shortName === userVoice);
    if (exactMatch) return exactMatch.shortName;

    const baseMatch = scoreVoices.find((v) => v.shortName === userBase);
    if (baseMatch) return baseMatch.shortName;

    const numberedMatches = scoreVoices.filter((v) => v.shortName.charAt(0) === userBase);
    if (numberedMatches.length > 0) {
      const target = numberedMatches.find((v) => v.shortName === `${userBase}${userNum}`);
      if (target) return target.shortName;
      return numberedMatches[0].shortName;
    }

    return null;
  }

  function applyUserVoiceMix(): void {
    if (state.voices.length === 0) return;

    const mappedVoice = mapUserVoiceToScore(state.userVoice, state.voices);
    const panMultiplier = state.panInverted ? -1 : 1;

    for (const voice of state.voices) {
      if (voice.shortName === mappedVoice) {
        voice.volume = 1.0;
        voice.pan = 0.9 * panMultiplier;
      } else {
        voice.volume = 0.6;
        voice.pan = -0.9 * panMultiplier;
      }
      applyVoiceSettings(voice);
    }

    renderVoices();
  }

  function createVoiceState(voiceIndex: number, voiceName: VoiceName, instrumentKey: InstrumentKey = "piano"): VoiceState {
    const instrument = INSTRUMENTS[instrumentKey] || INSTRUMENTS.piano;
    const sampler = new Tone.Sampler({
      urls: instrument.urls,
      baseUrl: instrument.baseUrl,
      release: instrument.release
    });
    const gain = new Tone.Gain(0.9);
    const panner = new Tone.Panner(0);
    sampler.connect(gain);
    gain.connect(panner);
    panner.toDestination();

    return {
      name: voiceName.full,
      shortName: voiceName.short,
      sampler,
      gain,
      panner,
      volume: 0.9,
      pan: 0,
      muted: false,
      instrument: instrumentKey
    };
  }

  function applyVoiceSettings(voice: VoiceState): void {
    const targetGain = voice.muted ? 0 : voice.volume;
    voice.gain.gain.rampTo(targetGain, 0.05);
    voice.panner.pan.rampTo(voice.pan, 0.05);
  }

  function renderVoices(): void {
    elements.parts.innerHTML = "";

    if (state.voices.length === 0) return;

    const mappedVoice = mapUserVoiceToScore(state.userVoice, state.voices);
    const userVoice = state.voices.find(v => v.shortName === mappedVoice);
    const otherVoiceShortNames = state.voices.filter(v => v.shortName !== mappedVoice).map(v => v.shortName);

    if (state.advancedVoiceMode) {
      renderAdvancedVoiceControls();
    } else {
      renderSimpleVoiceControls(userVoice, otherVoiceShortNames);
    }
  }

  function renderSimpleVoiceControls(userVoice: VoiceState | undefined, otherVoiceShortNames: string[]): void {
    const container = elements.parts;

    if (userVoice) {
      container.appendChild(createVoiceControlRow(userVoice.shortName, "My Voice", false));
    }

    if (otherVoiceShortNames.length > 0) {
      const otherVoices = state.voices.filter(v => otherVoiceShortNames.includes(v.shortName));
      const otherVolume = otherVoices[0].volume;
      const otherPan = otherVoices[0].pan;
      const otherMuted = otherVoices.every(v => v.muted);

      const otherInstruments = otherVoices.map(v => v.instrument);
      const allSame = otherInstruments.every(i => i === otherInstruments[0]);

      const row = document.createElement("div");
      row.className = "part";
      row.innerHTML = `
      <div class="part__header">
        <div class="part__name">Other Voices</div>
        <label class="part__mute" title="Mute all other voices">
          <input data-role="mute" type="checkbox" ${otherMuted ? "checked" : ""} />
          <span>Mute</span>
        </label>
      </div>
      <div class="part__controls">
        <label class="field">
          <span>Instrument</span>
          <select data-role="instrument">
            ${allSame ? '' : '<option value="" disabled selected>Mixed</option>'}
            ${Object.entries(INSTRUMENTS).map(([key, inst]) =>
        `<option value="${key}" ${allSame && otherInstruments[0] === key ? 'selected' : ''}>${inst.name}</option>`
      ).join('')}
          </select>
        </label>
        <label class="field">
          <span>Volume</span>
          <input data-role="volume" type="range" min="0" max="1" step="0.01" value="${otherVolume}" title="${Math.round(otherVolume * 100)}%" />
        </label>
        <label class="field">
          <span>Pan</span>
          <input data-role="pan" type="range" min="-1" max="1" step="0.01" value="${otherPan}" title="${formatPan(otherPan)}" />
        </label>
      </div>
    `;

      const instrumentInput = row.querySelector('[data-role="instrument"]') as HTMLSelectElement;
      const muteInput = row.querySelector('[data-role="mute"]') as HTMLInputElement;
      const volumeInput = row.querySelector('[data-role="volume"]') as HTMLInputElement;
      const panInput = row.querySelector('[data-role="pan"]') as HTMLInputElement;

      instrumentInput.addEventListener("change", (event: Event) => {
        const newInstrumentKey = (event.target as HTMLSelectElement).value as InstrumentKey;
        if (!newInstrumentKey) return;

        for (const shortName of otherVoiceShortNames) {
          const voice = state.voices.find(v => v.shortName === shortName);
          if (!voice) continue;

          voice.sampler.dispose();

          const instrument = INSTRUMENTS[newInstrumentKey] || INSTRUMENTS.piano;
          voice.sampler = new Tone.Sampler({
            urls: instrument.urls,
            baseUrl: instrument.baseUrl,
            release: instrument.release
          });
          voice.sampler.connect(voice.gain);
          voice.instrument = newInstrumentKey;
          saveVoiceInstrument(voice.shortName, newInstrumentKey);
        }

        const mixedOption = instrumentInput.querySelector('option[value=""]');
        if (mixedOption) {
          mixedOption.remove();
        }
      });

      muteInput.addEventListener("change", (event: Event) => {
        for (const shortName of otherVoiceShortNames) {
          const voice = state.voices.find(v => v.shortName === shortName);
          if (!voice) continue;
          voice.muted = (event.target as HTMLInputElement).checked;
          applyVoiceSettings(voice);
        }
      });

      volumeInput.addEventListener("input", (event: Event) => {
        const value = Number((event.target as HTMLInputElement).value);
        volumeInput.title = `${Math.round(value * 100)}%`;
        for (const shortName of otherVoiceShortNames) {
          const voice = state.voices.find(v => v.shortName === shortName);
          if (!voice) continue;
          voice.volume = value;
          applyVoiceSettings(voice);
        }
      });

      panInput.addEventListener("input", (event: Event) => {
        const value = Number((event.target as HTMLInputElement).value);
        panInput.title = formatPan(value);
        for (const shortName of otherVoiceShortNames) {
          const voice = state.voices.find(v => v.shortName === shortName);
          if (!voice) continue;
          voice.pan = value;
          applyVoiceSettings(voice);
        }
      });

      container.appendChild(row);
    }

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "btn btn--small voice-mode-toggle";
    toggleBtn.textContent = "Advanced";
    toggleBtn.title = "Show individual controls for each voice";
    toggleBtn.addEventListener("click", () => {
      state.advancedVoiceMode = true;
      renderVoices();
    });
    container.appendChild(toggleBtn);
  }

  function renderAdvancedVoiceControls(): void {
    const container = elements.parts;

    for (const voice of state.voices) {
      container.appendChild(createVoiceControlRow(voice.shortName, voice.name, true));
    }

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "btn btn--small voice-mode-toggle";
    toggleBtn.textContent = "Simple view";
    toggleBtn.title = "Group other voices into one control";
    toggleBtn.addEventListener("click", () => {
      state.advancedVoiceMode = false;
      renderVoices();
    });
    container.appendChild(toggleBtn);
  }

  function createVoiceControlRow(voiceShortName: string, label: string, isAdvanced: boolean): HTMLDivElement {
    const voice = state.voices.find(v => v.shortName === voiceShortName)!;
    const row = document.createElement("div");
    row.className = "part";
    row.dataset.voice = voiceShortName;
    if (!isAdvanced && label === "My Voice") {
      row.classList.add("part--user");
    }

    const instrumentOptions = Object.entries(INSTRUMENTS).map(([key, instrument]) => {
      const selected = voice.instrument === key ? 'selected' : '';
      return `<option value="${key}" ${selected}>${instrument.name}</option>`;
    }).join('');

    row.innerHTML = `
    <div class="part__header">
      <div class="part__name">${label}</div>
      <label class="part__mute" title="Mute this voice">
        <input data-role="mute" type="checkbox" ${voice.muted ? "checked" : ""} />
        <span>Mute</span>
      </label>
    </div>
    <div class="part__controls">
      <label class="field">
        <span>Instrument</span>
        <select data-role="instrument">
          ${instrumentOptions}
        </select>
      </label>
      <label class="field">
        <span>Volume</span>
        <input data-role="volume" type="range" min="0" max="1" step="0.01" value="${voice.volume}" title="${Math.round(voice.volume * 100)}%" />
      </label>
      <label class="field">
        <span>Pan</span>
        <input data-role="pan" type="range" min="-1" max="1" step="0.01" value="${voice.pan}" title="${formatPan(voice.pan)}" />
      </label>
    </div>
  `;

    const muteInput = row.querySelector('[data-role="mute"]') as HTMLInputElement;
    const instrumentSelect = row.querySelector('[data-role="instrument"]') as HTMLSelectElement;
    const volumeInput = row.querySelector('[data-role="volume"]') as HTMLInputElement;
    const panInput = row.querySelector('[data-role="pan"]') as HTMLInputElement;

    muteInput.addEventListener("change", (event: Event) => {
      const v = state.voices.find(v => v.shortName === voiceShortName);
      if (!v) return;
      v.muted = (event.target as HTMLInputElement).checked;
      applyVoiceSettings(v);
    });

    instrumentSelect.addEventListener("change", (event: Event) => {
      const v = state.voices.find(v => v.shortName === voiceShortName);
      if (!v) return;

      const newInstrumentKey = (event.target as HTMLSelectElement).value as InstrumentKey;
      if (newInstrumentKey === v.instrument) return;

      const currentVolume = v.volume;
      const currentPan = v.pan;
      const currentMuted = v.muted;

      v.sampler.dispose();

      const instrument = INSTRUMENTS[newInstrumentKey] || INSTRUMENTS.piano;
      const newSampler = new Tone.Sampler({
        urls: instrument.urls,
        baseUrl: instrument.baseUrl,
        release: instrument.release
      });

      newSampler.connect(v.gain);

      v.sampler = newSampler;
      v.instrument = newInstrumentKey;

      v.volume = currentVolume;
      v.pan = currentPan;
      v.muted = currentMuted;
      applyVoiceSettings(v);

      saveVoiceInstrument(voiceShortName, newInstrumentKey);
    });

    volumeInput.addEventListener("input", (event: Event) => {
      const v = state.voices.find(v => v.shortName === voiceShortName);
      if (!v) return;
      v.volume = Number((event.target as HTMLInputElement).value);
      volumeInput.title = `${Math.round(v.volume * 100)}%`;
      applyVoiceSettings(v);
    });

    panInput.addEventListener("input", (event: Event) => {
      const v = state.voices.find(v => v.shortName === voiceShortName);
      if (!v) return;
      v.pan = Number((event.target as HTMLInputElement).value);
      panInput.title = formatPan(v.pan);
      applyVoiceSettings(v);
    });

    applyVoiceSettings(voice);
    return row;
  }

  function formatPan(pan: number): string {
    if (Math.abs(pan) < 0.05) return "Center";
    const pct = Math.round(Math.abs(pan) * 100);
    return pan < 0 ? `${pct}% L` : `${pct}% R`;
  }

  function assignVoicesToNotes(): void {
    const events = state.timeline.filter((e) =>
      (e.type === "note" && e.midi !== undefined) || e.type === "rest"
    );
    if (events.length === 0) {
      state.voiceCount = 0;
      return;
    }

    const expectedVoiceCount = state.currentScore?.voices?.length || 0;

    const voiceGroups = new Map<string, TimelineEvent[]>();
    for (const event of events) {
      const key = `${event.partIndex}:${event.voice}`;
      if (!voiceGroups.has(key)) {
        voiceGroups.set(key, []);
      }
      voiceGroups.get(key)!.push(event);
    }

    const baseGroupCount = voiceGroups.size;
    const needsChordSplitting = expectedVoiceCount > baseGroupCount;

    const partGroups = new Map<number, PartGroup[]>();

    for (const [key, groupEvents] of voiceGroups.entries()) {
      const [partStr, voiceStr] = key.split(':');
      const partIndex = parseInt(partStr, 10);
      const xmlVoice = parseInt(voiceStr, 10);

      if (!partGroups.has(partIndex)) {
        partGroups.set(partIndex, []);
      }

      if (!needsChordSplitting) {
        partGroups.get(partIndex)!.push({ events: groupEvents, xmlVoice, fromChordSplit: false });
        continue;
      }

      const notes = groupEvents.filter(e => e.type === "note" && e.midi !== undefined);
      const rests = groupEvents.filter(e => e.type === "rest");

      const timeMap = new Map<number, TimelineEvent[]>();
      for (const note of notes) {
        const t = note.timeBeats;
        if (!timeMap.has(t)) {
          timeMap.set(t, []);
        }
        timeMap.get(t)!.push(note);
      }

      let maxChordSize = 0;
      for (const notesAtTime of timeMap.values()) {
        maxChordSize = Math.max(maxChordSize, notesAtTime.length);
      }

      if (maxChordSize <= 1) {
        partGroups.get(partIndex)!.push({ events: groupEvents, xmlVoice, fromChordSplit: false });
      } else {
        const subGroups: TimelineEvent[][] = [];
        for (let i = 0; i < maxChordSize; i++) {
          subGroups.push([]);
        }

        // First pass: assign notes from chords to establish pitch ranges
        for (const [t, notesAtTime] of timeMap.entries()) {
          if (notesAtTime.length > 1) {
            notesAtTime.sort((a, b) => (b.midi as number) - (a.midi as number));
            for (let i = 0; i < notesAtTime.length; i++) {
              subGroups[i].push(notesAtTime[i]);
            }
          }
        }

        // Calculate median pitch for each subgroup
        const subGroupMedians = subGroups.map((sg: TimelineEvent[]) => {
          if (sg.length === 0) return 0;
          const pitches = sg.map(n => n.midi as number).sort((a, b) => a - b);
          const mid = Math.floor(pitches.length / 2);
          return pitches.length % 2 === 0 ? (pitches[mid - 1] + pitches[mid]) / 2 : pitches[mid];
        });

        // Second pass: assign single notes to closest subgroup by pitch
        for (const [t, notesAtTime] of timeMap.entries()) {
          if (notesAtTime.length === 1) {
            const note = notesAtTime[0];
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < maxChordSize; i++) {
              if (subGroupMedians[i] === 0) continue;
              const dist = Math.abs((note.midi as number) - subGroupMedians[i]);
              if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
              }
            }
            subGroups[bestIdx].push(note);
          }
        }

        for (const rest of rests) {
          subGroups[0].push(rest);
        }

        for (const subGroup of subGroups) {
          if (subGroup.length > 0) {
            partGroups.get(partIndex)!.push({ events: subGroup, xmlVoice, fromChordSplit: true });
          }
        }
      }
    }

    for (const [partIndex, groups] of partGroups.entries()) {
      if (groups.length <= 1) continue;

      const groupStats = groups.map((g, idx) => {
        const notes = g.events.filter(e => e.type === "note" && e.midi !== undefined);
        if (notes.length === 0) return { idx, median: 0, count: 0, xmlVoice: g.xmlVoice, fromChordSplit: g.fromChordSplit };
        const pitches = notes.map(n => n.midi as number).sort((a, b) => a - b);
        const mid = Math.floor(pitches.length / 2);
        const median = pitches.length % 2 === 0
          ? (pitches[mid - 1] + pitches[mid]) / 2
          : pitches[mid];
        return { idx, median, count: notes.length, xmlVoice: g.xmlVoice, fromChordSplit: g.fromChordSplit };
      });

      groupStats.sort((a, b) => b.median - a.median);

      for (let i = groupStats.length - 1; i >= 0; i--) {
        const small = groupStats[i];
        if (small.count > 10) continue;
        if (small.fromChordSplit) continue;

        let closest = -1;
        let closestDist = Infinity;
        for (let j = 0; j < groupStats.length; j++) {
          if (j === i) continue;
          if (groupStats[j].xmlVoice === small.xmlVoice) continue;
          const dist = Math.abs(groupStats[j].median - small.median);
          if (dist < closestDist) {
            closestDist = dist;
            closest = j;
          }
        }

        if (closest >= 0 && closestDist <= 12) {
          const targetGroup = groups[groupStats[closest].idx].events;
          const sourceGroup = groups[small.idx].events;

          const targetNoteTimes = new Set(
            targetGroup.filter(e => e.type === "note").map(e => e.timeBeats),
          );
          const hasOverlap = sourceGroup.some(
            e => e.type === "note" && targetNoteTimes.has(e.timeBeats),
          );
          if (hasOverlap) continue;

          targetGroup.push(...sourceGroup);
          sourceGroup.length = 0;
          groupStats.splice(i, 1);
          if (closest > i) closest--;
        }
      }
    }

    const finalGroups = [];
    for (const groups of partGroups.values()) {
      for (const group of groups) {
        if (group.events.length > 0) {
          finalGroups.push(group.events);
        }
      }
    }

    state.voiceCount = finalGroups.length;

    for (let i = 0; i < finalGroups.length; i++) {
      for (const event of finalGroups[i]) {
        event.voiceIndex = i;
      }
    }
  }

  function analyzeVoiceNames(): VoiceName[] {
    const notes = state.timeline.filter((e) => e.type === "note" && e.midi !== undefined);
    if (notes.length === 0 || state.voiceCount === 0) return [];

    const voiceStats: VoiceStats[] = [];
    for (let i = 0; i < state.voiceCount; i++) {
      voiceStats.push({ index: i, pitches: [], median: 0 });
    }

    for (const note of notes) {
      if (note.voiceIndex !== undefined) {
        voiceStats[note.voiceIndex]!.pitches.push(note.midi!);
      }
    }

    for (const voice of voiceStats) {
      if (voice.pitches.length > 0) {
        voice.pitches.sort((a, b) => a - b);
        const mid = Math.floor(voice.pitches.length / 2);
        voice.median = voice.pitches.length % 2 === 0
          ? (voice.pitches[mid - 1] + voice.pitches[mid]) / 2
          : voice.pitches[mid];
      } else {
        voice.median = 0;
      }
    }

    const sorted = [...voiceStats].sort((a, b) => b.median - a.median);
    const names: VoiceName[] = new Array(state.voiceCount);

    const parsedVoices = parseVoicesString(state.currentScore?.voices);

    if (parsedVoices && parsedVoices.length >= state.voiceCount) {
      for (let i = 0; i < sorted.length; i++) {
        const voice = sorted[i];
        names[voice.index] = parsedVoices[i];
      }
    } else {
      const defaultStr = state.voiceCount <= 4 ? "SATB".slice(0, state.voiceCount) : "SATB" + "B".repeat(state.voiceCount - 4);
      const defaultVoices = parseVoicesString(defaultStr) || [];
      for (let i = 0; i < sorted.length; i++) {
        const voice = sorted[i];
        names[voice.index] = defaultVoices[i] || { short: `V${i + 1}`, full: `Voice ${i + 1}` };
      }
    }

    return names;
  }

  function getUserVoice(): string {
    return getStoredUserVoice();
  }

  function setUserVoice(voice: string): void {
    setStoredUserVoice(voice);
    elements.userVoice.value = voice;
    if (state.scoreReady) {
      applyUserVoiceMix();
    }
  }

  return {
    renderVoices,
    createVoiceState,
    applyVoiceSettings,
    assignVoicesToNotes,
    analyzeVoiceNames,
    parseVoicesString,
    mapUserVoiceToScore,
    applyUserVoiceMix,
    setUserVoice,
    getUserVoice,
    formatPan
  };
}

export { initVoices };
