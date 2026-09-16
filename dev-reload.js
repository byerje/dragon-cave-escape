/* ============================================================
   DEV RELOAD (local development only)
   ------------------------------------------------------------
   Polls the game's own files for changes (using the HTTP
   "Last-Modified" header, which python -m http.server sets
   automatically) and reloads the page the moment one changes.

   This only runs when the page is served from localhost, so it
   never activates for anyone playing a deployed copy of the game.
   ============================================================ */
(function () {
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocal) return;

  const WATCHED_FILES = ["index.html", "styles.css", "game.js"];
  const POLL_INTERVAL_MS = 1000;
  const lastModified = {};

  async function checkFile(file) {
    const response = await fetch(file, { method: "HEAD", cache: "no-store" });
    const modified = response.headers.get("Last-Modified");
    if (!modified) return;

    if (lastModified[file] && lastModified[file] !== modified) {
      console.log("[dev-reload] " + file + " changed, reloading...");
      window.location.reload();
      return;
    }
    lastModified[file] = modified;
  }

  setInterval(function () {
    WATCHED_FILES.forEach(function (file) {
      checkFile(file).catch(function () { /* server briefly restarting; ignore */ });
    });
  }, POLL_INTERVAL_MS);
})();
