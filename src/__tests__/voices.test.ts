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

    it("splits chord notes into subgroups and routes single notes/rests", () => {
      const topChord = makeEvent({ partIndex: 0, voice: "1", timeBeats: 0, midi: 76 });
      const bottomChord = makeEvent({ partIndex: 0, voice: "1", timeBeats: 0, midi: 60 });
      const topSingle = makeEvent({ partIndex: 0, voice: "1", timeBeats: 1, midi: 74 });
      const bottomSingle = makeEvent({ partIndex: 0, voice: "1", timeBeats: 2, midi: 62 });
      const rest = makeEvent({ partIndex: 0, voice: "1", timeBeats: 3, type: "rest", midi: undefined });
      const timeline: TimelineEvent[] = [topChord, bottomChord, topSingle, bottomSingle, rest];

      const deps = createMockDeps({
        timeline,
        currentScore: { name: "Test", url: "", voices: "SA" }
      });
      const api = initVoices(deps);

      api.assignVoicesToNotes();

      expect(deps.state.voiceCount).toBe(2);
      expect(topChord.voiceIndex).toBe(topSingle.voiceIndex);
      expect(bottomChord.voiceIndex).toBe(bottomSingle.voiceIndex);
      expect(topChord.voiceIndex).not.toBe(bottomChord.voiceIndex);
      expect(rest.voiceIndex).toBe(topChord.voiceIndex);
    });

    it("merges small non-chord groups into the closest group within 12 semitones", () => {
      const highGroup = Array.from({ length: 12 }, (_, idx) =>
        makeEvent({ partIndex: 0, voice: "1", timeBeats: idx, midi: 81 + (idx % 2) })
      );
      const midGroup = Array.from({ length: 12 }, (_, idx) =>
        makeEvent({ partIndex: 0, voice: "2", timeBeats: 20 + idx, midi: 66 + (idx % 2) })
      );
      const lowSmallGroup = [
        makeEvent({ partIndex: 0, voice: "3", timeBeats: 40, midi: 58 }),
        makeEvent({ partIndex: 0, voice: "3", timeBeats: 41, midi: 57 })
      ];
      const timeline: TimelineEvent[] = [...highGroup, ...midGroup, ...lowSmallGroup];

      const deps = createMockDeps({
        timeline,
        currentScore: { name: "Test", url: "", voices: "SATB" }
      });
      const api = initVoices(deps);

      api.assignVoicesToNotes();

      expect(deps.state.voiceCount).toBe(2);
      expect(lowSmallGroup[0].voiceIndex).toBe(midGroup[0].voiceIndex);
      expect(lowSmallGroup[1].voiceIndex).toBe(midGroup[0].voiceIndex);
      expect(lowSmallGroup[0].voiceIndex).not.toBe(highGroup[0].voiceIndex);
    });
  });

  describe("analyzeVoiceNames fallbacks", () => {
    it("uses default SATB when the score has no voices string", () => {
      const timeline: TimelineEvent[] = [
        makeEvent({ voiceIndex: 0, midi: 48 }),
        makeEvent({ voiceIndex: 1, midi: 60 }),
        makeEvent({ voiceIndex: 2, midi: 65 }),
        makeEvent({ voiceIndex: 3, midi: 72 })
      ];

      const api = initVoices(
        createMockDeps({
          timeline,
          voiceCount: 4,
          currentScore: { name: "Test", url: "" }
        })
      );

      expect(api.analyzeVoiceNames()).toEqual([
        { short: "B", full: "Bass" },
        { short: "T", full: "Tenor" },
        { short: "A", full: "Alto" },
        { short: "S", full: "Soprano" }
      ]);
    });

    it("falls back to SATB plus numbered bass voices when voiceCount exceeds four", () => {
      const timeline: TimelineEvent[] = [
        makeEvent({ voiceIndex: 0, midi: 40 }),
        makeEvent({ voiceIndex: 1, midi: 45 }),
        makeEvent({ voiceIndex: 2, midi: 50 }),
        makeEvent({ voiceIndex: 3, midi: 55 }),
        makeEvent({ voiceIndex: 4, midi: 60 }),
        makeEvent({ voiceIndex: 5, midi: 65 })
      ];

      const api = initVoices(
        createMockDeps({
          timeline,
          voiceCount: 6,
          currentScore: { name: "Test", url: "", voices: "SATB" }
        })
      );

      expect(api.analyzeVoiceNames()).toEqual([
        { short: "B3", full: "Bass 3" },
        { short: "B2", full: "Bass 2" },
        { short: "B1", full: "Bass 1" },
        { short: "T", full: "Tenor" },
        { short: "A", full: "Alto" },
        { short: "S", full: "Soprano" }
      ]);
    });
  });

  describe("voice state and mix helpers", () => {
    it("creates a voice state with connected Tone nodes", () => {
      const mockTone = {
        Sampler: vi.fn(function () {
          return {
          connect: vi.fn(),
          dispose: vi.fn()
          };
        }),
        Gain: vi.fn(function (val: number) {
          return {
          connect: vi.fn(),
          gain: { rampTo: vi.fn(), value: val }
          };
        }),
        Panner: vi.fn(function (val: number) {
          return {
          toDestination: vi.fn(),
          pan: { rampTo: vi.fn(), value: val }
          };
        })
      };

      const deps = createMockDeps();
      deps.Tone = mockTone as any;
      deps.INSTRUMENTS = {
        piano: { name: "Piano", source: {}, baseUrl: "/piano/", urls: { C4: "C4.mp3" }, release: 1 },
        violin: { name: "Violin", source: {}, baseUrl: "/violin/", urls: { D4: "D4.mp3" }, release: 2 }
      } as any;

      const api = initVoices(deps);
      const created = api.createVoiceState(0, { short: "S", full: "Soprano" }, "violin");

      expect(mockTone.Sampler).toHaveBeenCalledWith({
        urls: { D4: "D4.mp3" },
        baseUrl: "/violin/",
        release: 2
      });
      expect(mockTone.Gain).toHaveBeenCalledWith(0.9);
      expect(mockTone.Panner).toHaveBeenCalledWith(0);
      expect(created.sampler.connect).toHaveBeenCalledWith(created.gain);
      expect(created.gain.connect).toHaveBeenCalledWith(created.panner);
      expect(created.panner.toDestination).toHaveBeenCalledTimes(1);
      expect(created.instrument).toBe("violin");
      expect(created.shortName).toBe("S");
    });

    it("applies gain and pan ramps from voice state", () => {
      const gainRamp = vi.fn();
      const panRamp = vi.fn();
      const voice = {
        volume: 0.72,
        pan: -0.25,
        muted: false,
        gain: { gain: { rampTo: gainRamp } },
        panner: { pan: { rampTo: panRamp } }
      } as any;

      const api = initVoices(createMockDeps());

      api.applyVoiceSettings(voice);
      expect(gainRamp).toHaveBeenCalledWith(0.72, 0.05);
      expect(panRamp).toHaveBeenCalledWith(-0.25, 0.05);

      voice.muted = true;
      api.applyVoiceSettings(voice);
      expect(gainRamp).toHaveBeenLastCalledWith(0, 0.05);
      expect(panRamp).toHaveBeenLastCalledWith(-0.25, 0.05);
    });

    it("applies user voice mix to matched and unmatched voices", () => {
      const soprano = {
        name: "Soprano",
        shortName: "S",
        sampler: { connect: vi.fn(), dispose: vi.fn() },
        gain: { gain: { rampTo: vi.fn(), value: 0.9 }, connect: vi.fn() },
        panner: { pan: { rampTo: vi.fn(), value: 0 }, toDestination: vi.fn() },
        volume: 0.9,
        pan: 0,
        muted: false,
        instrument: "piano"
      } as any;
      const tenor = {
        name: "Tenor",
        shortName: "T",
        sampler: { connect: vi.fn(), dispose: vi.fn() },
        gain: { gain: { rampTo: vi.fn(), value: 0.9 }, connect: vi.fn() },
        panner: { pan: { rampTo: vi.fn(), value: 0 }, toDestination: vi.fn() },
        volume: 0.9,
        pan: 0,
        muted: false,
        instrument: "piano"
      } as any;
      const bass = {
        name: "Bass",
        shortName: "B",
        sampler: { connect: vi.fn(), dispose: vi.fn() },
        gain: { gain: { rampTo: vi.fn(), value: 0.9 }, connect: vi.fn() },
        panner: { pan: { rampTo: vi.fn(), value: 0 }, toDestination: vi.fn() },
        volume: 0.9,
        pan: 0,
        muted: false,
        instrument: "piano"
      } as any;

      const deps = createMockDeps({
        userVoice: "T1",
        panInverted: true,
        voices: [soprano, tenor, bass],
        advancedVoiceMode: true
      });
      deps.elements = {
        parts: document.createElement("div"),
        userVoice: document.createElement("select")
      } as any;

      const api = initVoices(deps);

      api.applyUserVoiceMix();

      expect(tenor.volume).toBe(1.0);
      expect(tenor.pan).toBe(-0.9);
      expect(soprano.volume).toBe(0.6);
      expect(soprano.pan).toBe(0.9);
      expect(bass.volume).toBe(0.6);
      expect(bass.pan).toBe(0.9);
      expect(tenor.gain.gain.rampTo).toHaveBeenLastCalledWith(1.0, 0.05);
      expect(tenor.panner.pan.rampTo).toHaveBeenLastCalledWith(-0.9, 0.05);
      expect(soprano.gain.gain.rampTo).toHaveBeenCalledWith(0.6, 0.05);
      expect(bass.gain.gain.rampTo).toHaveBeenCalledWith(0.6, 0.05);
    });

    it("proxies user voice getters and setters", () => {
      const deps = createMockDeps({ scoreReady: false });
      deps.getStoredUserVoice = vi.fn(() => "B2");
      const api = initVoices(deps);

      expect(api.getUserVoice()).toBe("B2");

      api.setUserVoice("A1");

      expect(deps.setStoredUserVoice).toHaveBeenCalledWith("A1");
      expect(deps.elements.userVoice.value).toBe("A1");
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
