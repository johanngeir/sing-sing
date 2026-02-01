import * as Tone from "tone";

const IS_DEV = import.meta.env.DEV;

if (!IS_DEV) {
  document.querySelectorAll("[data-dev]").forEach(el => {
    el.remove();
  });
}

const SCORES = [
  { name: "Færðu mér ljósið", url: "/scores/faerdu-mer-ljosid.musicxml", voices: "SATBB" },
  { name: "Fjallið Skjaldbreiður", url: "/scores/fjallid-skjaldbreidur.musicxml", voices: "TTBB" },
  { name: "Nú máttu hægt", url: "/scores/Nú máttu hægt.mvt1.withwedges-split.musicxml", voices: "TTBB" },
  { name: "Samferða", url: "/scores/Samferða.musicxml", voices: "TTBB" }
];

function parseVoicesString(voicesStr) {
  if (!voicesStr) return null;
  
  const counts = { S: 0, A: 0, T: 0, B: 0 };
  const result = [];
  
  for (const char of voicesStr.toUpperCase()) {
    if (counts[char] !== undefined) {
      counts[char]++;
    }
  }
  
  const needsNumber = {};
  for (const [type, count] of Object.entries(counts)) {
    needsNumber[type] = count > 1;
  }
  
  const currentNum = { S: 0, A: 0, T: 0, B: 0 };
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

function fullName(char) {
  const names = { S: "Soprano", A: "Alto", T: "Tenor", B: "Bass" };
  return names[char] || char;
}

function getUserVoice() {
  return state.userVoice;
}

function setUserVoice(voice) {
  state.userVoice = voice;
  localStorage.setItem("userVoice", voice);
  elements.userVoice.value = voice;
  if (state.scoreReady) {
    applyUserVoiceMix();
  }
}

function mapUserVoiceToScore(userVoice, scoreVoices) {
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

function applyUserVoiceMix() {
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

const SAMPLE_URLS_V8 = {
  A3: "A3v8.wav",
  C3: "C3v8.wav",
  "D#3": "Ds3v8.wav",
  "F#3": "Fs3v8.wav",
  A4: "A4v8.wav",
  C4: "C4v8.wav",
  "D#4": "Ds4v8.wav",
  "F#4": "Fs4v8.wav",
  C5: "C5v8.wav"
};
const SAMPLE_URLS_V12 = {
  A3: "A3v12.wav",
  C3: "C3v12.wav",
  "D#3": "Ds3v12.wav",
  "F#3": "Fs3v12.wav",
  A4: "A4v12.wav",
  C4: "C4v12.wav",
  "D#4": "Ds4v12.wav",
  "F#4": "Fs4v12.wav",
  C5: "C5v12.wav"
};

const CDN_BASE = "https://nbrosowsky.github.io/tonejs-instruments/samples/";

const INSTRUMENT_SOURCES = {
  salamander: {
    name: "Salamander Grand Piano",
    author: "Alexander Holm",
    license: "CC BY 3.0",
    url: "https://sfzinstruments.github.io/pianos/salamander/"
  },
  tonejsInstruments: {
    name: "tonejs-instruments",
    author: "Nick Brosowsky",
    license: "MIT",
    url: "https://github.com/nbrosowsky/tonejs-instruments"
  }
};

const INSTRUMENTS = {
  piano: {
    name: "Piano",
    source: INSTRUMENT_SOURCES.salamander,
    baseUrl: "/salamander/samples/",
    urls: SAMPLE_URLS_V8,
    release: 1
  },
  violin: {
    name: "Violin",
    source: INSTRUMENT_SOURCES.tonejsInstruments,
    baseUrl: `${CDN_BASE}violin/`,
    urls: {
      A3: "A3.mp3", A4: "A4.mp3", A5: "A5.mp3", A6: "A6.mp3",
      C4: "C4.mp3", C5: "C5.mp3", C6: "C6.mp3", C7: "C7.mp3",
      E4: "E4.mp3", E5: "E5.mp3", E6: "E6.mp3",
      G3: "G3.mp3", G4: "G4.mp3", G5: "G5.mp3", G6: "G6.mp3"
    },
    release: 0.5
  },
  cello: {
    name: "Cello",
    source: INSTRUMENT_SOURCES.tonejsInstruments,
    baseUrl: `${CDN_BASE}cello/`,
    urls: {
      A2: "A2.mp3", A3: "A3.mp3", A4: "A4.mp3",
      C2: "C2.mp3", C3: "C3.mp3", C4: "C4.mp3", C5: "C5.mp3",
      E2: "E2.mp3", E3: "E3.mp3", E4: "E4.mp3",
      G2: "G2.mp3", G3: "G3.mp3", G4: "G4.mp3"
    },
    release: 0.8
  },
  organ: {
    name: "Organ",
    source: INSTRUMENT_SOURCES.tonejsInstruments,
    baseUrl: `${CDN_BASE}organ/`,
    urls: {
      A1: "A1.mp3", A2: "A2.mp3", A3: "A3.mp3", A4: "A4.mp3", A5: "A5.mp3",
      C1: "C1.mp3", C2: "C2.mp3", C3: "C3.mp3", C4: "C4.mp3", C5: "C5.mp3", C6: "C6.mp3",
      "D#1": "Ds1.mp3", "D#2": "Ds2.mp3", "D#3": "Ds3.mp3", "D#4": "Ds4.mp3", "D#5": "Ds5.mp3",
      "F#1": "Fs1.mp3", "F#2": "Fs2.mp3", "F#3": "Fs3.mp3", "F#4": "Fs4.mp3", "F#5": "Fs5.mp3"
    },
    release: 0.3
  },
  saxophone: {
    name: "Saxophone",
    source: INSTRUMENT_SOURCES.tonejsInstruments,
    baseUrl: `${CDN_BASE}saxophone/`,
    urls: {
      A3: "A3.mp3", A4: "A4.mp3", A5: "A5.mp3",
      C4: "C4.mp3", C5: "C5.mp3",
      "D#3": "Ds3.mp3", "D#4": "Ds4.mp3", "D#5": "Ds5.mp3",
      "F#3": "Fs3.mp3", "F#4": "Fs4.mp3", "F#5": "Fs5.mp3"
    },
    release: 0.4
  }
};

const elements = {
  status: document.getElementById("status"),
  scoreSelect: document.getElementById("scoreSelect"),
  userVoice: document.getElementById("userVoice"),
  instrumentSelect: document.getElementById("instrumentSelect"),
  panInvert: document.getElementById("panInvert"),
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
  tempo: document.getElementById("tempo"),
  tempoValue: document.getElementById("tempoValue"),
  tempoPresets: document.getElementById("tempoPresets"),
  parts: document.getElementById("parts"),
  timeline: IS_DEV ? document.getElementById("timeline") : null,
  downloadJson: IS_DEV ? document.getElementById("downloadJson") : null,
  downloadCsv: IS_DEV ? document.getElementById("downloadCsv") : null
};

const state = {
   currentScore: null,
   userVoice: localStorage.getItem("userVoice") || "T1",
   instrument: localStorage.getItem("instrument") || "piano",
   panInverted: localStorage.getItem("panInverted") === "true",
   tempo: 120,
   originalTempo: 120,
   parts: [],
   timeline: [],
   timelineRows: [],
   voiceCount: 0,
   voices: [],
   isPlaying: false,
   scoreTitle: "",
   scoreReady: false,
   playbackRAF: null,
   advancedVoiceMode: false,
   autoScrollPaused: false,
   autoScrollResumeTimeout: null,
   loopA: null,
   loopB: null,
   loopASeconds: null,
   loopBSeconds: null,
   loopMode: "inactive",
   isSeeking: false
};

function setStatus(message) {
  elements.status.textContent = message;
}

function midiToNoteName(midi) {
  return Tone.Frequency(midi, "midi").toNote();
}

function getTempo(doc) {
  const soundTempo = doc.querySelector("sound[tempo]");
  if (soundTempo) {
    const value = Number(soundTempo.getAttribute("tempo"));
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  const metronome = doc.querySelector("direction metronome per-minute");
  if (metronome) {
    const value = Number(metronome.textContent);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 120;
}

function getTitle(doc) {
  const title = doc.querySelector("work > work-title");
  if (title && title.textContent) {
    return title.textContent.trim();
  }

  const movementTitle = doc.querySelector("movement-title");
  if (movementTitle && movementTitle.textContent) {
    return movementTitle.textContent.trim();
  }

  return "Untitled";
}

function getPartNames(doc) {
  const names = new Map();
  doc.querySelectorAll("part-list score-part").forEach((part) => {
    const id = part.getAttribute("id");
    const name = part.querySelector("part-name")?.textContent?.trim();
    if (id) {
      names.set(id, name || id);
    }
  });
  return names;
}

function parsePitch(note) {
  const pitch = note.querySelector("pitch");
  if (!pitch) return null;

  const step = pitch.querySelector("step")?.textContent;
  const octave = pitch.querySelector("octave")?.textContent;
  if (!step || !octave) return null;

  const alterValue = pitch.querySelector("alter")?.textContent;
  const alter = alterValue ? Number(alterValue) : 0;
  const stepOffsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = stepOffsets[step] ?? 0;
  const midi = 12 * (Number(octave) + 1) + base + alter;
  return midi;
}

function hasTie(note, type) {
  return Boolean(
    Array.from(note.querySelectorAll("tie, notations > tied")).find(
      (tie) => tie.getAttribute("type") === type
    )
  );
}

function buildEventsForPart(part, name, partIndex) {
  const events = [];
  const tieMap = new Map();
  let currentDivisions = 1;
  let absoluteBeats = 0;
  let measureStartBeats = 0;
  let lastChordBeats = 0;
  const timeline = [];
  let measureIndex = 0;
  let chordIndex = 0;

  part.querySelectorAll("measure").forEach((measure) => {
    measureStartBeats = absoluteBeats;
    lastChordBeats = absoluteBeats;

    Array.from(measure.children).forEach((child) => {
      const tag = child.tagName;
      if (tag === "attributes") {
        const divisions = child.querySelector("divisions");
        if (divisions) {
          const value = Number(divisions.textContent);
          if (Number.isFinite(value) && value > 0) {
            currentDivisions = value;
          }
        }
        return;
      }

      if (tag === "backup" || tag === "forward") {
        const durationValue = child.querySelector("duration")?.textContent;
        const durationDivisions = durationValue ? Number(durationValue) : 0;
        if (!Number.isFinite(durationDivisions) || durationDivisions <= 0) {
          return;
        }
        const delta = durationDivisions / currentDivisions;
        if (tag === "backup") {
          absoluteBeats = Math.max(measureStartBeats, absoluteBeats - delta);
        } else {
          absoluteBeats += delta;
        }
        lastChordBeats = absoluteBeats;
        return;
      }

      if (tag !== "note") {
        return;
      }

      if (child.querySelector("grace")) {
        return;
      }

      const durationValue = child.querySelector("duration")?.textContent;
      const durationDivisions = durationValue ? Number(durationValue) : 0;
      if (!Number.isFinite(durationDivisions) || durationDivisions <= 0) {
        return;
      }

      const durationBeats = durationDivisions / currentDivisions;
      const isRest = Boolean(child.querySelector("rest"));
      const isChord = Boolean(child.querySelector("chord"));
      const noteBeats = isChord ? lastChordBeats : absoluteBeats;
      const voice = child.querySelector("voice")?.textContent?.trim() || "1";
      const staff = child.querySelector("staff")?.textContent?.trim() || "1";

      if (!isChord) {
        lastChordBeats = noteBeats;
        chordIndex = 0;
      } else {
        chordIndex++;
      }

      if (isRest) {
        timeline.push({
          partIndex,
          partName: name,
          measure: measureIndex,
          voice,
          staff,
          chordIndex,
          timeBeats: noteBeats,
          durationBeats,
          type: "rest"
        });
      } else {
        const midi = parsePitch(child);
        if (midi !== null) {
          const tieStart = hasTie(child, "start");
          const tieStop = hasTie(child, "stop");
          const tieKey = `${voice}:${midi}`;

          if (tieStart && !tieStop) {
            const existing = tieMap.get(tieKey);
            const start = existing ? existing.start : noteBeats;
            const total = (existing ? existing.duration : 0) + durationBeats;
            tieMap.set(tieKey, {
              start,
              duration: total,
              voice,
              staff,
              chordIndex,
              measure: measureIndex
            });
          } else if (tieStop) {
            const existing = tieMap.get(tieKey);
            const start = existing ? existing.start : noteBeats;
            const total = (existing ? existing.duration : 0) + durationBeats;
            const measureValue = existing ? existing.measure : measureIndex;
            const voiceValue = existing ? existing.voice : voice;
            const staffValue = existing ? existing.staff : staff;
            const chordIndexValue = existing ? existing.chordIndex : chordIndex;
            tieMap.delete(tieKey);
            const event = {
              timeBeats: start,
              durationBeats: total,
              midi
            };
            events.push(event);
            timeline.push({
              partIndex,
              partName: name,
              measure: measureValue,
              voice: voiceValue,
              staff: staffValue,
              chordIndex: chordIndexValue,
              timeBeats: start,
              durationBeats: total,
              type: "note",
              midi
            });
          } else {
            events.push({ timeBeats: noteBeats, durationBeats, midi });
            timeline.push({
              partIndex,
              partName: name,
              measure: measureIndex,
              voice,
              staff,
              chordIndex,
              timeBeats: noteBeats,
              durationBeats,
              type: "note",
              midi
            });
          }
        }
      }

      if (!isChord) {
        absoluteBeats += durationBeats;
      }
    });

    measureIndex += 1;
  });

  return {
    name,
    events,
    timeline
  };
}

function parseMusicXML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const tempo = getTempo(doc);
  const title = getTitle(doc);
  const partNames = getPartNames(doc);
  const parts = [];
  const timeline = [];

  doc.querySelectorAll("part").forEach((part, index) => {
    const id = part.getAttribute("id") || "Part";
    const name = partNames.get(id) || id;
    const built = buildEventsForPart(part, name, index);
    parts.push(built);
    timeline.push(...built.timeline);
  });

  return { tempo, title, parts, timeline };
}

function createVoiceState(voiceIndex, voiceName) {
  const instrument = INSTRUMENTS[state.instrument] || INSTRUMENTS.piano;
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
    muted: false
  };
}

function applyVoiceSettings(voice) {
  const targetGain = voice.muted ? 0 : voice.volume;
  voice.gain.gain.rampTo(targetGain, 0.05);
  voice.panner.pan.rampTo(voice.pan, 0.05);
}

function renderVoices() {
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

function renderSimpleVoiceControls(userVoice, otherVoiceShortNames) {
  const container = elements.parts;
  
  if (userVoice) {
    container.appendChild(createVoiceControlRow(userVoice.shortName, "My Voice", false));
  }
  
  if (otherVoiceShortNames.length > 0) {
    const otherVoices = state.voices.filter(v => otherVoiceShortNames.includes(v.shortName));
    const otherVolume = otherVoices[0].volume;
    const otherPan = otherVoices[0].pan;
    const otherMuted = otherVoices.every(v => v.muted);
    
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
          <span>Volume</span>
          <input data-role="volume" type="range" min="0" max="1" step="0.01" value="${otherVolume}" title="${Math.round(otherVolume * 100)}%" />
        </label>
        <label class="field">
          <span>Pan</span>
          <input data-role="pan" type="range" min="-1" max="1" step="0.01" value="${otherPan}" title="${formatPan(otherPan)}" />
        </label>
      </div>
    `;
    
    const muteInput = row.querySelector('[data-role="mute"]');
    const volumeInput = row.querySelector('[data-role="volume"]');
    const panInput = row.querySelector('[data-role="pan"]');
    
    muteInput.addEventListener("change", (event) => {
      for (const shortName of otherVoiceShortNames) {
        const voice = state.voices.find(v => v.shortName === shortName);
        if (!voice) continue;
        voice.muted = event.target.checked;
        applyVoiceSettings(voice);
      }
    });
    
    volumeInput.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      volumeInput.title = `${Math.round(value * 100)}%`;
      for (const shortName of otherVoiceShortNames) {
        const voice = state.voices.find(v => v.shortName === shortName);
        if (!voice) continue;
        voice.volume = value;
        applyVoiceSettings(voice);
      }
    });
    
    panInput.addEventListener("input", (event) => {
      const value = Number(event.target.value);
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

function renderAdvancedVoiceControls() {
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

function createVoiceControlRow(voiceShortName, label, isAdvanced) {
  const voice = state.voices.find(v => v.shortName === voiceShortName);
  const row = document.createElement("div");
  row.className = "part";
  row.dataset.voice = voiceShortName;
  if (!isAdvanced && label === "My Voice") {
    row.classList.add("part--user");
  }
  
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
        <span>Volume</span>
        <input data-role="volume" type="range" min="0" max="1" step="0.01" value="${voice.volume}" title="${Math.round(voice.volume * 100)}%" />
      </label>
      <label class="field">
        <span>Pan</span>
        <input data-role="pan" type="range" min="-1" max="1" step="0.01" value="${voice.pan}" title="${formatPan(voice.pan)}" />
      </label>
    </div>
  `;

  const muteInput = row.querySelector('[data-role="mute"]');
  const volumeInput = row.querySelector('[data-role="volume"]');
  const panInput = row.querySelector('[data-role="pan"]');

  muteInput.addEventListener("change", (event) => {
    const v = state.voices.find(v => v.shortName === voiceShortName);
    if (!v) return;
    v.muted = event.target.checked;
    applyVoiceSettings(v);
  });

  volumeInput.addEventListener("input", (event) => {
    const v = state.voices.find(v => v.shortName === voiceShortName);
    if (!v) return;
    v.volume = Number(event.target.value);
    volumeInput.title = `${Math.round(v.volume * 100)}%`;
    applyVoiceSettings(v);
  });

  panInput.addEventListener("input", (event) => {
    const v = state.voices.find(v => v.shortName === voiceShortName);
    if (!v) return;
    v.pan = Number(event.target.value);
    panInput.title = formatPan(v.pan);
    applyVoiceSettings(v);
  });

  applyVoiceSettings(voice);
  return row;
}

function formatPan(pan) {
   if (Math.abs(pan) < 0.05) return "Center";
   const pct = Math.round(Math.abs(pan) * 100);
   return pan < 0 ? `${pct}% L` : `${pct}% R`;
}

function formatTime(seconds) {
   const mins = Math.floor(seconds / 60);
   const secs = Math.floor(seconds % 60);
   return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDuration(durationBeats) {
  const durationMap = {
    4: "/1",
    3: "/2.",
    2: "/2",
    1.5: "/4.",
    1: "/4",
    0.75: "/8.",
    0.5: "/8",
    0.375: "/16.",
    0.25: "/16",
    0.125: "/32"
  };
  return durationMap[durationBeats] || `/${(4 / durationBeats).toFixed(1)}`;
}

function formatNoteShort(midi, durationBeats) {
  const noteName = midiToNoteName(midi);
  return `${noteName}${formatDuration(durationBeats)}`;
}

function formatRestShort(durationBeats) {
  return `R${formatDuration(durationBeats)}`;
}

function assignVoicesToNotes() {
  const events = state.timeline.filter((e) => 
    (e.type === "note" && e.midi !== undefined) || e.type === "rest"
  );
  if (events.length === 0) {
    state.voiceCount = 0;
    return;
  }

  const expectedVoiceCount = state.currentScore?.voices?.length || 0;

  const voiceGroups = new Map();
  for (const event of events) {
    const key = `${event.partIndex}:${event.voice}`;
    if (!voiceGroups.has(key)) {
      voiceGroups.set(key, []);
    }
    voiceGroups.get(key).push(event);
  }

  const baseGroupCount = voiceGroups.size;
  const needsChordSplitting = expectedVoiceCount > baseGroupCount;

  if (!needsChordSplitting) {
    state.voiceCount = baseGroupCount;
    let voiceIndex = 0;
    for (const group of voiceGroups.values()) {
      for (const event of group) {
        event.voiceIndex = voiceIndex;
      }
      voiceIndex++;
    }
    return;
  }

  const partGroups = new Map();
  
  for (const [key, groupEvents] of voiceGroups.entries()) {
    const [partStr, voiceStr] = key.split(':');
    const partIndex = parseInt(partStr);
    const xmlVoice = parseInt(voiceStr);
    const notes = groupEvents.filter(e => e.type === "note");
    const rests = groupEvents.filter(e => e.type === "rest");
    
    const timeMap = new Map();
    for (const note of notes) {
      const t = note.timeBeats;
      if (!timeMap.has(t)) {
        timeMap.set(t, []);
      }
      timeMap.get(t).push(note);
    }
    
    let maxChordSize = 0;
    for (const notesAtTime of timeMap.values()) {
      maxChordSize = Math.max(maxChordSize, notesAtTime.length);
    }
    
    if (!partGroups.has(partIndex)) {
      partGroups.set(partIndex, []);
    }
    
    if (maxChordSize <= 1) {
      partGroups.get(partIndex).push({ events: groupEvents, xmlVoice, fromChordSplit: false });
    } else {
      const subGroups = [];
      for (let i = 0; i < maxChordSize; i++) {
        subGroups.push([]);
      }
      
      // First pass: assign notes from chords to establish pitch ranges
      for (const [t, notesAtTime] of timeMap.entries()) {
        if (notesAtTime.length > 1) {
          notesAtTime.sort((a, b) => b.midi - a.midi);
          for (let i = 0; i < notesAtTime.length; i++) {
            subGroups[i].push(notesAtTime[i]);
          }
        }
      }
      
      // Calculate median pitch for each subgroup
      const subGroupMedians = subGroups.map(sg => {
        if (sg.length === 0) return 0;
        const pitches = sg.map(n => n.midi).sort((a, b) => a - b);
        const mid = Math.floor(pitches.length / 2);
        return pitches.length % 2 === 0 ? (pitches[mid-1] + pitches[mid]) / 2 : pitches[mid];
      });
      
      // Second pass: assign single notes to closest subgroup by pitch
      for (const [t, notesAtTime] of timeMap.entries()) {
        if (notesAtTime.length === 1) {
          const note = notesAtTime[0];
          let bestIdx = 0;
          let bestDist = Infinity;
          for (let i = 0; i < maxChordSize; i++) {
            if (subGroupMedians[i] === 0) continue;
            const dist = Math.abs(note.midi - subGroupMedians[i]);
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
          partGroups.get(partIndex).push({ events: subGroup, xmlVoice, fromChordSplit: true });
        }
      }
    }
  }

  for (const [partIndex, groups] of partGroups.entries()) {
    if (groups.length <= 1) continue;
    
    const groupStats = groups.map((g, idx) => {
      const notes = g.events.filter(e => e.type === "note");
      if (notes.length === 0) return { idx, median: 0, count: 0, xmlVoice: g.xmlVoice, fromChordSplit: g.fromChordSplit };
      const pitches = notes.map(n => n.midi).sort((a, b) => a - b);
      const mid = Math.floor(pitches.length / 2);
      const median = pitches.length % 2 === 0 
        ? (pitches[mid - 1] + pitches[mid]) / 2 
        : pitches[mid];
      return { idx, median, count: notes.length, xmlVoice: g.xmlVoice, fromChordSplit: g.fromChordSplit };
    });
    
    groupStats.sort((a, b) => b.median - a.median);
    
    for (let i = groupStats.length - 1; i > 0; i--) {
      const small = groupStats[i];
      if (small.count > 10) continue;
      if (small.fromChordSplit) continue;
      
      let closest = -1;
      let closestDist = Infinity;
      for (let j = 0; j < i; j++) {
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
        targetGroup.push(...sourceGroup);
        sourceGroup.length = 0;
        groupStats.splice(i, 1);
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

function analyzeVoiceNames() {
  const notes = state.timeline.filter((e) => e.type === "note" && e.midi !== undefined);
  if (notes.length === 0 || state.voiceCount === 0) return [];

  const voiceStats = [];
  for (let i = 0; i < state.voiceCount; i++) {
    voiceStats.push({ index: i, pitches: [] });
  }

  for (const note of notes) {
    if (note.voiceIndex !== undefined) {
      voiceStats[note.voiceIndex].pitches.push(note.midi);
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
  const names = new Array(state.voiceCount);

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

function buildTimelineRows() {
  const events = state.timeline.filter((e) => 
    (e.type === "note" && e.midi !== undefined) || e.type === "rest"
  );
  if (events.length === 0) return { rows: [], voiceCount: 0 };

  const grouped = new Map();
  for (const entry of events) {
    if (entry.voiceIndex === undefined) continue;
    const key = entry.timeBeats.toFixed(4);
    if (!grouped.has(key)) {
      grouped.set(key, { timeBeats: entry.timeBeats, measure: entry.measure, events: [] });
    }
    grouped.get(key).events.push(entry);
  }

  const rows = Array.from(grouped.values())
    .sort((a, b) => a.timeBeats - b.timeBeats)
    .map((group) => {
      const voiceColumns = new Array(state.voiceCount).fill(null);

      for (const event of group.events) {
        if (event.voiceIndex !== undefined) {
          if (event.type === "note") {
            voiceColumns[event.voiceIndex] = {
              type: "note",
              midi: event.midi,
              durationBeats: event.durationBeats,
              display: formatNoteShort(event.midi, event.durationBeats)
            };
          } else if (event.type === "rest") {
            voiceColumns[event.voiceIndex] = {
              type: "rest",
              durationBeats: event.durationBeats,
              display: formatRestShort(event.durationBeats)
            };
          }
        }
      }

      return {
        timeBeats: group.timeBeats,
        timeSeconds: (group.timeBeats * 60) / state.tempo,
        measure: group.measure,
        voiceColumns
      };
    });

  return { rows, voiceCount: state.voiceCount };
}

function renderTimeline() {
  if (!elements.timeline) return;
  
  const { rows, voiceCount } = buildTimelineRows();
  state.timelineRows = rows;

  if (rows.length === 0) {
    elements.timeline.innerHTML = "<p class=\"hint\">No events to display.</p>";
    return;
  }

  const voiceHeaders = state.voices.map((v) => `<span>${v.shortName}</span>`).join("");
  const header = `
    <div class="timeline__row timeline__row--header" style="grid-template-columns: 4rem 4rem 2rem repeat(${voiceCount}, 1fr);">
      <span>Beat</span>
      <span>Sec</span>
      <span>M</span>
      ${voiceHeaders}
    </div>
  `;

  const rowsHtml = rows
    .map((entry, index) => {
      const voiceCells = entry.voiceColumns
        .map((cell) => {
          if (!cell) return `<span class="voice-cell"></span>`;
          const cellClass = cell.type === "rest" ? "voice-cell voice-cell--rest" : "voice-cell";
          return `<span class="${cellClass}">${cell.display}</span>`;
        })
        .join("");
      return `
        <div class="timeline__row" data-row-index="${index}" data-time-beats="${entry.timeBeats}" style="grid-template-columns: 4rem 4rem 2rem repeat(${voiceCount}, 1fr);">
          <span>${entry.timeBeats.toFixed(2)}</span>
          <span>${entry.timeSeconds.toFixed(2)}</span>
          <span>${entry.measure + 1}</span>
          ${voiceCells}
        </div>
      `;
    })
    .join("");

  elements.timeline.innerHTML = header + rowsHtml;
}

function updatePlaybackHighlight() {
  if (!state.isPlaying) {
    if (state.playbackRAF) {
      cancelAnimationFrame(state.playbackRAF);
      state.playbackRAF = null;
    }
    return;
  }

  if (!elements.timeline) {
    state.playbackRAF = requestAnimationFrame(updatePlaybackHighlight);
    return;
  }

  const currentSeconds = Tone.Transport.seconds;
  const currentBeats = (currentSeconds * state.tempo) / 60;

  const rows = elements.timeline.querySelectorAll(".timeline__row:not(.timeline__row--header)");
  let activeIndex = -1;

  for (let i = 0; i < state.timelineRows.length; i++) {
    const rowBeats = state.timelineRows[i].timeBeats;
    if (rowBeats <= currentBeats) {
      activeIndex = i;
    } else {
      break;
    }
  }

   rows.forEach((row, index) => {
     if (index === activeIndex) {
       row.classList.add("timeline__row--active");
       if (!state.autoScrollPaused) {
         row.scrollIntoView({ block: "nearest", behavior: "smooth" });
       }
     } else {
       row.classList.remove("timeline__row--active");
     }
   });

    if (!state.isSeeking) {
      elements.seekBar.value = currentSeconds;
    }

    const currentMeasure = getCurrentMeasure();
    elements.currentTime.textContent = `${formatTime(currentSeconds)} (M. ${currentMeasure + 1})`;

    // Check loop bounds
    if (state.loopMode === "active" && state.loopBSeconds !== null) {
      if (currentSeconds >= state.loopBSeconds) {
        Tone.Transport.seconds = state.loopASeconds;
        state.playbackRAF = requestAnimationFrame(updatePlaybackHighlight);
        return;
      }
    }

    state.playbackRAF = requestAnimationFrame(updatePlaybackHighlight);
}

function downloadFile(filename, content) {
   const blob = new Blob([content], { type: "text/plain" });
   const url = URL.createObjectURL(blob);
   const link = document.createElement("a");
   link.href = url;
   link.download = filename;
   document.body.appendChild(link);
   link.click();
   link.remove();
   URL.revokeObjectURL(url);
}

function getMeasureStartSeconds(measureNumber) {
   for (const row of state.timelineRows) {
      if (row.measure === measureNumber) {
         return row.timeSeconds;
      }
   }
   return null;
}

function getTotalDuration() {
   if (state.timelineRows.length === 0) return 0;
   const lastRow = state.timelineRows[state.timelineRows.length - 1];
   return lastRow.timeSeconds + 2;
}

function getCurrentMeasure() {
   const currentSeconds = Tone.Transport.seconds;
   for (let i = state.timelineRows.length - 1; i >= 0; i--) {
      if (state.timelineRows[i].timeSeconds <= currentSeconds) {
         return state.timelineRows[i].measure;
      }
   }
   return 0;
}

function getTotalMeasures() {
   if (state.timelineRows.length === 0) return 0;
   const lastRow = state.timelineRows[state.timelineRows.length - 1];
   return lastRow.measure + 1;
}

function buildSchedule() {
  Tone.Transport.cancel();
  Tone.Transport.bpm.value = state.tempo;

  const notes = state.timeline.filter((e) => e.type === "note" && e.midi !== undefined);
  for (const note of notes) {
    if (note.voiceIndex === undefined) continue;
    const voice = state.voices[note.voiceIndex];
    if (!voice) continue;

    const startSeconds = (note.timeBeats * 60) / state.tempo;
    const durationSeconds = (note.durationBeats * 60) / state.tempo;
    const noteName = midiToNoteName(note.midi);
    Tone.Transport.schedule((time) => {
      voice.sampler.triggerAttackRelease(noteName, durationSeconds, time, 0.8);
    }, startSeconds);
  }
}

function pausePlayback() {
  if (!state.isPlaying) return;
  Tone.Transport.pause();
  state.isPlaying = false;
  elements.playPauseButton.textContent = "▶";
  if (state.playbackRAF) {
    cancelAnimationFrame(state.playbackRAF);
    state.playbackRAF = null;
  }
}

async function startPlayback(fromSeconds = 0) {
  if (!state.scoreReady || state.isPlaying) return;
  await Tone.start();
  state.isPlaying = true;
  buildSchedule();
  Tone.Transport.seconds = fromSeconds;
  Tone.Transport.start();
  elements.playPauseButton.textContent = "❚❚";
  updatePlaybackHighlight();
}

function stopPlayback() {
  if (!state.isPlaying) return;
  Tone.Transport.stop();
  Tone.Transport.cancel();
  state.isPlaying = false;
  elements.playPauseButton.textContent = "▶";
  if (state.playbackRAF) {
    cancelAnimationFrame(state.playbackRAF);
    state.playbackRAF = null;
  }
  if (elements.timeline) {
    const rows = elements.timeline.querySelectorAll(".timeline__row--active");
    for (const row of rows) {
      row.classList.remove("timeline__row--active");
    }
  }
}

function setTempo(value) {
  state.tempo = value;
  elements.tempo.value = String(value);
  elements.tempoValue.textContent = String(value);
  updateTempoPresetButtons();
  if (state.isPlaying) {
    stopPlayback();
    startPlayback();
  }
}

function updateTempoPresetButtons() {
  const pct = Math.round((state.tempo / state.originalTempo) * 100);
  const buttons = elements.tempoPresets.querySelectorAll("button");
  for (const btn of buttons) {
    const btnPct = Number(btn.dataset.tempoPct);
    btn.classList.toggle("btn--active", btnPct === pct);
  }
}

function resetState() {
   if (state.isPlaying) {
     stopPlayback();
   }
   for (const voice of state.voices) {
     if (voice.sampler) voice.sampler.dispose();
     if (voice.gain) voice.gain.dispose();
     if (voice.panner) voice.panner.dispose();
   }
   state.voices = [];
   state.timeline = [];
   state.timelineRows = [];
   state.voiceCount = 0;
   state.parts = [];
   state.scoreReady = false;
   state.scoreTitle = "";
   
   // Clear loop state
   state.loopA = null;
   state.loopB = null;
   state.loopASeconds = null;
   state.loopBSeconds = null;
   state.loopMode = "inactive";
   elements.loopMarkerA.hidden = true;
   elements.loopMarkerB.hidden = true;
   elements.loopDisplay.hidden = true;
   elements.clearLoopButton.hidden = true;
   elements.setLoopButton.textContent = "A/B";
   
   // Hide player bar
   elements.playerBar.hidden = true;
   
   elements.parts.innerHTML = "";
   if (elements.timeline) elements.timeline.innerHTML = "";
}

async function loadScoreFromText(xmlText) {
  resetState();
  setStatus("Loading score...");
  
  const parsed = parseMusicXML(xmlText);

  state.originalTempo = Math.round(parsed.tempo);
  state.tempo = state.originalTempo;
  state.scoreTitle = parsed.title;
  state.timeline = parsed.timeline;
  state.parts = parsed.parts;
  elements.tempo.value = String(state.tempo);
  elements.tempoValue.textContent = String(state.tempo);
  updateTempoPresetButtons();

  assignVoicesToNotes();
  const voiceNames = analyzeVoiceNames();
  const mappedUserVoice = mapUserVoiceToScore(state.userVoice, voiceNames.map(v => ({ shortName: v.short })));

  const voiceStates = [];
  for (let i = 0; i < state.voiceCount; i++) {
    const isUserVoice = voiceNames[i].short === mappedUserVoice;
    const sampleUrls = isUserVoice ? SAMPLE_URLS_V12 : SAMPLE_URLS_V8;
    voiceStates.push(createVoiceState(i, voiceNames[i], sampleUrls));
  }
  await Tone.loaded();
  state.voices = voiceStates;
  state.scoreReady = true;

     applyUserVoiceMix();
     renderTimeline();
     const totalDuration = getTotalDuration();
     elements.seekBar.max = totalDuration;
     elements.seekBar.value = 0;
     const totalMeasures = getTotalMeasures();
     elements.totalTime.textContent = `${formatTime(totalDuration)} (M. ${totalMeasures})`;
     elements.currentTime.textContent = "0:00 (M. 1)";
     elements.playerBar.hidden = false;
     setStatus(`Loaded: ${parsed.title} (${state.voiceCount} voices)`);
}

elements.playPauseButton.addEventListener("click", async () => {
    if (state.isPlaying) {
      pausePlayback();
    } else {
      // Resume from current position if paused, otherwise start from beginning
      const position = Tone.Transport.seconds;
      try {
        await startPlayback(position > 0 ? position : 0);
      } catch (error) {
        setStatus(`Playback error: ${error.message}`);
      }
    }
});

elements.seekBar.addEventListener("input", () => {
  Tone.Transport.seconds = parseFloat(elements.seekBar.value);
});

elements.seekBar.addEventListener("pointerdown", () => {
  state.isSeeking = true;
});

elements.seekBar.addEventListener("pointerup", () => {
  state.isSeeking = false;
});

elements.seekBar.addEventListener("pointercancel", () => {
  state.isSeeking = false;
});

elements.playerStopButton.addEventListener("click", () => {
    stopPlayback();
    // Reset to loop start or beginning
    if (state.loopA !== null && state.loopASeconds !== null) {
      Tone.Transport.seconds = state.loopASeconds;
    } else {
      Tone.Transport.seconds = 0;
    }
});

elements.skipBackButton.addEventListener("click", () => {
  const currentMeasure = getCurrentMeasure();
  if (currentMeasure > 0) {
    Tone.Transport.seconds = getMeasureStartSeconds(currentMeasure - 1);
  } else {
    Tone.Transport.seconds = 0;
  }
});

elements.skipForwardButton.addEventListener("click", () => {
  const currentMeasure = getCurrentMeasure();
  const totalMeasures = getTotalMeasures();
  if (currentMeasure < totalMeasures - 1) {
    Tone.Transport.seconds = getMeasureStartSeconds(currentMeasure + 1);
  }
  // If at last measure, do nothing (stay at current position)
});

elements.setLoopButton.addEventListener("click", () => {
  const currentMeasure = getCurrentMeasure();
  
  if (state.loopMode === "inactive") {
    // First click - set A point
    state.loopA = currentMeasure;
    state.loopASeconds = getMeasureStartSeconds(currentMeasure);
    state.loopMode = "settingB";
    
    // Show marker A
    const totalDuration = getTotalDuration();
    const percentage = (state.loopASeconds / totalDuration) * 100;
    elements.loopMarkerA.style.left = `${percentage}%`;
    elements.loopMarkerA.hidden = false;
    
    // Update button to indicate waiting for B
    elements.setLoopButton.textContent = "B";
    elements.setLoopButton.title = "Set loop end point";
    
  } else if (state.loopMode === "settingB") {
    // Second click - set B point
    let loopB = currentMeasure;
    let loopBSeconds = getMeasureStartSeconds(currentMeasure);
    
    // Auto-swap if B < A
    if (loopBSeconds < state.loopASeconds) {
      const tempMeasure = state.loopA;
      const tempSeconds = state.loopASeconds;
      state.loopA = loopB;
      state.loopASeconds = loopBSeconds;
      loopB = tempMeasure;
      loopBSeconds = tempSeconds;
      
      // Update marker A position
      const totalDuration = getTotalDuration();
      const percentageA = (state.loopASeconds / totalDuration) * 100;
      elements.loopMarkerA.style.left = `${percentageA}%`;
    }
    
    state.loopB = loopB;
    state.loopBSeconds = loopBSeconds;
    state.loopMode = "active";
    
    // Show marker B
    const totalDuration = getTotalDuration();
    const percentageB = (state.loopBSeconds / totalDuration) * 100;
    elements.loopMarkerB.style.left = `${percentageB}%`;
    elements.loopMarkerB.hidden = false;
    
    // Show loop display
    elements.loopDisplay.textContent = `Loop: M.${state.loopA + 1} → M.${state.loopB + 1}`;
    elements.loopDisplay.hidden = false;
    elements.clearLoopButton.hidden = false;
    
    // Reset button
    elements.setLoopButton.textContent = "A/B";
    elements.setLoopButton.title = "Set loop point";
  }
});

elements.clearLoopButton.addEventListener("click", () => {
  // Reset state
  state.loopA = null;
  state.loopB = null;
  state.loopASeconds = null;
  state.loopBSeconds = null;
  state.loopMode = "inactive";
  
  // Hide markers and display
  elements.loopMarkerA.hidden = true;
  elements.loopMarkerB.hidden = true;
  elements.loopDisplay.hidden = true;
  elements.clearLoopButton.hidden = true;
  
  // Reset button
  elements.setLoopButton.textContent = "A/B";
  elements.setLoopButton.title = "Set loop point";
});

elements.tempo.addEventListener("input", (event) => {
  const value = Number(event.target.value);
  setTempo(value);
  renderTimeline();
});

elements.tempoPresets.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-tempo-pct]");
  if (!btn) return;
  const pct = Number(btn.dataset.tempoPct);
  const newTempo = Math.round(state.originalTempo * (pct / 100));
  setTempo(newTempo);
  renderTimeline();
});

if (elements.downloadJson) {
  elements.downloadJson.addEventListener("click", () => {
    const { rows, voiceCount } = buildTimelineRows();
    downloadFile(
      "timeline.json",
      JSON.stringify({ tempo: state.tempo, voiceCount, events: rows }, null, 2)
    );
  });
}

if (elements.downloadCsv) {
  elements.downloadCsv.addEventListener("click", () => {
    const { rows, voiceCount } = buildTimelineRows();
    const voiceHeaders = Array.from({ length: voiceCount }, (_, i) => `voice${i + 1}`);
    const header = ["timeBeats", "timeSeconds", "measure", ...voiceHeaders];
    const lines = [header.join(",")];
    for (const entry of rows) {
      const voiceCells = entry.voiceColumns.map((cell) => (cell ? cell.display : ""));
      const line = [
        entry.timeBeats.toFixed(2),
        entry.timeSeconds.toFixed(2),
        entry.measure + 1,
        ...voiceCells
      ];
      lines.push(line.join(","));
    }
    downloadFile("timeline.csv", `${lines.join("\n")}\n`);
  });
}

if (elements.timeline) {
  elements.timeline.addEventListener("click", (event) => {
    const row = event.target.closest(".timeline__row:not(.timeline__row--header)");
    if (!row) return;
    
    const timeBeats = parseFloat(row.dataset.timeBeats);
    if (!Number.isFinite(timeBeats)) return;
    
    const timeSeconds = (timeBeats * 60) / state.tempo;
    Tone.Transport.seconds = timeSeconds;
    
    if (!state.isPlaying) {
      startPlayback().catch((error) => {
        setStatus(`Playback error: ${error.message}`);
      });
    }
  });
}



elements.scoreSelect.addEventListener("change", (event) => {
  const url = event.target.value;
  if (!url) return;
  
  localStorage.setItem("selectedScore", url);
  state.currentScore = SCORES.find((s) => s.url === url) || null;
  
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Failed to load score");
      return response.text();
    })
    .then((xmlText) => loadScoreFromText(xmlText))
    .catch((error) => {
      setStatus(`Load error: ${error.message}`);
    });
});

elements.userVoice.addEventListener("change", (event) => {
  setUserVoice(event.target.value);
});

elements.panInvert.addEventListener("change", (event) => {
  state.panInverted = event.target.checked;
  localStorage.setItem("panInverted", state.panInverted);
  applyUserVoiceMix();
});

elements.instrumentSelect.addEventListener("change", async (event) => {
  const newInstrument = event.target.value;
  if (newInstrument === state.instrument) return;
  
  state.instrument = newInstrument;
  localStorage.setItem("instrument", newInstrument);
  
  if (state.scoreReady && state.voices.length > 0) {
    const wasPlaying = state.isPlaying;
    const playbackPosition = Tone.Transport.seconds;
    if (wasPlaying) {
      stopPlayback();
    }
    
    setStatus(`Switching to ${INSTRUMENTS[newInstrument].name}...`);
    
    const savedSettings = state.voices.map(v => ({
      name: { full: v.name, short: v.shortName },
      volume: v.volume,
      pan: v.pan,
      muted: v.muted
    }));
    
    for (const voice of state.voices) {
      voice.sampler.dispose();
      voice.gain.dispose();
      voice.panner.dispose();
    }
    
    state.voices = savedSettings.map((saved, i) => {
      const voice = createVoiceState(i, saved.name);
      voice.volume = saved.volume;
      voice.pan = saved.pan;
      voice.muted = saved.muted;
      return voice;
    });
    
    await Promise.all(state.voices.map(v => 
      new Promise(resolve => {
        if (v.sampler.loaded) {
          resolve();
        } else {
          const checkLoaded = setInterval(() => {
            if (v.sampler.loaded) {
              clearInterval(checkLoaded);
              resolve();
            }
          }, 50);
        }
      })
    ));
    
    for (const voice of state.voices) {
      applyVoiceSettings(voice);
    }
    
    renderVoices();
    setStatus(`Ready - ${INSTRUMENTS[newInstrument].name}`);
    
    if (wasPlaying) {
      startPlayback(playbackPosition).catch((error) => {
        setStatus(`Playback error: ${error.message}`);
      });
    }
  }
});

function initUserVoice() {
  elements.userVoice.value = state.userVoice;
  elements.instrumentSelect.value = state.instrument;
  elements.panInvert.checked = state.panInverted;
}

function populateScoreSelect() {
  for (const score of SCORES) {
    const option = document.createElement("option");
    option.value = score.url;
    option.textContent = score.name;
    elements.scoreSelect.appendChild(option);
  }
  
  const savedScore = localStorage.getItem("selectedScore");
  if (savedScore && SCORES.some(s => s.url === savedScore)) {
    elements.scoreSelect.value = savedScore;
    elements.scoreSelect.dispatchEvent(new Event("change"));
  }
}

initUserVoice();
populateScoreSelect();

function pauseAutoScroll() {
  state.autoScrollPaused = true;
  if (state.autoScrollResumeTimeout) {
    clearTimeout(state.autoScrollResumeTimeout);
  }
  state.autoScrollResumeTimeout = setTimeout(() => {
    state.autoScrollPaused = false;
  }, 3000);
}

if (elements.timeline) {
  elements.timeline.addEventListener("wheel", pauseAutoScroll, { passive: true });
  elements.timeline.addEventListener("touchstart", pauseAutoScroll, { passive: true });
  elements.timeline.addEventListener("pointerdown", pauseAutoScroll);
}
document.addEventListener("wheel", pauseAutoScroll, { passive: true });
document.addEventListener("touchmove", pauseAutoScroll, { passive: true });
