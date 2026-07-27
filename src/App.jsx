import ProfileSetup from "./pages/ProfileSetup";
import AppLoading from "./components/AppLoading";
import PackOpening from "./pages/PackOpening";
import UpdateNotice from
  "./components/UpdateNotice";

import {
  APP_VERSION,
} from "./data/updates";

import {
  hasUnreadUpdates,
  markCurrentUpdateAsSeen,
} from "./lib/updates";
import {
  forceStarterDeckMigration,
} from "./lib/collection";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "./lib/supabase";
import ChallengeMenu from "./pages/ChallengeMenu";
import {
  CHALLENGE_PROGRESS_KEY,
} from "./data/challenges";
import {
  EQUIPPED_TITLE_CHANGE_EVENT,
  applyEquippedAchievementFromProfile,
  getEquippedAchievement,
} from "./lib/achievements";
import AuthMenu from "./pages/AuthMenu";
import Menu from "./pages/Menu";
import OnlineMenu from "./pages/OnlineMenu";
import Battle from "./pages/Battle";
import DeckBuilder from "./pages/DeckBuilder";
import Friends from "./pages/Friends";
import Settings from "./pages/Settings";
import CardLibrary from "./pages/CardLibrary";
import Achievements from "./pages/Achievements";
import AchievementToast from "./components/AchievementToast";
function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

  const [screen, setScreen] = useState("menu");
  const [battleKey, setBattleKey] = useState(0);
  const [onlineRoom, setOnlineRoom] = useState(null);
const [
  selectedChallenge,
  setSelectedChallenge,
] = useState(null);
const [
  equippedAchievement,
  setEquippedAchievement,
] = useState(
  getEquippedAchievement,
);
  const [showAuthMenu, setShowAuthMenu] =
    useState(false);
const [
  showUpdateNotice,
  setShowUpdateNotice,
] = useState(false);

const [
  hasUnreadUpdate,
  setHasUnreadUpdate,
] = useState(false);
  const [currentUser, setCurrentUser] =
  useState(null);

const [currentProfile, setCurrentProfile] =
  useState(null);

