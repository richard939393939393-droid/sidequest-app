import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function FriendsScreen({ user, profile }) {
  const [tab, setTab] = useState("leaderboard"); // leaderboard | search | requests

  // ── Leaderboard state ──
  const [friends, setFriends] = useState([]);
  const [leaderboardView, setLeaderboardView] = useState("weekly");
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  // ── Search state ──
  const [searchInput, setSearchInput] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  // ── Requests state ──
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  // ── Load accepted friends ──
  async function loadFriends() {
    setLeaderboardLoading(true);
    const { data, error } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error || !data) {
      setLeaderboardLoading(false);
      return;
    }

    const friendIds = data.map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) {
      setFriends([]);
      setLeaderboardLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar, avatar_url, xp, streak, player_id")
      .in("id", friendIds);

    setFriends(profiles || []);
    setLeaderboardLoading(false);
  }

  // ── Load incoming requests ──
  async function loadRequests() {
    setRequestsLoading(true);
    const { data, error } = await supabase
      .from("friendships")
      .select("id, requester_id, created_at")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (error || !data) {
      setRequestsLoading(false);
      return;
    }

    if (data.length === 0) {
      setIncomingRequests([]);
      setRequestsLoading(false);
      return;
    }

    const requesterIds = data.map((r) => r.requester_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar, avatar_url, xp, streak, player_id")
      .in("id", requesterIds);

    const enriched = data.map((req) => ({
      ...req,
      senderProfile: profiles?.find((p) => p.id === req.requester_id) || null,
    }));

    setIncomingRequests(enriched);
    setRequestsLoading(false);
  }

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  // ── Search by Player ID ──
  async function handleSearch() {
    const query = searchInput.trim().toUpperCase();
    if (!query) return;
    setSearching(true);
    setSearchResult(null);
    setSearchError("");

    if (query === profile?.player_id) {
      setSearchError("That's your own Player ID!");
      setSearching(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar, avatar_url, xp, streak, player_id")
      .eq("player_id", query)
      .single();

    if (error || !data) {
      setSearchError(
        "No player found with that ID. Check the code and try again."
      );
      setSearching(false);
      return;
    }

    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${data.id}),and(requester_id.eq.${data.id},addressee_id.eq.${user.id})`
      )
      .maybeSingle();

    setSearchResult({ ...data, existingFriendship: existing || null });
    setSearching(false);
  }

  // ── Send friend request ──
  async function handleSendRequest(addresseeId) {
    setSendingRequest(true);
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: "pending",
    });
    setSendingRequest(false);
    if (!error) {
      setSearchResult((prev) => ({
        ...prev,
        existingFriendship: { status: "pending" },
      }));
    }
  }

  // ── Accept / decline ──
  async function handleRespond(friendshipId, accept) {
    setRespondingId(friendshipId);
    if (accept) {
      await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);
    } else {
      await supabase.from("friendships").delete().eq("id", friendshipId);
    }
    setRespondingId(null);
    await loadRequests();
    await loadFriends();
  }

  // ── Leaderboard data ──
  const me = {
    id: user.id,
    username: profile?.username || "You",
    avatar: profile?.avatar || "🧑",
    avatar_url: profile?.avatar_url || profile?.avatar || null,
    xp: profile?.xp || 0,
    streak: profile?.streak || 0,
    isMe: true,
  };

  const allPlayers = [me, ...friends.map((f) => ({ ...f, isMe: false }))];
  const sorted = [...allPlayers].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const myRank = sorted.findIndex((p) => p.isMe) + 1;
  const maxXp = sorted[0]?.xp || 1;
  const medals = ["🥇", "🥈", "🥉"];
  const pendingCount = incomingRequests.length;

  return (
    <div
      className="screen"
      style={{ paddingBottom: 24, fontFamily: "'Nunito', sans-serif" }}
    >
      <style>{`
        .fs-title { font-size: 26px; font-weight: 900; color: #2d3a4a; margin-bottom: 4px; }
        .fs-sub   { font-size: 13px; color: #aaa; font-weight: 600; margin-bottom: 18px; }

        .fs-tabs { display: flex; background: #f0f0f0; border-radius: 16px; padding: 4px; margin-bottom: 20px; gap: 4px; }
        .fs-tab {
          flex: 1; padding: 9px 0; border: none; background: transparent;
          border-radius: 12px; font-size: 12px; font-weight: 700; color: #999;
          cursor: pointer; transition: all .2s; font-family: 'Nunito', sans-serif; position: relative;
        }
        .fs-tab.active { background: #fff; color: #58cc02; box-shadow: 0 2px 8px rgba(0,0,0,0.10); }
        .fs-tab-badge {
          position: absolute; top: 3px; right: 6px; background: #e74c3c; color: #fff;
          border-radius: 10px; padding: 1px 5px; font-size: 9px; font-weight: 900;
        }

        .fs-toggle { display: flex; background: #f0f0f0; border-radius: 14px; padding: 3px; margin-bottom: 14px; gap: 3px; }
        .fs-toggle-btn {
          flex: 1; padding: 7px 0; border: none; background: transparent;
          border-radius: 11px; font-size: 12px; font-weight: 700; color: #999;
          cursor: pointer; transition: all .2s; font-family: 'Nunito', sans-serif;
        }
        .fs-toggle-btn.active { background: #fff; color: #58cc02; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }

        .fs-rank-banner {
          background: linear-gradient(135deg, #58cc02, #89e219); border-radius: 18px;
          padding: 12px 18px; display: flex; align-items: center; gap: 10px;
          margin-bottom: 14px; box-shadow: 0 4px 14px rgba(88,204,2,0.28);
        }
        .fs-rank-banner-text { font-size: 15px; font-weight: 900; color: #fff; }

        .fs-row {
          display: flex; align-items: center; gap: 10px; padding: 12px 14px;
          border-radius: 18px; background: #f8f9fa; border: 1.5px solid transparent; margin-bottom: 8px;
        }
        .fs-row.is-me { background: #f0fbe0; border-color: #58cc02; }
        .fs-rank-col { width: 28px; text-align: center; flex-shrink: 0; }
        .fs-medal    { font-size: 20px; }
        .fs-rank-num { font-size: 13px; font-weight: 800; color: #aaa; }
        .fs-avatar {
          width: 42px; height: 42px; border-radius: 50%; background: #fff;
          border: 2px solid #f0f0f0; display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .fs-info { flex: 1; min-width: 0; }
        .fs-name-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
        .fs-name   { font-size: 14px; font-weight: 800; color: #2d3a4a; }
        .fs-streak { font-size: 12px; color: #e67e22; font-weight: 700; }
        .fs-you-badge { font-size: 10px; background: #f0fbe0; color: #58cc02; padding: 2px 7px; border-radius: 10px; font-weight: 800; margin-left: auto; }
        .fs-bar-wrap { background: #e8e8e8; border-radius: 10px; height: 5px; margin-bottom: 3px; overflow: hidden; }
        .fs-bar      { height: 100%; border-radius: 10px; background: #a78bfa; transition: width .4s ease; }
        .fs-bar.me   { background: #58cc02; }
        .fs-xp       { font-size: 11px; color: #888; font-weight: 700; }

        .fs-empty { background: #f8f9fa; border-radius: 16px; padding: 28px; text-align: center; border: 1.5px dashed #e0e0e0; margin-top: 8px; }
        .fs-empty-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.4; }
        .fs-empty-text { font-size: 13px; color: #bbb; font-weight: 700; }
        .fs-empty-sub  { font-size: 12px; color: #ccc; font-weight: 600; margin-top: 4px; }

        .fs-search-wrap { display: flex; gap: 8px; margin-bottom: 14px; }
        .fs-search-input {
          flex: 1; padding: 12px 14px; border-radius: 14px; border: 2px solid #f0f0f0;
          background: #f8f9fa; font-size: 14px; font-weight: 700; color: #2d3a4a;
          outline: none; font-family: 'Nunito', sans-serif;
          text-transform: uppercase; letter-spacing: 1px; transition: border-color .15s;
        }
        .fs-search-input:focus { border-color: #58cc02; }
        .fs-search-input::placeholder { text-transform: none; letter-spacing: 0; color: #bbb; font-weight: 600; }
        .fs-search-btn {
          padding: 12px 18px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #58cc02, #89e219); color: #fff;
          font-size: 14px; font-weight: 800; cursor: pointer;
          font-family: 'Nunito', sans-serif; box-shadow: 0 3px 10px rgba(88,204,2,0.3);
        }
        .fs-search-btn:disabled { background: #ccc; box-shadow: none; cursor: not-allowed; }

        .fs-search-error { background: #fdf0f0; border: 1.5px solid #f5c6c6; border-radius: 14px; padding: 12px 16px; font-size: 13px; color: #c0392b; font-weight: 700; margin-bottom: 14px; }

        .fs-your-id { background: #f8f9fa; border-radius: 14px; padding: 10px 14px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }

        .fs-result-card { background: #fff; border-radius: 20px; padding: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid #f0f4f8; animation: fadeUp .25s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fs-result-profile { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
        .fs-result-avatar {
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, #f0fbe0, #d4f5a0); border: 3px solid #58cc02;
          display: flex; align-items: center; justify-content: center; font-size: 28px; overflow: hidden; flex-shrink: 0;
        }
        .fs-result-name { font-size: 18px; font-weight: 900; color: #2d3a4a; margin-bottom: 2px; }
        .fs-result-id   { font-size: 11px; color: #aaa; font-weight: 700; font-family: monospace; letter-spacing: 1px; }
        .fs-result-stats { display: flex; gap: 8px; margin-top: 6px; }
        .fs-result-stat { display: flex; align-items: center; gap: 4px; background: #f8f9fa; border-radius: 10px; padding: 3px 9px; font-size: 12px; font-weight: 800; color: #555; }

        .fs-add-btn { width: 100%; padding: 13px; border-radius: 16px; border: none; background: linear-gradient(135deg, #58cc02, #89e219); color: #fff; font-size: 15px; font-weight: 900; cursor: pointer; font-family: 'Nunito', sans-serif; box-shadow: 0 4px 14px rgba(88,204,2,0.35); }
        .fs-add-btn:disabled { background: #ccc; box-shadow: none; cursor: not-allowed; }
        .fs-status-pill { width: 100%; padding: 12px; border-radius: 16px; text-align: center; font-size: 14px; font-weight: 800; }
        .fs-status-pending  { background: #fff8ec; color: #f39c12; border: 1.5px solid #ffe0b2; }
        .fs-status-accepted { background: #f0fbe0; color: #27ae60; border: 1.5px solid #c8f0a0; }

        .fs-req-card { background: #fff; border-radius: 18px; padding: 14px 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1.5px solid #f0f4f8; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
        .fs-req-avatar { width: 46px; height: 46px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; overflow: hidden; }
        .fs-req-info { flex: 1; min-width: 0; }
        .fs-req-name { font-size: 14px; font-weight: 800; color: #2d3a4a; margin-bottom: 2px; }
        .fs-req-id   { font-size: 10px; color: #bbb; font-weight: 700; font-family: monospace; letter-spacing: 0.5px; }
        .fs-req-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .fs-accept-btn { padding: 7px 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #58cc02, #89e219); color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; font-family: 'Nunito', sans-serif; }
        .fs-decline-btn { padding: 7px 12px; border-radius: 12px; border: 1.5px solid #f0f0f0; background: #fff; color: #aaa; font-size: 12px; font-weight: 800; cursor: pointer; font-family: 'Nunito', sans-serif; }
        .fs-accept-btn:disabled, .fs-decline-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <h1 className="fs-title">Friends</h1>
      <p className="fs-sub">Find explorers, compete together</p>

      {/* Tab bar */}
      <div className="fs-tabs">
        <button
          className={"fs-tab" + (tab === "leaderboard" ? " active" : "")}
          onClick={() => setTab("leaderboard")}
        >
          🏆 Leaderboard
        </button>
        <button
          className={"fs-tab" + (tab === "search" ? " active" : "")}
          onClick={() => setTab("search")}
        >
          🔍 Find
        </button>
        <button
          className={"fs-tab" + (tab === "requests" ? " active" : "")}
          onClick={() => setTab("requests")}
        >
          👥 Requests
          {pendingCount > 0 && (
            <span className="fs-tab-badge">{pendingCount}</span>
          )}
        </button>
      </div>

      {/* ── LEADERBOARD ── */}
      {tab === "leaderboard" && (
        <div>
          <div className="fs-toggle">
            <button
              className={
                "fs-toggle-btn" +
                (leaderboardView === "weekly" ? " active" : "")
              }
              onClick={() => setLeaderboardView("weekly")}
            >
              This Week
            </button>
            <button
              className={
                "fs-toggle-btn" +
                (leaderboardView === "alltime" ? " active" : "")
              }
              onClick={() => setLeaderboardView("alltime")}
            >
              All Time
            </button>
          </div>

          {leaderboardLoading ? (
            <div className="fs-empty">
              <div className="fs-empty-icon">⏳</div>
              <p className="fs-empty-text">Loading...</p>
            </div>
          ) : (
            <>
              <div className="fs-rank-banner">
                <span style={{ fontSize: 22 }}>🏆</span>
                <span className="fs-rank-banner-text">
                  Your Rank #{myRank} out of {allPlayers.length}
                </span>
              </div>

              {allPlayers.length === 1 && (
                <div className="fs-empty">
                  <div className="fs-empty-icon">👥</div>
                  <p className="fs-empty-text">No friends yet</p>
                  <p className="fs-empty-sub">
                    Use Find tab to search by Player ID!
                  </p>
                </div>
              )}

              {sorted.map((player, index) => {
                const xp = player.xp || 0;
                const barWidth = maxXp > 0 ? Math.round((xp / maxXp) * 100) : 0;
                return (
                  <div
                    key={player.id}
                    className={"fs-row" + (player.isMe ? " is-me" : "")}
                  >
                    <div className="fs-rank-col">
                      {index < 3 ? (
                        <span className="fs-medal">{medals[index]}</span>
                      ) : (
                        <span className="fs-rank-num">#{index + 1}</span>
                      )}
                    </div>
                    <div className="fs-avatar">
                      {(player.avatar_url || player.avatar)?.startsWith?.(
                        "http"
                      ) ? (
                        <img
                          src={player.avatar_url || player.avatar}
                          alt="avatar"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center top",
                          }}
                        />
                      ) : (
                        player.avatar || "🧑"
                      )}
                    </div>
                    <div className="fs-info">
                      <div className="fs-name-row">
                        <span className="fs-name">
                          {player.isMe ? "You" : player.username || "Explorer"}
                        </span>
                        <span className="fs-streak">
                          🔥 {player.streak || 0}
                        </span>
                        {player.isMe && (
                          <span className="fs-you-badge">YOU</span>
                        )}
                      </div>
                      <div className="fs-bar-wrap">
                        <div
                          className={"fs-bar" + (player.isMe ? " me" : "")}
                          style={{ width: barWidth + "%" }}
                        />
                      </div>
                      <span className="fs-xp">{xp} XP</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── SEARCH ── */}
      {tab === "search" && (
        <div>
          <p
            style={{
              fontSize: 13,
              color: "#aaa",
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            Enter a Player ID to find and add someone
          </p>

          <div className="fs-search-wrap">
            <input
              className="fs-search-input"
              placeholder="QUEST-XXXXXX"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSearchError("");
                setSearchResult(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              maxLength={12}
            />
            <button
              className="fs-search-btn"
              onClick={handleSearch}
              disabled={searching || !searchInput.trim()}
            >
              {searching ? "..." : "Search"}
            </button>
          </div>

          {/* Your own ID */}
          <div className="fs-your-id">
            <span style={{ fontSize: 16 }}>🪪</span>
            <div>
              <p
                style={{
                  fontSize: 10,
                  color: "#bbb",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                }}
              >
                Your Player ID
              </p>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: "#58cc02",
                  fontFamily: "monospace",
                  letterSpacing: "1.5px",
                }}
              >
                {profile?.player_id || "—"}
              </p>
            </div>
          </div>

          {searchError && (
            <div className="fs-search-error">⚠️ {searchError}</div>
          )}

          {searchResult && (
            <div className="fs-result-card">
              <div className="fs-result-profile">
                <div className="fs-result-avatar">
                  {(
                    searchResult.avatar_url || searchResult.avatar
                  )?.startsWith?.("http") ? (
                    <img
                      src={searchResult.avatar_url || searchResult.avatar}
                      alt="avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                      }}
                    />
                  ) : (
                    searchResult.avatar || "🧑"
                  )}
                </div>
                <div>
                  <p className="fs-result-name">
                    {searchResult.username || "Explorer"}
                  </p>
                  <p className="fs-result-id">{searchResult.player_id}</p>
                  <div className="fs-result-stats">
                    <div className="fs-result-stat">
                      <span>⚡</span>
                      <span>{searchResult.xp || 0} XP</span>
                    </div>
                    <div className="fs-result-stat">
                      <span>🔥</span>
                      <span>{searchResult.streak || 0} streak</span>
                    </div>
                  </div>
                </div>
              </div>

              {!searchResult.existingFriendship && (
                <button
                  className="fs-add-btn"
                  onClick={() => handleSendRequest(searchResult.id)}
                  disabled={sendingRequest}
                >
                  {sendingRequest ? "Sending..." : "➕ Send Friend Request"}
                </button>
              )}
              {searchResult.existingFriendship?.status === "pending" && (
                <div className="fs-status-pill fs-status-pending">
                  ⏳ Friend request pending
                </div>
              )}
              {searchResult.existingFriendship?.status === "accepted" && (
                <div className="fs-status-pill fs-status-accepted">
                  ✅ Already friends!
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── REQUESTS ── */}
      {tab === "requests" && (
        <div>
          {requestsLoading ? (
            <div className="fs-empty">
              <div className="fs-empty-icon">⏳</div>
              <p className="fs-empty-text">Loading...</p>
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="fs-empty">
              <div className="fs-empty-icon">📭</div>
              <p className="fs-empty-text">No pending requests</p>
              <p className="fs-empty-sub">
                Share your Player ID so friends can find you!
              </p>
            </div>
          ) : (
            incomingRequests.map((req) => (
              <div key={req.id} className="fs-req-card">
                <div className="fs-req-avatar">
                  {(
                    req.senderProfile?.avatar_url || req.senderProfile?.avatar
                  )?.startsWith?.("http") ? (
                    <img
                      src={
                        req.senderProfile.avatar_url || req.senderProfile.avatar
                      }
                      alt="avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                      }}
                    />
                  ) : (
                    req.senderProfile?.avatar || "🧑"
                  )}
                </div>
                <div className="fs-req-info">
                  <p className="fs-req-name">
                    {req.senderProfile?.username || "Explorer"}
                  </p>
                  <p className="fs-req-id">
                    {req.senderProfile?.player_id || ""}
                  </p>
                </div>
                <div className="fs-req-actions">
                  <button
                    className="fs-accept-btn"
                    onClick={() => handleRespond(req.id, true)}
                    disabled={respondingId === req.id}
                  >
                    {respondingId === req.id ? "..." : "✓ Accept"}
                  </button>
                  <button
                    className="fs-decline-btn"
                    onClick={() => handleRespond(req.id, false)}
                    disabled={respondingId === req.id}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
