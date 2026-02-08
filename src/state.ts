import type { AppState, LoopMode } from "./types.ts";

function createState(): AppState {
  return {
    currentScore: null,
    userVoice: localStorage.getItem("userVoice") || "T1",
    panInverted: localStorage.getItem("panInverted") === "true",
    theme: (localStorage.getItem("theme") === "dark" ? "dark" : "light"),
    autoAdvance: localStorage.getItem("autoAdvance") === "true",
    showTimeline: localStorage.getItem("showTimeline") !== "false",
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
    loopMode: "inactive" as LoopMode,
    isSeeking: false
  };
}

const state: AppState = createState();

function getVoiceInstruments(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("voiceInstruments") || "{}") || {};
  } catch {
    return {};
  }
}

function saveVoiceInstrument(shortName: string, instrumentKey: string): void {
  const instruments = getVoiceInstruments();
  instruments[shortName] = instrumentKey;
  localStorage.setItem("voiceInstruments", JSON.stringify(instruments));
}

function getUserVoice(): string {
  return state.userVoice;
}

function setUserVoice(voice: string): void {
  state.userVoice = voice;
  localStorage.setItem("userVoice", voice);
}

export { state, createState, getVoiceInstruments, saveVoiceInstrument, getUserVoice, setUserVoice };
