import type { InstrumentConfig, InstrumentKey, InstrumentSource } from "../types";

const SAMPLE_URLS_V8: Record<string, string> = {
  A3: "A3v8.wav",
  C3: "C3v8.wav",
  "D#3": "Ds3v8.wav",
  "F#3": "Fs3v8.wav",
  A4: "A4v8.wav",
  C4: "C4v8.wav",
  "D#4": "Ds4v8.wav",
  "F#4": "Fs4v8.wav",
  C5: "C5v8.wav"
};
const SAMPLE_URLS_V12: Record<string, string> = {
  A3: "A3v12.wav",
  C3: "C3v12.wav",
  "D#3": "Ds3v12.wav",
  "F#3": "Fs3v12.wav",
  A4: "A4v12.wav",
  C4: "C4v12.wav",
  "D#4": "Ds4v12.wav",
  "F#4": "Fs4v12.wav",
  C5: "C5v12.wav"
};

const CDN_BASE = "https://nbrosowsky.github.io/tonejs-instruments/samples/";

const INSTRUMENT_SOURCES: Record<string, InstrumentSource> = {
  salamander: {
    name: "Salamander Grand Piano",
    author: "Alexander Holm",
    license: "CC BY 3.0",
    url: "https://sfzinstruments.github.io/pianos/salamander/"
  },
  tonejsInstruments: {
    name: "tonejs-instruments",
    author: "Nick Brosowsky",
    license: "MIT",
    url: "https://github.com/nbrosowsky/tonejs-instruments"
  }
};

const INSTRUMENTS: Record<InstrumentKey, InstrumentConfig> = {
  piano: {
    name: "Piano",
    source: INSTRUMENT_SOURCES.salamander,
    baseUrl: "/salamander/samples/",
    urls: SAMPLE_URLS_V8,
    release: 1
  },
  violin: {
    name: "Violin",
    source: INSTRUMENT_SOURCES.tonejsInstruments,
    baseUrl: `${CDN_BASE}violin/`,
    urls: {
      A3: "A3.mp3", A4: "A4.mp3", A5: "A5.mp3", A6: "A6.mp3",
      C4: "C4.mp3", C5: "C5.mp3", C6: "C6.mp3", C7: "C7.mp3",
      E4: "E4.mp3", E5: "E5.mp3", E6: "E6.mp3",
      G3: "G3.mp3", G4: "G4.mp3", G5: "G5.mp3", G6: "G6.mp3"
    },
    release: 0.5
  },
  cello: {
    name: "Cello",
    source: INSTRUMENT_SOURCES.tonejsInstruments,
    baseUrl: `${CDN_BASE}cello/`,
    urls: {
      A2: "A2.mp3", A3: "A3.mp3", A4: "A4.mp3",
      C2: "C2.mp3", C3: "C3.mp3", C4: "C4.mp3", C5: "C5.mp3",
      E2: "E2.mp3", E3: "E3.mp3", E4: "E4.mp3",
      G2: "G2.mp3", G3: "G3.mp3", G4: "G4.mp3"
    },
    release: 0.8
  },
  organ: {
    name: "Organ",
    source: INSTRUMENT_SOURCES.tonejsInstruments,
    baseUrl: `${CDN_BASE}organ/`,
    urls: {
      A1: "A1.mp3", A2: "A2.mp3", A3: "A3.mp3", A4: "A4.mp3", A5: "A5.mp3",
      C1: "C1.mp3", C2: "C2.mp3", C3: "C3.mp3", C4: "C4.mp3", C5: "C5.mp3", C6: "C6.mp3",
      "D#1": "Ds1.mp3", "D#2": "Ds2.mp3", "D#3": "Ds3.mp3", "D#4": "Ds4.mp3", "D#5": "Ds5.mp3",
      "F#1": "Fs1.mp3", "F#2": "Fs2.mp3", "F#3": "Fs3.mp3", "F#4": "Fs4.mp3", "F#5": "Fs5.mp3"
    },
    release: 0.3
  },
  saxophone: {
    name: "Saxophone",
    source: INSTRUMENT_SOURCES.tonejsInstruments,
    baseUrl: `${CDN_BASE}saxophone/`,
    urls: {
      A3: "A3.mp3", A4: "A4.mp3", A5: "A5.mp3",
      C4: "C4.mp3", C5: "C5.mp3",
      "D#3": "Ds3.mp3", "D#4": "Ds4.mp3", "D#5": "Ds5.mp3",
      "F#3": "Fs3.mp3", "F#4": "Fs4.mp3", "F#5": "Fs5.mp3"
    },
    release: 0.4
  }
};

export { INSTRUMENTS, INSTRUMENT_SOURCES };
