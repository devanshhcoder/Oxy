// Replaces the Claude-artifact `window.storage` API with:
//  - shared=true  -> calls the Express API in server.js (real shared data)
//  - shared=false -> this browser's own localStorage (no login = no
//    server-side concept of "this user", and none is needed for this key —
//    it's only ever used for a browser's own remembered name/room).
window.storage = {
  async get(key, shared = false) {
    if (!shared) {
      const raw = localStorage.getItem("local:" + key);
      if (raw === null) throw new Error("not found");
      return { key, value: raw, shared: false };
    }
    const res = await fetch(`/api/storage/${encodeURIComponent(key)}`);
    if (res.status === 404) throw new Error("not found");
    if (!res.ok) throw new Error("storage get failed");
    const data = await res.json();
    return { key, value: data.value, shared: true };
  },

  async set(key, value, shared = false) {
    if (!shared) {
      localStorage.setItem("local:" + key, value);
      return { key, value, shared: false };
    }
    const res = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) throw new Error("storage set failed");
    return { key, value, shared: true };
  },

  async delete(key, shared = false) {
    if (!shared) {
      localStorage.removeItem("local:" + key);
      return { key, deleted: true, shared: false };
    }
    const res = await fetch(`/api/storage/${encodeURIComponent(key)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("storage delete failed");
    return { key, deleted: true, shared: true };
  },

  async list(prefix = "", shared = false) {
    if (!shared) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith("local:" + prefix)) keys.push(k.slice(6));
      }
      return { keys, prefix, shared: false };
    }
    const res = await fetch(`/api/storage-list?prefix=${encodeURIComponent(prefix)}`);
    if (!res.ok) throw new Error("storage list failed");
    const data = await res.json();
    return { keys: data.keys, prefix, shared: true };
  },
};
