import * as Tone from "tone";

const SCORES = [
  { name: "Færðu mér ljósið", url: "/scores/faerdu-mer-ljosid.musicxml", voices: "SATBB" },
  { name: "Nú máttu hægt", url: "/scores/Nú máttu hægt.mvt1.withwedges-split.musicxml", voices: "TTBB" }
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

const SAMPLE_BASE = "/salamander/samples/";
const SAMPLE_URLS = {
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

const elements = {
  status: document.getElementById("status"),
  scoreSelect: document.getElementById("scoreSelect"),
  fileInput: document.getElementById("fileInput"),
  playButton: document.getElementById("playButton"),
  stopButton: document.getElementById("stopButton"),
  tempo: document.getElementById("tempo"),
  tempoValue: document.getElementById("tempoValue"),
  tempoPresets: document.getElementById("tempoPresets"),
  parts: document.getElementById("parts"),
  timeline: document.getElementById("timeline"),
  downloadJson: document.getElementById("downloadJson"),
  downloadCsv: document.getElementById("downloadCsv")
};

const state = {
  currentScore: null,
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
  playbackRAF: null
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
      }

      if (isRest) {
        timeline.push({
          partIndex,
          partName: name,
          measure: measureIndex,
          voice,
          staff,
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
              measure: measureIndex
            });
          } else if (tieStop) {
            const existing = tieMap.get(tieKey);
            const start = existing ? existing.start : noteBeats;
            const total = (existing ? existing.duration : 0) + durationBeats;
            const measureValue = existing ? existing.measure : measureIndex;
            const voiceValue = existing ? existing.voice : voice;
            const staffValue = existing ? existing.staff : staff;
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
  const sampler = new Tone.Sampler({
    urls: SAMPLE_URLS,
    baseUrl: SAMPLE_BASE,
    release: 1
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
  voice.gain.gain.value = voice.muted ? 0 : voice.volume;
  voice.panner.pan.value = voice.pan;
}

function renderVoices() {
  elements.parts.innerHTML = "";
  state.voices.forEach((voice) => {
    const row = document.createElement("div");
    row.className = "part";
    row.innerHTML = `
      <div class="part__name">${voice.name}</div>
      <div class="part__controls">
        <label class="field">
          <span>Mute</span>
          <input data-role="mute" type="checkbox" />
        </label>
        <label class="field">
          <span>Volume</span>
          <input data-role="volume" type="range" min="0" max="1" step="0.01" value="${voice.volume}" />
        </label>
        <label class="field">
          <span>Pan</span>
          <input data-role="pan" type="range" min="-1" max="1" step="0.01" value="${voice.pan}" />
        </label>
      </div>
    `;

    const muteInput = row.querySelector('[data-role="mute"]');
    const volumeInput = row.querySelector('[data-role="volume"]');
    const panInput = row.querySelector('[data-role="pan"]');

    muteInput.addEventListener("change", (event) => {
      voice.muted = event.target.checked;
      applyVoiceSettings(voice);
    });

    volumeInput.addEventListener("input", (event) => {
      voice.volume = Number(event.target.value);
      applyVoiceSettings(voice);
    });

    panInput.addEventListener("input", (event) => {
      voice.pan = Number(event.target.value);
      applyVoiceSettings(voice);
    });

    elements.parts.appendChild(row);
    applyVoiceSettings(voice);
  });
}

function formatNoteShort(midi, durationBeats) {
  const noteName = midiToNoteName(midi);
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
  const dur = durationMap[durationBeats] || `/${(4 / durationBeats).toFixed(1)}`;
  return `${noteName}${dur}`;
}

function assignVoicesToNotes() {
  const notes = state.timeline.filter((e) => e.type === "note" && e.midi !== undefined);
  if (notes.length === 0) {
    state.voiceCount = 0;
    return;
  }

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.timeBeats !== b.timeBeats) return a.timeBeats - b.timeBeats;
    return b.midi - a.midi;
  });

  const voiceEndTimes = [];

  for (const note of sortedNotes) {
    const noteStart = note.timeBeats;
    const noteEnd = noteStart + note.durationBeats;

    let assignedVoice = -1;
    for (let i = 0; i < voiceEndTimes.length; i++) {
      if (voiceEndTimes[i] <= noteStart) {
        assignedVoice = i;
        voiceEndTimes[i] = noteEnd;
        break;
      }
    }

    if (assignedVoice === -1) {
      assignedVoice = voiceEndTimes.length;
      voiceEndTimes.push(noteEnd);
    }

    note.voiceIndex = assignedVoice;
  }

  state.voiceCount = voiceEndTimes.length;
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
  const notes = state.timeline.filter((e) => e.type === "note" && e.midi !== undefined);
  if (notes.length === 0) return { rows: [], voiceCount: 0 };

  const grouped = new Map();
  for (const entry of notes) {
    const key = entry.timeBeats.toFixed(4);
    if (!grouped.has(key)) {
      grouped.set(key, { timeBeats: entry.timeBeats, measure: entry.measure, notes: [] });
    }
    grouped.get(key).notes.push(entry);
  }

  const rows = Array.from(grouped.values())
    .sort((a, b) => a.timeBeats - b.timeBeats)
    .map((group) => {
      const voiceColumns = new Array(state.voiceCount).fill(null);

      for (const note of group.notes) {
        if (note.voiceIndex !== undefined) {
          voiceColumns[note.voiceIndex] = {
            midi: note.midi,
            durationBeats: note.durationBeats,
            display: formatNoteShort(note.midi, note.durationBeats)
          };
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
        .map((cell) => `<span class="voice-cell">${cell ? cell.display : ""}</span>`)
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
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      row.classList.remove("timeline__row--active");
    }
  });

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

async function startPlayback() {
  if (!state.scoreReady || state.isPlaying) return;
  await Tone.start();
  state.isPlaying = true;
  buildSchedule();
  Tone.Transport.start();
  elements.playButton.disabled = true;
  elements.stopButton.disabled = false;
  updatePlaybackHighlight();
}

function stopPlayback() {
  if (!state.isPlaying) return;
  Tone.Transport.stop();
  Tone.Transport.cancel();
  state.isPlaying = false;
  elements.playButton.disabled = false;
  elements.stopButton.disabled = true;
  if (state.playbackRAF) {
    cancelAnimationFrame(state.playbackRAF);
    state.playbackRAF = null;
  }
  const rows = elements.timeline.querySelectorAll(".timeline__row--active");
  for (const row of rows) {
    row.classList.remove("timeline__row--active");
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
  elements.playButton.disabled = true;
  elements.parts.innerHTML = "";
  elements.timeline.innerHTML = "";
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

  const voiceStates = [];
  for (let i = 0; i < state.voiceCount; i++) {
    voiceStates.push(createVoiceState(i, voiceNames[i]));
  }
  await Tone.loaded();
  state.voices = voiceStates;
  state.scoreReady = true;

  renderVoices();
  renderTimeline();
  elements.playButton.disabled = false;
  setStatus(`Loaded: ${parsed.title} (${state.voiceCount} voices)`);
}

elements.playButton.addEventListener("click", () => {
  startPlayback().catch((error) => {
    setStatus(`Playback error: ${error.message}`);
  });
});

elements.stopButton.addEventListener("click", () => {
  stopPlayback();
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

elements.downloadJson.addEventListener("click", () => {
  const { rows, voiceCount } = buildTimelineRows();
  downloadFile(
    "timeline.json",
    JSON.stringify({ tempo: state.tempo, voiceCount, events: rows }, null, 2)
  );
});

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

elements.fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  state.currentScore = null;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    loadScoreFromText(e.target.result).catch((error) => {
      setStatus(`Load error: ${error.message}`);
    });
  };
  reader.onerror = () => {
    setStatus("Error reading file");
  };
  reader.readAsText(file);
});

elements.scoreSelect.addEventListener("change", (event) => {
  const url = event.target.value;
  if (!url) return;
  
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

function populateScoreSelect() {
  for (const score of SCORES) {
    const option = document.createElement("option");
    option.value = score.url;
    option.textContent = score.name;
    elements.scoreSelect.appendChild(option);
  }
}

populateScoreSelect();
