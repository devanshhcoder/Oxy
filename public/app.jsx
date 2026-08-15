// No bundler here — React is loaded globally via CDN script tags in
// index.html, and the icon components come from icons.js (loaded first).
const { useState, useEffect, useCallback } = React;

// ---- Change this to whatever passcode you want to use as the hostel owner ----
const OWNER_PASSCODE = "mess123";
const POLL_MS = 15000;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEALS = ["Breakfast", "Lunch", "Snacks", "Dinner", "Fruit"];

// Each meal's structure. "vote" parts are what students pick a dish for.
// "poll" parts are a fixed set of options (yes/no, morning/evening) — no dish suggestions.
// "fixed" parts are always the same and are just shown as info.
function getMealParts(day, meal) {
  if (meal === "Breakfast") {
    return [
      { key: "main", label: "Main", type: "vote" },
      { key: "tea", label: "Tea", type: "fixed" },
    ];
  }
  if (meal === "Lunch") {
    return [
      { key: "dal", label: "Dal today?", type: "poll", options: ["Yes", "No"] },
      { key: "sabji", label: "Sabji", type: "vote" },
      { key: "dahi", label: "Dahi today?", type: "poll", options: ["Yes", "No"] },
      { key: "rice", label: "Rice & Chawal", type: "fixed" },
    ];
  }
  if (meal === "Snacks") {
    return [
      { key: "tea", label: "Tea", type: "fixed" },
      { key: "snack", label: "Snack", type: "vote" },
    ];
  }
  if (meal === "Dinner") {
    if (day === "Sun") {
      return [{ key: "special", label: "Sunday Special", type: "vote" }];
    }
    return [
      { key: "dal", label: "Dal today?", type: "poll", options: ["Yes", "No"] },
      { key: "sabji", label: "Sabji", type: "vote" },
      { key: "rice", label: "Rice & Chawal", type: "fixed" },
    ];
  }
  if (meal === "Fruit") {
    return [{ key: "timing", label: "Fruit — when?", type: "poll", options: ["Morning", "Evening"] }];
  }
  return [];
}

// Default candidate dishes for each voteable slot ("Meal:part")
const DEFAULT_ITEMS = {
  "Breakfast:main": ["Aloo Paratha", "Poha", "Fried Idli", "Bread Sandwich", "Kachori"],
  "Lunch:sabji": ["Aloo Gobi", "Bhindi Fry", "Mix Veg", "Paneer Curry", "Chana Masala"],
  "Snacks:snack": ["Samosa", "Pakora", "Bread Pakora", "Vada Pav"],
  "Dinner:sabji": ["Aloo Matar", "Lauki Sabji", "Paneer Bhurji", "Mix Veg"],
  "Dinner:special": ["Chhole Bhature", "Dosa + Sambar", "Pav Bhaji", "Veg Manchurian + Fried Rice"],
};

