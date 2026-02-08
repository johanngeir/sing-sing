import { describe, expect, it, vi } from 'vitest';

vi.mock('tone', () => ({
  Frequency: () => ({
    toNote: () => 'C4'
  })
}));

import { parseMusicXML } from '../parser/musicxml';

function makeXML(options: {
  title?: string;
  tempo?: number;
  parts?: Array<{
    id?: string;
    name?: string;
    measures: string;
  }>;
}): string {
  const parts =
    options.parts ?? [
      {
        id: 'P1',
        name: 'Part 1',
        measures:
          '<measure number="1"><attributes><divisions>1</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note></measure>'
      }
    ];

  const partList = parts
    .map(
      (part, index) =>
        `<score-part id="${part.id ?? `P${index + 1}`}"><part-name>${part.name ?? `Part ${index + 1}`}</part-name></score-part>`
    )
    .join('');

  const renderedParts = parts
    .map((part, index) => {
      const partId = part.id ?? `P${index + 1}`;
      const tempoMeasure =
        index === 0 && options.tempo !== undefined
          ? `<measure number="0"><direction><sound tempo="${options.tempo}"/></direction></measure>`
          : '';
      return `<part id="${partId}">${tempoMeasure}${part.measures}</part>`;
    })
    .join('');

  const title = options.title
    ? `<work><work-title>${options.title}</work-title></work>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
${title}
<part-list>${partList}</part-list>
${renderedParts}
</score-partwise>`;
}

function noteXml(options: {
  step?: string;
  octave?: number;
  alter?: number;
  duration?: number;
  voice?: string;
  staff?: string;
  rest?: boolean;
  chord?: boolean;
  grace?: boolean;
  tieStart?: boolean;
  tieStop?: boolean;
}): string {
  const duration = options.duration ?? 1;
  const voice = options.voice ?? '1';
  const staff = options.staff ?? '1';
  const pitch = options.rest
    ? '<rest/>'
    : `<pitch><step>${options.step ?? 'C'}</step>${
        options.alter !== undefined ? `<alter>${options.alter}</alter>` : ''
      }<octave>${options.octave ?? 4}</octave></pitch>`;

  return `<note>${
    options.grace ? '<grace/>' : ''
  }${options.chord ? '<chord/>' : ''}${pitch}${
    options.tieStart ? '<tie type="start"/>' : ''
  }${options.tieStop ? '<tie type="stop"/>' : ''}<duration>${duration}</duration><voice>${voice}</voice><staff>${staff}</staff></note>`;
}

