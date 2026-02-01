import * as Tone from "tone";

const SCORE_URL = "/score.musicxml";
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
  playButton: document.getElementById("playButton"),
  stopButton: document.getElementById("stopButton"),
  tempo: document.getElementById("tempo"),
  tempoValue: document.getElementById("tempoValue"),
  parts: document.getElementById("parts"),
  timeline: document.getElementById("timeline"),
  downloadJson: document.getElementById("downloadJson"),
  downloadCsv: document.getElementById("downloadCsv")
};

const state = {
  tempo: 120,
  parts: [],
  timeline: [],
  timelineRows: [],
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

function createPartState(part) {
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
    name: part.name,
    events: part.events,
    sampler,
    gain,
    panner,
    volume: 0.9,
    pan: 0,
    muted: false
  };
}

function applyPartSettings(part) {
  part.gain.gain.value = part.muted ? 0 : part.volume;
  part.panner.pan.value = part.pan;
}

function renderParts() {
  elements.parts.innerHTML = "";
  state.parts.forEach((part) => {
    const row = document.createElement("div");
    row.className = "part";
    row.innerHTML = `
      <div class="part__name">${part.name}</div>
      <div class="part__controls">
        <label class="field">
          <span>Mute</span>
          <input data-role="mute" type="checkbox" />
        </label>
        <label class="field">
          <span>Volume</span>
          <input data-role="volume" type="range" min="0" max="1" step="0.01" value="${part.volume}" />
        </label>
        <label class="field">
          <span>Pan</span>
          <input data-role="pan" type="range" min="-1" max="1" step="0.01" value="${part.pan}" />
        </label>
      </div>
    `;

    const muteInput = row.querySelector('[data-role="mute"]');
    const volumeInput = row.querySelector('[data-role="volume"]');
    const panInput = row.querySelector('[data-role="pan"]');

    muteInput.addEventListener("change", (event) => {
      part.muted = event.target.checked;
      applyPartSettings(part);
    });

    volumeInput.addEventListener("input", (event) => {
      part.volume = Number(event.target.value);
      applyPartSettings(part);
    });

    panInput.addEventListener("input", (event) => {
      part.pan = Number(event.target.value);
      applyPartSettings(part);
    });

    elements.parts.appendChild(row);
    applyPartSettings(part);
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

function buildTimelineRows() {
  const notes = state.timeline.filter((e) => e.type === "note" && e.midi !== undefined);

  const grouped = new Map();
  notes.forEach((entry) => {
    const key = entry.timeBeats.toFixed(4);
    if (!grouped.has(key)) {
      grouped.set(key, { timeBeats: entry.timeBeats, measure: entry.measure, notes: [] });
    }
    grouped.get(key).notes.push(entry);
  });

  const rows = Array.from(grouped.values())
    .sort((a, b) => a.timeBeats - b.timeBeats)
    .map((group) => {
      const sortedNotes = group.notes.sort((a, b) => b.midi - a.midi);
      const notesStr = sortedNotes.map((n) => formatNoteShort(n.midi, n.durationBeats)).join(" ");
      return {
        timeBeats: group.timeBeats,
        timeSeconds: (group.timeBeats * 60) / state.tempo,
        measure: group.measure,
        notes: notesStr
      };
    });

  return rows;
}

function renderTimeline() {
  const rows = buildTimelineRows();
  state.timelineRows = rows;
  if (rows.length === 0) {
    elements.timeline.innerHTML = "<p class=\"hint\">No events to display.</p>";
    return;
  }

  const header = `
    <div class="timeline__row timeline__row--header">
      <span>Beat</span>
      <span>Sec</span>
      <span>M</span>
      <span>Notes</span>
    </div>
  `;

  const rowsHtml = rows
    .map((entry, index) => {
      return `
        <div class="timeline__row" data-row-index="${index}" data-time-beats="${entry.timeBeats}">
          <span>${entry.timeBeats.toFixed(2)}</span>
          <span>${entry.timeSeconds.toFixed(2)}</span>
          <span>${entry.measure + 1}</span>
          <span>${entry.notes}</span>
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

  state.parts.forEach((part) => {
    part.events.forEach((event) => {
      const startSeconds = (event.timeBeats * 60) / state.tempo;
      const durationSeconds = (event.durationBeats * 60) / state.tempo;
      const noteName = midiToNoteName(event.midi);
      Tone.Transport.schedule((time) => {
        part.sampler.triggerAttackRelease(noteName, durationSeconds, time, 0.8);
      }, startSeconds);
    });
  });
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
  rows.forEach((row) => row.classList.remove("timeline__row--active"));
}

function setTempo(value) {
  state.tempo = value;
  elements.tempoValue.textContent = String(value);
  if (state.isPlaying) {
    stopPlayback();
    startPlayback();
  }
}

async function loadScore() {
  setStatus("Loading score...");
  const response = await fetch(SCORE_URL);
  if (!response.ok) {
    throw new Error("Failed to load MusicXML file");
  }
  const xmlText = await response.text();
  const parsed = parseMusicXML(xmlText);

  state.tempo = Math.round(parsed.tempo);
  state.scoreTitle = parsed.title;
  elements.tempo.value = String(state.tempo);
  elements.tempoValue.textContent = String(state.tempo);

  const partStates = parsed.parts.map(createPartState);
  await Tone.loaded();
  state.parts = partStates;
  state.timeline = parsed.timeline;
  state.scoreReady = true;

  renderParts();
  renderTimeline();
  elements.playButton.disabled = false;
  setStatus(`Loaded: ${parsed.title} (${parsed.parts.length} parts)`);
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

elements.downloadJson.addEventListener("click", () => {
  const rows = buildTimelineRows();
  downloadFile(
    "timeline.json",
    JSON.stringify({ tempo: state.tempo, events: rows }, null, 2)
  );
});

elements.downloadCsv.addEventListener("click", () => {
  const rows = buildTimelineRows();
  const header = [
    "timeBeats",
    "timeSeconds",
    "measure",
    "part",
    "voice",
    "staff",
    "type",
    "pitch",
    "durationBeats",
    "durationSeconds"
  ];
  const lines = [header.join(",")];
  rows.forEach((entry) => {
    const pitch = entry.midi !== undefined ? midiToNoteName(entry.midi) : "";
    const line = [
      entry.timeBeats.toFixed(2),
      entry.timeSeconds.toFixed(2),
      entry.measure + 1,
      entry.partName,
      entry.voice,
      entry.staff,
      entry.type,
      pitch,
      entry.durationBeats.toFixed(2),
      entry.durationSeconds.toFixed(2)
    ];
    lines.push(line.join(","));
  });
  downloadFile("timeline.csv", `${lines.join("\n")}\n`);
});

loadScore().catch((error) => {
  setStatus(`Load error: ${error.message}`);
});
