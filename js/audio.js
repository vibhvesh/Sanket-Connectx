// Temporary in-memory audio history. No IndexedDB, localStorage, or persistent recording.
window.SanketAudio = (() => {
  let items = [];
  return {
    add(item) { items.push(item); },
    all() { return [...items]; },
    clear() {
      for (const item of items) if (item.url) URL.revokeObjectURL(item.url);
      items = [];
    }
  };
})();