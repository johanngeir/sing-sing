import * as Tone from "tone";
import { ok, err, type Result } from "neverthrow";
import type { TimelineEvent, PartEvent, ParsedPart, ParsedScore, TempoMark } from "../types";

interface ParseError {
  code: "INVALID_XML" | "PARSE_ERROR";
  message: string;
}

type StepName = "C" | "D" | "E" | "F" | "G" | "A" | "B";

const STEP_OFFSETS: Record<StepName, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11
};

function midiToNoteName(midi: number): string {
  return Tone.Frequency(midi, "midi").toNote();
}

function fallbackTempo(doc: Document): number {
  const metronome = doc.querySelector("direction metronome per-minute");
  if (metronome) {
    const value = Number(metronome.textContent);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 120;
}

function readSoundTempo(child: Element): number | null {
  const sound = child.querySelector("sound[tempo]");
  if (!sound) return null;
  const value = Number(sound.getAttribute("tempo"));
  return Number.isFinite(value) && value > 0 ? value : null;
}

interface MeasureBarline {
  repeatForward: boolean;
  repeatBackward: boolean;
  endingStart: number[] | null;
  endingEnd: boolean;
}

function readBarlines(measure: Element): MeasureBarline {
  const result: MeasureBarline = { repeatForward: false, repeatBackward: false, endingStart: null, endingEnd: false };
  measure.querySelectorAll(":scope > barline").forEach((barline) => {
    const repeat = barline.querySelector("repeat");
    if (repeat?.getAttribute("direction") === "forward") result.repeatForward = true;
    if (repeat?.getAttribute("direction") === "backward") result.repeatBackward = true;
    const ending = barline.querySelector("ending");
    if (ending) {
      const type = ending.getAttribute("type");
      if (type === "start") {
        result.endingStart = (ending.getAttribute("number") || "1")
          .split(/[,\s]+/)
          .map(Number)
          .filter((n) => Number.isFinite(n));
      } else {
        result.endingEnd = true;
      }
    }
  });
  return result;
}

// Expands repeat barlines and volta endings (read from the first part) into
// the sequence of measure indices actually played.
function buildPlayOrder(measures: Element[]): number[] {
  const bars = measures.map(readBarlines);
  const order: number[] = [];
  let repeatStart = 0;
  let pass = 1;
  let i = 0;
  while (i < measures.length) {
    const bar = bars[i];
    if (bar.repeatForward && i !== repeatStart) {
      // A new repeat section; the previous one may have ended by skipping a
      // volta past its repeat barline without resetting the pass counter.
      repeatStart = i;
      pass = 1;
    }
    if (bar.endingStart && !bar.endingStart.includes(pass)) {
      while (i < measures.length && !bars[i].endingEnd) i++;
      i++;
      continue;
    }
    order.push(i);
    if (bar.repeatBackward && pass === 1) {
      pass = 2;
      i = repeatStart;
      continue;
    }
    if (bar.repeatBackward) {
      pass = 1;
      repeatStart = i + 1;
    }
    i++;
  }
  return order;
}

function getTitle(doc: Document): string {
  const title = doc.querySelector("work > work-title");
  if (title && title.textContent) {
    return title.textContent.trim();
  }

  const movementTitle = doc.querySelector("movement-title");
  if (movementTitle && movementTitle.textContent) {
    return movementTitle.textContent.trim();
  }

  return "Untitled";
}

function getPartNames(doc: Document): Map<string, string> {
  const names = new Map<string, string>();
  doc.querySelectorAll("part-list score-part").forEach((part) => {
    const id = part.getAttribute("id");
    const name = part.querySelector("part-name")?.textContent?.trim();
    if (id) {
      names.set(id, name || id);
    }
  });
  return names;
}

function parsePitch(note: Element): number | null {
  const pitch = note.querySelector("pitch");
  if (!pitch) return null;

  const step = pitch.querySelector("step")?.textContent;
  const octave = pitch.querySelector("octave")?.textContent;
  if (!step || !octave) return null;

  const alterValue = pitch.querySelector("alter")?.textContent;
  const alter = alterValue ? Number(alterValue) : 0;
  const base = STEP_OFFSETS[step as StepName] ?? 0;
  const midi = 12 * (Number(octave) + 1) + base + alter;
  return midi;
}

function hasTie(note: Element, type: "start" | "stop"): boolean {
  return Boolean(
    Array.from(note.querySelectorAll("tie, notations > tied")).find(
      (tie) => tie.getAttribute("type") === type
    )
  );
}

interface TieEntry {
  start: number;
  duration: number;
  voice: string;
  staff: string;
  chordIndex: number;
  measure: number;
}

function buildEventsForPart(
  part: Element,
  name: string,
  partIndex: number,
  playOrder: number[],
  tempoMarks: TempoMark[] | null
): ParsedPart {
  const events: PartEvent[] = [];
  const tieMap = new Map<string, TieEntry>();
  let currentDivisions = 1;
  let absoluteBeats = 0;
  let measureStartBeats = 0;
  let lastChordBeats = 0;
  const timeline: TimelineEvent[] = [];
  let chordIndex = 0;
  const measures = Array.from(part.querySelectorAll("measure"));
  const divisionsAt: number[] = [];

  playOrder.forEach((measureIndex) => {
    const measure = measures[measureIndex];
    if (!measure) return;
    if (divisionsAt[measureIndex] !== undefined) {
      currentDivisions = divisionsAt[measureIndex];
    }
    measureStartBeats = absoluteBeats;
    lastChordBeats = absoluteBeats;

    Array.from(measure.children).forEach((child) => {
      const tag = child.tagName;
      if (tag === "attributes") {
        const divisions = child.querySelector("divisions");
        if (divisions) {
          const value = Number(divisions.textContent);
          if (Number.isFinite(value) && value > 0) {
            currentDivisions = value;
          }
        }
        return;
      }

      if (tag === "direction" && tempoMarks) {
        const bpm = readSoundTempo(child);
        if (bpm !== null) {
          tempoMarks.push({ beats: absoluteBeats, bpm });
        }
        return;
      }

      if (tag === "backup" || tag === "forward") {
        const durationValue = child.querySelector("duration")?.textContent;
        const durationDivisions = durationValue ? Number(durationValue) : 0;
        if (!Number.isFinite(durationDivisions) || durationDivisions <= 0) {
          return;
        }
        const delta = durationDivisions / currentDivisions;
        if (tag === "backup") {
          absoluteBeats = Math.max(measureStartBeats, absoluteBeats - delta);
        } else {
          absoluteBeats += delta;
        }
        lastChordBeats = absoluteBeats;
        return;
      }

      if (tag !== "note") {
        return;
      }

      if (child.querySelector("grace")) {
        return;
      }

      const durationValue = child.querySelector("duration")?.textContent;
      const durationDivisions = durationValue ? Number(durationValue) : 0;
      if (!Number.isFinite(durationDivisions) || durationDivisions <= 0) {
        return;
      }

      const durationBeats = durationDivisions / currentDivisions;
      const isRest = Boolean(child.querySelector("rest"));
      const isChord = Boolean(child.querySelector("chord"));
      const noteBeats = isChord ? lastChordBeats : absoluteBeats;
      const voice = child.querySelector("voice")?.textContent?.trim() || "1";
      const staff = child.querySelector("staff")?.textContent?.trim() || "1";

      if (!isChord) {
        lastChordBeats = noteBeats;
        chordIndex = 0;
      } else {
        chordIndex++;
      }

      if (isRest) {
        timeline.push({
          partIndex,
          partName: name,
          measure: measureIndex,
          voice,
          staff,
          chordIndex,
          timeBeats: noteBeats,
          durationBeats,
          type: "rest" as const
        });
      } else {
        const midi = parsePitch(child);
        if (midi !== null) {
          const tieStart = hasTie(child, "start");
          const tieStop = hasTie(child, "stop");
          const tieKey = `${voice}:${midi}`;

          if (tieStart) {
            const existing = tieMap.get(tieKey);
            const start = existing ? existing.start : noteBeats;
            const total = (existing ? existing.duration : 0) + durationBeats;
            tieMap.set(tieKey, {
              start,
              duration: total,
              voice,
              staff,
              chordIndex,
              measure: measureIndex
            });
          } else if (tieStop) {
            const existing = tieMap.get(tieKey);
            const start = existing ? existing.start : noteBeats;
            const total = (existing ? existing.duration : 0) + durationBeats;
            const measureValue = existing ? existing.measure : measureIndex;
            const voiceValue = existing ? existing.voice : voice;
            const staffValue = existing ? existing.staff : staff;
            const chordIndexValue = existing ? existing.chordIndex : chordIndex;
            tieMap.delete(tieKey);
            const event = {
              timeBeats: start,
              durationBeats: total,
              midi
            };
            events.push(event);
            timeline.push({
              partIndex,
              partName: name,
              measure: measureValue,
              voice: voiceValue,
              staff: staffValue,
              chordIndex: chordIndexValue,
              timeBeats: start,
              durationBeats: total,
              type: "note",
              midi
            });
          } else {
            events.push({ timeBeats: noteBeats, durationBeats, midi });
            timeline.push({
              partIndex,
              partName: name,
              measure: measureIndex,
              voice,
              staff,
              chordIndex,
              timeBeats: noteBeats,
              durationBeats,
              type: "note",
              midi
            });
          }
        }
      }

      if (!isChord) {
        absoluteBeats += durationBeats;
      }
    });

    divisionsAt[measureIndex + 1] = currentDivisions;
  });

  return {
    name,
    events,
    timeline
  };
}

function parseMusicXML(xmlText: string): Result<ParsedScore, ParseError> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    return err({
      code: "INVALID_XML",
      message: parseError.textContent?.trim() || "Invalid XML"
    });
  }

  try {
    const title = getTitle(doc);
    const partNames = getPartNames(doc);
    const parts: ParsedPart[] = [];
    const timeline: TimelineEvent[] = [];
    const partElements = Array.from(doc.querySelectorAll("part"));
    const playOrder = partElements.length > 0
      ? buildPlayOrder(Array.from(partElements[0].querySelectorAll("measure")))
      : [];
    const tempoMarks: TempoMark[] = [];

    partElements.forEach((part, index) => {
      const id = part.getAttribute("id") || "Part";
      const name = partNames.get(id) || id;
      const built = buildEventsForPart(part, name, index, playOrder, index === 0 ? tempoMarks : null);
      parts.push(built);
      timeline.push(...built.timeline);
    });

    if (tempoMarks.length === 0) {
      tempoMarks.push({ beats: 0, bpm: fallbackTempo(doc) });
    }
    const tempoMap = tempoMarks.filter((mark, i) => i === 0 || mark.beats > tempoMarks[i - 1].beats);
    if (tempoMap[0].beats > 0) {
      tempoMap.unshift({ beats: 0, bpm: tempoMap[0].bpm });
    }

    return ok({ tempo: tempoMap[0].bpm, tempoMap, title, parts, timeline });
  } catch (error) {
    return err({
      code: "PARSE_ERROR",
      message: error instanceof Error ? error.message : "Unknown parse error"
    });
  }
}

export { parseMusicXML, midiToNoteName };
export type { ParseError };
