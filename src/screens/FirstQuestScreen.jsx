import { useState, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function FirstQuestScreen({ user, profile, onComplete }) {
  const [phase, setPhase] = useState("intro"); // intro | camera | preview | saving | done
  const [photoData, setPhotoData] = useState(null); // base64 data URL
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const displayName = profile?.username || "Explorer";

  // Open native camera (capture="user" = front camera)
  function handleOpenCamera() {
    fileInputRef.current.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoData(ev.target.result);
      setPhase("preview");
    };
    reader.readAsDataURL(file);
  }

  function handleRetake() {
    setPhotoData(null);
    setPhase("camera");
    // Re-trigger camera
    setTimeout(() => fileInputRef.current.click(), 100);
  }

  async function handleConfirm() {
    setPhase("saving");
    setError("");

    try {
      // Upload photo to Supabase Storage
      let photoUrl = null;
      if (photoData) {
        // Convert base64 to blob
        const res = await fetch(photoData);
        const blob = await res.blob();
        const ext = blob.type.includes("png") ? "png" : "jpg";
        const path = `avatars/${user.id}/profile.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("quest-photos")
          .upload(path, blob, { upsert: true, contentType: blob.type });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("quest-photos")
            .getPublicUrl(path);
          photoUrl = urlData?.publicUrl || null;
        }
      }

      // Update profile: xp +10, coins +100, streak = 1, avatar = photoUrl
      const updates = {
        xp: (profile?.xp || 0) + 10,
        coins: (profile?.coins || 0) + 100,
        streak: 1,
        first_quest_done: true,
        updated_at: new Date().toISOString(),
      };
      if (photoUrl) updates.avatar_url = photoUrl;

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Save to quest_history
      await supabase.from("quest_history").insert({
        user_id: user.id,
        quest_id: "first_quest_profile_photo",
        completed: true,
        date: new Date().toISOString(),
        photo_url: photoUrl,
        xp: 10,
        coins: 100,
      });

      setPhase("done");
    } catch (err) {
      console.error(err);
      setError("Something went wrong saving your quest. Try again.");
      setPhase("preview");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(160deg, #1a2a1a 0%, #0d1f0d 50%, #162416 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        fontFamily: "'Nunito', sans-serif",
        color: "#fff",
      }}
    >
      {/* Hidden file input — capture="user" forces front camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* ── Intro phase ── */}
      {phase === "intro" && (
        <div
          style={{
            textAlign: "center",
            maxWidth: 340,
            animation: "fadeIn .4s ease",
          }}
        >
          <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>

          {/* Quest badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(88,204,2,0.15)",
              border: "1.5px solid rgba(88,204,2,0.4)",
              borderRadius: 20,
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 800,
              color: "#89e219",
              marginBottom: 28,
              letterSpacing: "0.5px",
            }}
          >
            🎯 FIRST QUEST
          </div>

          <div
            style={{
              fontSize: 72,
              marginBottom: 20,
              filter: "drop-shadow(0 0 24px rgba(88,204,2,0.4))",
            }}
          >
            📸
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              marginBottom: 12,
              lineHeight: 1.2,
            }}
          >
            Say hello, {displayName}!
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
              lineHeight: 1.7,
              marginBottom: 32,
            }}
          >
            Your first quest is simple — take a selfie to set your profile
            picture. Show us who's going on adventures! 🌍
          </p>

          {/* Rewards */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginBottom: 36,
            }}
          >
            {[
              ["⚡", "10 XP"],
              ["🪙", "100 Coins"],
              ["🔥", "Streak: 1"],
            ].map(([icon, label]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(255,255,255,0.08)",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: "7px 12px",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setPhase("camera");
              setTimeout(() => fileInputRef.current.click(), 100);
            }}
            style={{
              width: "100%",
              padding: "16px 0",
              borderRadius: 20,
              border: "none",
              background: "linear-gradient(135deg, #58cc02, #89e219)",
              color: "#fff",
              fontSize: 17,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 6px 24px rgba(88,204,2,0.45)",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            📷 Open Camera
          </button>

          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              fontWeight: 600,
              marginTop: 14,
            }}
          >
            Uses your front camera · stays on your device
          </p>
        </div>
      )}

      {/* ── Camera phase (waiting for photo) ── */}
      {phase === "camera" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 60,
              marginBottom: 20,
              animation: "pulse 1.5s infinite",
            }}
          >
            📷
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.95)} }`}</style>
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Waiting for camera...
          </p>
          <button
            onClick={handleOpenCamera}
            style={{
              marginTop: 20,
              padding: "10px 24px",
              borderRadius: 14,
              border: "1.5px solid rgba(255,255,255,0.3)",
              background: "transparent",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            Tap here if camera didn't open
          </button>
        </div>
      )}

      {/* ── Preview phase ── */}
      {phase === "preview" && photoData && (
        <div
          style={{
            textAlign: "center",
            width: "100%",
            maxWidth: 340,
            animation: "fadeIn .3s ease",
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              fontWeight: 700,
              marginBottom: 14,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Looking good! 🔥
          </p>

          {/* Photo preview */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: "50%",
              overflow: "hidden",
              margin: "0 auto 24px",
              border: "4px solid #58cc02",
              boxShadow: "0 0 0 8px rgba(88,204,2,0.15)",
            }}
          >
            <img
              src={photoData}
              alt="profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
            Use this photo?
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.55)",
              fontWeight: 600,
              marginBottom: 28,
            }}
          >
            This becomes your SideQuest profile picture
          </p>

          {error && (
            <p
              style={{
                fontSize: 12,
                color: "#ff6b6b",
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleConfirm}
            style={{
              width: "100%",
              padding: "15px 0",
              borderRadius: 20,
              border: "none",
              background: "linear-gradient(135deg, #58cc02, #89e219)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 6px 24px rgba(88,204,2,0.4)",
              marginBottom: 12,
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            ✅ Use this photo
          </button>
          <button
            onClick={handleRetake}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 20,
              border: "1.5px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            🔄 Retake
          </button>
        </div>
      )}

      {/* ── Saving phase ── */}
      {phase === "saving" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 52,
              marginBottom: 16,
              animation: "pulse 1s infinite",
            }}
          >
            ⏳
          </div>
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Saving your quest...
          </p>
        </div>
      )}

      {/* ── Done phase ── */}
      {phase === "done" && (
        <div
          style={{
            textAlign: "center",
            maxWidth: 320,
            animation: "fadeIn .4s ease",
          }}
        >
          <div
            style={{
              fontSize: 72,
              marginBottom: 20,
              animation: "pop .4s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            🎉
          </div>
          <style>{`@keyframes pop { from{transform:scale(0)} to{transform:scale(1)} }`}</style>

          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>
            Quest Complete!
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
              lineHeight: 1.6,
              marginBottom: 28,
            }}
          >
            Your adventure has begun. More quests await you every day!
          </p>

          {/* Rewards earned */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginBottom: 36,
            }}
          >
            {[
              ["⚡", "+10 XP"],
              ["🪙", "+100 Coins"],
              ["🔥", "Streak: 1"],
            ].map(([icon, label]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(88,204,2,0.12)",
                  border: "1.5px solid rgba(88,204,2,0.3)",
                  borderRadius: 14,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#89e219",
                }}
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onComplete}
            style={{
              width: "100%",
              padding: "16px 0",
              borderRadius: 20,
              border: "none",
              background: "linear-gradient(135deg, #58cc02, #89e219)",
              color: "#fff",
              fontSize: 17,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 6px 24px rgba(88,204,2,0.45)",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            Start Exploring! 🗺️
          </button>
        </div>
      )}
    </div>
  );
}
