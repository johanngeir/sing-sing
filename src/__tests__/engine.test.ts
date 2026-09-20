import { beforeEach, describe, expect, it, vi } from "vitest";
import { initAudioEngine } from "../audio/engine";

function createMockTone() {
  const scheduledCallbacks: Array<{ callback: Function; time: number }> = [];

  return {
    start: vi.fn(async () => {}),
    loaded: vi.fn(async () => {}),
    Frequency: vi.fn((midi: number) => ({
      toNote: () => `C${Math.floor(midi / 12) - 1}`
    })),
    Transport: {
      bpm: { value: 120 },
      PPQ: 480,
      ticks: 0,
      seconds: 0,
      cancel: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      schedule: vi.fn((callback: Function, time: number) => {
        scheduledCallbacks.push({ callback, time });
      })
    },
    Sampler: vi.fn(() => ({
      connect: vi.fn(() => ({})),
      dispose: vi.fn(),
      triggerAttackRelease: vi.fn()
    })),
    Gain: vi.fn(() => ({
      connect: vi.fn(() => ({})),
      dispose: vi.fn(),
      gain: { rampTo: vi.fn() }
    })),
    Panner: vi.fn(() => ({
      toDestination: vi.fn(),
      dispose: vi.fn(),
      pan: { rampTo: vi.fn() }
    })),
    _scheduled: scheduledCallbacks
  };
}

