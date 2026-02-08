import { describe, expect, it, vi } from "vitest";
import { initVoices } from "../ui/voices.ts";
import type { TimelineEvent } from "../types";

type MockStateOverrides = Record<string, unknown>;

function createMockDeps(stateOverrides: MockStateOverrides = {}) {
  const state = {
    currentScore: null,
    userVoice: "T1",
    panInverted: false,
    voices: [],
    timeline: [],
    voiceCount: 0,
    scoreReady: false,
    advancedVoiceMode: false,
    ...stateOverrides
  };

  return {
    Tone: {} as any,
    state: state as any,
    elements: { parts: { innerHTML: "" }, userVoice: { value: "" } } as any,
    INSTRUMENTS: { piano: { name: "Piano", source: {}, baseUrl: "", urls: {}, release: 1 } } as any,
    saveVoiceInstrument: vi.fn(),
    setStoredUserVoice: vi.fn(),
    getStoredUserVoice: vi.fn(() => "T1")
  };
}

function makeEvent(overrides: Partial<TimelineEvent>): TimelineEvent {
  return {
    partIndex: 0,
    partName: "Part",
    measure: 1,
    voice: "1",
    staff: "1",
    chordIndex: 0,
    timeBeats: 0,
    durationBeats: 1,
    type: "note",
    midi: 60,
    ...overrides
  };
}

