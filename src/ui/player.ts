import type * as ToneNs from "tone";
import type { AppState, AppElements, LoopMode, TimelineRow } from "../types";

interface TimelineRowsResult {
  rows: TimelineRow[];
  voiceCount: number;
}

interface PlayerDeps {
  Tone: typeof ToneNs;
  state: AppState;
  elements: AppElements;
  setStatus: (message: string) => void;
  pausePlayback: () => void;
  startPlayback: (fromBeats?: number) => Promise<void>;
  stopPlayback: () => void;
  setTempo: (value: number) => void;
  renderTimeline: () => void;
  buildTimelineRows: () => TimelineRowsResult;
  loadNextScore: () => void;
}

interface PlayerApi {
  updatePlaybackHighlight: () => void;
  formatTime: (seconds: number) => string;
  formatDuration: (durationBeats: number) => string;
  formatNoteShort: (midi: number, durationBeats: number) => string;
  formatRestShort: (durationBeats: number) => string;
  getMeasureStartSeconds: (measureNumber: number) => number | null;
  getTotalBeats: () => number;
  getTotalDuration: () => number;
  beatsToSeconds: (beats: number) => number;
  secondsToBeats: (seconds: number) => number;
  getCurrentMeasure: () => number;
  getTotalMeasures: () => number;
  downloadFile: (filename: string, content: string) => void;
}

