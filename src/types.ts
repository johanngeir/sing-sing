import type * as Tone from "tone";
export type { Score, InstrumentKey } from "./schemas.ts";
import type { Score, InstrumentKey } from "./schemas.ts";

// ── Parser types ─────────────────────────────────────────────────────

export interface TimelineEvent {
  partIndex: number;
  partName: string;
  measure: number;
  voice: string;
  staff: string;
  chordIndex: number;
  timeBeats: number;
  durationBeats: number;
  type: "note" | "rest";
  midi?: number;
  voiceIndex?: number;
}

export interface PartEvent {
  timeBeats: number;
  durationBeats: number;
  midi: number;
}

export interface ParsedPart {
  name: string;
  events: PartEvent[];
  timeline: TimelineEvent[];
}

export interface TempoMark {
  beats: number;
  bpm: number;
}

export interface ParsedScore {
  tempo: number;
  tempoMap: TempoMark[];
  title: string;
  parts: ParsedPart[];
  timeline: TimelineEvent[];
}

// ── Audio / Voice types ──────────────────────────────────────────────

export interface InstrumentSource {
  name: string;
  author: string;
  license: string;
  url: string;
}

export interface InstrumentConfig {
  name: string;
  source: InstrumentSource;
  baseUrl: string;
  urls: Record<string, string>;
  release: number;
}

export interface VoiceState {
  name: string;
  shortName: string;
  sampler: Tone.Sampler;
  gain: Tone.Gain;
  panner: Tone.Panner;
  volume: number;
  pan: number;
  muted: boolean;
  instrument: InstrumentKey;
}

export interface VoiceName {
  short: string;
  full: string;
}

// ── Timeline row (computed from TimelineEvent[]) ─────────────────────

export interface VoiceCell {
  type: "note" | "rest";
  midi?: number;
  durationBeats: number;
  display: string;
}

export interface TimelineRow {
  timeBeats: number;
  timeSeconds: number;
  measure: number;
  voiceColumns: (VoiceCell | null)[];
}

// ── Loop mode ────────────────────────────────────────────────────────

export type LoopMode = "inactive" | "settingB" | "active";

// ── Application state ────────────────────────────────────────────────

export interface AppState {
  currentScore: Score | null;
  userVoice: string;
  panInverted: boolean;
  theme: "light" | "dark";
  autoAdvance: boolean;
  showTimeline: boolean;
  tempo: number;
  originalTempo: number;
  tempoMap: TempoMark[];
  parts: ParsedPart[];
  timeline: TimelineEvent[];
  timelineRows: TimelineRow[];
  voiceCount: number;
  voices: VoiceState[];
  isPlaying: boolean;
  scoreTitle: string;
  scoreReady: boolean;
  playbackRAF: number | null;
  advancedVoiceMode: boolean;
  autoScrollPaused: boolean;
  autoScrollResumeTimeout: ReturnType<typeof setTimeout> | null;
  loopA: number | null;
  loopB: number | null;
  loopASeconds: number | null;
  loopBSeconds: number | null;
  loopMode: LoopMode;
  isSeeking: boolean;
}

// ── DOM elements map ─────────────────────────────────────────────────

export interface AppElements {
  status: HTMLElement;
  scoreSelect: HTMLSelectElement;
  userVoice: HTMLSelectElement;
  panInvert: HTMLInputElement;
  playerBar: HTMLElement;
  playPauseButton: HTMLButtonElement;
  playerStopButton: HTMLButtonElement;
  skipBackButton: HTMLButtonElement;
  skipForwardButton: HTMLButtonElement;
  seekBar: HTMLInputElement;
  currentTime: HTMLElement;
  totalTime: HTMLElement;
  parts: HTMLElement;
  timeline: HTMLElement | null;
  downloadJson: HTMLElement | null;
  downloadCsv: HTMLElement | null;
  setLoopButton: HTMLButtonElement;
  clearLoopButton: HTMLButtonElement;
  loopDisplay: HTMLElement;
  loopMarkerA: HTMLElement;
  loopMarkerB: HTMLElement;
  settingsButton: HTMLButtonElement;
  settingsModal: HTMLElement;
  closeSettings: HTMLButtonElement;
  themeToggle: HTMLButtonElement;
  autoAdvance: HTMLInputElement;
  showTimeline: HTMLInputElement;
  timelinePanel: HTMLElement | null;
  resetSettings: HTMLButtonElement;
  tempoSelect: HTMLSelectElement;
  pianoRoll: HTMLCanvasElement | null;
  pianoRollTooltip: HTMLElement | null;
  pianoRollLegend: HTMLElement | null;
  pianoRollPanel: HTMLElement | null;
}
