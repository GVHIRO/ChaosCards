import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function OnlineMenu({ onBack, onMatchStart }) {
  const [roomCode, setRoomCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [message, setMessage] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);


  useEffect(() => {
    if (!roomId || !playerRole) {
      return;
    }

    let isProcessing = false;

    const intervalId = window.setInterval(async () => {
      if (isProcessing) {
        return;
      }

      isProcessing = true;

      try {
        const { data: room, error: roomError } =
          await supabase
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .single();

        if (roomError) {
          console.error("部屋確認エラー:", roomError);
          return;
        }

        // ホストだけが試合を作成する
        if (
          playerRole === "host" &&
          room.status === "ready" &&
          room.guest_id &&
          !room.match_id
        ) {
          setMessage("試合を準備しています…");

         // コイントスはホスト端末だけで行い、結果をDBへ保存する
          const firstPlayer =
            Math.random() < 0.5 ? "host" : "guest";

          const { data: match, error: matchError } =
            await supabase
              .from("matches")
              .upsert(
                {
                  room_id: room.id,
                  host_hp: 40,
                  guest_hp: 40,
                  host_energy: 3,
                  guest_energy: 3,
                  host_shield: 0,
                  guest_shield: 0,
                  turn_number: 1,
                  phase: "playing",
                  first_player: firstPlayer,
                  current_player: firstPlayer,
                  winner: null,
                  battle_logs: [
                    `🪙 ${firstPlayer}が先攻`,
                  ],
                },
                {
                  onConflict: "room_id",
                  ignoreDuplicates: true,
                }
              )
              .select()
              .maybeSingle();

          if (matchError) {
            console.error(
              "試合作成エラー:",
              matchError
            );

            setMessage(
              `試合作成エラー：${matchError.message}`
            );
            return;
          }

          let matchId = match?.id;

          if (!matchId) {
            const {
              data: existingMatch,
              error: existingMatchError,
            } = await supabase
              .from("matches")
              .select("id")
              .eq("room_id", room.id)
              .single();

            if (existingMatchError) {
              console.error(
                "既存試合取得エラー:",
                existingMatchError
              );
              return;
            }

            matchId = existingMatch.id;
          }

          const { error: updateRoomError } =
            await supabase
              .from("rooms")
              .update({
                match_id: matchId,
                status: "playing",
              })
              .eq("id", room.id);

          if (updateRoomError) {
            console.error(
              "部屋更新エラー:",
              updateRoomError
            );

            setMessage(
              `部屋更新エラー：${updateRoomError.message}`
            );
            return;
          }

          window.clearInterval(intervalId);
          onMatchStart(room.id, "host", matchId);
          return;
        }

        // match_idが保存されたらゲストも対戦開始
        if (room.match_id) {
          window.clearInterval(intervalId);

          setMessage("対戦を開始します！");

          onMatchStart(
            room.id,
            playerRole,
            room.match_id
          );
        }
      } catch (error) {
        console.error("待機処理エラー:", error);

        setMessage(
          `待機処理エラー：${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        );
      } finally {
        isProcessing = false;
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [roomId, playerRole, onMatchStart]);

  function generateRoomCode() {
    const characters =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i += 1) {
      const randomIndex = Math.floor(
        Math.random() * characters.length
      );

      code += characters[randomIndex];
    }

    return code;
  }

  async function createRoom() {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      console.error(
        "ユーザー取得エラー:",
        userError
      );

      setMessage(
        "ログイン情報を取得できませんでした"
      );
      return;
    }

    const newRoomCode = generateRoomCode();

    const { data: room, error } = await supabase
  .from("rooms")
  .insert({
    room_code: newRoomCode,
    host_id: currentUser.id,
    guest_id: null,
    status: "waiting",
  })
  .select()
  .single();

    if (error) {
      console.error("部屋作成エラー:", error);

      setMessage(
        `部屋を作成できませんでした：${error.message}`
      );
      return;
    }

    console.log("作成した部屋:", room);

setRoomId(room.id);
    setPlayerRole("host");
    setCreatedCode(newRoomCode);
    setIsWaiting(true);
    setMessage("参加者を待っています！");
  }

  async function joinRoom() {
    const normalizedCode = roomCode
      .trim()
      .toUpperCase();

    if (normalizedCode.length !== 6) {
      setMessage(
        "6文字のルームコードを入力してください"
      );
      return;
    }

    setMessage("部屋を探しています…");

    const { data: room, error: searchError } =
      await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", normalizedCode)
        .maybeSingle();

    if (searchError) {
      console.error("部屋検索エラー:", searchError);

      setMessage(
        `検索エラー：${searchError.message}`
      );
      return;
    }

    if (!room) {
      setMessage("部屋が見つかりませんでした");
      return;
    }

    if (room.status !== "waiting") {
      setMessage("この部屋はすでに対戦中です");
      return;
    }

    if (room.guest_id) {
      setMessage(
        "この部屋にはすでに参加者がいます"
      );
      return;
    }

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      setMessage(
        "ログイン情報を取得できませんでした"
      );
      return;
    }

    if (room.host_id === currentUser.id) {
      setMessage(
        "自分で作成した部屋には参加できません"
      );
      return;
    }


    const {
  data: joinedRoom,
  error: joinError,
} = await supabase
  .from("rooms")
  .update({
    guest_id: currentUser.id,
    status: "ready",
  })
  .eq("id", room.id)
  .eq("status", "waiting")
  .is("guest_id", null)
  .select("*")
  .maybeSingle();

console.log("入室処理の確認", {
  roomId: room.id,
  hostId: room.host_id,
  guestIdBefore: room.guest_id,
  currentUserId: currentUser.id,
  joinedRoom,
  joinError,
});

if (joinError) {
  console.error("入室エラー:", joinError);

  setMessage(
    `入室エラー：${joinError.message}`
  );
  return;
}

if (!joinedRoom) {
  setMessage(
    "この部屋には入室できませんでした。新しい部屋を作成して、もう一度試してください"
  );
  return;
}

setRoomId(joinedRoom.id);
setPlayerRole("guest");
setIsWaiting(true);

setMessage(
  "部屋に参加しました。ホストを待っています…"
);
  }

  return (
  <main className="online-page">
    <div className="online-background-glow online-glow-left" />
    <div className="online-background-glow online-glow-right" />

    <header className="online-header">
      <button
        type="button"
        className="online-back-button"
        onClick={onBack}
      >
        <span>←</span>
        メニューへ戻る
      </button>

      <div className="online-header-title">
        <small>NETWORK BATTLE</small>
        <h1>オンライン対戦</h1>
        <p>
          ルームを作成するか、コードを入力して対戦に参加
        </p>
      </div>

      <div className="online-connection-status">
        <span className="online-status-dot" />

        <div>
          <small>SERVER STATUS</small>
          <strong>ONLINE</strong>
        </div>
      </div>
    </header>

    {!isWaiting ? (
      <section className="online-lobby-grid">
        <article className="online-mode-card online-create-card">
          <div className="online-card-decoration" />

          <div className="online-card-icon">⚔️</div>

          <div className="online-card-content">
            <small className="online-card-kicker">
              CREATE PRIVATE ROOM
            </small>

            <h2>ルームを作成</h2>

            <p>
              専用のルームコードを発行して、
              フレンドを対戦に招待します。
            </p>

            <div className="online-feature-list">
              <span>✓ 6文字の専用コード</span>
              <span>✓ 1対1のプライベート対戦</span>
              <span>✓ 先攻・後攻はランダム</span>
            </div>
          </div>

          <button
            type="button"
            className="online-primary-button"
            onClick={createRoom}
          >
            <span>ルームを作る</span>
            <strong>＋</strong>
          </button>
        </article>

        <article className="online-mode-card online-join-card">
          <div className="online-card-icon">⌨️</div>

          <div className="online-card-content">
            <small className="online-card-kicker">
              JOIN PRIVATE ROOM
            </small>

            <h2>ルームに参加</h2>

            <p>
              相手から受け取った6文字のコードを入力してください。
            </p>
          </div>

          <div className="online-code-form">
            <label htmlFor="room-code">
              ROOM CODE
            </label>

            <input
              id="room-code"
              type="text"
              className="online-code-input"
              placeholder="ABC123"
              value={roomCode}
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) =>
                setRoomCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  joinRoom();
                }
              }}
            />

            <div className="online-code-length">
              <span
                style={{
                  width: `${(roomCode.length / 6) * 100}%`,
                }}
              />
            </div>

            <small>
              {roomCode.length} / 6 CHARACTERS
            </small>
          </div>

          <button
            type="button"
            className="online-secondary-button"
            onClick={joinRoom}
            disabled={roomCode.length !== 6}
          >
            <span>部屋に参加する</span>
            <strong>→</strong>
          </button>
        </article>

        <aside className="online-info-panel">
          <div className="online-info-heading">
            <span>i</span>

            <div>
              <small>MATCH GUIDE</small>
              <h3>対戦の流れ</h3>
            </div>
          </div>

          <ol className="online-steps">
            <li>
              <span>01</span>

              <div>
                <strong>ルームを準備</strong>
                <p>
                  作成またはコード入力でルームに入室
                </p>
              </div>
            </li>

            <li>
              <span>02</span>

              <div>
                <strong>相手を待機</strong>
                <p>
                  2人がそろうと自動で試合を準備
                </p>
              </div>
            </li>

            <li>
              <span>03</span>

              <div>
                <strong>バトル開始</strong>
                <p>
                  先攻を決定して対戦画面へ移動
                </p>
              </div>
            </li>
          </ol>
        </aside>
      </section>
    ) : (
      <section className="online-waiting">
        <div className="online-waiting-radar">
          <div className="online-radar-ring ring-one" />
          <div className="online-radar-ring ring-two" />
          <div className="online-radar-ring ring-three" />

          <div className="online-radar-center">
            {playerRole === "host" ? "⚔️" : "✓"}
          </div>
        </div>

        <small className="online-waiting-kicker">
          {playerRole === "host"
            ? "WAITING FOR OPPONENT"
            : "CONNECTED TO ROOM"}
        </small>

        <h2>
          {playerRole === "host"
            ? "対戦相手を待っています"
            : "ホストが試合を準備しています"}
        </h2>

        <p className="online-waiting-description">
          この画面を開いたままお待ちください。
          対戦の準備ができると自動的に開始します。
        </p>

        {createdCode && (
          <div className="online-created-room">
            <small>ROOM CODE</small>

            <strong>{createdCode}</strong>

            <p>
              このコードを対戦相手に伝えてください
            </p>

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    createdCode
                  );

                  setMessage(
                    "ルームコードをコピーしました"
                  );
                } catch (error) {
                  console.error(
                    "コピーエラー:",
                    error
                  );

                  setMessage(
                    "コードをコピーできませんでした"
                  );
                }
              }}
            >
              コードをコピー
            </button>
          </div>
        )}

        <div className="online-waiting-dots">
          <span />
          <span />
          <span />
        </div>
      </section>
    )}

    {message && (
      <div
        className={[
          "online-message",
          message.includes("エラー") ||
          message.includes("できません") ||
          message.includes("見つかりません")
            ? "online-message-error"
            : "",
        ].join(" ")}
      >
        <span>
          {message.includes("エラー") ||
          message.includes("できません") ||
          message.includes("見つかりません")
            ? "!"
            : "✓"}
        </span>

        <p>{message}</p>
      </div>
    )}
  </main>
);
}

export default OnlineMenu;