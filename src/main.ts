import * as Tone from "tone";
import type { AppElements, Score } from "./types";
import { SCORES } from "./scores.ts";
import { INSTRUMENTS, INSTRUMENT_SOURCES } from "./audio/instruments.ts";
import { parseMusicXML } from "./parser/musicxml.ts";
import { initAudioEngine } from "./audio/engine.ts";
import { initVoices } from "./ui/voices.ts";
import { initPlayer } from "./ui/player.ts";
import { initSettings } from "./ui/settings.ts";
import { initTimeline } from "./ui/timeline.ts";
import { state, getVoiceInstruments, saveVoiceInstrument, getUserVoice as getStoredUserVoice, setUserVoice as setStoredUserVoice } from "./state.ts";

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

const elements: AppElements = {
  status: document.getElementById("status")!,
  scoreSelect: document.getElementById("scoreSelect") as HTMLSelectElement,
  userVoice: document.getElementById("userVoice") as HTMLSelectElement,
  panInvert: document.getElementById("panInvert") as HTMLInputElement,
  playerBar: document.getElementById("playerBar")!,
  playPauseButton: document.getElementById("playPauseButton") as HTMLButtonElement,
  playerStopButton: document.getElementById("playerStopButton") as HTMLButtonElement,
  skipBackButton: document.getElementById("skipBackButton") as HTMLButtonElement,
  skipForwardButton: document.getElementById("skipForwardButton") as HTMLButtonElement,
  seekBar: document.getElementById("seekBar") as HTMLInputElement,
  currentTime: document.getElementById("currentTime")!,
  totalTime: document.getElementById("totalTime")!,
  parts: document.getElementById("parts")!,
  timeline: IS_DEV ? document.getElementById("timeline") : null,
  downloadJson: IS_DEV ? document.getElementById("downloadJson") : null,
  downloadCsv: IS_DEV ? document.getElementById("downloadCsv") : null,
  setLoopButton: document.getElementById("setLoopButton") as HTMLButtonElement,
  clearLoopButton: document.getElementById("clearLoopButton") as HTMLButtonElement,
  loopDisplay: document.getElementById("loopDisplay")!,
  loopMarkerA: document.getElementById("loopMarkerA")!,
  loopMarkerB: document.getElementById("loopMarkerB")!,
  settingsButton: document.getElementById("settingsButton") as HTMLButtonElement,
  settingsModal: document.getElementById("settingsModal")!,
  closeSettings: document.getElementById("closeSettings") as HTMLButtonElement,
  themeToggle: document.getElementById("themeToggle") as HTMLButtonElement,
  autoAdvance: document.getElementById("autoAdvance") as HTMLInputElement,
  showTimeline: document.getElementById("showTimeline") as HTMLInputElement,
  timelinePanel: document.querySelector(".panel--timeline"),
  resetSettings: document.getElementById("resetSettings") as HTMLButtonElement,
  tempoSelect: document.getElementById("tempoSelect") as HTMLSelectElement
};

function setStatus(message: string) {
  elements.status.textContent = message;
}

function midiToNoteName(midi: number) {
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

let timelineModule: ReturnType<typeof initTimeline>;
let playerModule: ReturnType<typeof initPlayer>;
let engineModule: ReturnType<typeof initAudioEngine>;

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
  const url = (event.target as HTMLSelectElement).value;
  if (!url) return;

  localStorage.setItem("selectedScore", url);
  state.currentScore = SCORES.find((s) => s.url === url) || null;

  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Failed to load score");
      return response.text();
    })
    .then(async (xmlText) => {
      const result = await engineModule.loadScoreFromText(xmlText);
      if (result.isErr()) {
        setStatus(`Parse error: ${result.error.message}`);
      }
    })
    .catch((error) => {
      setStatus(`Load error: ${error.message}`);
    });
});

elements.userVoice.addEventListener("change", (event) => {
  voicesModule.setUserVoice((event.target as HTMLSelectElement).value);
});

elements.panInvert.addEventListener("change", (event) => {
  state.panInverted = (event.target as HTMLInputElement).checked;
  localStorage.setItem("panInverted", String(state.panInverted));
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
