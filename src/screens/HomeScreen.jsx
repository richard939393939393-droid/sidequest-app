import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ALL_CHALLENGES } from "../data/data";

export default function HomeScreen({
  onEarnCoins,
  onSkipQuest,
  onProfileUpdate,
  currentChallengeIndex,
  profile,
  user,
  coins,
}) {
  const [phase, setPhase] = useState("idle"); // idle | preview | saving | done
  const [photoData, setPhotoData] = useState(null);
  const [friendsPosts, setFriendsPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [heartedPosts, setHeartedPosts] = useState({});
  const fileInputRef = useRef(null);

  // Safe challenge lookup with fallback
  const challenges = ALL_CHALLENGES || [];
  const currentChallenge = challenges[currentChallengeIndex] ||
    challenges[0] || {
      id: "fallback",
      title: "Explore Zürich",
      description: "Head outside and discover something new!",
      category: "Adventure",
      categoryIcon: "🗺️",
      location: "Zürich",
      xp: 10,
      coins: 50,
      difficulty: "Easy",
    };

  const displayName = profile?.username || "Explorer";
  const streak = profile?.streak || 0;
  const completed = phase === "done";

  useEffect(() => {
    if (user?.id) loadFriendsFeed();
  }, [user?.id]);

  // ── Camera ────────────────────────────────────────────────────────────────
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
    setPhase("idle");
    setTimeout(() => fileInputRef.current?.click(), 100);
  }

  // ── Complete quest ────────────────────────────────────────────────────────
  async function handleConfirm() {
    setPhase("saving");

    // Upload photo
    let photoUrl = null;
    if (photoData) {
      try {
        const res = await fetch(photoData);
        const blob = await res.blob();
        const ext = blob.type.includes("png") ? "png" : "jpg";
        const path = `quests/${user.id}/${
          currentChallenge.id
        }-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("quest-photos")
          .upload(path, blob, { upsert: true, contentType: blob.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("quest-photos")
            .getPublicUrl(path);
          photoUrl = urlData?.publicUrl || null;
        }
      } catch (e) {
        console.error("Photo upload failed:", e);
      }
    }

    // Calculate streak
    const lastCompleted = profile?.last_completed_date
      ? new Date(profile.last_completed_date)
      : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let newStreak = 1;
    if (lastCompleted) {
      const lastDay = new Date(lastCompleted);
      lastDay.setHours(0, 0, 0, 0);
      if (lastDay.getTime() === yesterday.getTime()) {
        newStreak = (profile?.streak || 0) + 1;
      } else if (lastDay.getTime() === today.getTime()) {
        newStreak = profile?.streak || 1;
      }
    }

    // Save to quest_history
    await supabase.from("quest_history").insert({
      user_id: user.id,
      quest_id: String(currentChallenge.id),
      completed: true,
      date: new Date().toISOString(),
      photo_url: photoUrl,
      xp: currentChallenge.xp,
      coins: currentChallenge.coins,
    });

    // Update profile
    const newXp = (profile?.xp || 0) + currentChallenge.xp;
    const newCoins = (profile?.coins || 0) + currentChallenge.coins;
    const { data: updated } = await supabase
      .from("profiles")
      .update({
        xp: newXp,
        coins: newCoins,
        streak: newStreak,
        last_completed_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    onEarnCoins(currentChallenge.coins);
    if (updated && onProfileUpdate) onProfileUpdate(updated);
    setPhase("done");
  }

  // ── Friends feed ──────────────────────────────────────────────────────────
  async function loadFriendsFeed() {
    setFeedLoading(true);
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!friendships || friendships.length === 0) {
      setFriendsPosts([]);
      setFeedLoading(false);
      return;
    }

    const friendIds = friendships.map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: histories } = await supabase
      .from("quest_history")
      .select("user_id, quest_id, photo_url, date")
      .in("user_id", friendIds)
      .eq("completed", true)
      .gte("date", todayStart.toISOString())
      .order("date", { ascending: false });

    if (!histories || histories.length === 0) {
      setFriendsPosts([]);
      setFeedLoading(false);
      return;
    }

    const { data: friendProfiles } = await supabase
      .from("profiles")
      .select("id, username, avatar, avatar_url, streak")
      .in("id", friendIds);

    const posts = histories.map((h) => {
      const fp = friendProfiles?.find((p) => p.id === h.user_id) || null;
      const quest =
        challenges.find((c) => String(c.id) === String(h.quest_id)) || null;
      return {
        id: `${h.user_id}-${h.quest_id}-${h.date}`,
        username: fp?.username || "Explorer",
        avatar: fp?.avatar || "🧑",
        avatarUrl: fp?.avatar_url || fp?.avatar || null,
        streak: fp?.streak || 0,
        quest,
        photoUrl: h.photo_url,
        timeAgo: getTimeAgo(new Date(h.date)),
      };
    });

    setFriendsPosts(posts);
    setFeedLoading(false);
  }

  function toggleHeart(postId) {
    setHeartedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }

  return (
    <div className="screen home-screen" style={{ paddingBottom: 24 }}>
      <style>{`
        .home-header { margin-bottom: 18px; }
        .app-title   { font-size: 28px; font-weight: 900; color: #2d3a4a; letter-spacing: -0.5px; margin-bottom: 6px; }
        .home-welcome { font-size: 13px; color: #aaa; font-weight: 700; margin-bottom: 2px; }
        .home-username { color: #58cc02; }
        .home-tagline { font-size: 16px; font-weight: 800; color: #2d3a4a; line-height: 1.2; }
        .home-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .home-streak-badge { display: flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #fff3e0, #ffe0b2); border: 1.5px solid #ffcc80; border-radius: 20px; padding: 4px 12px; font-size: 13px; font-weight: 800; color: #e65100; }

        .challenge-card { background: #fff; border-radius: 24px; padding: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid #f0f4f8; margin-bottom: 16px; }
        .challenge-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .challenge-category { display: flex; align-items: center; gap: 6px; background: #f0fbe0; border-radius: 20px; padding: 4px 12px; }
        .category-icon { font-size: 15px; }
        .category-name { font-size: 12px; font-weight: 700; color: #58cc02; }
        .challenge-meta { display: flex; gap: 8px; align-items: center; }
        .challenge-location { font-size: 11px; color: #e74c3c; font-weight: 600; }
        .challenge-xp { font-size: 11px; color: #f5a623; font-weight: 700; }
        .challenge-title { font-size: 20px; font-weight: 900; color: #2d3a4a; margin-bottom: 6px; line-height: 1.2; }
        .challenge-description { font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 12px; }
        .challenge-rewards { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .reward-item { display: flex; align-items: center; gap: 5px; background: #f8f9ff; border-radius: 12px; padding: 5px 10px; border: 1px solid #e8eaf6; }
        .reward-icon { font-size: 13px; }
        .reward-label { font-size: 11px; font-weight: 700; color: #555; }
        .difficulty-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .difficulty-badge { font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
        .difficulty-easy   { background: #e8f8e8; color: #27ae60; }
        .difficulty-medium { background: #fff3e0; color: #f39c12; }
        .difficulty-hard   { background: #fde8e8; color: #e74c3c; }
        .streak-display { font-size: 13px; font-weight: 700; color: #e67e22; }

        .action-zone { border-radius: 18px; overflow: hidden; border: 2px dashed #e0e0e0; background: #f8f9fa; }
        .action-zone.done { border: 2px solid #c8f0a0; background: #f0fbe0; }

        .action-idle { padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .camera-btn { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #58cc02, #89e219); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(88,204,2,0.45); transition: transform 0.15s; font-size: 26px; }
        .camera-btn:hover  { transform: scale(1.07); }
        .camera-btn:active { transform: scale(0.95); }
        .camera-hint { font-size: 12px; color: #aaa; font-weight: 600; text-align: center; }

        .action-preview { padding: 14px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .preview-img { width: 160px; height: 160px; border-radius: 50%; object-fit: cover; object-position: center top; border: 4px solid #58cc02; box-shadow: 0 0 0 6px rgba(88,204,2,0.15); }
        .preview-confirm-btn { width: 100%; padding: 13px; border-radius: 16px; border: none; background: linear-gradient(135deg, #58cc02, #89e219); color: #fff; font-size: 15px; font-weight: 900; cursor: pointer; font-family: 'Nunito', sans-serif; box-shadow: 0 4px 14px rgba(88,204,2,0.35); }
        .preview-retake-btn  { width: 100%; padding: 11px; border-radius: 16px; border: 1.5px solid rgba(0,0,0,0.1); background: transparent; color: #888; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; }

        .action-saving { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .action-done-wrap { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .action-done-icon  { font-size: 38px; }
        .action-done-title { font-size: 16px; font-weight: 900; color: #27ae60; }
        .action-done-sub   { font-size: 12px; color: #888; font-weight: 600; }

        .skip-btn { display: flex; align-items: center; gap: 7px; background: linear-gradient(135deg, #ffd700, #ffaa00); border: none; border-radius: 20px; padding: 8px 18px; cursor: pointer; font-size: 13px; font-weight: 800; box-shadow: 0 3px 12px rgba(255,170,0,.35); transition: transform .15s; }
        .skip-btn:hover  { transform: scale(1.03); }
        .skip-btn:active { transform: scale(0.97); }
        .skip-btn-disabled { background: #eee; box-shadow: none; cursor: not-allowed; opacity: 0.6; }
        .skip-label { color: #7a4800; font-weight: 800; }
        .skip-btn-disabled .skip-label { color: #999; }
        .skip-cost { background: rgba(0,0,0,0.12); border-radius: 10px; padding: 2px 7px; font-size: 12px; font-weight: 800; color: #7a4800; }

        .friends-feed { margin-top: 4px; }
        .friends-feed-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .friends-feed-title  { font-size: 17px; font-weight: 800; color: #2d3a4a; }
        .friends-active-badge { font-size: 12px; font-weight: 700; color: #58cc02; background: #f0fbe0; padding: 3px 10px; border-radius: 20px; }
        .friend-post { background: #fff; border-radius: 20px; margin-bottom: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); border: 1.5px solid #f0f0f0; overflow: hidden; }
        .friend-post-header { display: flex; align-items: center; gap: 10px; padding: 12px 14px 0; }
        .fp-avatar { width: 38px; height: 38px; border-radius: 50%; background: #fff; border: 2px solid #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.08); overflow: hidden; }
        .fp-meta { flex: 1; }
        .fp-name { font-size: 13px; font-weight: 800; color: #2d3a4a; }
        .fp-sub  { font-size: 11px; color: #aaa; font-weight: 600; }
        .fp-time { font-size: 11px; color: #bbb; font-weight: 600; }
        .fp-photo-wrap { margin: 10px 14px; border-radius: 14px; overflow: hidden; }
        .fp-photo-img  { width: 100%; height: 180px; object-fit: cover; object-position: center top; display: block; }
        .fp-photo-placeholder { height: 100px; background: linear-gradient(135deg, #f0fbe0, #e8f8ff); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border: 1.5px dashed #c8f0a0; border-radius: 14px; }
        .fp-placeholder-icon { font-size: 24px; opacity: 0.4; }
        .fp-placeholder-text { font-size: 11px; color: #bbb; font-weight: 700; }
        .fp-challenge-tag { display: flex; align-items: center; gap: 5px; margin: 0 14px 10px; background: #f8f9fa; border-radius: 10px; padding: 6px 10px; }
        .fp-challenge-tag-icon { font-size: 14px; }
        .fp-challenge-tag-text { font-size: 11px; font-weight: 700; color: #555; }
        .friend-post-actions { display: flex; align-items: center; padding: 0 14px 12px; }
        .heart-btn { display: flex; align-items: center; gap: 5px; border: none; background: none; cursor: pointer; padding: 6px 10px; border-radius: 20px; transition: all .15s; font-size: 13px; font-weight: 700; color: #aaa; }
        .heart-btn:hover { background: #fff0f0; color: #e74c3c; }
        .heart-btn.hearted { color: #e74c3c; background: #fff0f0; }
        .heart-btn.hearted .heart-icon { animation: heartPop .3s ease; }
        @keyframes heartPop { 0%{transform:scale(1)} 50%{transform:scale(1.4)} 100%{transform:scale(1)} }
        .heart-icon  { font-size: 16px; }
        .heart-count { font-size: 12px; font-weight: 800; }
        .feed-empty { background: #f8f9fa; border-radius: 16px; padding: 24px; text-align: center; border: 1.5px dashed #e0e0e0; }
        .feed-empty-icon { font-size: 28px; margin-bottom: 6px; opacity: 0.4; }
        .feed-empty-text { font-size: 13px; color: #bbb; font-weight: 700; }
        .feed-empty-sub  { font-size: 12px; color: #ccc; font-weight: 600; margin-top: 4px; }
      `}</style>

      {/* Hidden file/camera input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="home-header">
        <div className="home-header-top">
          <h1 className="app-title">SideQuest</h1>
          <div className="home-streak-badge">
            🔥{" "}
            <span>
              {streak} day{streak !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <p className="home-welcome">
          Welcome back, <span className="home-username">{displayName}</span> 👋
        </p>
        <p className="home-tagline">Today's Adventure is:</p>
      </div>

      {/* Challenge card */}
      <div className="challenge-card">
        <div className="challenge-card-header">
          <div className="challenge-category">
            <span className="category-icon">
              {currentChallenge.categoryIcon}
            </span>
            <span className="category-name">{currentChallenge.category}</span>
          </div>
          <div className="challenge-meta">
            <span className="challenge-location">
              📍 {currentChallenge.location}
            </span>
            <span className="challenge-xp">⚡ {currentChallenge.xp} XP</span>
          </div>
        </div>

        <h2 className="challenge-title">{currentChallenge.title}</h2>
        <p className="challenge-description">{currentChallenge.description}</p>

        <div className="challenge-rewards">
          <div className="reward-item">
            <span className="reward-icon">⚡</span>
            <span className="reward-label">{currentChallenge.xp} XP</span>
          </div>
          <div className="reward-item">
            <span className="reward-icon">🪙</span>
            <span className="reward-label">{currentChallenge.coins} coins</span>
          </div>
        </div>

        <div className="difficulty-row">
          <span
            className={
              "difficulty-badge difficulty-" +
              (currentChallenge.difficulty || "easy").toLowerCase()
            }
          >
            {currentChallenge.difficulty}
          </span>
          <span className="streak-display">🔥 {streak} day streak</span>
        </div>

        {/* Action zone */}
        <div className={"action-zone" + (completed ? " done" : "")}>
          {phase === "idle" && (
            <div className="action-idle">
              <button className="camera-btn" onClick={handleOpenCamera}>
                📷
              </button>
              <p className="camera-hint">
                Take a photo to complete today's quest
              </p>
              <SkipButton onSkip={onSkipQuest} coins={coins} />
            </div>
          )}

          {phase === "preview" && photoData && (
            <div className="action-preview">
              <p style={{ fontSize: 12, color: "#aaa", fontWeight: 700 }}>
                Looking good! 🔥
              </p>
              <img src={photoData} alt="preview" className="preview-img" />
              <button className="preview-confirm-btn" onClick={handleConfirm}>
                ✅ Complete Quest
              </button>
              <button className="preview-retake-btn" onClick={handleRetake}>
                🔄 Retake
              </button>
            </div>
          )}

          {phase === "saving" && (
            <div className="action-saving">
              <div style={{ fontSize: 36 }}>⏳</div>
              <p style={{ fontSize: 14, color: "#aaa", fontWeight: 700 }}>
                Saving your quest...
              </p>
            </div>
          )}

          {phase === "done" && (
            <div className="action-done-wrap">
              <span className="action-done-icon">✅</span>
              <p className="action-done-title">Quest Complete!</p>
              <p className="action-done-sub">
                +{currentChallenge.xp} XP · +{currentChallenge.coins} coins
                earned
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Friends feed */}
      <div className="friends-feed">
        <div className="friends-feed-header">
          <h3 className="friends-feed-title">Friends' Quests</h3>
          {!feedLoading && (
            <span className="friends-active-badge">
              {friendsPosts.length} done today
            </span>
          )}
        </div>

        {feedLoading ? (
          <div className="feed-empty">
            <div className="feed-empty-icon">⏳</div>
            <p className="feed-empty-text">Loading...</p>
          </div>
        ) : friendsPosts.length === 0 ? (
          <div className="feed-empty">
            <div className="feed-empty-icon">👥</div>
            <p className="feed-empty-text">No quests from friends today</p>
            <p className="feed-empty-sub">Add friends in the Friends tab!</p>
          </div>
        ) : (
          friendsPosts.map((post) => {
            const isHearted = !!heartedPosts[post.id];
            const avatarIsUrl = post.avatarUrl?.startsWith?.("http");
            return (
              <div key={post.id} className="friend-post">
                <div className="friend-post-header">
                  <div className="fp-avatar">
                    {avatarIsUrl ? (
                      <img
                        src={post.avatarUrl}
                        alt="avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center top",
                        }}
                      />
                    ) : (
                      post.avatar || "🧑"
                    )}
                  </div>
                  <div className="fp-meta">
                    <p className="fp-name">{post.username}</p>
                    <p className="fp-sub">🔥 {post.streak} day streak</p>
                  </div>
                  <span className="fp-time">{post.timeAgo}</span>
                </div>

                <div className="fp-photo-wrap">
                  {post.photoUrl ? (
                    <img
                      src={post.photoUrl}
                      alt="quest"
                      className="fp-photo-img"
                    />
                  ) : (
                    <div className="fp-photo-placeholder">
                      <span className="fp-placeholder-icon">
                        {post.quest?.categoryIcon || "📷"}
                      </span>
                      <span className="fp-placeholder-text">
                        No photo taken
                      </span>
                    </div>
                  )}
                </div>

                {post.quest && (
                  <div className="fp-challenge-tag">
                    <span className="fp-challenge-tag-icon">
                      {post.quest.categoryIcon}
                    </span>
                    <span className="fp-challenge-tag-text">
                      {post.quest.title}
                    </span>
                  </div>
                )}

                <div className="friend-post-actions">
                  <button
                    className={"heart-btn" + (isHearted ? " hearted" : "")}
                    onClick={() => toggleHeart(post.id)}
                  >
                    <span className="heart-icon">
                      {isHearted ? "❤️" : "🤍"}
                    </span>
                    <span className="heart-count">{isHearted ? 1 : 0}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SkipButton({ onSkip, coins }) {
  const canSkip = coins >= 100;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <button
        className={"skip-btn" + (!canSkip ? " skip-btn-disabled" : "")}
        onClick={canSkip ? onSkip : undefined}
      >
        <span>🔀</span>
        <span className="skip-label">Skip Quest</span>
        <span className="skip-cost">🪙 100</span>
      </button>
      {!canSkip && (
        <span style={{ fontSize: 10, color: "#bbb", fontWeight: 600 }}>
          Need 100 coins to skip
        </span>
      )}
    </div>
  );
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
