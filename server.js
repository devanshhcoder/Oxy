const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Glitch persists the .data folder across restarts/deploys (it's excluded
// from the project's git history), so this is where all shared vote/menu
// data lives. There is no login here, so "shared" storage below is the only
// storage that touches the server — "private" data (like a browser's saved
// name/room) lives in that browser's own localStorage instead. See
// public/storage-shim.js for the client-side half of this.
const DATA_DIR = path.join(__dirname, ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}");

function readStore() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

// Serialize every write through one queue so concurrent submits (50-60
// students hitting "Submit" around the same time) can't interleave and
// corrupt the file with a lost update.
let queue = Promise.resolve();
function withStore(mutate) {
  queue = queue.then(() => {
    const store = readStore();
    mutate(store);
    fs.writeFileSync(DATA_FILE, JSON.stringify(store));
  });
  return queue;
}

app.get("/api/storage/:key", (req, res) => {
  const store = readStore();
  const value = store[req.params.key];
  if (value === undefined) return res.status(404).json({ error: "not found" });
  res.json({ value });
});

app.put("/api/storage/:key", async (req, res) => {
  await withStore((store) => {
    store[req.params.key] = req.body.value;
  });
  res.json({ ok: true });
});

app.delete("/api/storage/:key", async (req, res) => {
  await withStore((store) => {
    delete store[req.params.key];
  });
  res.json({ ok: true });
});

app.get("/api/storage-list", (req, res) => {
  const prefix = req.query.prefix || "";
  const store = readStore();
  const keys = Object.keys(store).filter((k) => k.startsWith(prefix));
  res.json({ keys });
});

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mess board running on port ${PORT}`));
