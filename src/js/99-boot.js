/* ===== Boot ===== */
(function boot() {
  applyTheme(store.get().settings.theme);
  render(html`<${App} />`, document.getElementById("app"));
  initCaps();
  if (storage.corrupt) setTimeout(() => toast("Your saved data couldn't be read. A copy was kept in this browser.", { ms: 15000, action: { label: "Restore", run: () => go("prefs") } }), 600);
  loadJobs();
})();
