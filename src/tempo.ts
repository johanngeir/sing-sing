import type { TempoMark } from "./types.ts";

interface TempoState {
  tempo: number;
  originalTempo: number;
  tempoMap: TempoMark[];
}

function effectiveMap(state: TempoState): TempoMark[] {
  const scale = state.originalTempo > 0 ? state.tempo / state.originalTempo : 1;
  const map = state.tempoMap.length > 0 ? state.tempoMap : [{ beats: 0, bpm: state.tempo }];
  return map.map((mark) => ({ beats: mark.beats, bpm: mark.bpm * scale }));
}

function beatsToSeconds(state: TempoState, beats: number): number {
  const map = effectiveMap(state);
  let seconds = 0;
  for (let i = 0; i < map.length; i++) {
    const segmentEnd = i + 1 < map.length ? Math.min(map[i + 1].beats, beats) : beats;
    if (segmentEnd <= map[i].beats) break;
    seconds += ((segmentEnd - map[i].beats) * 60) / map[i].bpm;
  }
  return seconds;
}

function secondsToBeats(state: TempoState, seconds: number): number {
  const map = effectiveMap(state);
  let elapsed = 0;
  for (let i = 0; i < map.length; i++) {
    const secondsPerBeat = 60 / map[i].bpm;
    const segmentBeats = i + 1 < map.length ? map[i + 1].beats - map[i].beats : Infinity;
    const segmentSeconds = segmentBeats * secondsPerBeat;
    if (seconds - elapsed <= segmentSeconds) {
      return map[i].beats + (seconds - elapsed) / secondsPerBeat;
    }
    elapsed += segmentSeconds;
  }
  return map[map.length - 1].beats;
}

export { beatsToSeconds, secondsToBeats };