describe("voices pure logic", () => {
  describe("parseVoicesString", () => {
    it("parses SATB into canonical unnumbered names", () => {
      const api = initVoices(createMockDeps());
      expect(api.parseVoicesString("SATB")).toEqual([
        { short: "S", full: "Soprano" },
        { short: "A", full: "Alto" },
        { short: "T", full: "Tenor" },
        { short: "B", full: "Bass" }
      ]);
    });

    it("numbers repeated sections for TTBB", () => {
      const api = initVoices(createMockDeps());
      expect(api.parseVoicesString("TTBB")).toEqual([
        { short: "T1", full: "Tenor 1" },
        { short: "T2", full: "Tenor 2" },
        { short: "B1", full: "Bass 1" },
        { short: "B2", full: "Bass 2" }
      ]);
    });

    it("numbers only duplicated letters for SATBB", () => {
      const api = initVoices(createMockDeps());
      expect(api.parseVoicesString("SATBB")).toEqual([
        { short: "S", full: "Soprano" },
        { short: "A", full: "Alto" },
        { short: "T", full: "Tenor" },
        { short: "B1", full: "Bass 1" },
        { short: "B2", full: "Bass 2" }
      ]);
    });

    it("numbers sopranos for SSATB", () => {
      const api = initVoices(createMockDeps());
      expect(api.parseVoicesString("SSATB")).toEqual([
        { short: "S1", full: "Soprano 1" },
        { short: "S2", full: "Soprano 2" },
        { short: "A", full: "Alto" },
        { short: "T", full: "Tenor" },
        { short: "B", full: "Bass" }
      ]);
    });

    it("returns null for undefined and empty input", () => {
      const api = initVoices(createMockDeps());
      expect(api.parseVoicesString(undefined)).toBeNull();
      expect(api.parseVoicesString("")).toBeNull();
    });

    it("supports three-voice strings", () => {
      const api = initVoices(createMockDeps());
      expect(api.parseVoicesString("SAT")).toEqual([
        { short: "S", full: "Soprano" },
        { short: "A", full: "Alto" },
        { short: "T", full: "Tenor" }
      ]);
    });

    it("numbers all duplicated voice families", () => {
      const api = initVoices(createMockDeps());
      expect(api.parseVoicesString("SSAATTBB")).toEqual([
        { short: "S1", full: "Soprano 1" },
        { short: "S2", full: "Soprano 2" },
        { short: "A1", full: "Alto 1" },
        { short: "A2", full: "Alto 2" },
        { short: "T1", full: "Tenor 1" },
        { short: "T2", full: "Tenor 2" },
        { short: "B1", full: "Bass 1" },
        { short: "B2", full: "Bass 2" }
      ]);
    });
  });

  describe("mapUserVoiceToScore", () => {
    it("returns exact match when present", () => {
      const api = initVoices(createMockDeps());
      expect(api.mapUserVoiceToScore("T1", [{ shortName: "S" }, { shortName: "T1" }])).toBe("T1");
    });

    it("falls back to base letter when exact number is absent", () => {
      const api = initVoices(createMockDeps());
      expect(api.mapUserVoiceToScore("T1", [{ shortName: "S" }, { shortName: "T" }, { shortName: "B" }])).toBe("T");
    });

    it("falls back to first numbered match of the same base", () => {
      const api = initVoices(createMockDeps());
      expect(api.mapUserVoiceToScore("T2", [{ shortName: "T1" }, { shortName: "B1" }])).toBe("T1");
    });

    it("returns null when no base family exists", () => {
      const api = initVoices(createMockDeps());
      expect(api.mapUserVoiceToScore("T1", [{ shortName: "S" }, { shortName: "A" }, { shortName: "B" }])).toBeNull();
    });
  });

  describe("analyzeVoiceNames", () => {
    it("maps SATB names by descending median pitch", () => {
      const timeline: TimelineEvent[] = [
        makeEvent({ voiceIndex: 0, midi: 48 }),
        makeEvent({ voiceIndex: 1, midi: 60 }),
        makeEvent({ voiceIndex: 2, midi: 65 }),
        makeEvent({ voiceIndex: 3, midi: 72 }),
        makeEvent({ voiceIndex: 0, midi: 50 }),
        makeEvent({ voiceIndex: 1, midi: 59 }),
        makeEvent({ voiceIndex: 2, midi: 66 }),
        makeEvent({ voiceIndex: 3, midi: 74 })
      ];

      const api = initVoices(
        createMockDeps({
          timeline,
          voiceCount: 4,
          currentScore: { name: "Test", url: "/test.musicxml", voices: "SATB" }
        })
      );

      expect(api.analyzeVoiceNames()).toEqual([
        { short: "B", full: "Bass" },
        { short: "T", full: "Tenor" },
        { short: "A", full: "Alto" },
        { short: "S", full: "Soprano" }
      ]);
    });

    it("returns empty array when there are no notes", () => {
      const api = initVoices(createMockDeps({ timeline: [], voiceCount: 4, currentScore: { name: "Test", url: "", voices: "SATB" } }));
      expect(api.analyzeVoiceNames()).toEqual([]);
    });

    it("returns empty array when voiceCount is zero", () => {
      const api = initVoices(
        createMockDeps({
          timeline: [makeEvent({ voiceIndex: 0, midi: 60 })],
          voiceCount: 0,
          currentScore: { name: "Test", url: "", voices: "SATB" }
        })
      );
      expect(api.analyzeVoiceNames()).toEqual([]);
    });
  });

  describe("assignVoicesToNotes", () => {
    it("assigns voiceIndex for distinct part/voice groups", () => {
      const timeline: TimelineEvent[] = [
        makeEvent({ partIndex: 0, voice: "1", midi: 72 }),
        makeEvent({ partIndex: 1, voice: "1", midi: 65 }),
        makeEvent({ partIndex: 2, voice: "1", midi: 60 }),
        makeEvent({ partIndex: 3, voice: "1", midi: 48 })
      ];
      const deps = createMockDeps({ timeline, currentScore: { name: "Test", url: "", voices: "SATB" } });
      const api = initVoices(deps);

      api.assignVoicesToNotes();

      expect(deps.state.voiceCount).toBe(4);
      expect(timeline.map((event) => event.voiceIndex)).toEqual([0, 1, 2, 3]);
    });

    it("sets voiceCount to zero for empty timeline", () => {
      const deps = createMockDeps({ timeline: [] });
      const api = initVoices(deps);

      api.assignVoicesToNotes();

      expect(deps.state.voiceCount).toBe(0);
    });

    it("includes rests and ignores note events without midi", () => {
      const noteWithoutMidi = makeEvent({ type: "note", midi: undefined });
      const rest = makeEvent({ type: "rest", midi: undefined, timeBeats: 1 });
      const note = makeEvent({ type: "note", midi: 62, timeBeats: 2 });
      const timeline: TimelineEvent[] = [noteWithoutMidi, rest, note];
      const deps = createMockDeps({ timeline });
      const api = initVoices(deps);

      api.assignVoicesToNotes();

      expect(deps.state.voiceCount).toBe(1);
      expect(rest.voiceIndex).toBe(0);
      expect(note.voiceIndex).toBe(0);
      expect(noteWithoutMidi.voiceIndex).toBeUndefined();
    });
  });

  describe("formatPan", () => {
    it("formats center and left/right percentages", () => {
      const api = initVoices(createMockDeps());
      expect(api.formatPan(0)).toBe("Center");
      expect(api.formatPan(0.04)).toBe("Center");
      expect(api.formatPan(0.5)).toBe("50% R");
      expect(api.formatPan(-0.5)).toBe("50% L");
      expect(api.formatPan(1.0)).toBe("100% R");
      expect(api.formatPan(-1.0)).toBe("100% L");
    });
  });
});
