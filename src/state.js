function createState() {
  return {
    currentScore: null,
    userVoice: localStorage.getItem("userVoice") || "T1",
    panInverted: localStorage.getItem("panInverted") === "true",
    theme: localStorage.getItem("theme") || "light",
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
    loopMode: "inactive",
    isSeeking: false
  };
}

const state = createState();

function getVoiceInstruments() {
  try {
    return JSON.parse(localStorage.getItem("voiceInstruments")) || {};
  } catch {
    return {};
  }
}

function saveVoiceInstrument(shortName, instrumentKey) {
  const instruments = getVoiceInstruments();
  instruments[shortName] = instrumentKey;
  localStorage.setItem("voiceInstruments", JSON.stringify(instruments));
}

function getUserVoice() {
  return state.userVoice;
}

function setUserVoice(voice) {
  state.userVoice = voice;
  localStorage.setItem("userVoice", voice);
}

export { state, createState, getVoiceInstruments, saveVoiceInstrument, getUserVoice, setUserVoice };
