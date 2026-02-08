function initTimeline(deps) {
  const {
    state,
    elements,
    formatNoteShort,
    formatRestShort
  } = deps;

  function buildTimelineRows() {
    const events = state.timeline.filter((e) =>
      (e.type === "note" && e.midi !== undefined) || e.type === "rest"
    );
    if (events.length === 0) return { rows: [], voiceCount: 0 };

    const grouped = new Map();
    for (const entry of events) {
      if (entry.voiceIndex === undefined) continue;
      const key = entry.timeBeats.toFixed(4);
      if (!grouped.has(key)) {
        grouped.set(key, { timeBeats: entry.timeBeats, measure: entry.measure, events: [] });
      }
      grouped.get(key).events.push(entry);
    }

    const rows = Array.from(grouped.values())
      .sort((a, b) => a.timeBeats - b.timeBeats)
      .map((group) => {
        const voiceColumns = new Array(state.voiceCount).fill(null);

        for (const event of group.events) {
          if (event.voiceIndex !== undefined) {
            if (event.type === "note") {
              voiceColumns[event.voiceIndex] = {
                type: "note",
                midi: event.midi,
                durationBeats: event.durationBeats,
                display: formatNoteShort(event.midi, event.durationBeats)
              };
            } else if (event.type === "rest") {
              voiceColumns[event.voiceIndex] = {
                type: "rest",
                durationBeats: event.durationBeats,
                display: formatRestShort(event.durationBeats)
              };
            }
          }
        }

        return {
          timeBeats: group.timeBeats,
          timeSeconds: (group.timeBeats * 60) / state.tempo,
          measure: group.measure,
          voiceColumns
        };
      });

    return { rows, voiceCount: state.voiceCount };
  }

  function renderTimeline() {
    if (!elements.timeline) return;

    const { rows, voiceCount } = buildTimelineRows();
    state.timelineRows = rows;

    if (rows.length === 0) {
      elements.timeline.innerHTML = "<p class=\"hint\">No events to display.</p>";
      return;
    }

    const voiceHeaders = state.voices.map((v) => `<span>${v.shortName}</span>`).join("");
    const header = `
    <div class="timeline__row timeline__row--header" style="grid-template-columns: 4rem 4rem 2rem repeat(${voiceCount}, 1fr);">
      <span>Beat</span>
      <span>Sec</span>
      <span>M</span>
      ${voiceHeaders}
    </div>
  `;

    const rowsHtml = rows
      .map((entry, index) => {
        const voiceCells = entry.voiceColumns
          .map((cell) => {
            if (!cell) return `<span class="voice-cell"></span>`;
            const cellClass = cell.type === "rest" ? "voice-cell voice-cell--rest" : "voice-cell";
            return `<span class="${cellClass}">${cell.display}</span>`;
          })
          .join("");
        return `
        <div class="timeline__row" data-row-index="${index}" data-time-beats="${entry.timeBeats}" style="grid-template-columns: 4rem 4rem 2rem repeat(${voiceCount}, 1fr);">
          <span>${entry.timeBeats.toFixed(2)}</span>
          <span>${entry.timeSeconds.toFixed(2)}</span>
          <span>${entry.measure + 1}</span>
          ${voiceCells}
        </div>
      `;
      })
      .join("");

    elements.timeline.innerHTML = header + rowsHtml;
  }

  return { buildTimelineRows, renderTimeline };
}

export { initTimeline };