function slugify(str) {
  return str.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function buildDefaultItems() {
  const list = [];
  Object.entries(DEFAULT_ITEMS).forEach(([slot, names]) => {
    names.forEach((name) => list.push({ id: `${slugify(slot)}-${uid()}`, name, slot }));
  });
  return list;
}

function HostelMenuBoard() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [voteEntries, setVoteEntries] = useState([]); // [{voterId, name, room, choices: {day:{meal:{part:itemId}}}, ts}]
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [identityLocked, setIdentityLocked] = useState(false);
  const [voterId, setVoterId] = useState(null);
  const [selections, setSelections] = useState({}); // {day:{meal:{part:itemId}}}
  const [suggestText, setSuggestText] = useState({}); // {slot: text}
  const [generalSuggestion, setGeneralSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [activeVoteDay, setActiveVoteDay] = useState("Mon");
  const [activeResultDay, setActiveResultDay] = useState("Mon");
  const [expandedSlot, setExpandedSlot] = useState(null);

  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerUnlocked, setOwnerUnlocked] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [resetting, setResetting] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const res = await window.storage.get("menu-items", true);
      if (res && res.value) {
        setItems(JSON.parse(res.value));
      } else {
        const def = buildDefaultItems();
        await window.storage.set("menu-items", JSON.stringify(def), true);
        setItems(def);
      }
    } catch (e) {
      const def = buildDefaultItems();
      try {
        await window.storage.set("menu-items", JSON.stringify(def), true);
      } catch (e2) {}
      setItems(def);
    }
  }, []);

  const fetchVotes = useCallback(async () => {
    try {
      const l = await window.storage.list("vote:", true);
      const keys = (l && l.keys) || [];
      // Fetch all voter entries in parallel — with 50-60 voters, awaiting
      // each get() sequentially made every poll cycle noticeably slow.
      const results = await Promise.all(
        keys.map((k) => window.storage.get(k, true).catch(() => null))
      );
      const entries = [];
      for (const r of results) {
        if (r && r.value) {
          try {
            entries.push(JSON.parse(r.value));
          } catch (e) {}
        }
      }
      return entries;
    } catch (e) {
      return [];
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadItems();
      const entries = await fetchVotes();
      setVoteEntries(entries);
      try {
        const res = await window.storage.get("my-identity", false);
        if (res && res.value) {
          const saved = JSON.parse(res.value);
          setName(saved.name || "");
          setRoom(saved.room || "");
          setVoterId(saved.voterId || null);
          setIdentityLocked(true);
          const mine = entries.find((v) => v.voterId === saved.voterId);
          if (mine) {
            setSelections(mine.choices || {});
            setGeneralSuggestion(mine.generalSuggestion || "");
          }
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, [loadItems, fetchVotes]);

  // Live-ish updates: poll for new dishes and vote counts without touching in-progress selections
  useEffect(() => {
    const interval = setInterval(async () => {
      await loadItems();
      const entries = await fetchVotes();
      setVoteEntries(entries);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [loadItems, fetchVotes]);

  const confirmIdentity = async () => {
    if (!name.trim() || !room.trim()) {
      setError("Enter your name and room number to continue.");
      return;
    }
    setError("");
    const vid = `${slugify(room)}__${slugify(name)}`;
    setVoterId(vid);
    setIdentityLocked(true);
    try {
      await window.storage.set(
        "my-identity",
        JSON.stringify({ name: name.trim(), room: room.trim(), voterId: vid }),
        false
      );
    } catch (e) {}
    const mine = voteEntries.find((v) => v.voterId === vid);
    // Always set selections explicitly (never leave a previous voter's
    // in-progress picks sitting around for a new identity on this device).
    setSelections(mine ? mine.choices || {} : {});
    setGeneralSuggestion(mine ? mine.generalSuggestion || "" : "");
  };

  // Fully resets local voting state so a different person can vote on the
  // same device/session without inheriting the previous voter's picks.
  const switchUser = async () => {
    setIdentityLocked(false);
    setName("");
    setRoom("");
    setVoterId(null);
    setSelections({});
    setGeneralSuggestion("");
    setError("");
    setJustSubmitted(false);
    setExpandedSlot(null);
    setActiveVoteDay("Mon");
    try {
      await window.storage.delete("my-identity", false);
    } catch (e) {}
  };

  const pickItem = (day, meal, part, itemId) => {
    setSelections((prev) => {
      const next = { ...prev, [day]: { ...(prev[day] || {}) } };
      next[day][meal] = { ...(next[day][meal] || {}) };
      if (next[day][meal][part] === itemId) delete next[day][meal][part];
      else next[day][meal][part] = itemId;
      return next;
    });
  };

  const addSuggestion = async (meal, part) => {
    const slot = `${meal}:${part}`;
    const text = (suggestText[slot] || "").trim();
    if (!text) return;
    const newItem = { id: `x-${uid()}`, name: text, slot };
    const nextItems = [...items, newItem];
    setItems(nextItems);
    setSuggestText((p) => ({ ...p, [slot]: "" }));
    pickItem(activeVoteDay, meal, part, newItem.id);
    try {
      await window.storage.set("menu-items", JSON.stringify(nextItems), true);
    } catch (e) {}
  };

  const submitVote = async () => {
    // Votes are final — once an entry exists for this voterId, block resubmission.
    if (!voterId || hasVoted) return;
    setSubmitting(true);
    setError("");
    let totalPicks = 0;
    Object.values(selections).forEach((dayObj) => {
      Object.values(dayObj || {}).forEach((mealObj) => {
        totalPicks += Object.keys(mealObj || {}).length;
      });
    });
    if (totalPicks === 0) {
      setError("Pick at least one dish somewhere before submitting.");
      setSubmitting(false);
      return;
    }
    const entry = {
      voterId,
      name: name.trim(),
      room: room.trim(),
      choices: selections,
      generalSuggestion: generalSuggestion.trim(),
      ts: Date.now(),
    };
    try {
      await window.storage.set(`vote:${voterId}`, JSON.stringify(entry), true);
      // This flips `hasVoted` to true, which switches the view straight to the dashboard.
      setVoteEntries((prev) => [...prev.filter((v) => v.voterId !== voterId), entry]);
      setJustSubmitted(true);
    } catch (e) {
      setError("Couldn't save your vote — check your connection and try again.");
    }
    setSubmitting(false);
  };

  const unlockOwner = () => {
    if (passInput === OWNER_PASSCODE) {
      setOwnerUnlocked(true);
      setError("");
    } else {
      setError("Wrong passcode.");
    }
  };

  const resetAllVotes = async () => {
    setResetting(true);
    try {
      const l = await window.storage.list("vote:", true);
      const keys = (l && l.keys) || [];
      for (const k of keys) {
        try {
          await window.storage.delete(k, true);
        } catch (e) {}
      }
      setVoteEntries([]);
      setSelections({});
      setGeneralSuggestion("");
      setJustSubmitted(false);
    } catch (e) {}
    setResetting(false);
  };

  const removeItem = async (itemId) => {
    const nextItems = items.filter((i) => i.id !== itemId);
    setItems(nextItems);
    try {
      await window.storage.set("menu-items", JSON.stringify(nextItems), true);
    } catch (e) {}
  };

  const totalVoters = voteEntries.length;
  const hasVoted = voteEntries.some((v) => v.voterId === voterId);

  const tallyFor = (day, meal, part, itemId) =>
    voteEntries.reduce((count, v) => {
      const pick = v.choices && v.choices[day] && v.choices[day][meal] && v.choices[day][meal][part];
      return pick === itemId ? count + 1 : count;
    }, 0);

  const slotVoteCount = (day, meal, part, validIds) =>
    voteEntries.reduce((count, v) => {
      const pick = v.choices && v.choices[day] && v.choices[day][meal] && v.choices[day][meal][part];
      return pick && validIds.has(pick) ? count + 1 : count;
    }, 0);

  return (
    <div className="board-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;700&display=swap');
        .board-root {
          --charcoal: #232323; --charcoal-2: #2b2b28;
          --paper: #f4ecd8; --paper-2: #ebe0c5;
          --mustard: #d9a441; --mustard-dark: #b8842f;
          --maroon: #8c3b3b; --mint: #587a5e;
          --ink: #2c241b; --ink-soft: #6b6154;
          font-family: 'DM Sans', sans-serif;
          background: var(--charcoal); color: var(--paper); min-height: 100%;
        }
        .board-inner { max-width: 720px; margin: 0 auto; padding: 28px 18px 60px; }
        .board-header { text-align: center; padding: 22px 16px 26px; border-bottom: 3px dashed rgba(244,236,216,0.25); margin-bottom: 26px; }
        .board-eyebrow { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--mustard); font-weight: 700; }
        .board-title { font-family: 'Anton', sans-serif; font-size: 36px; letter-spacing: 1px; line-height: 1.05; margin: 6px 0 8px; text-transform: uppercase; }
        .board-sub { color: #c9bfa8; font-size: 14px; max-width: 460px; margin: 0 auto; line-height: 1.5; }
        .voter-count { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; background: rgba(217,164,65,0.14); border: 1px solid rgba(217,164,65,0.4); color: var(--mustard); padding: 5px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; }

        .id-card { background: var(--paper); color: var(--ink); border-radius: 10px; padding: 20px; margin-bottom: 22px; box-shadow: 0 8px 0 rgba(0,0,0,0.25); position: relative; }
        .id-card::before { content: 'TOKEN'; position: absolute; top: -10px; left: 18px; background: var(--maroon); color: var(--paper); font-family: 'Anton', sans-serif; font-size: 11px; letter-spacing: 2px; padding: 3px 10px; border-radius: 4px; }
        .id-row { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
        .id-input { flex: 1; min-width: 140px; border: 2px solid #d8cba7; background: #fffdf7; border-radius: 6px; padding: 10px 12px; font-size: 14.5px; color: var(--ink); outline: none; }
        .id-input:focus { border-color: var(--mustard-dark); }
        .btn { font-weight: 700; border: none; border-radius: 7px; padding: 10px 18px; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
        .btn:active { transform: scale(0.97); }
        .btn-primary { background: var(--mustard); color: #2c1e08; }
        .btn-danger { background: var(--maroon); color: var(--paper); }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .identity-summary { display: flex; align-items: center; justify-content: space-between; color: var(--ink-soft); font-size: 13.5px; flex-wrap: wrap; gap: 6px; }
        .identity-summary b { color: var(--ink); }
        .link-btn { background: none; border: none; color: var(--maroon); font-weight: 700; font-size: 12.5px; cursor: pointer; text-decoration: underline; padding: 0; }

        .day-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 18px; }
        .day-tab { flex: 0 0 auto; padding: 9px 16px; border-radius: 999px; border: 1.5px solid rgba(244,236,216,0.25); background: rgba(244,236,216,0.05); color: var(--paper); font-weight: 700; font-size: 13.5px; cursor: pointer; white-space: nowrap; }
        .day-tab.active { background: var(--mustard); color: #2c1e08; border-color: var(--mustard); }
        .day-tab .done-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--mint); margin-left: 6px; }

        .meal-group { margin-bottom: 28px; }
        .meal-group-title { font-family: 'Anton', sans-serif; font-size: 20px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--paper); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; border-left: 4px solid var(--mustard); padding-left: 10px; }
        .part-block { margin-bottom: 16px; }
        .part-label { font-size: 12.5px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--mint); font-weight: 700; margin-bottom: 8px; }
        .fixed-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(244,236,216,0.06); border: 1px dashed rgba(244,236,216,0.25); color: #b8ad93; padding: 8px 14px; border-radius: 8px; font-size: 13.5px; }
        .chip-grid { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 10px; }
        .chip { padding: 9px 15px; border-radius: 999px; border: 1.5px solid rgba(244,236,216,0.3); background: rgba(244,236,216,0.06); color: var(--paper); font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; user-select: none; }
        .chip.selected { background: var(--mustard); border-color: var(--mustard); color: #2c1e08; font-weight: 700; }
        .suggest-row { display: flex; gap: 8px; }
        .suggest-input { flex: 1; background: rgba(244,236,216,0.06); border: 1.5px dashed rgba(244,236,216,0.3); border-radius: 8px; padding: 8px 12px; color: var(--paper); font-size: 13.5px; outline: none; }
        .suggest-input::placeholder { color: #8f8571; }
        .suggest-input:focus { border-color: var(--mustard); }
        .icon-btn { background: rgba(217,164,65,0.16); border: 1px solid rgba(217,164,65,0.4); color: var(--mustard); border-radius: 8px; padding: 0 12px; cursor: pointer; display: flex; align-items: center; }

        .vote-notice { display: flex; align-items: center; gap: 8px; background: rgba(217,164,65,0.1); border: 1px solid rgba(217,164,65,0.3); color: var(--mustard); font-size: 12.5px; font-weight: 700; padding: 9px 14px; border-radius: 8px; margin-bottom: 18px; }
        .suggest-textarea { width: 100%; box-sizing: border-box; border: 2px solid #d8cba7; background: #fffdf7; border-radius: 6px; padding: 10px 12px; font-size: 14px; color: var(--ink); outline: none; font-family: inherit; resize: vertical; }
        .suggest-textarea:focus { border-color: var(--mustard-dark); }
        .general-suggestion-block { margin-top: 6px; margin-bottom: 18px; }

        .dashboard-screen { text-align: center; padding: 30px 16px 8px; }
        .dashboard-banner { display: inline-flex; align-items: center; gap: 8px; background: rgba(88,122,94,0.18); border: 1px solid rgba(88,122,94,0.5); color: var(--mint); font-weight: 700; font-size: 14.5px; padding: 10px 18px; border-radius: 999px; }
        .dashboard-suggestion { margin-top: 14px; color: #c9bfa8; font-size: 13px; font-style: italic; }

        .submit-bar { position: sticky; bottom: 14px; display: flex; justify-content: center; margin-top: 8px; }
        .submit-btn { font-family: 'Anton', sans-serif; font-size: 15px; letter-spacing: 0.5px; text-transform: uppercase; padding: 13px 30px; border-radius: 999px; background: var(--mustard); color: #2c1e08; border: none; box-shadow: 0 6px 18px rgba(0,0,0,0.4); cursor: pointer; }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .error-text { color: #e79a9a; font-size: 13.5px; text-align: center; margin-top: 10px; }
        .toast { text-align: center; color: var(--mustard); font-weight: 700; font-size: 13.5px; margin-top: 10px; }

        .results-section { margin-top: 44px; border-top: 3px dashed rgba(244,236,216,0.25); padding-top: 26px; }
        .results-heading { font-family: 'Anton', sans-serif; font-size: 24px; text-transform: uppercase; margin-bottom: 4px; }
        .results-caption { color: #c9bfa8; font-size: 13.5px; margin-bottom: 18px; }
        .result-meal-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--paper); font-weight: 700; margin: 18px 0 8px; }

        .slot-card { background: rgba(244,236,216,0.05); border: 1px solid rgba(244,236,216,0.15); border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; }
        .slot-top { display: flex; align-items: center; justify-content: space-between; }
        .slot-meal { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--mint); font-weight: 700; }
        .slot-winner { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .slot-winner-name { font-size: 16px; font-weight: 700; }
        .slot-meta { font-size: 12.5px; color: #a89a70; margin-top: 2px; }
        .slot-breakdown { margin-top: 12px; border-top: 1px dashed rgba(244,236,216,0.2); padding-top: 10px; }
        .tray-row { margin-bottom: 9px; }
        .tray-label { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
        .tray-label .count { color: var(--mustard); font-weight: 700; }
        .tray { height: 13px; background: rgba(244,236,216,0.08); border-radius: 4px; overflow: hidden; border: 1px solid rgba(244,236,216,0.15); }
        .tray-fill { height: 100%; background: linear-gradient(90deg, var(--mustard-dark), var(--mustard)); border-radius: 4px; transition: width 0.4s ease; }
        .fixed-result-row { display: flex; align-items: center; gap: 8px; color: #a89a70; font-size: 13.5px; padding: 8px 4px; }

        .owner-toggle { position: fixed; bottom: 16px; right: 16px; background: var(--charcoal-2); border: 1px solid rgba(244,236,216,0.25); color: #c9bfa8; border-radius: 999px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 20; }
        .owner-panel { position: fixed; bottom: 64px; right: 16px; width: 260px; background: var(--paper); color: var(--ink); border-radius: 10px; padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); z-index: 20; max-height: 70vh; overflow-y: auto; }
        .owner-panel h4 { font-family: 'Anton', sans-serif; font-size: 15px; margin: 0 0 10px; text-transform: uppercase; }
        .owner-item-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 5px 0; border-bottom: 1px solid #e2d5b0; }
        .loading-state { text-align: center; padding: 80px 20px; color: #c9bfa8; }
      `}</style>

      <div className="board-inner">
        <div className="board-header">
          <div className="board-eyebrow">Live Weekly Mess Board</div>
          <div className="board-title">This Week's Menu</div>
          <p className="board-sub">
            Vote on the parts that actually change — sabji, snack, breakfast item, Sunday special. Dal, rice, tea and dahi stay as usual.
          </p>
          {!loading && (
            <div className="voter-count">
              <Users size={14} /> {totalVoters} {totalVoters === 1 ? "student has" : "students have"} voted
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-state">Loading the board…</div>
        ) : (
          <>
            <div className="id-card">
              {!identityLocked ? (
                <>
                  <div style={{ fontSize: 13.5, color: "#6b6154", marginTop: 6 }}>
                    Quick — who's voting? This just stops double-voting.
                  </div>
                  <div className="id-row">
                    <input className="id-input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                    <input className="id-input" placeholder="Room no." value={room} onChange={(e) => setRoom(e.target.value)} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn-primary" onClick={confirmIdentity}>
                      <Check size={15} /> Continue to vote
                    </button>
                  </div>
                </>
              ) : (
                <div className="identity-summary">
                  <div>
                    Voting as <b>{name}</b> · Room <b>{room}</b>
                    {hasVoted && (
                      <span style={{ color: "#587a5e", fontWeight: 700 }}>
                        {" "}
                        · <Lock size={11} style={{ verticalAlign: -1 }} /> locked in
                      </span>
                    )}
                  </div>
                  <button className="link-btn" onClick={switchUser}>not you?</button>
                </div>
              )}
            </div>

            {identityLocked && !hasVoted && (
              <>
                <div className="vote-notice">
                  <Lock size={13} /> Heads up — once you submit, your picks are final and can't be changed.
                </div>
                <div className="day-tabs">
                  {DAYS.map((day) => {
                    const dayObj = selections[day] || {};
                    const filled = Object.values(dayObj).reduce((a, m) => a + Object.keys(m || {}).length, 0);
                    return (
                      <div
                        key={day}
                        className={`day-tab ${activeVoteDay === day ? "active" : ""}`}
                        onClick={() => setActiveVoteDay(day)}
                      >
                        {day}
                        {filled > 0 && <span className="done-dot" />}
                      </div>
                    );
                  })}
                </div>

                {MEALS.map((meal) => {
                  const parts = getMealParts(activeVoteDay, meal);
                  return (
                    <div className="meal-group" key={meal}>
                      <div className="meal-group-title">
                        <Utensils size={16} /> {activeVoteDay} · {meal}
                      </div>
                      {parts.map((part) => {
                        if (part.type === "fixed") {
                          return (
                            <div className="part-block" key={part.key}>
                              <div className="part-label">{part.label}</div>
                              <div className="fixed-tag">
                                <Coffee size={13} /> {part.label} — as usual
                              </div>
                            </div>
                          );
                        }
                        if (part.type === "poll") {
                          const picked = ((selections[activeVoteDay] || {})[meal] || {})[part.key];
                          return (
                            <div className="part-block" key={part.key}>
                              <div className="part-label">{part.label}</div>
                              <div className="chip-grid">
                                {part.options.map((opt) => (
                                  <div
                                    key={opt}
                                    className={`chip ${picked === opt ? "selected" : ""}`}
                                    onClick={() => pickItem(activeVoteDay, meal, part.key, opt)}
                                  >
                                    {picked === opt && <Check size={13} />}
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        const slot = `${meal}:${part.key}`;
                        const slotItems = items.filter((i) => i.slot === slot);
                        const picked = ((selections[activeVoteDay] || {})[meal] || {})[part.key];
                        return (
                          <div className="part-block" key={part.key}>
                            <div className="part-label">{part.label} — your pick</div>
                            <div className="chip-grid">
                              {slotItems.map((item) => (
                                <div
                                  key={item.id}
                                  className={`chip ${picked === item.id ? "selected" : ""}`}
                                  onClick={() => pickItem(activeVoteDay, meal, part.key, item.id)}
                                >
                                  {picked === item.id && <Check size={13} />}
                                  {item.name}
                                </div>
                              ))}
                            </div>
                            <div className="suggest-row">
                              <input
                                className="suggest-input"
                                placeholder={`Suggest a ${part.label.toLowerCase()} not listed…`}
                                value={suggestText[slot] || ""}
                                onChange={(e) => setSuggestText((p) => ({ ...p, [slot]: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && addSuggestion(meal, part.key)}
                              />
                              <button className="icon-btn" onClick={() => addSuggestion(meal, part.key)}>
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                <div className="part-block general-suggestion-block">
                  <div className="part-label">Any other suggestions? (optional)</div>
                  <textarea
                    className="suggest-textarea"
                    placeholder="Anything else you'd like to tell the mess committee — this is your last chance, it locks with your vote…"
                    value={generalSuggestion}
                    onChange={(e) => setGeneralSuggestion(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="submit-bar">
                  <button className="submit-btn" onClick={submitVote} disabled={submitting}>
                    {submitting ? "Saving…" : "Submit My Picks — Final"}
                  </button>
                </div>
                {error && <div className="error-text">{error}</div>}
              </>
            )}

            {identityLocked && hasVoted && (
              <div className="dashboard-screen">
                <div className="dashboard-banner">
                  <Check size={16} /> {justSubmitted ? "Your picks are locked in — thanks!" : "You've already voted — picks are locked."}
                </div>
                {generalSuggestion && (
                  <div className="dashboard-suggestion">Your note: “{generalSuggestion}”</div>
                )}
              </div>
            )}

            {identityLocked && hasVoted && (
            <div className="results-section">
              <div className="results-heading">Dashboard — Current Standings</div>
              <div className="results-caption">Tap a slot to see the full vote breakdown.</div>

              <div className="day-tabs">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className={`day-tab ${activeResultDay === day ? "active" : ""}`}
                    onClick={() => setActiveResultDay(day)}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {MEALS.map((meal) => {
                const parts = getMealParts(activeResultDay, meal);
                return (
                  <div key={meal}>
                    <div className="result-meal-title">{meal}</div>
                    {parts.map((part) => {
                      if (part.type === "fixed") {
                        return (
                          <div className="fixed-result-row" key={part.key}>
                            <Coffee size={13} /> {part.label} — as usual
                          </div>
                        );
                      }
                      const isPoll = part.type === "poll";
                      const slot = `${meal}:${part.key}`;
                      // Only ids that currently exist as options count toward the
                      // total — otherwise a deleted dish's old votes still get
                      // counted in the total but never show up in the breakdown.
                      const validIds = isPoll
                        ? new Set(part.options)
                        : new Set(items.filter((i) => i.slot === slot).map((i) => i.id));
                      const slotItems = isPoll
                        ? part.options
                            .map((opt) => ({ id: opt, name: opt, votes: tallyFor(activeResultDay, meal, part.key, opt) }))
                            .sort((a, b) => b.votes - a.votes)
                        : items
                            .filter((i) => i.slot === slot)
                            .map((i) => ({ ...i, votes: tallyFor(activeResultDay, meal, part.key, i.id) }))
                            .sort((a, b) => b.votes - a.votes);
                      const slotVotes = slotVoteCount(activeResultDay, meal, part.key, validIds);
                      const winner = slotItems[0];
                      const maxVotes = Math.max(1, ...slotItems.map((i) => i.votes));
                      const slotKey = `${activeResultDay}-${meal}-${part.key}`;
                      const expanded = expandedSlot === slotKey;
                      return (
                        <div className="slot-card" key={part.key} onClick={() => setExpandedSlot(expanded ? null : slotKey)}>
                          <div className="slot-top">
                            <div>
                              <div className="slot-meal">{part.label}</div>
                              {slotVotes > 0 ? (
                                <div className="slot-winner">
                                  <Trophy size={15} color="#d9a441" />
                                  <span className="slot-winner-name">{winner.name}</span>
                                </div>
                              ) : (
                                <div className="slot-winner-name" style={{ color: "#a89a70", fontWeight: 400 }}>
                                  No votes yet
                                </div>
                              )}
                              <div className="slot-meta">{slotVotes} vote{slotVotes === 1 ? "" : "s"}</div>
                            </div>
                            <ChevronDown size={18} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                          </div>
                          {expanded && (
                            <div className="slot-breakdown">
                              {slotItems.map((item) => (
                                <div className="tray-row" key={item.id}>
                                  <div className="tray-label">
                                    <span>{item.name}</span>
                                    <span className="count">{item.votes}</span>
                                  </div>
                                  <div className="tray">
                                    <div className="tray-fill" style={{ width: `${(item.votes / maxVotes) * 100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            )}
          </>
        )}
      </div>

      <button className="owner-toggle" onClick={() => setOwnerOpen((o) => !o)} title="Owner panel">
        {ownerUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
      </button>

      {ownerOpen && (
        <div className="owner-panel">
          {!ownerUnlocked ? (
            <>
              <h4>Owner Access</h4>
              <input
                className="id-input"
                style={{ width: "100%", boxSizing: "border-box", marginBottom: 8 }}
                type="password"
                placeholder="Passcode"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && unlockOwner()}
              />
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={unlockOwner}>
                Unlock
              </button>
              {error && <div className="error-text">{error}</div>}
            </>
          ) : (
            <>
              <h4>Manage Dishes</h4>
              <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
                {Object.keys(DEFAULT_ITEMS).map((slot) => (
                  <div key={slot}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#8c3b3b", marginTop: 8 }}>{slot.toUpperCase()}</div>
                    {items.filter((i) => i.slot === slot).map((item) => (
                      <div className="owner-item-row" key={item.id}>
                        <span>{item.name}</span>
                        <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8c3b3b" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {voteEntries.some((v) => v.generalSuggestion) && (
                <>
                  <h4 style={{ marginTop: 4 }}>Suggestions</h4>
                  <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 10 }}>
                    {voteEntries
                      .filter((v) => v.generalSuggestion)
                      .map((v) => (
                        <div
                          key={v.voterId}
                          style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid #e2d5b0" }}
                        >
                          <b>{v.name} (Room {v.room})</b>: {v.generalSuggestion}
                        </div>
                      ))}
                  </div>
                </>
              )}
              <button className="btn btn-danger" style={{ width: "100%", justifyContent: "center" }} onClick={resetAllVotes} disabled={resetting}>
                <RefreshCw size={14} /> {resetting ? "Resetting…" : "Reset all votes"}
              </button>
              <button className="link-btn" style={{ marginTop: 10, display: "block" }} onClick={() => setOwnerOpen(false)}>
                close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HostelMenuBoard />);
