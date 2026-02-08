import * as Tone from "tone";
import { SCORES } from "./scores.js";
import { INSTRUMENTS, INSTRUMENT_SOURCES } from "./audio/instruments.js";
import { parseMusicXML } from "./parser/musicxml.js";
import { initAudioEngine } from "./audio/engine.js";
import { initVoices } from "./ui/voices.js";
import { initPlayer } from "./ui/player.js";
import { initSettings } from "./ui/settings.js";
import { initTimeline } from "./ui/timeline.js";
import { state, getVoiceInstruments, saveVoiceInstrument, getUserVoice as getStoredUserVoice, setUserVoice as setStoredUserVoice } from "./state.js";

const IS_DEV = import.meta.env.DEV;

if ("serviceWorker" in navigator && !IS_DEV) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

if (!IS_DEV) {
  document.querySelectorAll("[data-dev]").forEach(el => {
    el.remove();
  });
}

const elements = {
  status: document.getElementById("status"),
  scoreSelect: document.getElementById("scoreSelect"),
  userVoice: document.getElementById("userVoice"),
  panInvert: document.getElementById("panInvert"),
  playerBar: document.getElementById("playerBar"),
  playPauseButton: document.getElementById("playPauseButton"),
  playerStopButton: document.getElementById("playerStopButton"),
  skipBackButton: document.getElementById("skipBackButton"),
  skipForwardButton: document.getElementById("skipForwardButton"),
  seekBar: document.getElementById("seekBar"),
  currentTime: document.getElementById("currentTime"),
  totalTime: document.getElementById("totalTime"),
  parts: document.getElementById("parts"),
  timeline: IS_DEV ? document.getElementById("timeline") : null,
  downloadJson: IS_DEV ? document.getElementById("downloadJson") : null,
  downloadCsv: IS_DEV ? document.getElementById("downloadCsv") : null,
  setLoopButton: document.getElementById("setLoopButton"),
  clearLoopButton: document.getElementById("clearLoopButton"),
  loopDisplay: document.getElementById("loopDisplay"),
  loopMarkerA: document.getElementById("loopMarkerA"),
  loopMarkerB: document.getElementById("loopMarkerB"),
  settingsButton: document.getElementById("settingsButton"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettings: document.getElementById("closeSettings"),
  themeToggle: document.getElementById("themeToggle"),
  autoAdvance: document.getElementById("autoAdvance"),
  showTimeline: document.getElementById("showTimeline"),
  timelinePanel: document.querySelector(".panel--timeline"),
  resetSettings: document.getElementById("resetSettings"),
  tempoSelect: document.getElementById("tempoSelect")
};

function setStatus(message) {
  elements.status.textContent = message;
}

function midiToNoteName(midi) {
  return Tone.Frequency(midi, "midi").toNote();
}

const voicesModule = initVoices({
  Tone,
  state,
  elements,
  INSTRUMENTS,
  saveVoiceInstrument,
  setStoredUserVoice,
  getStoredUserVoice
});

const settingsModule = initSettings({
  state,
  elements,
  SCORES,
  setStatus
});

let timelineModule;
let playerModule;
let engineModule;

playerModule = initPlayer({
  Tone,
  state,
  elements,
  setStatus,
  pausePlayback: () => engineModule.pausePlayback(),
  startPlayback: (...args) => engineModule.startPlayback(...args),
  stopPlayback: () => engineModule.stopPlayback(),
  setTempo: (value) => engineModule.setTempo(value),
  renderTimeline: () => timelineModule.renderTimeline(),
  buildTimelineRows: () => timelineModule.buildTimelineRows(),
  loadNextScore: () => settingsModule.loadNextScore()
});

timelineModule = initTimeline({
  state,
  elements,
  formatNoteShort: playerModule.formatNoteShort,
  formatRestShort: playerModule.formatRestShort
});

engineModule = initAudioEngine({
  Tone,
  state,
  elements,
  setStatus,
  parseMusicXML,
  midiToNoteName,
  assignVoicesToNotes: () => voicesModule.assignVoicesToNotes(),
  analyzeVoiceNames: () => voicesModule.analyzeVoiceNames(),
  mapUserVoiceToScore: (...args) => voicesModule.mapUserVoiceToScore(...args),
  getVoiceInstruments,
  createVoiceState: (...args) => voicesModule.createVoiceState(...args),
  applyUserVoiceMix: () => voicesModule.applyUserVoiceMix(),
  renderTimeline: () => timelineModule.renderTimeline(),
  getTotalBeats: () => playerModule.getTotalBeats(),
  getTotalDuration: () => playerModule.getTotalDuration(),
  getTotalMeasures: () => playerModule.getTotalMeasures(),
  formatTime: (seconds) => playerModule.formatTime(seconds),
  updatePlaybackHighlight: () => playerModule.updatePlaybackHighlight()
});

function initUserVoice() {
  elements.userVoice.value = state.userVoice;
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
    .then((xmlText) => engineModule.loadScoreFromText(xmlText))
    .catch((error) => {
      setStatus(`Load error: ${error.message}`);
    });
});

elements.userVoice.addEventListener("change", (event) => {
  voicesModule.setUserVoice(event.target.value);
});

elements.panInvert.addEventListener("change", (event) => {
  state.panInverted = event.target.checked;
  localStorage.setItem("panInverted", state.panInverted);
  voicesModule.applyUserVoiceMix();
});

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

initUserVoice();
populateScoreSelect();
