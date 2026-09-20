import * as Tone from "tone";
import { beatsToSeconds, secondsToBeats } from "../tempo";
import { AppState, AppElements, TimelineEvent } from "../types";

const VOICE_COLORS = [
  { bg: "#c97d3c", label: "Soprano" },
  { bg: "#3d8c7d", label: "Alto" },
  { bg: "#7b5ea7", label: "Tenor" },
  { bg: "#c75a5a", label: "Bass" },
  { bg: "#5a8fc7", label: "Baritone" },
  { bg: "#8c7b3d", label: "Mezzo" },
  { bg: "#c75a8f", label: "Contralto" },
  { bg: "#5ac7a0", label: "Treble" },
];

export function initPianoRoll({
  state,
  elements,
}: {
  state: AppState;
  elements: AppElements;
}) {
  const canvas = elements.pianoRoll;
  const tooltip = elements.pianoRollTooltip;
  const legend = elements.pianoRollLegend;
  const container = elements.pianoRollPanel?.querySelector(
    ".pianoroll__container"
  ) as HTMLElement;

  if (!canvas || !tooltip || !legend || !container) {
    console.warn("Piano roll elements not found");
    return { renderPianoRoll: () => {} };
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { renderPianoRoll: () => {} };
  }

  const view = {
    offsetX: 50,
    offsetY: 20,
    scaleX: 40,
    scaleY: 12,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    minMidi: 0,
    maxMidi: 127,
  };

  let animationFrameId: number | null = null;
  let hoveredEvent: TimelineEvent | null = null;

  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => render());
  });
  resizeObserver.observe(container);

  function getVoiceColor(voiceIndex: number | undefined, alpha = 1.0) {
    if (voiceIndex === undefined) return `rgba(150, 150, 150, ${alpha})`;
    const colorDef = VOICE_COLORS[voiceIndex % VOICE_COLORS.length];
    
    const hex = colorDef.bg.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getCssVar(name: string) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }

  function render() {
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const bgColor = getCssVar("--panel-bg") || "#fdfbf7";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (state.timeline.length === 0) {
      ctx.fillStyle = getCssVar("--text-muted");
      ctx.font = "16px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Load a score to see the piano roll", rect.width / 2, rect.height / 2);
      return;
    }

    const keyWidth = 50;

    for (let midi = view.maxMidi; midi >= view.minMidi; midi--) {
      const y = (view.maxMidi - midi) * view.scaleY + view.offsetY;
      
      if (y > rect.height || y + view.scaleY < 0) continue;

      const isBlackKey = [1, 3, 6, 8, 10].includes(midi % 12);
      
      if (isBlackKey) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
        ctx.fillRect(keyWidth, y, rect.width - keyWidth, view.scaleY);
      } else {
        if (midi % 12 === 0) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
          ctx.lineWidth = 1;
          ctx.moveTo(keyWidth, y + view.scaleY);
          ctx.lineTo(rect.width, y + view.scaleY);
          ctx.stroke();
        }
      }

      const noteName = Tone.Frequency(midi, "midi").toNote();
      if (noteName.includes("C") || noteName.includes("E") || noteName.includes("G")) {
         if (view.scaleY > 8) {
             ctx.fillStyle = getCssVar("--text-secondary");
             ctx.font = "10px sans-serif";
             ctx.textAlign = "right";
             ctx.textBaseline = "middle";
             ctx.fillText(noteName, keyWidth - 5, y + view.scaleY / 2);
         }
      }
      
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.moveTo(0, y + view.scaleY);
      ctx.lineTo(keyWidth, y + view.scaleY);
      ctx.stroke();
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, keyWidth, rect.height);
    ctx.beginPath();
    ctx.strokeStyle = getCssVar("--panel-border");
    ctx.moveTo(keyWidth, 0);
    ctx.lineTo(keyWidth, rect.height);
    ctx.stroke();

    const maxBeat = state.timeline.reduce((max, ev) => Math.max(max, ev.timeBeats + ev.durationBeats), 0);
    const measureMap = new Map<number, number>();
    
    let lastMeasure = -1;
    const measureLines = new Set<number>();
    state.timeline.forEach(ev => {
        if (ev.measure !== lastMeasure) {
            measureLines.add(ev.timeBeats);
            lastMeasure = ev.measure;
            
            const x = ev.timeBeats * view.scaleX + view.offsetX + keyWidth;
            if (x > keyWidth && x < rect.width) {
                 ctx.fillStyle = getCssVar("--text-muted");
                 ctx.font = "10px sans-serif";
                 ctx.textAlign = "left";
                 ctx.fillText(ev.measure.toString(), x + 4, 12);
            }
        }
    });
    
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    measureLines.forEach(beat => {
        const x = beat * view.scaleX + view.offsetX + keyWidth;
        if (x > keyWidth && x < rect.width) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, rect.height);
        }
    });
    ctx.stroke();


    state.timeline.forEach((ev) => {
      if (ev.type !== "note" || ev.midi === undefined) return;

      const x = ev.timeBeats * view.scaleX + view.offsetX + keyWidth;
      const width = ev.durationBeats * view.scaleX;
      const y = (view.maxMidi - ev.midi) * view.scaleY + view.offsetY;
      const height = view.scaleY - 1;

      if (x + width < keyWidth || x > rect.width) return;
      if (y + height < 0 || y > rect.height) return;

      const color = getVoiceColor(ev.voiceIndex, 0.85);
      const borderColor = getVoiceColor(ev.voiceIndex, 1.0);

      const r = 3;
      ctx.fillStyle = color;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
         ctx.roundRect(x, y, width, height, r);
      } else {
         ctx.rect(x, y, width, height);
      }
      ctx.fill();
      ctx.stroke();
    });

    if (state.isPlaying) {
        const currentSeconds = Tone.Transport.seconds;
        const currentBeats = secondsToBeats(state, currentSeconds);
        
        const x = currentBeats * view.scaleX + view.offsetX + keyWidth;
        
        if (x > keyWidth && x < rect.width) {
            ctx.strokeStyle = "#e87070";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, rect.height);
            ctx.stroke();
        }
    }
  }

  function loop() {
    if (state.isPlaying) {
      render();
      animationFrameId = requestAnimationFrame(loop);
    } else {
      animationFrameId = null;
    }
  }

  function updateData() {
    if (state.timeline.length > 0) {
      let min = 127;
      let max = 0;
      state.timeline.forEach(ev => {
        if (ev.midi !== undefined) {
          min = Math.min(min, ev.midi);
          max = Math.max(max, ev.midi);
        }
      });
      view.minMidi = Math.max(0, min - 2);
      view.maxMidi = Math.min(127, max + 2);

      const duration = state.timeline[state.timeline.length - 1].timeBeats + 10;
      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width - 50;
      view.scaleX = Math.max(20, availableWidth / (duration + 4)); 
      
      view.offsetX = 10;
      view.offsetY = 10;
      
      updateLegend();
    }
    render();
  }

  function updateLegend() {
    if (!legend) return;
    legend.innerHTML = "";
    
    const usedVoiceIndices = new Set<number>();
    state.timeline.forEach(ev => {
        if (ev.voiceIndex !== undefined) usedVoiceIndices.add(ev.voiceIndex);
    });

    const sortedIndices = Array.from(usedVoiceIndices).sort((a, b) => a - b);
    
    sortedIndices.forEach(idx => {
        const voiceState = state.voices[idx]; 
        
        const name = voiceState?.shortName || voiceState?.name || `Voice ${idx + 1}`;
        const color = getVoiceColor(idx, 1);
        
        const item = document.createElement("div");
        item.className = "pianoroll__legend-item";
        
        const dot = document.createElement("div");
        dot.className = "pianoroll__legend-dot";
        dot.style.backgroundColor = color;
        
        const label = document.createElement("span");
        label.textContent = name;
        
        item.appendChild(dot);
        item.appendChild(label);
        legend.appendChild(item);
    });
  }
  
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const keyWidth = 50;
    
    if (e.metaKey || e.ctrlKey) {
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const mouseX = e.clientX - rect.left - keyWidth;
      
      const beatUnderMouse = (mouseX - view.offsetX) / view.scaleX;
      
      view.scaleX *= zoomFactor;
      view.scaleX = Math.max(5, Math.min(200, view.scaleX));
      
      view.offsetX = mouseX - beatUnderMouse * view.scaleX;
    } else {
      view.offsetX -= e.deltaX;
      view.offsetY -= e.deltaY;
    }
    
    requestAnimationFrame(render);
  }, { passive: false });

  canvas.addEventListener("mousedown", (e) => {
    view.isDragging = true;
    view.lastMouseX = e.clientX;
    view.lastMouseY = e.clientY;
    container.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", () => {
    view.isDragging = false;
    if (container) container.style.cursor = "grab";
  });

  window.addEventListener("mousemove", (e) => {
    if (view.isDragging) {
      const dx = e.clientX - view.lastMouseX;
      const dy = e.clientY - view.lastMouseY;
      view.offsetX += dx;
      view.offsetY += dy;
      view.lastMouseX = e.clientX;
      view.lastMouseY = e.clientY;
      requestAnimationFrame(render);
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    if (view.isDragging) {
        tooltip.hidden = true;
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const keyWidth = 50;
    
    const mouseBeat = (x - keyWidth - view.offsetX) / view.scaleX;

    let found: TimelineEvent | null = null;
    
    for (const ev of state.timeline) {
        if (ev.type !== "note" || ev.midi === undefined) continue;
        
        const evStart = ev.timeBeats;
        const evEnd = ev.timeBeats + ev.durationBeats;
        
        if (mouseBeat >= evStart && mouseBeat <= evEnd) {
             const rectY = (view.maxMidi - ev.midi) * view.scaleY + view.offsetY;
             const rectH = view.scaleY - 1;
             
             if (y >= rectY && y <= rectY + rectH) {
                 found = ev;
                 break;
             }
        }
    }

    hoveredEvent = found;

    if (found && found.midi !== undefined) {
        tooltip.hidden = false;
        const containerRect = container.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - containerRect.left + 12}px`;
        tooltip.style.top = `${e.clientY - containerRect.top + 12}px`;
        
        const noteName = Tone.Frequency(found.midi, "midi").toNote();
        const voiceName = state.voices[found.voiceIndex || 0]?.shortName || "?";
        
        tooltip.innerHTML = `
            <strong>${noteName}</strong> • ${voiceName}<br>
            M. ${found.measure} • ${found.durationBeats.toFixed(2)} beats
        `;
    } else {
        tooltip.hidden = true;
    }
  });
  
  canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const keyWidth = 50;
      
      if (x > keyWidth) {
          const beat = (x - keyWidth - view.offsetX) / view.scaleX;
          const clampedBeat = Math.max(0, beat);
          
          if (state.tempo > 0) {
              const seconds = beatsToSeconds(state, clampedBeat);
              Tone.Transport.seconds = seconds;
              requestAnimationFrame(render);
          }
      }
  });

  return {
    renderPianoRoll: () => {
      updateData();
      
      if (state.isPlaying && !animationFrameId) {
        loop();
      }
    },
  };
}
