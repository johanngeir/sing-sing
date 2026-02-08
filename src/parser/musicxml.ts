import * as Tone from "tone";
import { ok, err, type Result } from "neverthrow";
import type { TimelineEvent, PartEvent, ParsedPart, ParsedScore } from "../types";

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

function getTempo(doc: Document): number {
  const soundTempo = doc.querySelector("sound[tempo]");
  if (soundTempo) {
    const value = Number(soundTempo.getAttribute("tempo"));
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  const metronome = doc.querySelector("direction metronome per-minute");
  if (metronome) {
    const value = Number(metronome.textContent);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 120;
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

function buildEventsForPart(part: Element, name: string, partIndex: number): ParsedPart {
  const events: PartEvent[] = [];
  const tieMap = new Map<string, TieEntry>();
  let currentDivisions = 1;
  let absoluteBeats = 0;
  let measureStartBeats = 0;
  let lastChordBeats = 0;
  const timeline: TimelineEvent[] = [];
  let measureIndex = 0;
  let chordIndex = 0;

  part.querySelectorAll("measure").forEach((measure) => {
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

          if (tieStart && !tieStop) {
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

    measureIndex += 1;
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
    const tempo = getTempo(doc);
    const title = getTitle(doc);
    const partNames = getPartNames(doc);
    const parts: ParsedPart[] = [];
    const timeline: TimelineEvent[] = [];

    doc.querySelectorAll("part").forEach((part, index) => {
      const id = part.getAttribute("id") || "Part";
      const name = partNames.get(id) || id;
      const built = buildEventsForPart(part, name, index);
      parts.push(built);
      timeline.push(...built.timeline);
    });

    return ok({ tempo, title, parts, timeline });
  } catch (error) {
    return err({
      code: "PARSE_ERROR",
      message: error instanceof Error ? error.message : "Unknown parse error"
    });
  }
}

export { parseMusicXML, midiToNoteName };
export type { ParseError };
