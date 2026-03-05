import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setEmail("");
    setPassword("");
    setUsername("");
    setError("");
  }

  function switchMode(m) {
    setMode(m);
    resetForm();
  }

  async function handleSubmit() {
    setError("");

    // Basic validation
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    if (mode === "signup") {
      const u = username.trim();
      if (!u) {
        setError("Please choose a username");
        return;
      }
      if (u.length < 3) {
        setError("Username must be at least 3 characters");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(u)) {
        setError("Username: only letters, numbers & underscores");
        return;
      }
    }

    setLoading(true);

    if (mode === "login") {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: email.trim(),
          password,
        }
      );
      setLoading(false);
      if (authError) {
        setError(authError.message);
        return;
      }
      onLogin(data.user);
    } else {
      // Sign up
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (authError) {
        setError(authError.message);
        return;
      }

      // Save username — upsert handles race with the DB trigger
      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            { id: data.user.id, username: username.trim() },
            { onConflict: "id" }
          );

        if (profileError) {
          if (profileError.code === "23505") {
            setError("That username is already taken, pick another");
          } else {
            setError(
              "Account created but couldn't save username — log in and set it in Profile"
            );
          }
          return;
        }
        // Small delay so the upsert finishes before we load the profile
        await new Promise((resolve) => setTimeout(resolve, 500));
        onLogin(data.user);
      }
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(160deg, #f0fbe0 0%, #e8f8ff 50%, #fff8f0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* ── Logo ── */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #58cc02, #89e219)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              margin: "0 auto 14px",
              boxShadow: "0 8px 28px rgba(88,204,2,0.35)",
            }}
          >
            🗺️
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: "#2d3a4a",
              marginBottom: 4,
              letterSpacing: "-0.5px",
            }}
          >
            SideQuest
          </h1>
          <p style={{ fontSize: 14, color: "#aaa", fontWeight: 600 }}>
            {mode === "login"
              ? "Welcome back, explorer!"
              : "Start your adventure"}
          </p>
        </div>

        {/* ── Card ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 28,
            padding: "28px 24px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
            border: "1.5px solid #f0f4f8",
          }}
        >
          {/* Mode toggle */}
          <div
            style={{
              display: "flex",
              background: "#f4f4f4",
              borderRadius: 16,
              padding: 4,
              marginBottom: 24,
              gap: 4,
            }}
          >
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 12,
                  border: "none",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#2d3a4a" : "#aaa",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.10)" : "none",
                  transition: "all .18s ease",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Username — only on signup */}
            {mode === "signup" && (
              <Field
                icon="👤"
                placeholder="username  (e.g. alex_zürich)"
                value={username}
                onChange={setUsername}
                maxLength={24}
              />
            )}

            <Field
              icon="✉️"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              type="email"
            />

            <Field
              icon="🔒"
              placeholder="Password"
              value={password}
              onChange={setPassword}
              type="password"
              onEnter={handleSubmit}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                background: "#fdf0f0",
                border: "1.5px solid #f5c6c6",
                borderRadius: 12,
                fontSize: 12,
                color: "#c0392b",
                fontWeight: 700,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 22,
              padding: "15px 0",
              borderRadius: 20,
              border: "none",
              background: loading
                ? "#ccc"
                : "linear-gradient(135deg, #58cc02, #89e219)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 5px 18px rgba(88,204,2,0.40)",
              transition: "all .15s ease",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {loading
              ? "..."
              : mode === "login"
              ? "Log In →"
              : "Create Account →"}
          </button>

          {/* Hint */}
          <p
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "#ccc",
              fontWeight: 600,
              marginTop: 14,
            }}
          >
            {mode === "login"
              ? "No account yet? "
              : "Already have an account? "}
            <span
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              style={{ color: "#58cc02", cursor: "pointer", fontWeight: 800 }}
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </span>
          </p>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#ccc",
            fontWeight: 600,
            marginTop: 20,
          }}
        >
          Your adventures, saved to the cloud ☁️
        </p>
      </div>
    </div>
  );
}

// ── Reusable input field ──────────────────────────────────────────────────────
function Field({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  maxLength,
  onEnter,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#f8f9fa",
        borderRadius: 14,
        padding: "12px 14px",
        border: "1.5px solid #f0f0f0",
        transition: "border-color .15s",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "#58cc02")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "#f0f0f0")}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          fontSize: 14,
          fontWeight: 600,
          color: "#2d3a4a",
          outline: "none",
          fontFamily: "'Nunito', sans-serif",
        }}
      />
    </div>
  );
}
