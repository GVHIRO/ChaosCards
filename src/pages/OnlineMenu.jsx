import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function OnlineMenu({ onBack, onMatchStart }) {
  const [roomCode, setRoomCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [message, setMessage] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);

  function getPlayerId() {
    let playerId = localStorage.getItem(
      "chaos-cards-player-id"
    );

    if (!playerId) {
      playerId = crypto.randomUUID();

      localStorage.setItem(
        "chaos-cards-player-id",
        playerId
      );
    }

    return playerId;
  }

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
                  turn_number: 1,
                  phase: "selecting",
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
    <div className="online-menu">
      <h1>オンライン対戦</h1>

      {!isWaiting && (
        <>
          <button type="button" onClick={createRoom}>
            部屋を作る
          </button>

          <div className="join-room">
            <input
              type="text"
              placeholder="ルームコード"
              value={roomCode}
              maxLength={6}
              onChange={(event) =>
                setRoomCode(
                  event.target.value.toUpperCase()
                )
              }
            />

            <button
              type="button"
              onClick={joinRoom}
            >
              部屋に参加
            </button>
          </div>
        </>
      )}

      {createdCode && (
        <div className="created-room">
          <p>ルームコード</p>
          <strong>{createdCode}</strong>
          <p>このコードを相手に伝えてください</p>
        </div>
      )}

      {message && (
        <p className="online-message">
          {message}
        </p>
      )}

      <button type="button" onClick={onBack}>
        戻る
      </button>
    </div>
  );
}

export default OnlineMenu;