describe('parseMusicXML', () => {
  describe('tempo extraction', () => {
    it('uses sound tempo attribute when available', () => {
      const result = parseMusicXML(makeXML({ tempo: 92 }));
      expect(result.tempo).toBe(92);
    });

    it('falls back to metronome per-minute when sound tempo is missing', () => {
      const xml = makeXML({
        parts: [
          {
            measures: `<measure number="1"><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type></direction></measure>`
          }
        ]
      });

      const result = parseMusicXML(xml);
      expect(result.tempo).toBe(72);
    });

    it('defaults to 120 when no tempo is present', () => {
      const result = parseMusicXML(makeXML({}));
      expect(result.tempo).toBe(120);
    });

    it('falls back to 120 for invalid or zero tempo values', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Part 1</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <direction><sound tempo="0"/></direction>
      <direction>
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>not-a-number</per-minute>
          </metronome>
        </direction-type>
      </direction>
      ${noteXml({ step: 'C', octave: 4, duration: 1 })}
    </measure>
  </part>
</score-partwise>`;

      const result = parseMusicXML(xml);
      expect(result.tempo).toBe(120);
    });
  });

  describe('title extraction', () => {
    it('uses work-title when present', () => {
      const result = parseMusicXML(makeXML({ title: 'Mass in C' }));
      expect(result.title).toBe('Mass in C');
    });

    it('falls back to movement-title when work-title is missing', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <movement-title>Allegro ma non troppo</movement-title>
  <part-list><score-part id="P1"><part-name>Part 1</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">${noteXml({ step: 'C', octave: 4, duration: 1 })}</measure>
  </part>
</score-partwise>`;

      const result = parseMusicXML(xml);
      expect(result.title).toBe('Allegro ma non troppo');
    });

    it('defaults to Untitled when no title elements are present', () => {
      const result = parseMusicXML(makeXML({}));
      expect(result.title).toBe('Untitled');
    });
  });

  describe('pitch parsing through note events', () => {
    it('parses all note steps, accidentals, and octaves into correct MIDI values', () => {
      const measure = `<measure number="1"><attributes><divisions>1</divisions></attributes>${[
        noteXml({ step: 'C', octave: 4 }),
        noteXml({ step: 'D', octave: 4 }),
        noteXml({ step: 'E', octave: 4 }),
        noteXml({ step: 'F', octave: 4 }),
        noteXml({ step: 'G', octave: 4 }),
        noteXml({ step: 'A', octave: 4 }),
        noteXml({ step: 'B', octave: 4 }),
        noteXml({ step: 'C', octave: 4, alter: 1 }),
        noteXml({ step: 'D', octave: 4, alter: -1 }),
        noteXml({ step: 'C', octave: 5 })
      ].join('')}</measure>`;

      const result = parseMusicXML(makeXML({ parts: [{ measures: measure }] }));
      const midiValues = result.parts[0].events.map((event) => event.midi);

      expect(midiValues).toEqual([60, 62, 64, 65, 67, 69, 71, 61, 61, 72]);
      expect(midiValues[0]).toBe(60);
      expect(midiValues[5]).toBe(69);
    });
  });

  describe('rest handling', () => {
    it('creates timeline rest events and excludes rests from part events', () => {
      const measure = `<measure number="1"><attributes><divisions>2</divisions></attributes>${noteXml({ rest: true, duration: 4 })}${noteXml({ step: 'C', octave: 4, duration: 2 })}</measure>`;
      const result = parseMusicXML(makeXML({ parts: [{ measures: measure }] }));

      const restEvents = result.timeline.filter((event) => event.type === 'rest');
      expect(restEvents).toHaveLength(1);
      expect(restEvents[0].durationBeats).toBe(2);
      expect(restEvents[0].timeBeats).toBe(0);

      expect(result.parts[0].events).toHaveLength(1);
      expect(result.parts[0].events[0].timeBeats).toBe(2);
      expect(result.parts[0].events[0].midi).toBe(60);
    });
  });

  describe('tie handling', () => {
    it('merges start/stop ties into one combined note event', () => {
      const measure = `<measure number="1"><attributes><divisions>1</divisions></attributes>${noteXml({ step: 'G', octave: 4, duration: 2, tieStart: true })}${noteXml({ step: 'G', octave: 4, duration: 1, tieStop: true })}</measure>`;
      const result = parseMusicXML(makeXML({ parts: [{ measures: measure }] }));

      expect(result.parts[0].events).toHaveLength(1);
      expect(result.parts[0].events[0]).toEqual({ timeBeats: 0, durationBeats: 3, midi: 67 });

      const noteTimeline = result.timeline.filter((event) => event.type === 'note');
      expect(noteTimeline).toHaveLength(1);
      expect(noteTimeline[0].durationBeats).toBe(3);
    });

    it('merges ties across measures and keeps the starting measure metadata', () => {
      const measures = `<measure number="1"><attributes><divisions>1</divisions></attributes>${noteXml({ step: 'C', octave: 4, duration: 2, tieStart: true, voice: '2' })}</measure><measure number="2">${noteXml({ step: 'C', octave: 4, duration: 2, tieStop: true, voice: '2' })}</measure>`;
      const result = parseMusicXML(makeXML({ parts: [{ measures }] }));

      expect(result.parts[0].events).toHaveLength(1);
      expect(result.parts[0].events[0]).toEqual({ timeBeats: 0, durationBeats: 4, midi: 60 });
      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].measure).toBe(0);
      expect(result.timeline[0].voice).toBe('2');
    });
  });

  describe('chord handling', () => {
    it('keeps chord notes on the same time and increments chordIndex', () => {
      const measure = `<measure number="1"><attributes><divisions>1</divisions></attributes>${noteXml({ step: 'C', octave: 4, duration: 2 })}${noteXml({ step: 'E', octave: 4, duration: 2, chord: true })}${noteXml({ step: 'G', octave: 4, duration: 2, chord: true })}${noteXml({ step: 'A', octave: 4, duration: 1 })}</measure>`;
      const result = parseMusicXML(makeXML({ parts: [{ measures: measure }] }));
      const noteTimeline = result.timeline.filter((event) => event.type === 'note');

      expect(result.parts[0].events).toHaveLength(4);
      expect(noteTimeline[0].timeBeats).toBe(0);
      expect(noteTimeline[1].timeBeats).toBe(0);
      expect(noteTimeline[2].timeBeats).toBe(0);
      expect(noteTimeline[3].timeBeats).toBe(2);

      expect(noteTimeline[0].chordIndex).toBe(0);
      expect(noteTimeline[1].chordIndex).toBe(1);
      expect(noteTimeline[2].chordIndex).toBe(2);
    });
  });

  describe('grace note skipping', () => {
    it('ignores grace notes entirely', () => {
      const measure = `<measure number="1"><attributes><divisions>1</divisions></attributes>${noteXml({ step: 'D', octave: 5, duration: 1, grace: true })}${noteXml({ step: 'C', octave: 5, duration: 1 })}</measure>`;
      const result = parseMusicXML(makeXML({ parts: [{ measures: measure }] }));

      expect(result.parts[0].events).toHaveLength(1);
      expect(result.parts[0].events[0].midi).toBe(72);
      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].midi).toBe(72);
    });
  });

  describe('backup and forward handling', () => {
    it('updates time cursor with backup and forward durations', () => {
      const measure = `<measure number="1"><attributes><divisions>1</divisions></attributes>${noteXml({ step: 'C', octave: 4, duration: 2 })}<backup><duration>1</duration></backup>${noteXml({ step: 'D', octave: 4, duration: 1 })}<forward><duration>2</duration></forward>${noteXml({ step: 'E', octave: 4, duration: 1 })}</measure>`;

      const result = parseMusicXML(makeXML({ parts: [{ measures: measure }] }));
      expect(result.parts[0].events.map((event) => event.timeBeats)).toEqual([0, 1, 4]);
      expect(result.parts[0].events.map((event) => event.midi)).toEqual([60, 62, 64]);
    });
  });

  describe('multi-part scores', () => {
    it('parses multiple parts in source order with correct names and indices', () => {
      const result = parseMusicXML(
        makeXML({
          parts: [
            { id: 'P1', name: 'Soprano', measures: `<measure number="1">${noteXml({ step: 'C', octave: 5 })}</measure>` },
            { id: 'P2', name: 'Alto', measures: `<measure number="1">${noteXml({ step: 'A', octave: 4 })}</measure>` },
            { id: 'P3', name: 'Tenor', measures: `<measure number="1">${noteXml({ step: 'E', octave: 4 })}</measure>` }
          ]
        })
      );

      expect(result.parts).toHaveLength(3);
      expect(result.parts.map((part) => part.name)).toEqual(['Soprano', 'Alto', 'Tenor']);

      const firstEvents = result.timeline.filter((event) => event.type === 'note');
      expect(firstEvents[0].partIndex).toBe(0);
      expect(firstEvents[0].partName).toBe('Soprano');
      expect(firstEvents[1].partIndex).toBe(1);
      expect(firstEvents[1].partName).toBe('Alto');
      expect(firstEvents[2].partIndex).toBe(2);
      expect(firstEvents[2].partName).toBe('Tenor');
    });
  });

  describe('SATB and TTBB structures', () => {
    it('returns four named parts for SATB layouts', () => {
      const result = parseMusicXML(
        makeXML({
          parts: [
            { id: 'P1', name: 'Soprano', measures: `<measure number="1">${noteXml({ step: 'C', octave: 5 })}</measure>` },
            { id: 'P2', name: 'Alto', measures: `<measure number="1">${noteXml({ step: 'A', octave: 4 })}</measure>` },
            { id: 'P3', name: 'Tenor', measures: `<measure number="1">${noteXml({ step: 'E', octave: 4 })}</measure>` },
            { id: 'P4', name: 'Bass', measures: `<measure number="1">${noteXml({ step: 'C', octave: 3 })}</measure>` }
          ]
        })
      );

      expect(result.parts).toHaveLength(4);
      expect(result.parts.map((part) => part.name)).toEqual(['Soprano', 'Alto', 'Tenor', 'Bass']);
    });

    it('captures two voices per part for TTBB layouts', () => {
      const result = parseMusicXML(
        makeXML({
          parts: [
            {
              id: 'P1',
              name: 'Tenor',
              measures: `<measure number="1"><attributes><divisions>1</divisions></attributes>${noteXml({ step: 'G', octave: 4, duration: 2, voice: '1' })}<backup><duration>2</duration></backup>${noteXml({ step: 'E', octave: 4, duration: 2, voice: '2' })}</measure>`
            },
            {
              id: 'P2',
              name: 'Bass',
              measures: `<measure number="1"><attributes><divisions>1</divisions></attributes>${noteXml({ step: 'C', octave: 3, duration: 2, voice: '1' })}<backup><duration>2</duration></backup>${noteXml({ step: 'A', octave: 2, duration: 2, voice: '2' })}</measure>`
            }
          ]
        })
      );

      expect(result.parts).toHaveLength(2);
      const tenorVoices = new Set(
        result.timeline.filter((event) => event.partName === 'Tenor').map((event) => event.voice)
      );
      const bassVoices = new Set(
        result.timeline.filter((event) => event.partName === 'Bass').map((event) => event.voice)
      );

      expect(Array.from(tenorVoices).sort()).toEqual(['1', '2']);
      expect(Array.from(bassVoices).sort()).toEqual(['1', '2']);
    });
  });

  describe('divisions handling', () => {
    it.each([
      { divisions: 1, duration: 4, expectedBeats: 4 },
      { divisions: 2, duration: 4, expectedBeats: 2 },
      { divisions: 4, duration: 4, expectedBeats: 1 }
    ])(
      'computes beats from duration/divisions for divisions=$divisions',
      ({ divisions, duration, expectedBeats }) => {
        const measures = `<measure number="1"><attributes><divisions>${divisions}</divisions></attributes>${noteXml({ step: 'C', octave: 4, duration })}</measure>`;
        const result = parseMusicXML(makeXML({ parts: [{ measures }] }));

        expect(result.parts[0].events).toHaveLength(1);
        expect(result.parts[0].events[0].durationBeats).toBe(expectedBeats);
      }
    );
  });
});
