import { useState } from "react";
import { supabase } from "../supabaseClient";
import {
  QUEST_CATEGORIES,
  DIFFICULTY_OPTIONS,
  STYLE_OPTIONS,
} from "../data/data";

const STEPS = [
  { id: "welcome", title: null },
  { id: "style", title: "How do you like to adventure?" },
  { id: "categories", title: "What kind of quests excite you?" },
  { id: "difficulty", title: "How challenging do you want it?" },
  { id: "done", title: null },
];

export default function OnboardingScreen({ user, profile, onComplete }) {
  const [step, setStep] = useState(0);
  const [questStyle, setQuestStyle] = useState("solo");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState([]);
  const [saving, setSaving] = useState(false);

  const displayName =
    profile?.username || user?.email?.split("@")[0] || "Explorer";
  const isLast = step === STEPS.length - 1;

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
    if (STEPS[step].id === "categories") return selectedCategories.length > 0;
    if (STEPS[step].id === "difficulty") return selectedDifficulty.length > 0;
    return true;
  }

  async function handleNext() {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    // Save preferences to Supabase
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        quest_style: questStyle,
        quest_categories: selectedCategories,
        quest_difficulty: selectedDifficulty,
        onboarded: true,
        first_quest_done: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    onComplete();
  }

  const DIFF_COLORS = {
    easy: { border: "#27ae60", bg: "#e8f8e8", text: "#27ae60" },
    medium: { border: "#f39c12", bg: "#fff8ec", text: "#f39c12" },
    hard: { border: "#e74c3c", bg: "#fdf0f0", text: "#e74c3c" },
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        fontFamily: "'Nunito', sans-serif",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: "28px 28px 0 0",
          padding: "28px 24px 36px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          animation: "slideUp .35s cubic-bezier(0.34,1.56,0.64,1)",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .ob-step { animation: fadeIn .25s ease; }
        `}</style>

        {/* Progress dots */}
        {step > 0 && step < STEPS.length - 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginBottom: 24,
            }}
          >
            {STEPS.slice(1, -1).map((s, i) => (
              <div
                key={s.id}
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: step - 1 === i ? 22 : 6,
                  background: step - 1 >= i ? "#58cc02" : "#e0e0e0",
                  transition: "all .3s ease",
                }}
              />
            ))}
          </div>
        )}

        {/* ── Step: Welcome ── */}
        {STEPS[step].id === "welcome" && (
          <div
            className="ob-step"
            style={{ textAlign: "center", padding: "12px 0 8px" }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #58cc02, #89e219)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
                margin: "0 auto 20px",
                boxShadow: "0 8px 28px rgba(88,204,2,0.35)",
              }}
            >
              🗺️
            </div>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: "#2d3a4a",
                marginBottom: 8,
              }}
            >
              Welcome, {displayName}!
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "#888",
                fontWeight: 600,
                lineHeight: 1.6,
                marginBottom: 6,
              }}
            >
              Let's set up your quest profile so we can send you adventures
              you'll actually love.
            </p>
            <p style={{ fontSize: 12, color: "#bbb", fontWeight: 600 }}>
              Takes about 30 seconds ✨
            </p>
          </div>
        )}

        {/* ── Step: Quest Style ── */}
        {STEPS[step].id === "style" && (
          <div className="ob-step">
            <h2
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#2d3a4a",
                marginBottom: 6,
              }}
            >
              {STEPS[step].title}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "#aaa",
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              Pick one — you can always change it later
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                    <span style={{ fontSize: 30 }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: 15,
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
                        width: 22,
                        height: 22,
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
                            width: 8,
                            height: 8,
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
          </div>
        )}

        {/* ── Step: Categories ── */}
        {STEPS[step].id === "categories" && (
          <div className="ob-step">
            <h2
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#2d3a4a",
                marginBottom: 6,
              }}
            >
              {STEPS[step].title}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "#aaa",
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              Pick as many as you like
            </p>
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
                      userSelect: "none",
                      fontSize: 13,
                      fontWeight: 700,
                      color: on ? "#3a9900" : "#777",
                      transform: on ? "translateY(-1px)" : "none",
                      boxShadow: on ? "0 3px 10px rgba(88,204,2,.15)" : "none",
                      transition: "all .15s ease",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {on && <span style={{ fontSize: 12 }}>✓</span>}
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

        {/* ── Step: Difficulty ── */}
        {STEPS[step].id === "difficulty" && (
          <div className="ob-step">
            <h2
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#2d3a4a",
                marginBottom: 6,
              }}
            >
              {STEPS[step].title}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "#aaa",
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              You can pick more than one
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                    <span style={{ fontSize: 30 }}>{d.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: 15,
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
                        width: 22,
                        height: 22,
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
                          style={{
                            fontSize: 13,
                            color: "#fff",
                            fontWeight: 900,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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

        {/* ── Step: Done ── */}
        {STEPS[step].id === "done" && (
          <div
            className="ob-step"
            style={{ textAlign: "center", padding: "12px 0 8px" }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f0fbe0, #d4f5a0)",
                border: "3px solid #58cc02",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
                margin: "0 auto 20px",
                boxShadow: "0 8px 28px rgba(88,204,2,0.2)",
              }}
            >
              ✅
            </div>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: "#2d3a4a",
                marginBottom: 10,
              }}
            >
              You're all set!
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "#888",
                fontWeight: 600,
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              Your first quest is waiting. Go explore Zürich!
            </p>
          </div>
        )}

        {/* ── Navigation ── */}
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          {step > 0 && step < STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{
                width: 44,
                height: 50,
                borderRadius: 16,
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
            onClick={handleNext}
            disabled={!canProceed() || saving}
            style={{
              flex: 1,
              padding: "15px 0",
              borderRadius: 18,
              border: "none",
              background:
                !canProceed() || saving
                  ? "#e0e0e0"
                  : "linear-gradient(135deg, #58cc02, #89e219)",
              color: !canProceed() || saving ? "#aaa" : "#fff",
              fontSize: 16,
              fontWeight: 900,
              cursor: !canProceed() || saving ? "not-allowed" : "pointer",
              boxShadow: canProceed()
                ? "0 5px 18px rgba(88,204,2,0.35)"
                : "none",
              transition: "all .2s ease",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {saving
              ? "Saving..."
              : STEPS[step].id === "welcome"
              ? "Let's Go! 🚀"
              : isLast
              ? "Start Exploring! 🗺️"
              : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
