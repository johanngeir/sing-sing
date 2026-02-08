import type { AppState, AppElements, Score } from "../types";

type Theme = AppState["theme"];

interface SettingsDeps {
  state: AppState;
  elements: AppElements;
  SCORES: Score[];
  setStatus: (message: string) => void;
}

interface SettingsApi {
  openSettings: () => void;
  closeSettings: () => void;
  applyTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resetAllSettings: () => void;
  loadNextScore: () => void;
  applyTimelineVisibility: () => void;
}

function initSettings(deps: SettingsDeps): SettingsApi {
  const {
    state,
    elements,
    SCORES,
    setStatus
  } = deps;

  function openSettings(): void {
    elements.settingsModal.hidden = false;
  }

  function closeSettings(): void {
    elements.settingsModal.hidden = true;
  }

  function applyTheme(theme: Theme): void {
    document.documentElement.setAttribute("data-theme", theme);
    state.theme = theme;
    localStorage.setItem("theme", theme);
  }

  function toggleTheme(): void {
    applyTheme(state.theme === "light" ? "dark" : "light");
  }

  function resetAllSettings(): void {
    if (!confirm("This will clear all your saved preferences. Continue?")) return;

    localStorage.clear();

    state.userVoice = "T1";
    state.panInverted = false;
    state.theme = "light";
    state.autoAdvance = false;
    state.showTimeline = true;

    applyTheme("light");
    elements.userVoice.value = "T1";
    elements.panInvert.checked = false;
    elements.autoAdvance.checked = false;
    elements.showTimeline.checked = true;
    applyTimelineVisibility();

    closeSettings();
    setStatus("Settings reset to defaults");
  }

  function loadNextScore(): void {
    const currentIndex = SCORES.findIndex(s => s.url === state.currentScore?.url);
    const nextIndex = (currentIndex + 1) % SCORES.length;
    const nextScore = SCORES[nextIndex];

    if (nextScore) {
      elements.scoreSelect.value = nextScore.url;
      elements.scoreSelect.dispatchEvent(new Event("change"));
    }
  }

  function applyTimelineVisibility(): void {
    if (elements.timelinePanel) {
      elements.timelinePanel.style.display = state.showTimeline ? "" : "none";
    }
  }

  function wireSettingsEvents(): void {
    elements.settingsButton.addEventListener("click", openSettings);
    elements.closeSettings.addEventListener("click", closeSettings);
    elements.settingsModal.querySelector(".modal__backdrop")!.addEventListener("click", closeSettings);
    elements.themeToggle.addEventListener("click", toggleTheme);
    elements.autoAdvance.addEventListener("change", (event: Event) => {
      state.autoAdvance = (event.target as HTMLInputElement).checked;
      localStorage.setItem("autoAdvance", String(state.autoAdvance));
    });
    elements.showTimeline.addEventListener("change", (event: Event) => {
      state.showTimeline = (event.target as HTMLInputElement).checked;
      localStorage.setItem("showTimeline", String(state.showTimeline));
      applyTimelineVisibility();
    });
    elements.resetSettings.addEventListener("click", resetAllSettings);

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape" && !elements.settingsModal.hidden) {
        closeSettings();
      }
    });
  }

  function init(): void {
    applyTheme(state.theme);
    elements.autoAdvance.checked = state.autoAdvance;
    elements.showTimeline.checked = state.showTimeline;
    applyTimelineVisibility();
    wireSettingsEvents();
  }

  init();

  return {
    openSettings,
    closeSettings,
    applyTheme,
    toggleTheme,
    resetAllSettings,
    loadNextScore,
    applyTimelineVisibility
  };
}

export { initSettings };
