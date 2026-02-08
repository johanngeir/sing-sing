import * as Tone from "tone";

function midiToNoteName(midi) {
  return Tone.Frequency(midi, "midi").toNote();
}

function getTempo(doc) {
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

function getTitle(doc) {
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

function getPartNames(doc) {
  const names = new Map();
  doc.querySelectorAll("part-list score-part").forEach((part) => {
    const id = part.getAttribute("id");
    const name = part.querySelector("part-name")?.textContent?.trim();
    if (id) {
      names.set(id, name || id);
    }
  });
  return names;
}

function parsePitch(note) {
  const pitch = note.querySelector("pitch");
  if (!pitch) return null;

  const step = pitch.querySelector("step")?.textContent;
  const octave = pitch.querySelector("octave")?.textContent;
  if (!step || !octave) return null;

  const alterValue = pitch.querySelector("alter")?.textContent;
  const alter = alterValue ? Number(alterValue) : 0;
  const stepOffsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = stepOffsets[step] ?? 0;
  const midi = 12 * (Number(octave) + 1) + base + alter;
  return midi;
}

function hasTie(note, type) {
  return Boolean(
    Array.from(note.querySelectorAll("tie, notations > tied")).find(
      (tie) => tie.getAttribute("type") === type
    )
  );
}

function buildEventsForPart(part, name, partIndex) {
  const events = [];
  const tieMap = new Map();
  let currentDivisions = 1;
  let absoluteBeats = 0;
  let measureStartBeats = 0;
  let lastChordBeats = 0;
  const timeline = [];
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
          type: "rest"
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

function parseMusicXML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const tempo = getTempo(doc);
  const title = getTitle(doc);
  const partNames = getPartNames(doc);
  const parts = [];
  const timeline = [];

  doc.querySelectorAll("part").forEach((part, index) => {
    const id = part.getAttribute("id") || "Part";
    const name = partNames.get(id) || id;
    const built = buildEventsForPart(part, name, index);
    parts.push(built);
    timeline.push(...built.timeline);
  });

  return { tempo, title, parts, timeline };
}

export { parseMusicXML };
