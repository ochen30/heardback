/* ===== Boot ===== */
(function boot() {
  applyTheme(store.get().settings.theme);
  render(html`<${App} />`, document.getElementById("app"));
  initCaps();
  loadJobs();
})();
