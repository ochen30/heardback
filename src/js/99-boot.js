/* ===== Boot ===== */
(function boot() {
  applyTheme(store.get().settings.theme);
  try { document.documentElement.lang = document.documentElement.lang || "en"; } catch {}
  render(html`<${App} />`, document.getElementById("app"));
  initCaps();
  if (storage.corrupt) setTimeout(() => toast("Your saved data couldn't be read. A copy was kept in this browser.", { ms: 15000, action: { label: "Restore", run: () => go("prefs") } }), 600);
  loadJobs();
})();
