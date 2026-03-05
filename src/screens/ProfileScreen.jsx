import { useState } from "react";
import {
  QUEST_CATEGORIES,
  DIFFICULTY_OPTIONS,
  STYLE_OPTIONS,
} from "../data/data";
import { supabase } from "../supabaseClient";

const DIFF_COLORS = {
  easy: { border: "#27ae60", bg: "#e8f8e8", text: "#27ae60" },
  medium: { border: "#f39c12", bg: "#fff8ec", text: "#f39c12" },
  hard: { border: "#e74c3c", bg: "#fdf0f0", text: "#e74c3c" },
};

// ── Player ID Badge ───────────────────────────────────────────────────────────
function PlayerIdBadge({ playerId }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!playerId) return;
    navigator.clipboard.writeText(playerId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1a1a2e, #16213e)",
        borderRadius: 18,
        padding: "14px 16px",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}
    >
      <div>
        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 4,
          }}
        >
          🪪 Player ID · permanent
        </p>
        <p
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: "#58cc02",
            letterSpacing: "2px",
            fontFamily: "monospace",
          }}
        >
          {playerId || "—"}
        </p>
        <p
          style={{ fontSize: 11, color: "#555", fontWeight: 600, marginTop: 3 }}
        >
          Share this so friends can find you
        </p>
      </div>
      <button
        onClick={handleCopy}
        disabled={!playerId}
        style={{
          background: copied ? "#27ae60" : "#58cc02",
          border: "none",
          borderRadius: 12,
          padding: "10px 16px",
          color: "#fff",
          fontSize: 12,
          fontWeight: 800,
          cursor: playerId ? "pointer" : "not-allowed",
          transition: "all .2s ease",
          flexShrink: 0,
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        {copied ? "✓ Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ── Preferences bottom sheet ──────────────────────────────────────────────────
function PreferencesSheet({
  user,
  currentStyle,
  currentCategories,
  currentDifficulty,
  onSave,
  onClose,
}) {
  const [step, setStep] = useState(0);
  const [questStyle, setQuestStyle] = useState(currentStyle || "solo");
  const [selectedCategories, setSelectedCategories] = useState(
    currentCategories || []
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState(
    currentDifficulty || []
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const STEPS = ["style", "categories", "difficulty"];
  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const TITLES = {
    style: "How do you like to adventure?",
    categories: "What kind of quests excite you?",
    difficulty: "How challenging do you want it?",
  };

  function toggleCategory(id) {
    setSelectedCategories((p) =>
      p.includes(id) ? p.filter((c) => c !== id) : [...p, id]
    );
  }
  function toggleDifficulty(id) {
    setSelectedDifficulty((p) =>
      p.includes(id) ? p.filter((d) => d !== id) : [...p, id]
    );
  }

  function canProceed() {
    if (currentStep === "categories") return selectedCategories.length > 0;
    if (currentStep === "difficulty") return selectedDifficulty.length > 0;
    return true;
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    const updates = {
      quest_style: questStyle,
      quest_categories: selectedCategories,
      quest_difficulty: selectedDifficulty,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setSaveError("Failed to save. Please try again.");
      return;
    }
    onSave({
      quest_style: questStyle,
      quest_categories: selectedCategories,
      quest_difficulty: selectedDifficulty,
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
        fontFamily: "'Nunito', sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: "28px 28px 0 0",
          padding: "28px 24px 40px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          animation: "sheetUp .3s cubic-bezier(0.34,1.56,0.64,1)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes sheetUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes fadeStep { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .pref-step { animation: fadeStep .2s ease; }
        `}</style>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                color: "#bbb",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Step {step + 1} of {STEPS.length}
            </p>
            <h2
              style={{
                fontSize: 19,
                fontWeight: 900,
                color: "#2d3a4a",
                marginTop: 2,
              }}
            >
              {TITLES[currentStep]}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f0f0f0",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 14,
              color: "#888",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 5,
                borderRadius: 3,
                flex: i === step ? 2 : 1,
                background: i <= step ? "#58cc02" : "#e0e0e0",
                transition: "all .3s ease",
              }}
            />
          ))}
        </div>

        {currentStep === "style" && (
          <div
            className="pref-step"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {STYLE_OPTIONS.map((opt) => {
              const on = questStyle === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setQuestStyle(opt.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 18,
                    border: `2px solid ${on ? "#58cc02" : "#f0f0f0"}`,
                    background: on ? "#f0fbe0" : "#fafafa",
                    cursor: "pointer",
                    transform: on ? "translateY(-1px)" : "none",
                    boxShadow: on ? "0 4px 14px rgba(88,204,2,.15)" : "none",
                    transition: "all .18s ease",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: on ? "#3a9900" : "#2d3a4a",
                        marginBottom: 2,
                      }}
                    >
                      {opt.label}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: on ? "#7bc846" : "#aaa",
                        fontWeight: 600,
                      }}
                    >
                      {opt.desc}
                    </p>
                  </div>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: `2.5px solid ${on ? "#58cc02" : "#ddd"}`,
                      background: on ? "#58cc02" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {on && (
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#fff",
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {currentStep === "categories" && (
          <div className="pref-step">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {QUEST_CATEGORIES.map((cat) => {
                const on = selectedCategories.includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "10px 16px",
                      borderRadius: 22,
                      border: `2px solid ${on ? "#58cc02" : "#f0f0f0"}`,
                      background: on ? "#f0fbe0" : "#fafafa",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700,
                      color: on ? "#3a9900" : "#777",
                      transform: on ? "translateY(-1px)" : "none",
                      boxShadow: on ? "0 3px 10px rgba(88,204,2,.15)" : "none",
                      transition: "all .15s ease",
                      userSelect: "none",
                    }}
                  >
                    <span style={{ fontSize: 17 }}>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {on && <span style={{ fontSize: 11 }}>✓</span>}
                  </div>
                );
              })}
            </div>
            {selectedCategories.length === 0 && (
              <p
                style={{
                  fontSize: 12,
                  color: "#f39c12",
                  fontWeight: 700,
                  marginTop: 14,
                  textAlign: "center",
                }}
              >
                ⚠️ Pick at least one to continue
              </p>
            )}
          </div>
        )}

        {currentStep === "difficulty" && (
          <div
            className="pref-step"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {DIFFICULTY_OPTIONS.map((d) => {
              const on = selectedDifficulty.includes(d.id);
              const col = DIFF_COLORS[d.id];
              return (
                <div
                  key={d.id}
                  onClick={() => toggleDifficulty(d.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 18,
                    border: `2px solid ${on ? col.border : "#f0f0f0"}`,
                    background: on ? col.bg : "#fafafa",
                    cursor: "pointer",
                    transform: on ? "translateY(-1px)" : "none",
                    boxShadow: on ? `0 4px 14px ${col.border}30` : "none",
                    transition: "all .18s ease",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{d.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: on ? col.text : "#2d3a4a",
                        marginBottom: 2,
                      }}
                    >
                      {d.label}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: on ? col.text : "#aaa",
                        fontWeight: 600,
                        opacity: on ? 0.8 : 1,
                      }}
                    >
                      {d.desc}
                    </p>
                  </div>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `2.5px solid ${on ? col.border : "#ddd"}`,
                      background: on ? col.border : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {on && (
                      <span
                        style={{ fontSize: 12, color: "#fff", fontWeight: 900 }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {selectedDifficulty.length === 0 && (
              <p
                style={{
                  fontSize: 12,
                  color: "#f39c12",
                  fontWeight: 700,
                  marginTop: 14,
                  textAlign: "center",
                }}
              >
                ⚠️ Pick at least one to continue
              </p>
            )}
          </div>
        )}

        {saveError && (
          <p
            style={{
              fontSize: 12,
              color: "#e74c3c",
              fontWeight: 700,
              marginTop: 12,
              textAlign: "center",
            }}
          >
            {saveError}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{
                width: 44,
                height: 50,
                borderRadius: 14,
                border: "2px solid #f0f0f0",
                background: "#fff",
                fontSize: 18,
                cursor: "pointer",
                color: "#aaa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              ‹
            </button>
          )}
          <button
            onClick={isLast ? handleSave : () => setStep((s) => s + 1)}
            disabled={!canProceed() || saving}
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 16,
              border: "none",
              background:
                !canProceed() || saving
                  ? "#e0e0e0"
                  : "linear-gradient(135deg, #58cc02, #89e219)",
              color: !canProceed() || saving ? "#aaa" : "#fff",
              fontSize: 15,
              fontWeight: 900,
              cursor: !canProceed() || saving ? "not-allowed" : "pointer",
              boxShadow: canProceed()
                ? "0 4px 16px rgba(88,204,2,.35)"
                : "none",
              transition: "all .2s ease",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {saving ? "Saving..." : isLast ? "Save Changes ✓" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ProfileScreen ────────────────────────────────────────────────────────
export default function ProfileScreen({
  user,
  profile,
  onLogout,
  onProfileUpdate,
}) {
  const [showPrefs, setShowPrefs] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(profile?.username || "");
  const [usernameError, setUsernameError] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  const [questStyle, setQuestStyle] = useState(profile?.quest_style || null);
  const [categories, setCategories] = useState(profile?.quest_categories || []);
  const [difficulties, setDifficulties] = useState(
    profile?.quest_difficulty || []
  );

  const displayName =
    profile?.username || user?.email?.split("@")[0] || "Explorer";
  const avatarUrl = profile?.avatar_url || profile?.avatar || null;
  const avatarEmoji = profile?.avatar || "🧑";
  const xp = profile?.xp || 0;
  const streak = profile?.streak || 0;
  const coins = profile?.coins || 0;
  const playerId = profile?.player_id || null;

  const styleInfo = STYLE_OPTIONS.find((s) => s.id === questStyle);

  function handlePrefsSaved(updates) {
    setQuestStyle(updates.quest_style);
    setCategories(updates.quest_categories);
    setDifficulties(updates.quest_difficulty);
    onProfileUpdate({ ...profile, ...updates });
    setShowPrefs(false);
  }

  async function handleSaveUsername() {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setUsernameError("Username can't be empty");
      return;
    }
    if (trimmed.length < 3) {
      setUsernameError("At least 3 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError("Only letters, numbers & underscores");
      return;
    }

    setSavingUsername(true);
    setUsernameError("");
    const { data, error } = await supabase
      .from("profiles")
      .update({ username: trimmed, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();
    setSavingUsername(false);
    if (error) {
      setUsernameError(
        error.code === "23505"
          ? "Username already taken"
          : "Something went wrong"
      );
    } else {
      onProfileUpdate(data);
      setEditingUsername(false);
    }
  }

  return (
    <div
      className="screen"
      style={{ paddingBottom: 32, fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── Avatar + name ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 22,
          paddingBottom: 20,
          borderBottom: "1.5px solid #f0f4f8",
        }}
      >
        {/* Avatar — large, top-left anchor */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f0fbe0, #d4f5a0)",
              border: "4px solid #58cc02",
              boxShadow: "0 6px 20px rgba(88,204,2,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 46,
              overflow: "hidden",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
                }}
              />
            ) : (
              avatarEmoji
            )}
          </div>
          {/* Streak badge pinned bottom-right of avatar */}
          <div
            style={{
              position: "absolute",
              bottom: -2,
              right: -4,
              background: "linear-gradient(135deg, #ff6b35, #ff9a5c)",
              borderRadius: 20,
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 800,
              color: "#fff",
              border: "2.5px solid #fff",
              boxShadow: "0 2px 6px rgba(255,107,53,0.4)",
            }}
          >
            🔥 {streak}
          </div>
        </div>

        {/* Name + stats */}
        <div style={{ flex: 1, paddingTop: 4 }}>
          {editingUsername ? (
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setUsernameError("");
                  }}
                  placeholder="your_username"
                  maxLength={24}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveUsername();
                    if (e.key === "Escape") setEditingUsername(false);
                  }}
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#2d3a4a",
                    border: "2px solid #58cc02",
                    borderRadius: 10,
                    padding: "5px 10px",
                    outline: "none",
                    background: "#f0fbe0",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                />
                <button
                  onClick={handleSaveUsername}
                  disabled={savingUsername}
                  style={{
                    background: "#58cc02",
                    border: "none",
                    borderRadius: 10,
                    padding: "6px 12px",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {savingUsername ? "..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingUsername(false);
                    setUsernameError("");
                    setUsernameInput(profile?.username || "");
                  }}
                  style={{
                    background: "#f0f0f0",
                    border: "none",
                    borderRadius: 10,
                    padding: "6px 10px",
                    color: "#888",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
              {usernameError && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#e74c3c",
                    fontWeight: 600,
                    marginTop: 3,
                  }}
                >
                  {usernameError}
                </p>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 2,
              }}
            >
              <h1
                style={{
                  fontSize: 21,
                  fontWeight: 900,
                  color: "#2d3a4a",
                  lineHeight: 1.2,
                }}
              >
                {displayName}
              </h1>
              <button
                onClick={() => {
                  setUsernameInput(profile?.username || "");
                  setEditingUsername(true);
                }}
                style={{
                  background: "none",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: 8,
                  padding: "2px 8px",
                  fontSize: 11,
                  color: "#aaa",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ✏️
              </button>
            </div>
          )}
          <p
            style={{
              fontSize: 11,
              color: "#ccc",
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            {user?.email}
          </p>

          {/* Stat pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              ["⚡", `${xp} XP`, "#e8f4ff", "#4a90d9"],
              ["🪙", `${coins}`, "#fff8ec", "#f39c12"],
              ["🔥", `${streak} days`, "#fff0ec", "#ff6b35"],
            ].map(([icon, label, bg, color]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: bg,
                  borderRadius: 10,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                  color,
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Player ID ── */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#2d3a4a",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          marginBottom: 10,
        }}
      >
        Identity
      </p>
      <PlayerIdBadge playerId={playerId} />

      {/* ── Quest Profile ── */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#2d3a4a",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          marginBottom: 12,
          marginTop: 18,
        }}
      >
        Quest Profile
      </p>

      {/* Style */}
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "14px 16px",
          marginBottom: 10,
          border: "1.5px solid #f0f4f8",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#bbb",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            marginBottom: 8,
          }}
        >
          Adventure Style
        </p>
        {styleInfo ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 26 }}>{styleInfo.icon}</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#2d3a4a" }}>
                {styleInfo.label}
              </p>
              <p style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>
                {styleInfo.desc}
              </p>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>
            Not set yet
          </p>
        )}
      </div>

      {/* Categories */}
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "14px 16px",
          marginBottom: 10,
          border: "1.5px solid #f0f4f8",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#bbb",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            marginBottom: 10,
          }}
        >
          Quest Types
        </p>
        {categories.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((id) => {
              const cat = QUEST_CATEGORIES.find((c) => c.id === id);
              return cat ? (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "#f0fbe0",
                    border: "1.5px solid #c8f0a0",
                    borderRadius: 20,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#3a9900",
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </div>
              ) : null;
            })}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>
            Not set yet
          </p>
        )}
      </div>

      {/* Difficulty */}
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "14px 16px",
          marginBottom: 10,
          border: "1.5px solid #f0f4f8",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#bbb",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            marginBottom: 10,
          }}
        >
          Difficulty
        </p>
        {difficulties.length > 0 ? (
          <div style={{ display: "flex", gap: 8 }}>
            {difficulties.map((id) => {
              const d = DIFFICULTY_OPTIONS.find((x) => x.id === id);
              const col = DIFF_COLORS[id];
              return d ? (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: col.bg,
                    border: `1.5px solid ${col.border}`,
                    borderRadius: 20,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: col.text,
                  }}
                >
                  <span>{d.icon}</span>
                  <span>{d.label}</span>
                </div>
              ) : null;
            })}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>
            Not set yet
          </p>
        )}
      </div>

      {/* ── Change Preferences ── */}
      <button
        onClick={() => setShowPrefs(true)}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 18,
          border: "2px solid #58cc02",
          background: "#f0fbe0",
          color: "#3a9900",
          fontSize: 14,
          fontWeight: 800,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 12,
          marginTop: 8,
          transition: "all .15s ease",
        }}
      >
        🎯 Change Preferences
      </button>

      {/* ── Logout ── */}
      <button
        onClick={onLogout}
        style={{
          width: "100%",
          padding: 13,
          borderRadius: 18,
          border: "2px solid #fde8e8",
          background: "#fff5f5",
          color: "#e74c3c",
          fontSize: 14,
          fontWeight: 800,
          cursor: "pointer",
          transition: "all .15s ease",
        }}
      >
        🚪 Log Out
      </button>

      {showPrefs && (
        <PreferencesSheet
          user={user}
          currentStyle={questStyle}
          currentCategories={categories}
          currentDifficulty={difficulties}
          onSave={handlePrefsSaved}
          onClose={() => setShowPrefs(false)}
        />
      )}
    </div>
  );
}
