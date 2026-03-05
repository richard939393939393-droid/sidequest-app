import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ALL_CHALLENGES } from "../data/data";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

const DIFF_COLOR = {
  Easy:   { bg: "#e8f8e8", text: "#27ae60" },
  Medium: { bg: "#fff3e0", text: "#f39c12" },
  Hard:   { bg: "#fde8e8", text: "#e74c3c" },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HistoryScreen({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [viewMonthIdx, setViewMonthIdx] = useState(0);
  const [monthsReady, setMonthsReady] = useState(false);

  const today = new Date();

  // ── Load quest history ──
  useEffect(() => {
    if (user?.id) loadHistory();
  }, [user?.id]);

  async function loadHistory() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quest_history")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (!error && data) setHistory(data);
    setLoading(false);
  }

  // ── Build months array from account creation → now ──
  const accountCreated = user?.created_at ? new Date(user.created_at) : today;
  const startMonth = new Date(accountCreated.getFullYear(), accountCreated.getMonth(), 1);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const months = [];
  let cursor = new Date(startMonth);
  while (cursor <= currentMonthStart) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Set to latest month once on mount
  useEffect(() => {
    if (months.length > 0 && !monthsReady) {
      setViewMonthIdx(months.length - 1);
      setMonthsReady(true);
    }
  }, [months.length]);

  const viewMonth = months[viewMonthIdx] || months[months.length - 1];

  // ── Calendar grid ──
  function buildCalendarDays(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }

  const calDays = viewMonth ? buildCalendarDays(viewMonth) : [];

  function entryForDay(date) {
    if (!date) return null;
    return history.find((h) => isSameDay(new Date(h.date), date)) || null;
  }

  function handleDayClick(date) {
    if (!date || date > today) return;
    const entry = entryForDay(date);
    if (entry) setSelectedEntry(entry);
  }

  // ── Enrich entry with quest data ──
  function enrichEntry(entry) {
    if (!entry) return null;
    // Special case: first quest (profile photo)
    if (entry.quest_id === "first_quest_profile_photo") {
      return {
        ...entry,
        quest: {
          title: "Profile Photo",
          category: "First Quest",
          categoryIcon: "📸",
          location: "Anywhere",
          difficulty: "Easy",
          xp: entry.xp || 10,
          coins: entry.coins || 100,
        },
      };
    }
    const quest = ALL_CHALLENGES.find((c) => String(c.id) === String(entry.quest_id)) || null;
    return { ...entry, quest };
  }

  // ── Stats ──
  const completedCount = history.filter((h) => h.completed).length;
  const totalXp    = history.reduce((s, h) => s + (h.completed ? (h.xp || 0) : 0), 0);
  const totalCoins = history.reduce((s, h) => s + (h.completed ? (h.coins || 0) : 0), 0);

  const isToday  = (date) => date && isSameDay(date, today);
  const isFuture = (date) => date && date > today;

  const enriched = enrichEntry(selectedEntry);

  if (loading) {
    return (
      <div className="screen" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
          <p style={{ fontSize: 14, color: "#aaa", fontWeight: 700 }}>Loading your history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen history-screen" style={{ paddingBottom: 24 }}>
      <style>{`
        .hs-header { margin-bottom: 18px; }
        .hs-title  { font-size: 26px; font-weight: 900; color: #2d3a4a; }
        .hs-sub    { font-size: 13px; color: #aaa; font-weight: 600; }

        .hs-stats { display: flex; align-items: center; background: #f8f9fa; border-radius: 20px; padding: 12px 10px; margin-bottom: 20px; justify-content: space-around; }
        .hs-stat     { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .hs-stat-num { font-size: 19px; font-weight: 900; }
        .hs-stat-lbl { font-size: 10px; color: #aaa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
        .hs-stat-div { width: 1px; height: 28px; background: #e8e8e8; }
        .c-green  { color: #27ae60; }
        .c-yellow { color: #f39c12; }
        .c-gold   { color: #b8860b; }

        .hs-month-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .hs-month-label { font-size: 16px; font-weight: 900; color: #2d3a4a; }
        .hs-nav-btn { width: 32px; height: 32px; border-radius: 50%; border: none; background: #f0f0f0; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; color: #555; transition: all .15s; }
        .hs-nav-btn:hover    { background: #e0e0e0; }
        .hs-nav-btn:disabled { opacity: 0.3; cursor: default; }

        .hs-cal { background: #fff; border-radius: 20px; padding: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1.5px solid #f0f4f8; margin-bottom: 18px; }
        .hs-cal-head { display: grid; grid-template-columns: repeat(7,1fr); margin-bottom: 6px; }
        .hs-cal-dow  { text-align: center; font-size: 10px; font-weight: 800; color: #bbb; text-transform: uppercase; padding: 4px 0; }
        .hs-cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 3px; }

        .hs-day { aspect-ratio: 1; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: default; position: relative; transition: transform .12s; }
        .hs-day-num { font-size: 12px; font-weight: 700; color: #2d3a4a; line-height: 1; }
        .hs-day-dot { width: 5px; height: 5px; border-radius: 50%; margin-top: 2px; }
        .hs-day.has-entry        { cursor: pointer; }
        .hs-day.has-entry:hover  { transform: scale(1.08); }
        .hs-day.completed        { background: #f0fbe0; }
        .hs-day.completed .hs-day-num { color: #3a9900; }
        .hs-day.completed .hs-day-dot { background: #58cc02; }
        .hs-day.missed           { background: #fdf0f0; }
        .hs-day.missed .hs-day-num { color: #c0392b; }
        .hs-day.missed .hs-day-dot { background: #e74c3c; }
        .hs-day.is-today         { box-shadow: 0 0 0 2px #58cc02; }
        .hs-day.is-selected      { box-shadow: 0 0 0 2.5px #2d3a4a; transform: scale(1.08); }
        .hs-day.future .hs-day-num { color: #ddd; }
        .hs-day.empty            { background: transparent; }

        .hs-detail { background: #fff; border-radius: 20px; padding: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid #f0f4f8; animation: slideUp .22s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .hs-detail-top  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .hs-detail-cat  { display: flex; align-items: center; gap: 6px; background: #f0fbe0; border-radius: 20px; padding: 4px 12px; }
        .hs-detail-cat-icon { font-size: 15px; }
        .hs-detail-cat-name { font-size: 12px; font-weight: 700; color: #58cc02; }
        .hs-detail-close { width: 28px; height: 28px; border-radius: 50%; border: none; background: #f0f0f0; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; color: #888; }
        .hs-detail-close:hover { background: #e0e0e0; }
        .hs-detail-title { font-size: 18px; font-weight: 900; color: #2d3a4a; margin-bottom: 6px; line-height: 1.25; }
        .hs-detail-meta  { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
        .hs-detail-date  { font-size: 11px; color: #aaa; font-weight: 700; }
        .hs-detail-loc   { font-size: 11px; color: #e74c3c; font-weight: 600; }
        .hs-detail-diff  { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; }

        .hs-photo-wrap { border-radius: 16px; overflow: hidden; margin-bottom: 14px; }
        .hs-photo-img  { width: 100%; height: 200px; object-fit: cover; object-position: center top; display: block; }
        .hs-photo-none { height: 110px; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; margin-bottom: 14px; }
        .hs-photo-none-icon { font-size: 32px; opacity: 0.4; }
        .hs-photo-none-text { font-size: 12px; color: rgba(255,255,255,0.3); font-weight: 700; }
        .hs-photo-missed { height: 90px; background: #f8f9fa; border: 2px dashed #e0e0e0; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; margin-bottom: 14px; }
        .hs-photo-missed-icon { font-size: 24px; opacity: 0.3; }
        .hs-photo-missed-text { font-size: 12px; color: #ccc; font-weight: 700; }

        .hs-rewards { display: flex; gap: 8px; }
        .hs-reward-chip { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; background: #f8f9fa; border-radius: 12px; padding: 8px; border: 1.5px solid #f0f0f0; }
        .hs-reward-chip.earned { border-color: #e8f8e8; background: #f0fbe0; }
        .hs-reward-chip.missed { border-color: #fde8e8; background: #fdf5f5; }
        .hs-reward-val        { font-size: 13px; font-weight: 900; }
        .hs-reward-val.xp     { color: #f39c12; }
        .hs-reward-val.coins  { color: #b8860b; }
        .hs-reward-val.miss   { color: #e74c3c; }

        .hs-empty { background: #f8f9fa; border-radius: 16px; padding: 24px; text-align: center; border: 1.5px dashed #e0e0e0; }
        .hs-empty-icon { font-size: 28px; margin-bottom: 6px; opacity: 0.4; }
        .hs-empty-text { font-size: 13px; color: #bbb; font-weight: 700; }
      `}</style>

      {/* Header */}
      <div className="hs-header">
        <h1 className="hs-title">History</h1>
        <p className="hs-sub">Your adventure log</p>
      </div>

      {/* Stats */}
      <div className="hs-stats">
        <div className="hs-stat">
          <span className="hs-stat-num c-green">{completedCount}</span>
          <span className="hs-stat-lbl">Done</span>
        </div>
        <div className="hs-stat-div" />
        <div className="hs-stat">
          <span className="hs-stat-num c-yellow">⚡{totalXp}</span>
          <span className="hs-stat-lbl">XP</span>
        </div>
        <div className="hs-stat-div" />
        <div className="hs-stat">
          <span className="hs-stat-num c-gold">🪙{totalCoins}</span>
          <span className="hs-stat-lbl">Coins</span>
        </div>
      </div>

      {/* Month nav + calendar */}
      {viewMonth && (
        <>
          <div className="hs-month-nav">
            <button
              className="hs-nav-btn"
              disabled={viewMonthIdx === 0}
              onClick={() => { setViewMonthIdx((i) => i - 1); setSelectedEntry(null); }}
            >‹</button>
            <span className="hs-month-label">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              className="hs-nav-btn"
              disabled={viewMonthIdx === months.length - 1}
              onClick={() => { setViewMonthIdx((i) => i + 1); setSelectedEntry(null); }}
            >›</button>
          </div>

          <div className="hs-cal">
            <div className="hs-cal-head">
              {DAYS.map((d) => <div key={d} className="hs-cal-dow">{d}</div>)}
            </div>
            <div className="hs-cal-grid">
              {calDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="hs-day empty" />;
                const entry = entryForDay(date);
                const future = isFuture(date);
                const todayDay = isToday(date);
                const selected = selectedEntry && entry && selectedEntry.id === entry.id;

                let cls = "hs-day";
                if (entry?.completed) cls += " completed";
                else if (entry && !entry.completed) cls += " missed";
                if (future) cls += " future";
                if (todayDay) cls += " is-today";
                if (selected) cls += " is-selected";
                if (entry) cls += " has-entry";

                return (
                  <div
                    key={date.toISOString()}
                    className={cls}
                    onClick={() => !future && handleDayClick(date)}
                  >
                    <span className="hs-day-num">{date.getDate()}</span>
                    {entry && <span className="hs-day-dot" />}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Quest detail */}
      {enriched ? (
        <div className="hs-detail">
          <div className="hs-detail-top">
            <div className="hs-detail-cat">
              {enriched.quest ? (
                <>
                  <span className="hs-detail-cat-icon">{enriched.quest.categoryIcon}</span>
                  <span className="hs-detail-cat-name">{enriched.quest.category}</span>
                </>
              ) : (
                <span className="hs-detail-cat-name">Quest</span>
              )}
            </div>
            <button className="hs-detail-close" onClick={() => setSelectedEntry(null)}>✕</button>
          </div>

          <h2 className="hs-detail-title">
            {enriched.quest?.title || `Quest #${enriched.quest_id}`}
          </h2>

          <div className="hs-detail-meta">
            <span className="hs-detail-date">
              📅 {new Date(enriched.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            {enriched.quest?.location && (
              <span className="hs-detail-loc">📍 {enriched.quest.location}</span>
            )}
            {enriched.quest?.difficulty && (
              <span
                className="hs-detail-diff"
                style={DIFF_COLOR[enriched.quest.difficulty] ? {
                  background: DIFF_COLOR[enriched.quest.difficulty].bg,
                  color: DIFF_COLOR[enriched.quest.difficulty].text,
                } : {}}
              >
                {enriched.quest.difficulty}
              </span>
            )}
          </div>

          {/* Photo */}
          {enriched.completed ? (
            enriched.photo_url ? (
              <div className="hs-photo-wrap">
                <img src={enriched.photo_url} alt="quest photo" className="hs-photo-img" />
              </div>
            ) : (
              <div className="hs-photo-none">
                <span className="hs-photo-none-icon">{enriched.quest?.categoryIcon || "📷"}</span>
                <span className="hs-photo-none-text">No photo taken</span>
              </div>
            )
          ) : (
            <div className="hs-photo-missed">
              <span className="hs-photo-missed-icon">📷</span>
              <span className="hs-photo-missed-text">Quest not completed</span>
            </div>
          )}

          {/* Rewards */}
          <div className="hs-rewards">
            <div className={"hs-reward-chip " + (enriched.completed ? "earned" : "missed")}>
              <span>⚡</span>
              <span className={"hs-reward-val " + (enriched.completed ? "xp" : "miss")}>
                {enriched.completed ? `+${enriched.xp || 0} XP` : "0 XP"}
              </span>
            </div>
            <div className={"hs-reward-chip " + (enriched.completed ? "earned" : "missed")}>
              <span>🪙</span>
              <span className={"hs-reward-val " + (enriched.completed ? "coins" : "miss")}>
                {enriched.completed ? `+${enriched.coins || 0}` : "Missed"}
              </span>
            </div>
            <div
              className="hs-reward-chip"
              style={{ background: enriched.completed ? "#f0fbe0" : "#fdf5f5", borderColor: enriched.completed ? "#c8f0a0" : "#fde0e0" }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: enriched.completed ? "#27ae60" : "#e74c3c" }}>
                {enriched.completed ? "✅ Done" : "✗ Missed"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="hs-empty">
          <div className="hs-empty-icon">📅</div>
          <p className="hs-empty-text">Tap a highlighted day to see your quest</p>
        </div>
      )}
    </div>
  );
}