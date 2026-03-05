import { useState, useEffect } from "react";
import "./styles.css";
import HomeScreen from "./screens/HomeScreen";
import HistoryScreen from "./screens/HistoryScreen";
import FriendsScreen from "./screens/FriendsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LoginScreen from "./screens/LoginScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import FirstQuestScreen from "./screens/FirstQuestScreen";
import { ALL_CHALLENGES } from "./data/data";
import { supabase } from "./supabaseClient";

// Derive today's quest index from the date — same for all users each day
function getDailyQuestIndex() {
  if (!ALL_CHALLENGES || ALL_CHALLENGES.length === 0) return 0;
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % ALL_CHALLENGES.length;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [coins, setCoins] = useState(0);
  const [challengeIndex, setChallengeIndex] = useState(getDailyQuestIndex());
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  async function loadProfile(userId) {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        const { data: created, error: insertError } = await supabase
          .from("profiles")
          .insert({ id: userId, onboarded: false, first_quest_done: false })
          .select()
          .single();
        if (!insertError && created)
          setProfile({ ...created, onboarded: false, first_quest_done: false });
      }
    } else if (data) {
      setProfile({
        ...data,
        onboarded: data.onboarded ?? false,
        first_quest_done: data.first_quest_done ?? false,
      });
      if (data.coins) setCoins(data.coins);
    }
    setProfileLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleEarnCoins = (amount) => setCoins((prev) => prev + amount);

  const handleSkipQuest = () => {
    if (coins >= 100) {
      setCoins((prev) => prev - 100);
      setChallengeIndex((prev) => (prev + 1) % ALL_CHALLENGES.length);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCoins(0);
    setChallengeIndex(getDailyQuestIndex());
    setActiveTab("home");
  };

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
    if (updatedProfile?.coins != null) setCoins(updatedProfile.coins);
  };

  const Splash = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#f8fdf0",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 40 }}>🗺️</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#58cc02" }}>
        SideQuest
      </div>
      <div style={{ fontSize: 13, color: "#aaa", fontWeight: 600 }}>
        Loading your adventure...
      </div>
    </div>
  );

  if (authLoading) return <Splash />;
  if (!user)
    return (
      <LoginScreen
        onLogin={(u) => {
          setUser(u);
          loadProfile(u.id);
        }}
      />
    );
  if (profileLoading || !profile) return <Splash />;

  if (profile.onboarded === false) {
    return (
      <OnboardingScreen
        user={user}
        profile={profile}
        onComplete={() => loadProfile(user.id)}
      />
    );
  }

  if (profile.onboarded === true && !profile.first_quest_done) {
    return (
      <FirstQuestScreen
        user={user}
        profile={profile}
        onComplete={() => loadProfile(user.id)}
      />
    );
  }

  return (
    <div className="app-container">
      <div className="phone-frame">
        <div className="screen-content">
          {activeTab === "home" && (
            <HomeScreen
              onEarnCoins={handleEarnCoins}
              onSkipQuest={handleSkipQuest}
              onProfileUpdate={handleProfileUpdate}
              currentChallengeIndex={challengeIndex}
              user={user}
              profile={profile}
              coins={coins}
            />
          )}
          {activeTab === "history" && <HistoryScreen user={user} />}
          {activeTab === "friends" && (
            <FriendsScreen user={user} profile={profile} />
          )}
          {activeTab === "profile" && (
            <ProfileScreen
              user={user}
              profile={profile}
              onLogout={handleLogout}
              onProfileUpdate={handleProfileUpdate}
            />
          )}
        </div>
        <div className="bottom-nav">
          {[
            { id: "home", icon: "🏠", label: "Home" },
            { id: "history", icon: "📋", label: "History" },
            { id: "friends", icon: "👥", label: "Friends" },
            { id: "profile", icon: "👤", label: "Profile" },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              className={"nav-btn " + (activeTab === id ? "active" : "")}
              onClick={() => setActiveTab(id)}
            >
              <span>{icon}</span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