function createMockDeps(overrides: Record<string, unknown> = {}) {
  const mockTone = createMockTone();
  const state = {
    currentScore: null,
    tempo: 120,
    originalTempo: 120,
    tempoMap: [],
    timeline: [],
    parts: [],
    voices: [],
    voiceCount: 0,
    isPlaying: false,
    scoreReady: false,
    scoreTitle: "",
    playbackRAF: null,
    userVoice: "T1",
    loopA: null,
    loopB: null,
    loopASeconds: null,
    loopBSeconds: null,
    loopMode: "inactive",
    timelineRows: []
  };

  const elements = {
    playPauseButton: { textContent: "" },
    seekBar: { max: "0", value: "0" },
    currentTime: { textContent: "" },
    totalTime: { textContent: "" },
    timeline: { innerHTML: "", querySelectorAll: () => [] },
    parts: { innerHTML: "" },
    playerBar: { hidden: true },
    tempoSelect: { value: "1", options: [{ value: "1" }, { value: "0.5" }] },
    loopMarkerA: { hidden: true },
    loopMarkerB: { hidden: true },
    loopDisplay: { hidden: true },
    clearLoopButton: { hidden: true },
    setLoopButton: { textContent: "A/B" }
  };

  return {
    Tone: mockTone as any,
    state: state as any,
    elements: elements as any,
    setStatus: vi.fn(),
    parseMusicXML: vi.fn(() => ({
      isOk: () => true,
      isErr: () => false,
      _unsafeUnwrap: () => ({
        tempo: 120,
        title: "Test Score",
        parts: [{ name: "Soprano", events: [], timeline: [] }],
        timeline: []
      }),
      value: {
        tempo: 120,
        title: "Test Score",
        parts: [{ name: "Soprano", events: [], timeline: [] }],
        timeline: []
      }
    })),
    midiToNoteName: vi.fn((midi: number) => `C${Math.floor(midi / 12) - 1}`),
    assignVoicesToNotes: vi.fn(),
    analyzeVoiceNames: vi.fn(() => [{ short: "S", full: "Soprano" }]),
    mapUserVoiceToScore: vi.fn(() => "S"),
    getVoiceInstruments: vi.fn(() => ({})),
    createVoiceState: vi.fn((_i: number, name: any) => ({
      name: name.full,
      shortName: name.short,
      sampler: { dispose: vi.fn(), connect: vi.fn(), triggerAttackRelease: vi.fn() },
      gain: { dispose: vi.fn(), gain: { rampTo: vi.fn() } },
      panner: { dispose: vi.fn(), pan: { rampTo: vi.fn() } },
      volume: 0.9,
      pan: 0,
      muted: false,
      instrument: "piano"
    })),
    applyUserVoiceMix: vi.fn(),
    renderTimeline: vi.fn(),
    getTotalBeats: vi.fn(() => 16),
    getTotalDuration: vi.fn(() => 32),
    getTotalMeasures: vi.fn(() => 4),
    formatTime: vi.fn((s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`),
    updatePlaybackHighlight: vi.fn(),
    ...overrides
  };
}

describe("audio engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("buildSchedule schedules playable notes with beat-to-seconds timing", () => {
    const deps = createMockDeps();
    const voice0Sampler = { triggerAttackRelease: vi.fn() };
    const voice1Sampler = { triggerAttackRelease: vi.fn() };
    deps.state.tempo = 120;
    deps.state.voices = [{ sampler: voice0Sampler }, { sampler: voice1Sampler }];
    deps.state.timeline = [
      { type: "note", midi: 60, voiceIndex: 0, timeBeats: 0, durationBeats: 1 },
      { type: "note", midi: 64, voiceIndex: 1, timeBeats: 2, durationBeats: 2 },
      { type: "note", midi: 67, timeBeats: 3, durationBeats: 1 },
      { type: "note", midi: 69, voiceIndex: 9, timeBeats: 4, durationBeats: 1 },
      { type: "rest", midi: 70, voiceIndex: 0, timeBeats: 5, durationBeats: 1 }
    ];

    const engine = initAudioEngine(deps as any);
    engine.buildSchedule();

    expect(deps.Tone.Transport.cancel).toHaveBeenCalledTimes(1);
    expect(deps.Tone.Transport.bpm.value).toBe(120);
    expect(deps.Tone.Transport.schedule).toHaveBeenCalledTimes(2);
    expect(deps.Tone.Transport.schedule).toHaveBeenNthCalledWith(1, expect.any(Function), 0);
    expect(deps.Tone.Transport.schedule).toHaveBeenNthCalledWith(2, expect.any(Function), 1);
    expect(deps.midiToNoteName).toHaveBeenCalledTimes(2);
    expect(deps.midiToNoteName).toHaveBeenNthCalledWith(1, 60);
    expect(deps.midiToNoteName).toHaveBeenNthCalledWith(2, 64);

    const first = deps.Tone._scheduled[0];
    const second = deps.Tone._scheduled[1];
    first.callback(10);
    second.callback(11);
    expect(voice0Sampler.triggerAttackRelease).toHaveBeenCalledWith("C4", 0.5, 10, 0.8);
    expect(voice1Sampler.triggerAttackRelease).toHaveBeenCalledWith("C4", 1, 11, 0.8);
  });

  it("setTempo updates state and transport bpm and refreshes playback controls", () => {
    const deps = createMockDeps();
    deps.state.scoreReady = true;
    deps.state.originalTempo = 100;
    deps.elements.tempoSelect.options = [{ value: "1" }, { value: "0.9" }];
    const engine = initAudioEngine(deps as any);

    engine.setTempo(90);

    expect(deps.state.tempo).toBe(90);
    expect(deps.Tone.Transport.bpm.value).toBe(90);
    expect(deps.elements.tempoSelect.value).toBe("0.9");
    expect(deps.getTotalBeats).toHaveBeenCalledTimes(1);
    expect(deps.elements.seekBar.max).toBe("16");
    expect(deps.elements.totalTime.textContent).toBe("0:32 (M. 4)");
  });

  it("loadScoreFromText parses, initializes voices, and updates playback state", async () => {
    const parsed = {
      tempo: 98.7,
      title: "Kyrie",
      parts: [{ name: "Soprano", events: [], timeline: [] }],
      timeline: [{ type: "note", midi: 60, timeBeats: 0, durationBeats: 1 }]
    };
    const deps = createMockDeps({ parseMusicXML: vi.fn(() => ({
      isOk: () => true,
      isErr: () => false,
      _unsafeUnwrap: () => parsed,
      value: parsed
    })) });
    deps.assignVoicesToNotes = vi.fn(() => {
      deps.state.voiceCount = 2;
    });
    deps.analyzeVoiceNames = vi.fn(() => [
      { short: "S", full: "Soprano" },
      { short: "A", full: "Alto" }
    ]);
    deps.getVoiceInstruments = vi.fn(() => ({ S: "organ" }));

    const engine = initAudioEngine(deps as any);
    await engine.loadScoreFromText("<score-partwise />");

    expect(deps.parseMusicXML).toHaveBeenCalledWith("<score-partwise />");
    expect(deps.state.originalTempo).toBe(99);
    expect(deps.state.tempo).toBe(99);
    expect(deps.state.scoreTitle).toBe("Kyrie");
    expect(deps.state.timeline).toEqual(parsed.timeline);
    expect(deps.state.parts).toEqual(parsed.parts);
    expect(deps.assignVoicesToNotes).toHaveBeenCalledTimes(1);
    expect(deps.analyzeVoiceNames).toHaveBeenCalledTimes(1);
    expect(deps.createVoiceState).toHaveBeenNthCalledWith(1, 0, { short: "S", full: "Soprano" }, "organ");
    expect(deps.createVoiceState).toHaveBeenNthCalledWith(2, 1, { short: "A", full: "Alto" }, "piano");
    expect(deps.Tone.loaded).toHaveBeenCalledTimes(1);
    expect(deps.state.scoreReady).toBe(true);
    expect(deps.applyUserVoiceMix).toHaveBeenCalledTimes(1);
    expect(deps.renderTimeline).toHaveBeenCalledTimes(1);
    expect(deps.elements.playerBar.hidden).toBe(false);
  });

  it("resetState disposes audio objects and clears score and loop state", () => {
    const samplerDispose = vi.fn();
    const gainDispose = vi.fn();
    const pannerDispose = vi.fn();
    const deps = createMockDeps();
    deps.state.voices = [
      {
        sampler: { dispose: samplerDispose },
        gain: { dispose: gainDispose },
        panner: { dispose: pannerDispose }
      }
    ];
    deps.state.timeline = [{ type: "note" }];
    deps.state.parts = [{ name: "P1" }];
    deps.state.timelineRows = [{}];
    deps.state.voiceCount = 3;
    deps.state.scoreReady = true;
    deps.state.scoreTitle = "Loaded";
    deps.state.loopA = 1;
    deps.state.loopB = 4;
    deps.state.loopASeconds = 1.2;
    deps.state.loopBSeconds = 2.3;
    deps.state.loopMode = "setA";
    deps.elements.playerBar.hidden = false;

    const engine = initAudioEngine(deps as any);
    engine.resetState();

    expect(samplerDispose).toHaveBeenCalledTimes(1);
    expect(gainDispose).toHaveBeenCalledTimes(1);
    expect(pannerDispose).toHaveBeenCalledTimes(1);
    expect(deps.state.voices).toEqual([]);
    expect(deps.state.timeline).toEqual([]);
    expect(deps.state.timelineRows).toEqual([]);
    expect(deps.state.parts).toEqual([]);
    expect(deps.state.voiceCount).toBe(0);
    expect(deps.state.scoreReady).toBe(false);
    expect(deps.state.scoreTitle).toBe("");
    expect(deps.state.loopA).toBeNull();
    expect(deps.state.loopB).toBeNull();
    expect(deps.state.loopASeconds).toBeNull();
    expect(deps.state.loopBSeconds).toBeNull();
    expect(deps.state.loopMode).toBe("inactive");
    expect(deps.elements.playerBar.hidden).toBe(true);
    expect(deps.elements.loopMarkerA.hidden).toBe(true);
    expect(deps.elements.loopMarkerB.hidden).toBe(true);
    expect(deps.elements.loopDisplay.hidden).toBe(true);
    expect(deps.elements.clearLoopButton.hidden).toBe(true);
    expect(deps.elements.setLoopButton.textContent).toBe("A/B");
  });

  it("pausePlayback pauses transport and clears playing state", () => {
    const cancelFrame = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelFrame);
    const deps = createMockDeps();
    deps.state.isPlaying = true;
    deps.state.playbackRAF = 12;
    const engine = initAudioEngine(deps as any);

    engine.pausePlayback();

    expect(deps.Tone.Transport.pause).toHaveBeenCalledTimes(1);
    expect(deps.state.isPlaying).toBe(false);
    expect(deps.state.playbackRAF).toBeNull();
    expect(cancelFrame).toHaveBeenCalledWith(12);
    expect(deps.elements.playPauseButton.textContent).toBe("▶");
    vi.unstubAllGlobals();
  });

  it("stopPlayback stops and cancels transport, and removes active timeline rows", () => {
    const cancelFrame = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelFrame);
    const removeA = vi.fn();
    const removeB = vi.fn();
    const deps = createMockDeps();
    deps.state.isPlaying = true;
    deps.state.playbackRAF = 99;
    deps.elements.timeline = {
      innerHTML: "",
      querySelectorAll: vi.fn(() => [
        { classList: { remove: removeA } },
        { classList: { remove: removeB } }
      ])
    };
    const engine = initAudioEngine(deps as any);

    engine.stopPlayback();

    expect(deps.Tone.Transport.stop).toHaveBeenCalledTimes(1);
    expect(deps.Tone.Transport.cancel).toHaveBeenCalledTimes(1);
    expect(deps.state.isPlaying).toBe(false);
    expect(deps.state.playbackRAF).toBeNull();
    expect(cancelFrame).toHaveBeenCalledWith(99);
    expect(removeA).toHaveBeenCalledWith("timeline__row--active");
    expect(removeB).toHaveBeenCalledWith("timeline__row--active");
    expect(deps.elements.playPauseButton.textContent).toBe("▶");
    vi.unstubAllGlobals();
  });
});