function initPlayer(deps: PlayerDeps): PlayerApi {
  const {
    Tone,
    state,
    elements,
    setStatus,
    pausePlayback,
    startPlayback,
    stopPlayback,
    setTempo,
    renderTimeline,
    buildTimelineRows,
    loadNextScore
  } = deps;

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function formatDuration(durationBeats: number): string {
    const durationMap: Record<number, string> = {
      4: "/1",
      3: "/2.",
      2: "/2",
      1.5: "/4.",
      1: "/4",
      0.75: "/8.",
      0.5: "/8",
      0.375: "/16.",
      0.25: "/16",
      0.125: "/32"
    };
    return durationMap[durationBeats] || `/${(4 / durationBeats).toFixed(1)}`;
  }

  function formatNoteShort(midi: number, durationBeats: number): string {
    const noteName = Tone.Frequency(midi, "midi").toNote();
    return `${noteName}${formatDuration(durationBeats)}`;
  }

  function formatRestShort(durationBeats: number): string {
    return `R${formatDuration(durationBeats)}`;
  }

  function getMeasureStartSeconds(measureNumber: number): number | null {
    for (const row of state.timelineRows) {
      if (row.measure === measureNumber) {
        return row.timeSeconds;
      }
    }
    return null;
  }

  function getTotalBeats(): number {
    if (state.timelineRows.length === 0) return 0;
    const lastRow = state.timelineRows[state.timelineRows.length - 1];
    return lastRow.timeBeats + 4;
  }

  function getTotalDuration(): number {
    return (getTotalBeats() * 60) / state.tempo;
  }

  function beatsToSeconds(beats: number): number {
    return (beats * 60) / state.tempo;
  }

  function secondsToBeats(seconds: number): number {
    return (seconds * state.tempo) / 60;
  }

  function getCurrentMeasure(): number {
    const currentSeconds = Tone.Transport.seconds;
    for (let i = state.timelineRows.length - 1; i >= 0; i--) {
      if (state.timelineRows[i].timeSeconds <= currentSeconds) {
        return state.timelineRows[i].measure;
      }
    }
    return 0;
  }

  function getTotalMeasures(): number {
    if (state.timelineRows.length === 0) return 0;
    const lastRow = state.timelineRows[state.timelineRows.length - 1];
    return lastRow.measure + 1;
  }

  function updatePlaybackHighlight(): void {
    if (!state.isPlaying) {
      if (state.playbackRAF) {
        cancelAnimationFrame(state.playbackRAF);
        state.playbackRAF = null;
      }
      return;
    }

    if (!elements.timeline) {
      state.playbackRAF = requestAnimationFrame(updatePlaybackHighlight);
      return;
    }

    const currentBeats = Tone.Transport.ticks / Tone.Transport.PPQ;
    const currentSeconds = beatsToSeconds(currentBeats);

    const rows = elements.timeline.querySelectorAll(".timeline__row:not(.timeline__row--header)");
    let activeIndex = -1;

    for (let i = 0; i < state.timelineRows.length; i++) {
      const rowBeats = state.timelineRows[i].timeBeats;
      if (rowBeats <= currentBeats) {
        activeIndex = i;
      } else {
        break;
      }
    }

    rows.forEach((row, index) => {
      if (index === activeIndex) {
        row.classList.add("timeline__row--active");
        if (!state.autoScrollPaused) {
          row.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      } else {
        row.classList.remove("timeline__row--active");
      }
    });

    if (!state.isSeeking) {
      elements.seekBar.value = String(currentBeats);
    }

    const currentMeasure = getCurrentMeasure();
    elements.currentTime.textContent = `${formatTime(currentSeconds)} (M. ${currentMeasure + 1})`;

    // Check loop bounds
    if ((state.loopMode as LoopMode) === "active" && state.loopBSeconds !== null) {
      if (currentSeconds >= state.loopBSeconds) {
        Tone.Transport.seconds = state.loopASeconds as number;
        state.playbackRAF = requestAnimationFrame(updatePlaybackHighlight);
        return;
      }
    }

    // Check if playback reached the end
    const totalBeats = getTotalBeats();
    if (currentBeats >= totalBeats) {
      stopPlayback();
      if (state.autoAdvance) {
        loadNextScore();
      }
      return;
    }

    state.playbackRAF = requestAnimationFrame(updatePlaybackHighlight);
  }

  function downloadFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function wirePlayerEvents(): void {
    elements.playPauseButton.addEventListener("click", async () => {
      if (state.isPlaying) {
        pausePlayback();
      } else {
        const currentBeats = Tone.Transport.ticks / Tone.Transport.PPQ;
        try {
          await startPlayback(currentBeats > 0 ? currentBeats : 0);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setStatus(`Playback error: ${message}`);
        }
      }
    });

    elements.seekBar.addEventListener("input", () => {
      const beats = parseFloat(elements.seekBar.value);
      Tone.Transport.ticks = beats * Tone.Transport.PPQ;
    });

    elements.seekBar.addEventListener("pointerdown", () => {
      state.isSeeking = true;
    });

    elements.seekBar.addEventListener("pointerup", () => {
      state.isSeeking = false;
    });

    elements.seekBar.addEventListener("pointercancel", () => {
      state.isSeeking = false;
    });

    elements.playerStopButton.addEventListener("click", () => {
      stopPlayback();
      // Reset to loop start or beginning
      if (state.loopA !== null && state.loopASeconds !== null) {
        Tone.Transport.seconds = state.loopASeconds;
      } else {
        Tone.Transport.seconds = 0;
      }
    });

    elements.skipBackButton.addEventListener("click", () => {
      const currentMeasure = getCurrentMeasure();
      if (currentMeasure > 0) {
        Tone.Transport.seconds = getMeasureStartSeconds(currentMeasure - 1) as number;
      } else {
        Tone.Transport.seconds = 0;
      }
    });

    elements.skipForwardButton.addEventListener("click", () => {
      const currentMeasure = getCurrentMeasure();
      const totalMeasures = getTotalMeasures();
      if (currentMeasure < totalMeasures - 1) {
        Tone.Transport.seconds = getMeasureStartSeconds(currentMeasure + 1) as number;
      }
      // If at last measure, do nothing (stay at current position)
    });

    elements.setLoopButton.addEventListener("click", () => {
      const currentMeasure = getCurrentMeasure();

      if (state.loopMode === "inactive") {
        // First click - set A point
        state.loopA = currentMeasure;
        state.loopASeconds = getMeasureStartSeconds(currentMeasure);
        state.loopMode = "settingB";

        // Show marker A
        const totalDuration = getTotalDuration();
        const percentage = ((state.loopASeconds as number) / totalDuration) * 100;
        elements.loopMarkerA.style.left = `${percentage}%`;
        elements.loopMarkerA.hidden = false;

        // Update button to indicate waiting for B
        elements.setLoopButton.textContent = "B";
        elements.setLoopButton.title = "Set loop end point";

      } else if (state.loopMode === "settingB") {
        // Second click - set B point
        let loopB = currentMeasure;
        let loopBSeconds = getMeasureStartSeconds(currentMeasure);

        // Auto-swap if B < A
        if ((loopBSeconds as number) < (state.loopASeconds as number)) {
          const tempMeasure = state.loopA!;
          const tempSeconds = state.loopASeconds!;
          state.loopA = loopB;
          state.loopASeconds = loopBSeconds as number;
          loopB = tempMeasure;
          loopBSeconds = tempSeconds as number;

          // Update marker A position
          const totalDuration = getTotalDuration();
          const percentageA = ((state.loopASeconds as number) / totalDuration) * 100;
          elements.loopMarkerA.style.left = `${percentageA}%`;
        }

        state.loopB = loopB;
        state.loopBSeconds = loopBSeconds;
        state.loopMode = "active";

        // Show marker B
        const totalDuration = getTotalDuration();
        const percentageB = ((state.loopBSeconds as number) / totalDuration) * 100;
        elements.loopMarkerB.style.left = `${percentageB}%`;
        elements.loopMarkerB.hidden = false;

        // Show loop display
        elements.loopDisplay.textContent = `Loop: M.${state.loopA! + 1} → M.${state.loopB + 1}`;
        elements.loopDisplay.hidden = false;
        elements.clearLoopButton.hidden = false;

        // Reset button
        elements.setLoopButton.textContent = "A/B";
        elements.setLoopButton.title = "Set loop point";
      }
    });

    elements.clearLoopButton.addEventListener("click", () => {
      // Reset state
      state.loopA = null;
      state.loopB = null;
      state.loopASeconds = null;
      state.loopBSeconds = null;
      state.loopMode = "inactive";

      // Hide markers and display
      elements.loopMarkerA.hidden = true;
      elements.loopMarkerB.hidden = true;
      elements.loopDisplay.hidden = true;
      elements.clearLoopButton.hidden = true;

      // Reset button
      elements.setLoopButton.textContent = "A/B";
      elements.setLoopButton.title = "Set loop point";
    });

    elements.tempoSelect.addEventListener("change", (event: Event) => {
      const multiplier = parseFloat((event.target as HTMLSelectElement).value);
      const newTempo = Math.round(state.originalTempo * multiplier);
      setTempo(newTempo);
      renderTimeline();
    });

    if (elements.downloadJson) {
      elements.downloadJson.addEventListener("click", () => {
        const { rows, voiceCount } = buildTimelineRows();
        downloadFile(
          "timeline.json",
          JSON.stringify({ tempo: state.tempo, voiceCount, events: rows }, null, 2)
        );
      });
    }

    if (elements.downloadCsv) {
      elements.downloadCsv.addEventListener("click", () => {
        const { rows, voiceCount } = buildTimelineRows();
        const voiceHeaders = Array.from({ length: voiceCount }, (_, i) => `voice${i + 1}`);
        const header = ["timeBeats", "timeSeconds", "measure", ...voiceHeaders];
        const lines = [header.join(",")];
        for (const entry of rows) {
          const voiceCells = entry.voiceColumns.map((cell) => (cell ? cell.display : ""));
          const line = [
            entry.timeBeats.toFixed(2),
            entry.timeSeconds.toFixed(2),
            entry.measure + 1,
            ...voiceCells
          ];
          lines.push(line.join(","));
        }
        downloadFile("timeline.csv", `${lines.join("\n")}\n`);
      });
    }

    if (elements.timeline) {
      elements.timeline.addEventListener("click", (event: Event) => {
        const row = (event.target as HTMLElement).closest(".timeline__row:not(.timeline__row--header)") as HTMLElement | null;
        if (!row) return;

        const timeBeats = parseFloat(row.dataset.timeBeats || "");
        if (!Number.isFinite(timeBeats)) return;

        const timeSeconds = (timeBeats * 60) / state.tempo;
        Tone.Transport.seconds = timeSeconds;

        if (!state.isPlaying) {
          startPlayback().catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            setStatus(`Playback error: ${message}`);
          });
        }
      });
    }
  }

  wirePlayerEvents();

  return {
    updatePlaybackHighlight,
    formatTime,
    formatDuration,
    formatNoteShort,
    formatRestShort,
    getMeasureStartSeconds,
    getTotalBeats,
    getTotalDuration,
    beatsToSeconds,
    secondsToBeats,
    getCurrentMeasure,
    getTotalMeasures,
    downloadFile
  };
}

export { initPlayer };
