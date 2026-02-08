import { beforeEach, describe, expect, it } from "vitest";
import { createState, getVoiceInstruments, saveVoiceInstrument, getUserVoice, setUserVoice, state } from "../state";

describe("createState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default state when localStorage is empty", () => {
    const s = createState();
    expect(s.userVoice).toBe("T1");
    expect(s.panInverted).toBe(false);
    expect(s.theme).toBe("light");
    expect(s.autoAdvance).toBe(false);
    expect(s.showTimeline).toBe(true);
    expect(s.tempo).toBe(120);
    expect(s.originalTempo).toBe(120);
    expect(s.currentScore).toBeNull();
    expect(s.parts).toEqual([]);
    expect(s.timeline).toEqual([]);
    expect(s.voices).toEqual([]);
    expect(s.isPlaying).toBe(false);
    expect(s.scoreReady).toBe(false);
    expect(s.loopMode).toBe("inactive");
    expect(s.isSeeking).toBe(false);
  });

  it("reads userVoice from localStorage", () => {
    localStorage.setItem("userVoice", "S2");
    const s = createState();
    expect(s.userVoice).toBe("S2");
  });

  it("reads panInverted from localStorage", () => {
    localStorage.setItem("panInverted", "true");
    const s = createState();
    expect(s.panInverted).toBe(true);
  });

  it("reads theme from localStorage", () => {
    localStorage.setItem("theme", "dark");
    const s = createState();
    expect(s.theme).toBe("dark");
  });

  it("defaults theme to light for invalid values", () => {
    localStorage.setItem("theme", "neon");
    const s = createState();
    expect(s.theme).toBe("light");
  });

  it("reads autoAdvance from localStorage", () => {
    localStorage.setItem("autoAdvance", "true");
    const s = createState();
    expect(s.autoAdvance).toBe(true);
  });

  it("reads showTimeline from localStorage (defaults true)", () => {
    // showTimeline is true unless explicitly "false"
    const s1 = createState();
    expect(s1.showTimeline).toBe(true);

    localStorage.setItem("showTimeline", "false");
    const s2 = createState();
    expect(s2.showTimeline).toBe(false);

    localStorage.setItem("showTimeline", "anything");
    const s3 = createState();
    expect(s3.showTimeline).toBe(true);
  });

  it("creates independent state objects", () => {
    const s1 = createState();
    const s2 = createState();
    s1.tempo = 80;
    expect(s2.tempo).toBe(120);
  });
});

describe("getVoiceInstruments / saveVoiceInstrument", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty object when nothing saved", () => {
    expect(getVoiceInstruments()).toEqual({});
  });

  it("saves and retrieves voice instruments", () => {
    saveVoiceInstrument("S1", "violin");
    saveVoiceInstrument("T1", "cello");
    const instruments = getVoiceInstruments();
    expect(instruments).toEqual({ S1: "violin", T1: "cello" });
  });

  it("overwrites existing instrument for same voice", () => {
    saveVoiceInstrument("S1", "violin");
    saveVoiceInstrument("S1", "organ");
    expect(getVoiceInstruments()).toEqual({ S1: "organ" });
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("voiceInstruments", "not-json");
    expect(getVoiceInstruments()).toEqual({});
  });

  it("persists to localStorage as JSON", () => {
    saveVoiceInstrument("B1", "piano");
    const raw = localStorage.getItem("voiceInstruments");
    expect(JSON.parse(raw!)).toEqual({ B1: "piano" });
  });
});

describe("getUserVoice / setUserVoice", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset the singleton state's userVoice
    state.userVoice = "T1";
  });

  it("getUserVoice returns current state value", () => {
    expect(getUserVoice()).toBe("T1");
  });

  it("setUserVoice updates state and localStorage", () => {
    setUserVoice("A2");
    expect(getUserVoice()).toBe("A2");
    expect(state.userVoice).toBe("A2");
    expect(localStorage.getItem("userVoice")).toBe("A2");
  });
});
