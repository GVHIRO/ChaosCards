import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

import AuthMenu from "./pages/AuthMenu";
import Menu from "./pages/Menu";
import OnlineMenu from "./pages/OnlineMenu";
import Battle from "./pages/Battle";
import DeckBuilder from "./pages/DeckBuilder";
import Friends from "./pages/Friends";

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

    async function initializeAuth() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

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

        if (isMounted) {
          setCurrentUser(user);
          setAuthReady(true);
        }
      } catch (error) {
        console.error("認証初期化エラー:", error);

        if (isMounted) {
          setAuthError(
            error?.message ||
              "ゲームの準備に失敗しました"
          );
        }
      }
    }

    initializeAuth();

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

  function openOnlineMenu() {
    if (!hasValidDeck()) {
      moveToDeckBuilder();
      return;
    }

    setScreen("online");
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

  function renderScreen() {
 if (screen === "friends") {
  return (
    <Friends
      onBack={() => setScreen("menu")}
      onMatchStart={startOnlineBattle}
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
          restartGame={() => {
            setBattleKey(
              (currentKey) => currentKey + 1
            );
          }}
          goToMenu={() => setScreen("menu")}
        />
      );
    }

    if (screen === "online-battle") {
      return (
        <Battle
          key={`${onlineRoom?.matchId}-${battleKey}`}
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
  onFriends={() => setScreen("friends")}
  openAuthMenu={() => setShowAuthMenu(true)}
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
    return (
      <main className="loading-screen">
        <h2>CHAOS CARDS</h2>
        <p>ゲームを準備中...</p>
      </main>
    );
  }

  return (
    <>
      {renderScreen()}

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