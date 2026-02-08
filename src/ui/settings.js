function initSettings(deps) {
  const {
    state,
    elements,
    SCORES,
    setStatus
  } = deps;

  function openSettings() {
    elements.settingsModal.hidden = false;
  }

  function closeSettings() {
    elements.settingsModal.hidden = true;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    state.theme = theme;
    localStorage.setItem("theme", theme);
  }

  function toggleTheme() {
    applyTheme(state.theme === "light" ? "dark" : "light");
  }

  function resetAllSettings() {
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

  function loadNextScore() {
    const currentIndex = SCORES.findIndex(s => s.url === state.currentScore?.url);
    const nextIndex = (currentIndex + 1) % SCORES.length;
    const nextScore = SCORES[nextIndex];

    if (nextScore) {
      elements.scoreSelect.value = nextScore.url;
      elements.scoreSelect.dispatchEvent(new Event("change"));
    }
  }

  function applyTimelineVisibility() {
    if (elements.timelinePanel) {
      elements.timelinePanel.style.display = state.showTimeline ? "" : "none";
    }
  }

  function wireSettingsEvents() {
    elements.settingsButton.addEventListener("click", openSettings);
    elements.closeSettings.addEventListener("click", closeSettings);
    elements.settingsModal.querySelector(".modal__backdrop").addEventListener("click", closeSettings);
    elements.themeToggle.addEventListener("click", toggleTheme);
    elements.autoAdvance.addEventListener("change", (event) => {
      state.autoAdvance = event.target.checked;
      localStorage.setItem("autoAdvance", state.autoAdvance);
    });
    elements.showTimeline.addEventListener("change", (event) => {
      state.showTimeline = event.target.checked;
      localStorage.setItem("showTimeline", state.showTimeline);
      applyTimelineVisibility();
    });
    elements.resetSettings.addEventListener("click", resetAllSettings);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !elements.settingsModal.hidden) {
        closeSettings();
      }
    });
  }

  function init() {
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
