import type * as ToneNs from "tone";
import type { AppState, AppElements, VoiceName, VoiceState, ParsedScore, InstrumentKey } from "../types";

interface AudioEngineDeps {
  Tone: typeof ToneNs;
  state: AppState;
  elements: AppElements;
  setStatus: (message: string) => void;
  parseMusicXML: (xmlText: string) => ParsedScore;
  midiToNoteName: (midi: number) => string;
  assignVoicesToNotes: () => void;
  analyzeVoiceNames: () => VoiceName[];
  mapUserVoiceToScore: (userVoice: string, voices: { shortName: string }[]) => string | null;
  getVoiceInstruments: () => Record<string, string>;
  createVoiceState: (voiceIndex: number, voiceName: VoiceName, instrumentKey?: InstrumentKey) => VoiceState;
  applyUserVoiceMix: () => void;
  renderTimeline: () => void;
  getTotalBeats: () => number;
  getTotalDuration: () => number;
  getTotalMeasures: () => number;
  formatTime: (seconds: number) => string;
  updatePlaybackHighlight: () => void;
}

function initAudioEngine(deps: AudioEngineDeps) {
  const {
    Tone,
    state,
    elements,
    setStatus,
    parseMusicXML,
    midiToNoteName,
    assignVoicesToNotes,
    analyzeVoiceNames,
    mapUserVoiceToScore,
    getVoiceInstruments,
    createVoiceState,
    applyUserVoiceMix,
    renderTimeline,
    getTotalBeats,
    getTotalDuration,
    getTotalMeasures,
    formatTime,
    updatePlaybackHighlight
  } = deps;

  function buildSchedule() {
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = state.tempo;

    const notes = state.timeline.filter((e) => e.type === "note" && e.midi !== undefined);
    for (const note of notes) {
      if (note.voiceIndex === undefined) continue;
      const voice = state.voices[note.voiceIndex];
      if (!voice) continue;

      const startSeconds = (note.timeBeats * 60) / state.tempo;
      const durationSeconds = (note.durationBeats * 60) / state.tempo;
      const noteName = midiToNoteName(note.midi!);
      Tone.Transport.schedule((time) => {
        voice.sampler.triggerAttackRelease(noteName, durationSeconds, time, 0.8);
      }, startSeconds);
    }
  }

  function pausePlayback() {
    if (!state.isPlaying) return;
    Tone.Transport.pause();
    state.isPlaying = false;
    elements.playPauseButton.textContent = "▶";
    if (state.playbackRAF) {
      cancelAnimationFrame(state.playbackRAF);
      state.playbackRAF = null;
    }
  }

  async function startPlayback(fromBeats: number = 0) {
    if (!state.scoreReady || state.isPlaying) return;
    await Tone.start();
    state.isPlaying = true;
    buildSchedule();
    Tone.Transport.ticks = fromBeats * Tone.Transport.PPQ;
    Tone.Transport.start();
    elements.playPauseButton.textContent = "❚❚";
    updatePlaybackHighlight();
  }

  function stopPlayback() {
    if (!state.isPlaying) return;
    Tone.Transport.stop();
    Tone.Transport.cancel();
    state.isPlaying = false;
    elements.playPauseButton.textContent = "▶";
    if (state.playbackRAF) {
      cancelAnimationFrame(state.playbackRAF);
      state.playbackRAF = null;
    }
    if (elements.timeline) {
      const rows = elements.timeline.querySelectorAll(".timeline__row--active");
      for (const row of rows) {
        row.classList.remove("timeline__row--active");
      }
    }
  }

  function setTempo(value: number) {
    state.tempo = value;
    updateTempoSelect();
    Tone.Transport.bpm.value = value;
    updatePlaybackControls();
  }

  function updatePlaybackControls() {
    if (!state.scoreReady) return;
    const totalBeats = getTotalBeats();
    const totalDuration = getTotalDuration();
    const totalMeasures = getTotalMeasures();
    elements.seekBar.max = String(totalBeats);
    elements.totalTime.textContent = `${formatTime(totalDuration)} (M. ${totalMeasures})`;
  }

  function updateTempoSelect() {
    const multiplier = state.tempo / state.originalTempo;
    const selectValue = multiplier.toFixed(1).replace(/\.0$/, '');
    if (elements.tempoSelect) {
      const option = [...elements.tempoSelect.options].find(o => parseFloat(o.value) === parseFloat(selectValue));
      if (option) {
        elements.tempoSelect.value = option.value;
      }
    }
  }

  function resetState() {
    if (state.isPlaying) {
      stopPlayback();
    }
    for (const voice of state.voices) {
      if (voice.sampler) voice.sampler.dispose();
      if (voice.gain) voice.gain.dispose();
      if (voice.panner) voice.panner.dispose();
    }
    state.voices = [];
    state.timeline = [];
    state.timelineRows = [];
    state.voiceCount = 0;
    state.parts = [];
    state.scoreReady = false;
    state.scoreTitle = "";

    // Clear loop state
    state.loopA = null;
    state.loopB = null;
    state.loopASeconds = null;
    state.loopBSeconds = null;
    state.loopMode = "inactive";
    elements.loopMarkerA.hidden = true;
    elements.loopMarkerB.hidden = true;
    elements.loopDisplay.hidden = true;
    elements.clearLoopButton.hidden = true;
    elements.setLoopButton.textContent = "A/B";

    // Hide player bar
    elements.playerBar.hidden = true;

    elements.parts.innerHTML = "";
    if (elements.timeline) elements.timeline.innerHTML = "";
  }

  async function loadScoreFromText(xmlText: string) {
    resetState();
    setStatus("Loading score...");

    const parsed = parseMusicXML(xmlText);

    state.originalTempo = Math.round(parsed.tempo);
    state.tempo = state.originalTempo;
    state.scoreTitle = parsed.title;
    state.timeline = parsed.timeline;
    state.parts = parsed.parts;
    updateTempoSelect();

    assignVoicesToNotes();
    const voiceNames = analyzeVoiceNames();
    const mappedUserVoice = mapUserVoiceToScore(state.userVoice, voiceNames.map(v => ({ shortName: v.short })));

    const savedInstruments = getVoiceInstruments();
    const voiceStates = [];
    for (let i = 0; i < state.voiceCount; i++) {
      const instrumentKey = (savedInstruments[voiceNames[i].short] || "piano") as InstrumentKey;
      voiceStates.push(createVoiceState(i, voiceNames[i], instrumentKey));
    }
    await Tone.loaded();
    state.voices = voiceStates;
    state.scoreReady = true;

    applyUserVoiceMix();
    renderTimeline();
    const totalBeats = getTotalBeats();
    const totalDuration = getTotalDuration();
    elements.seekBar.max = String(totalBeats);
    elements.seekBar.value = "0";
    const totalMeasures = getTotalMeasures();
    elements.totalTime.textContent = `${formatTime(totalDuration)} (M. ${totalMeasures})`;
    elements.currentTime.textContent = "0:00 (M. 1)";
    elements.playerBar.hidden = false;
    setStatus(`Loaded: ${parsed.title} (${state.voiceCount} voices)`);
  }

  return {
    buildSchedule,
    pausePlayback,
    startPlayback,
    stopPlayback,
    setTempo,
    loadScoreFromText,
    resetState,
    updatePlaybackControls,
    updateTempoSelect
  };
}

export { initAudioEngine };