/*
  profilesからユーザーのプロフィールを取得する。
  既存アカウントでも、プロフィールがなければnullになる。
*/
async function fetchUserProfile(user) {
  if (!user || user.is_anonymous) {
  setCurrentProfile(null);

  /*
    ゲストは今までどおり、
    端末内に保存された称号を使用する。
  */
  setEquippedAchievement(
    getEquippedAchievement(),
  );

  return null;
}

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
  id,
  username,
  nickname,
  friend_code,
  avatar_id,
  avatar_url,
  avatar_path,
  bio,
  status,
  equipped_title_id
`)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
  throw profileError;
}

const serverEquippedAchievement =
  applyEquippedAchievementFromProfile(
    profile?.equipped_title_id ??
      null,
  );

setEquippedAchievement(
  serverEquippedAchievement,
);

setCurrentProfile(
  profile ?? null,
);

return profile ?? null;
}
useEffect(() => {
  /*
    スターターデッキへの移行自体は
    今までどおり一度だけ実行する。
  */
  const migrationResult =
    forceStarterDeckMigration();

  if (
    migrationResult.error
  ) {
    console.error(
      "スターターデッキへの変更に失敗しました:",
      migrationResult.error,
    );
  }

  /*
    現在のバージョンをまだ確認していない場合、
    未読バッジを付けてお知らせを自動表示する。
  */
  const unread =
    hasUnreadUpdates();

  setHasUnreadUpdate(
    unread,
  );

  if (unread) {
    setShowUpdateNotice(
      true,
    );
  }
}, []);
useEffect(() => {
  function refreshEquippedTitle() {
    setEquippedAchievement(
      getEquippedAchievement(),
    );
  }

  window.addEventListener(
    EQUIPPED_TITLE_CHANGE_EVENT,
    refreshEquippedTitle,
  );

  return () => {
    window.removeEventListener(
      EQUIPPED_TITLE_CHANGE_EVENT,
      refreshEquippedTitle,
    );
  };
}, []);
useEffect(() => {
  let isMounted = true;

  async function initializeAuth() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      /*
        ログインしていない場合だけ、
        ゲストアカウントを作成する。
      */
      if (!session) {
        const { error: signInError } =
          await supabase.auth.signInAnonymously();

        if (signInError) {
          throw signInError;
        }
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!isMounted) {
        return;
      }

      setCurrentUser(user);

      const profile =
        await fetchUserProfile(user);

      if (!isMounted) {
        return;
      }

      /*
        通常アカウントなのにプロフィールがない場合、
        既存ユーザーでもプロフィール設定を表示する。
      */
      const hasCompletedProfile =
  Boolean(profile?.username?.trim());

if (
  user &&
  !user.is_anonymous &&
  !hasCompletedProfile
) {
  setScreen("profile-setup");
} else {
  setScreen("menu");
}

      setAuthReady(true);
    } catch (error) {
      console.error(
        "認証初期化エラー:",
        error
      );

      if (isMounted) {
        setAuthError(
          error?.message ||
            "ゲームの準備に失敗しました"
        );

        setAuthReady(true);
      }
    }
  }

  initializeAuth();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      const user =
        session?.user ?? null;

      setCurrentUser(user);

      try {
        const savedPassword =
          sessionStorage.getItem(
            "pendingAccountPassword"
          );

        if (
          user &&
          !user.is_anonymous &&
          savedPassword
        ) {
          /*
            USER_UPDATEDがもう一度発生しても
            重複処理されないよう、先に削除する。
          */
          sessionStorage.removeItem(
            "pendingAccountPassword"
          );

          const { error: passwordError } =
            await supabase.auth.updateUser({
              password: savedPassword,
            });

          if (passwordError) {
            sessionStorage.setItem(
              "pendingAccountPassword",
              savedPassword
            );

            throw passwordError;
          }
        }

        if (
          event === "SIGNED_IN" ||
          event === "USER_UPDATED"
        ) {
          const profile =
            await fetchUserProfile(user);

          const hasCompletedProfile =
  Boolean(profile?.username?.trim());

if (
  user &&
  !user.is_anonymous &&
  !hasCompletedProfile
) {
  setScreen("profile-setup");
} else if (hasCompletedProfile) {
  setScreen((currentScreen) =>
    currentScreen === "profile-setup"
      ? "menu"
      : currentScreen
  );
}
        }

        if (event === "SIGNED_OUT") {
          setCurrentProfile(null);
          setScreen("menu");
        }
      } catch (error) {
        console.error(
          "認証状態変更エラー:",
          error
        );
      }
    }
  );

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
  function hasValidDeck() {
    const savedDeck =
      localStorage.getItem("chaosCardsDeck");

    if (!savedDeck) {
      return false;
    }

    try {
      const parsedDeck = JSON.parse(savedDeck);

      return (
        Array.isArray(parsedDeck) &&
        parsedDeck.length === 20
      );
    } catch (error) {
      console.error("デッキ確認エラー:", error);
      return false;
    }
  }

  function moveToDeckBuilder() {
    alert(
      "先に20枚のデッキを作成して保存してください！"
    );
    setScreen("deck-builder");
  }

  function startCpuBattle() {
    if (!hasValidDeck()) {
      moveToDeckBuilder();
      return;
    }

    setScreen("battle");
  }
function openChallengeMenu() {
  setScreen("challenge");
}

function startChallengeBattle(
  challenge,
) {
  if (!hasValidDeck()) {
    moveToDeckBuilder();
    return;
  }

  setSelectedChallenge(
    challenge,
  );

  setBattleKey(
    (currentKey) =>
      currentKey + 1,
  );

  setScreen(
    "challenge-battle",
  );
}

function recordChallengeResult(
  result,
) {
  if (
    result !== "player" ||
    !selectedChallenge
  ) {
    return;
  }

  try {
    const saved =
      localStorage.getItem(
        CHALLENGE_PROGRESS_KEY,
      );

    const parsed = saved
      ? JSON.parse(saved)
      : [];

    const clearedIds =
      Array.isArray(parsed)
        ? parsed
        : [];

    const nextClearedIds = [
      ...new Set([
        ...clearedIds,
        selectedChallenge.id,
      ]),
    ];

    localStorage.setItem(
      CHALLENGE_PROGRESS_KEY,
      JSON.stringify(
        nextClearedIds,
      ),
    );
  } catch (error) {
    console.error(
      "チャレンジ進行保存エラー:",
      error,
    );
  }
}
  function openOnlineMenu() {
    if (!hasValidDeck()) {
      moveToDeckBuilder();
      return;
    }

    setScreen("online");
  }
  function openFriends() {
  /*
    フレンド機能は正式アカウントのみ使用可能。
    匿名ユーザーの場合はログイン・登録画面を開く。
  */
  if (
    !currentUser ||
    currentUser.is_anonymous
  ) {
    setShowAuthMenu(true);
    return;
  }

  /*
    正式アカウントでもプロフィールが未設定なら、
    先にプロフィール設定画面へ移動する。
  */
  const hasCompletedProfile =
    Boolean(
      currentProfile?.username?.trim()
    );

  if (!hasCompletedProfile) {
    setScreen("profile-setup");
    return;
  }

  setScreen("friends");
}

  async function startOnlineBattle(
  roomId,
  receivedRole,
  matchId
) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(
        userError?.message ||
          "ユーザー情報を取得できませんでした"
      );
    }

    const {
      data: room,
      error: roomError,
    } = await supabase
      .from("rooms")
      .select(
        "id, host_id, guest_id, match_id"
      )
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      throw new Error(
        roomError?.message ||
          "対戦部屋を取得できませんでした"
      );
    }

    let actualRole = null;

    if (
      String(room.host_id) ===
      String(user.id)
    ) {
      actualRole = "host";
    } else if (
      String(room.guest_id) ===
      String(user.id)
    ) {
      actualRole = "guest";
    }

    if (!actualRole) {
      throw new Error(
        "この対戦部屋の参加者ではありません"
      );
    }

    const actualMatchId =
      matchId || room.match_id;

    if (!actualMatchId) {
      throw new Error(
        "試合IDを取得できませんでした"
      );
    }

    console.log("対戦開始・役割確認", {
      userId: user.id,
      roomId,
      hostId: room.host_id,
      guestId: room.guest_id,
      receivedRole,
      actualRole,
      matchId: actualMatchId,
    });

    setOnlineRoom({
      roomId,
      role: actualRole,
      matchId: actualMatchId,
    });

    setScreen("online-battle");
  } catch (error) {
    console.error(
      "オンライン対戦開始エラー:",
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : String(error)
    );
  }
}
function closeUpdateNotice() {
  markCurrentUpdateAsSeen();

  setHasUnreadUpdate(
    false,
  );

  setShowUpdateNotice(
    false,
  );
}
  async function handleLogout() {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "ログアウトエラー:",
        error
      );
      return;
    }

    const { error: anonymousError } =
      await supabase.auth.signInAnonymously();

    if (anonymousError) {
      console.error(
        "ゲストログインエラー:",
        anonymousError
      );
    }
  }
const handleOnlineRematchStart =
  useCallback(() => {
    setBattleKey(
      (currentKey) =>
        currentKey + 1,
    );
  }, []);
  function renderScreen() {
    if (screen === "challenge") {
  return (
    <ChallengeMenu
      onBack={() => {
        setScreen("menu");
      }}
      onStart={
        startChallengeBattle
      }
    />
  );
}

if (screen === "challenge-battle") {
  return (
    <Battle
      key={`challenge-${
        selectedChallenge?.id ??
        "unknown"
      }-${battleKey}`}
      mode="cpu"
      playerTitle={
  equippedAchievement?.title ?? ""
}
      challenge={selectedChallenge}
      onBattleEnd={recordChallengeResult}
      currentUserId={currentUser?.id}
      playerName={
        currentProfile?.username ??
        "YOU"
      }
      playerAvatarUrl={
        currentProfile?.avatar_url ??
        ""
      }
      restartGame={() => {
        setBattleKey(
          (currentKey) =>
            currentKey + 1,
        );
      }}
      goToMenu={() => {
        setScreen("challenge");
      }}
    />
  );
}
    if (screen === "profile-setup") {
  return (
    <ProfileSetup
      onComplete={(profile) => {
        setCurrentProfile(profile);
        setScreen("menu");
      }}
    />
  );
}
    if (screen === "settings") {
  return (
    <Settings
      goBack={() => setScreen("menu")}
    />
  );
}
if (screen === "card-library") {
  return (
    <CardLibrary
      onBack={() =>
        setScreen("menu")
      }
    />
  );
}
if (screen === "pack-opening") {
  return (
    <PackOpening
      onBack={() =>
        setScreen("menu")
      }
    />
  );
}
if (screen === "achievements") {
  return (
    <Achievements
      onBack={() =>
        setScreen("menu")
      }
    />
  );
}
 if (screen === "friends") {
  return (
    <Friends
      onBack={() =>
        setScreen("menu")
      }
      onMatchStart={
        startOnlineBattle
      }
      onProfileUpdated={
        setCurrentProfile
      }
    />
  );
}

    if (screen === "deck-builder") {
      return (
        <DeckBuilder
          onBack={() => setScreen("menu")}
        />
      );
    }

    if (screen === "battle") {
      return (
        <Battle
  key={battleKey}
  mode="cpu"
playerTitle={
  equippedAchievement?.title ?? ""
}
  currentUserId={currentUser?.id}
  playerName={
    currentProfile?.username ??
    "YOU"
  }
playerAvatarUrl={
  currentProfile?.avatar_url ?? ""
}
  restartGame={() => {
    setBattleKey(
      (currentKey) =>
        currentKey + 1
    );
  }}
  goToMenu={() =>
    setScreen("menu")
  }
/>
      );
    }

    if (screen === "online-battle") {
      return (
        <Battle
  key={`${onlineRoom?.matchId}-${battleKey}`}
  mode="online"
  playerTitle={
  equippedAchievement?.title ?? ""
}
  roomId={onlineRoom?.roomId}
  matchId={onlineRoom?.matchId}
  playerRole={onlineRoom?.role}

  currentUserId={currentUser?.id}
  playerName={
    currentProfile?.username ??
    "YOU"
  }
playerAvatarUrl={
  currentProfile?.avatar_url ?? ""
}
 restartGame={() => {
  setOnlineRoom(null);
  setScreen("online");
}}
onRematchStart={
  handleOnlineRematchStart
}
goToMenu={() => {
  setOnlineRoom(null);
  setScreen("menu");
}}
/>
      );
    }

    if (screen === "online") {
  return (
    <OnlineMenu
      onBack={() => setScreen("menu")}
      onMatchStart={startOnlineBattle}

      currentUser={currentUser}
      nickname={
        currentProfile?.username ??
        "ゲスト"
      }
      avatarId={
  currentProfile?.avatar_id ??
  "default"
}
avatarUrl={
  currentProfile?.avatar_url ??
  ""
}
    />
  );
}

    return (
     <Menu
  onStart={startCpuBattle}
  onChallenge={
  openChallengeMenu
}
  onOnline={openOnlineMenu}
  onDeckBuilder={() =>
    setScreen("deck-builder")
  }
  onPackOpening={() =>
  setScreen("pack-opening")
}
  onFriends={openFriends}
  onSettings={() =>
    setScreen("settings")
  }
  onCardLibrary={() =>
  setScreen("card-library")
}
onAchievements={() =>
  setScreen("achievements")
}
appVersion={
  APP_VERSION
}
hasUnreadUpdate={
  hasUnreadUpdate
}
onOpenUpdates={() => {
  setShowUpdateNotice(
    true,
  );
}}
     playerName={
  currentProfile?.username?.trim() ||
  currentProfile?.nickname?.trim() ||
  "PLAYER"
}
playerAvatarUrl={
  currentProfile?.avatar_url ?? ""
}
  playerTitle={
    equippedAchievement?.title ?? ""
  }
playerEmail={
  currentUser?.is_anonymous
    ? ""
    : currentUser?.email ?? ""
}
  openAuthMenu={() =>
    setShowAuthMenu(true)
  }
  currentUser={currentUser}
  handleLogout={handleLogout}
/>
    );
  }

  if (authError) {
    return (
      <main className="loading-screen">
        <h2>接続エラー</h2>
        <p>{authError}</p>

        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
        >
          もう一度試す
        </button>
      </main>
    );
  }

  if (!authReady) {
    return <AppLoading />;
  }

 return (
  <>
    {renderScreen()}

    <AchievementToast />

    {showUpdateNotice &&
  screen === "menu" && (
    <UpdateNotice
      onClose={
        closeUpdateNotice
      }
    />
  )}

    {showAuthMenu && (
      <AuthMenu
        onClose={() =>
          setShowAuthMenu(false)
        }
      />
    )}
  </>
);
}

export default App;