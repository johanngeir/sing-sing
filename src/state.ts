import type { AppState, LoopMode } from "./types.ts";
import { ThemeSchema, BoolStringSchema, VoiceInstrumentsSchema, safeParse } from "./schemas.ts";

function createState(): AppState {
  return {
    currentScore: null,
    userVoice: localStorage.getItem("userVoice") || "T1",
    panInverted: safeParse(BoolStringSchema, localStorage.getItem("panInverted"), false),
    theme: safeParse(ThemeSchema, localStorage.getItem("theme"), "light"),
    autoAdvance: safeParse(BoolStringSchema, localStorage.getItem("autoAdvance"), false),
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
    const raw = JSON.parse(localStorage.getItem("voiceInstruments") || "{}");
    return safeParse(VoiceInstrumentsSchema, raw, {});
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
