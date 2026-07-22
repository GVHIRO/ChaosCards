import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import AuthMenu from "./pages/AuthMenu";
// 既存のimport
import Menu from "./pages/Menu";
import OnlineMenu from "./pages/OnlineMenu";
import Battle from "./pages/Battle";
import DeckBuilder from "./pages/DeckBuilder";


function App() {
    const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [screen, setScreen] = useState("menu");
  const [battleKey, setBattleKey] = useState(0);
  const [onlineRoom, setOnlineRoom] = useState(null);
  const [showAuthMenu, setShowAuthMenu] =
  useState(false);

const [currentUser, setCurrentUser] =
  useState(null);
  useEffect(() => {
  let isMounted = true;

  async function initializeAnonymousAuth() {
    try {
      // 以前作った匿名セッションがあるか確認
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      // セッションがなければ匿名ログイン
      if (!session) {
        const { error: signInError } =
          await supabase.auth.signInAnonymously();

        if (signInError) {
          throw signInError;
        }
      }

      if (isMounted) {
        setAuthReady(true);
      }
    } catch (error) {
      console.error("匿名ログインエラー:", error);

      if (isMounted) {
        setAuthError(
          error?.message || "ゲームの準備に失敗しました"
        );
      }
    }
  }

  initializeAnonymousAuth();

  return () => {
    isMounted = false;
  };
}, []);
useEffect(() => {
  async function loadCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUser(user);
  }

  loadCurrentUser();

  const {
  data: { subscription },
} = supabase.auth.onAuthStateChange(
  async (_event, session) => {
    const user = session?.user ?? null;
    setCurrentUser(user);

    const savedPassword =
      sessionStorage.getItem(
        "pendingAccountPassword"
      );

    if (
      user &&
      !user.is_anonymous &&
      savedPassword
    ) {
      const { error } =
        await supabase.auth.updateUser({
          password: savedPassword,
        });

      if (error) {
        console.error(
          "パスワード設定エラー:",
          error
        );
        return;
      }

      sessionStorage.removeItem(
        "pendingAccountPassword"
      );
    }
  }
);

  return () => {
    subscription.unsubscribe();
  };
}, []);
if (authError) {
  return (
    <main className="loading-screen">
      <h2>接続エラー</h2>
      <p>{authError}</p>

      <button onClick={() => window.location.reload()}>
        もう一度試す
      </button>
    </main>
  );
}

if (!authReady) {
  return (
    <main className="loading-screen">
      <h2>Chaos Cards</h2>
      <p>ゲームを準備中...</p>
    </main>
  );
}
function startOnlineBattle(roomId, role, matchId) {
  if (!hasValidDeck()) {
    alert("先に20枚のデッキを作成してください！");

    setOnlineRoom(null);
    setScreen("deck-builder");
    return;
  }

  setOnlineRoom({
    roomId,
    role,
    matchId,
  });

  setScreen("online-battle");
}


async function handleLogout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("ログアウトエラー:", error);
    return;
  }

  // ログアウト後は新しいゲストとして入り直す
  const { error: anonymousError } =
    await supabase.auth.signInAnonymously();

  if (anonymousError) {
    console.error(
      "ゲストログインエラー:",
      anonymousError
    );
  }
}
function hasValidDeck() {
  const savedDeck = localStorage.getItem("chaosCardsDeck");

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
function startCpuBattle() {
  if (!hasValidDeck()) {
    alert("先に20枚のデッキを作成してください！");
    setScreen("deck-builder");
    return;
  }

  setScreen("battle");
}

function openOnlineMenu() {
  if (!hasValidDeck()) {
    alert("先に20枚のデッキを作成してください！");
    setScreen("deck-builder");
    return;
  }

  setScreen("online");
}
function renderScreen() {
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
      restartGame={() => {
        setBattleKey((prev) => prev + 1);
      }}
      goToMenu={() => setScreen("menu")}
    />
  );
}
  if (screen === "online-battle") {
  return (
    <Battle
      mode="online"
      roomId={onlineRoom?.roomId}
      matchId={onlineRoom?.matchId}
      playerRole={onlineRoom?.role}
      restartGame={() => {
        setOnlineRoom(null);
        setScreen("online");
      }}
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
      />
    );
  }

 return (
  <Menu
  onStart={startCpuBattle}
  onOnline={openOnlineMenu}
  onDeckBuilder={() => setScreen("deck-builder")}
  openAuthMenu={() => setShowAuthMenu(true)}
  currentUser={currentUser}
  handleLogout={handleLogout}
/>
);
}

return (
  <>
    {renderScreen()}

    {showAuthMenu && (
      <AuthMenu
        onClose={() => setShowAuthMenu(false)}
      />
    )}
  </>
);
}

export default App;