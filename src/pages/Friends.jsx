import "./Friends.css";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { updateStatus } from "../lib/status";
import "../App.css";

function createFriendCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 8; i += 1) {
    const randomIndex = Math.floor(
      Math.random() * characters.length
    );

    code += characters[randomIndex];
  }

  return code;
}

function createRoomCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    const randomIndex = Math.floor(
      Math.random() * characters.length
    );

    code += characters[randomIndex];
  }

  return code;
}

export default function Friends({
  onBack,
  onMatchStart,
}) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [nickname, setNickname] = useState("");
  const [friendCodeInput, setFriendCodeInput] =
    useState("");

  const [receivedRequests, setReceivedRequests] =
    useState([]);
  const [friends, setFriends] = useState([]);
  const [matchInvites, setMatchInvites] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [notification, setNotification] =
    useState("");

  

  const notificationTimerRef = useRef(null);

  function showNotification(text) {
    setNotification(text);

    if (notificationTimerRef.current) {
      window.clearTimeout(
        notificationTimerRef.current
      );
    }

    notificationTimerRef.current =
      window.setTimeout(() => {
        setNotification("");
        notificationTimerRef.current = null;
      }, 4000);
  }

  function closeNotification() {
    if (notificationTimerRef.current) {
      window.clearTimeout(
        notificationTimerRef.current
      );
      notificationTimerRef.current = null;
    }

    setNotification("");
  }

  useEffect(() => {
    initializeFriends();
  }, []);

  // フレンド申請の受信監視
  useEffect(() => {
    if (!user?.id || !profile) return undefined;

    const channel = supabase
      .channel(`friend-requests-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log(
            "フレンド申請イベント:",
            payload
          );

          if (
            payload.eventType === "INSERT" &&
            payload.new?.status === "pending"
          ) {
            showNotification(
              "🔔 新しいフレンド申請が届きました！"
            );
          }

          await loadReceivedRequests(user.id);
        }
      )
      .subscribe((status) => {
        console.log(
          "フレンド申請Realtime:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile]);
// フレンド一覧のリアルタイム監視
useEffect(() => {
  if (!user?.id) {
    return undefined;
  }

  const channel = supabase
    .channel(`friends-list-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "friends",
      },
      async (payload) => {

        const addedFriendship = payload.new;

        // 自分が関係する行だけ処理
        if (
          addedFriendship.user_id !== user.id &&
          addedFriendship.friend_id !== user.id
        ) {
          return;
        }

        await loadFriends(user.id);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "friends",
      },
      async (payload) => {

        // DELETEはpayloadの情報が少ないことがあるため、
        // イベントが来たら一覧を再取得する
        await loadFriends(user.id);
      }
    )
    .subscribe((status, error) => {
      console.log(
        "フレンド一覧Realtime:",
        status
      );

      if (error) {
        console.error(
          "フレンド一覧Realtimeエラー:",
          error
        );
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id]);
  // 自分宛ての対戦招待を監視
  useEffect(() => {
    if (!user?.id || !profile) return undefined;

    const channel = supabase
      .channel(`incoming-match-invites-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_invites",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log(
            "受信対戦招待イベント:",
            payload
          );

          if (
            payload.eventType === "INSERT" &&
            payload.new?.status === "pending"
          ) {
            showNotification(
              "⚔️ フレンドから対戦招待が届きました！"
            );
          }

          await loadMatchInvites(user.id);
        }
      )
      .subscribe((status) => {
        console.log(
          "受信対戦招待Realtime:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile]);

  // 自分が送った対戦招待の返事を監視
 // 自分が送った対戦招待の返事を監視
useEffect(() => {
  if (!user?.id || !profile) {
    return undefined;
  }

  let isStartingMatch = false;

  const channel = supabase
    .channel(`sent-match-invites-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "match_invites",
        filter: `sender_id=eq.${user.id}`,
      },
      async (payload) => {
        console.log(
          "送信対戦招待イベント:",
          payload
        );

        if (payload.new?.status === "rejected") {
          showNotification(
            "❌ 対戦招待が断られました"
          );
          setMessage("");
          return;
        }

        if (
          payload.new?.status !== "accepted" ||
          !payload.new?.room_id ||
          isStartingMatch
        ) {
          return;
        }

        isStartingMatch = true;

        showNotification(
          "🎮 対戦招待が承認されました！"
        );
await updateStatus(user.id, "battle");
        setMessage("対戦を開始しています…");

        try {
          let room = null;

// match_idが設定されるまで最大10秒待つ
for (let attempt = 0; attempt < 20; attempt += 1) {
  const {
    data,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select("id, match_id, status")
    .eq("id", payload.new.room_id)
    .maybeSingle();

  if (roomError) {
    throw new Error(
      `部屋取得エラー：${roomError.message}`
    );
  }

  if (data?.match_id) {
    room = data;
    break;
  }

  await new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });
}

if (!room?.match_id) {
  throw new Error(
    "試合の準備がタイムアウトしました"
  );
}

          if (typeof onMatchStart !== "function") {
            throw new Error(
              "対戦開始処理が設定されていません"
            );
          }
          await updateStatus(user.id, "battle");
          // 招待を送った側はguest
          await updateStatus(user.id, "battle");
          onMatchStart(room.id, "host", room.match_id);
        } catch (error) {
          console.error(
            "送信側の対戦開始エラー:",
            error
          );

          setMessage(
            error instanceof Error
              ? error.message
              : String(error)
          );

          isStartingMatch = false;
        }
      }
    )
    .subscribe((status, error) => {
      console.log(
        "送信対戦招待Realtime:",
        status
      );

      if (error) {
        console.error(
          "送信招待Realtimeエラー:",
          error
        );
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id, profile, onMatchStart]);

  // 対戦招待から作られた部屋を監視し、既存のオンライン対戦へ接続


  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        window.clearTimeout(
          notificationTimerRef.current
        );
      }
    };
  }, []);
useEffect(() => {
  if (!user) return;

  const handleUnload = async () => {
    await updateStatus(user.id, "offline");
  };

  window.addEventListener("beforeunload", handleUnload);

  return () => {
    window.removeEventListener(
      "beforeunload",
      handleUnload
    );
  };
}, [user]);
  async function initializeFriends() {
    setLoading(true);
    setMessage("");

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
        "ユーザー情報を取得できませんでした"
      );
      setLoading(false);
      return;
    }

    setUser(currentUser);

    const currentProfile = await loadProfile(
      currentUser.id
    );

    if (currentProfile) {
      setProfile(currentProfile);
      setNickname(currentProfile.nickname);
await updateStatus(currentUser.id, "online");
      await Promise.all([
        loadReceivedRequests(currentUser.id),
        loadFriends(currentUser.id),
        loadMatchInvites(currentUser.id),
      ]);
    }

    setLoading(false);
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "プロフィール取得エラー:",
        error
      );
      setMessage(
        `プロフィール取得エラー：${error.message}`
      );
      return null;
    }

    return data;
  }

  async function createProfile() {
    const trimmedNickname = nickname.trim();

    if (!user) {
      setMessage("ユーザー情報がありません");
      return;
    }

    if (
      trimmedNickname.length < 1 ||
      trimmedNickname.length > 16
    ) {
      setMessage(
        "ニックネームは1〜16文字にしてください"
      );
      return;
    }

    setMessage("プロフィールを作成しています…");

    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      const friendCode = createFriendCode();

      const { data, error } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          nickname: trimmedNickname,
          friend_code: friendCode,
        })
        .select()
        .single();

      if (!error) {
        setProfile(data);
        setNickname(data.nickname);
        setMessage(
          "プロフィールを作成しました！"
        );
        return;
      }

      if (error.code !== "23505") {
        console.error(
          "プロフィール作成エラー:",
          error
        );
        setMessage(
          `プロフィール作成エラー：${error.message}`
        );
        return;
      }
    }

    setMessage(
      "フレンドコードの作成に失敗しました。もう一度試してください"
    );
  }

  async function updateNickname() {
    const trimmedNickname = nickname.trim();

    if (!profile || !user) return;

    if (
      trimmedNickname.length < 1 ||
      trimmedNickname.length > 16
    ) {
      setMessage(
        "ニックネームは1〜16文字にしてください"
      );
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        nickname: trimmedNickname,
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("名前変更エラー:", error);
      setMessage(
        `名前変更エラー：${error.message}`
      );
      return;
    }

    setProfile(data);
    setNickname(data.nickname);
    setMessage(
      "ニックネームを変更しました！"
    );
  }

  async function sendFriendRequest() {
    if (!user || !profile) return;

    const enteredCode = friendCodeInput
      .trim()
      .toUpperCase();

    if (!enteredCode) {
      setMessage(
        "フレンドコードを入力してください"
      );
      return;
    }

    if (enteredCode === profile.friend_code) {
      setMessage("自分自身には申請できません");
      return;
    }

    const {
      data: receiver,
      error: searchError,
    } = await supabase
      .from("profiles")
      .select("id, nickname, friend_code")
      .eq("friend_code", enteredCode)
      .maybeSingle();

    if (searchError) {
      console.error(
        "フレンド検索エラー:",
        searchError
      );
      setMessage(
        `フレンド検索エラー：${searchError.message}`
      );
      return;
    }

    if (!receiver) {
      setMessage(
        "そのフレンドコードのユーザーは見つかりませんでした"
      );
      return;
    }

    const alreadyFriend = friends.some(
      (friend) => friend.id === receiver.id
    );

    if (alreadyFriend) {
      setMessage(
        `${receiver.nickname}とはすでにフレンドです`
      );
      return;
    }

    const { data: existingRequest } =
      await supabase
        .from("friend_requests")
        .select("id, status")
        .eq("sender_id", user.id)
        .eq("receiver_id", receiver.id)
        .maybeSingle();

    if (existingRequest?.status === "pending") {
      showNotification(
        `⏳ ${receiver.nickname}の返事を待っています`
      );
      return;
    }

    const { error: requestError } =
      await supabase
        .from("friend_requests")
        .upsert(
          {
            sender_id: user.id,
            receiver_id: receiver.id,
            status: "pending",
          },
          {
            onConflict: "sender_id,receiver_id",
          }
        );

    if (requestError) {
      console.error(
        "フレンド申請エラー:",
        requestError
      );
      setMessage(
        `フレンド申請エラー：${requestError.message}`
      );
      return;
    }

    setFriendCodeInput("");
    showNotification(
      `🔔 ${receiver.nickname}にフレンド申請を送りました！`
    );
  }

  async function loadReceivedRequests(userId) {
    const { data, error } = await supabase
      .from("friend_requests")
      .select(`
        id,
        sender_id,
        status,
        created_at,
        sender:profiles!friend_requests_sender_id_fkey (
          id,
          nickname,
          friend_code
        )
      `)
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "申請一覧取得エラー:",
        error
      );
      setMessage(
        `申請一覧取得エラー：${error.message}`
      );
      return;
    }

    setReceivedRequests(data ?? []);
  }

  async function acceptFriendRequest(request) {
    if (!user) return;

    const senderId = request.sender_id;

    const { error: friendsError } =
      await supabase.from("friends").insert([
        {
          user_id: user.id,
          friend_id: senderId,
        },
        {
          user_id: senderId,
          friend_id: user.id,
        },
      ]);

    if (
      friendsError &&
      friendsError.code !== "23505"
    ) {
      console.error(
        "フレンド追加エラー:",
        friendsError
      );
      setMessage(
        `フレンド追加エラー：${friendsError.message}`
      );
      return;
    }

    const { error: updateError } =
      await supabase
        .from("friend_requests")
        .update({
          status: "accepted",
        })
        .eq("id", request.id);

    if (updateError) {
      console.error(
        "申請承認エラー:",
        updateError
      );
      setMessage(
        `申請承認エラー：${updateError.message}`
      );
      return;
    }

    showNotification(
      `✅ ${request.sender.nickname}とフレンドになりました！`
    );

    await Promise.all([
      loadReceivedRequests(user.id),
      loadFriends(user.id),
    ]);
  }

  async function rejectFriendRequest(request) {
    if (!user) return;

    const { error } = await supabase
      .from("friend_requests")
      .update({
        status: "rejected",
      })
      .eq("id", request.id);

    if (error) {
      console.error(
        "申請拒否エラー:",
        error
      );
      setMessage(
        `申請拒否エラー：${error.message}`
      );
      return;
    }

    showNotification(
      "フレンド申請を拒否しました"
    );
    await loadReceivedRequests(user.id);
  }

  async function loadFriends(userId) {
    const { data, error } = await supabase
      .from("friends")
      .select(`
        friend_id,
        friend:profiles!friends_friend_id_fkey (
  id,
  nickname,
  friend_code,
  status
)
      `)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "フレンド一覧取得エラー:",
        error
      );
      setMessage(
        `フレンド一覧取得エラー：${error.message}`
      );
      return;
    }

    const friendProfiles = (data ?? [])
      .map((row) => row.friend)
      .filter(Boolean);

    setFriends(friendProfiles);
  }

  async function loadMatchInvites(userId) {
    const { data, error } = await supabase
      .from("match_invites")
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        room_id,
        created_at,
        sender:profiles!match_invites_sender_id_fkey (
          id,
          nickname,
          friend_code
        )
      `)
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "対戦招待取得エラー:",
        error
      );
      setMessage(
        `対戦招待取得エラー：${error.message}`
      );
      return;
    }

    setMatchInvites(data ?? []);
  }
async function deleteFriend(friend) {
  if (!user) return;

  const confirmed = window.confirm(
    `${friend.nickname}さんをフレンドから削除しますか？`
  );

  if (!confirmed) return;

  setMessage("");

  const { error } = await supabase
    .from("friends")
    .delete()
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${friend.id}),and(user_id.eq.${friend.id},friend_id.eq.${user.id})`
    );

  if (error) {
    console.error("フレンド削除エラー:", error);
    setMessage(`削除エラー：${error.message}`);
    return;
  }

  setFriends((currentFriends) =>
    currentFriends.filter(
      (currentFriend) =>
        currentFriend.id !== friend.id
    )
  );

  showNotification(
    `🗑️ ${friend.nickname}さんをフレンドから削除しました`
  );
}
  async function sendMatchInvite(friend) {
    if (!user || !profile) {
      setMessage(
        "ユーザー情報を取得できません"
      );
      return;
    }

    const {
      data: existingInvite,
      error: existingError,
    } = await supabase
      .from("match_invites")
      .select("id, status")
      .eq("sender_id", user.id)
      .eq("receiver_id", friend.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError) {
      console.error(
        "既存招待確認エラー:",
        existingError
      );
      setMessage(
        `対戦招待確認エラー：${existingError.message}`
      );
      return;
    }

    if (existingInvite) {
      showNotification(
        `⏳ ${friend.nickname}の返事を待っています…`
      );
      return;
    }

    const { data, error } = await supabase
      .from("match_invites")
      .insert({
        sender_id: user.id,
        receiver_id: friend.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        showNotification(
          `⏳ ${friend.nickname}の返事を待っています…`
        );
        return;
      }

      console.error(
        "対戦招待エラー:",
        error
      );
      setMessage(
        `対戦招待エラー：${error.message}`
      );
      return;
    }

    console.log("作成した対戦招待:", data);

    showNotification(
      `⚔️ ${friend.nickname}に対戦招待を送りました！`
    );
  }

  async function acceptMatchInvite(invite) {
  if (!user) return;

  setMessage("試合を準備しています…");

  try {
    const newRoomCode = createRoomCode();

    // 1. 部屋を作成
    const { data: room, error: roomError } =
      await supabase
        .from("rooms")
.insert({
  room_code: newRoomCode,
  host_id: invite.sender_id,
  guest_id: user.id,
  status: "ready",
})
        .select()
        .single();

    if (roomError) {
      throw new Error(
        `部屋作成エラー：${roomError.message}`
      );
    }

    // 2. コイントスを行って交互ターン制の試合を作成
    const firstPlayer =
      Math.random() < 0.5 ? "host" : "guest";
    const now = new Date().toISOString();

const { data: match, error: matchError } =
  await supabase
    .from("matches")
    .insert({
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

      host_last_seen: now,
      guest_last_seen: now,
      finish_reason: null,

      battle_logs: [
        `🪙 ${firstPlayer}が先攻`,
      ],
    })
    .select()
    .single();

    if (matchError) {
      throw new Error(
        `試合作成エラー：${matchError.message}`
      );
    }

    // 3. 部屋に試合IDを保存
    const {
  data: updatedRoom,
  error: roomUpdateError,
} = await supabase
  .from("rooms")
  .update({
    match_id: match.id,
    status: "playing",
  })
  .eq("id", room.id)
  .select("id, match_id, status")
  .maybeSingle();

if (roomUpdateError) {
  throw new Error(
    `部屋更新エラー：${roomUpdateError.message}`
  );
}

if (!updatedRoom) {
  throw new Error(
    "部屋を更新できませんでした。roomsのUPDATEポリシーを確認してください"
  );
}

if (!updatedRoom.match_id) {
  throw new Error(
    "部屋に試合IDを保存できませんでした"
  );
}

console.log("更新後の部屋:", updatedRoom);

    if (roomUpdateError) {
      throw new Error(
        `部屋更新エラー：${roomUpdateError.message}`
      );
    }

    // 4. 招待を承認済みにする
    const { data: updatedInvite, error: inviteError } =
      await supabase
        .from("match_invites")
        .update({
          status: "accepted",
          room_id: room.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invite.id)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .select()
        .maybeSingle();

    if (inviteError) {
      throw new Error(
        `招待承認エラー：${inviteError.message}`
      );
    }

    if (!updatedInvite) {
      throw new Error(
        "この招待はすでに処理されています"
      );
    }

    setMatchInvites((current) =>
      current.filter(
        (item) => item.id !== invite.id
      )
    );

    showNotification(
  "🎮 対戦招待を承認しました！"
);

await updateStatus(user.id, "battle");

// 5. 承諾側をすぐ対戦画面へ移動
 if (typeof onMatchStart === "function") {
      onMatchStart(room.id, "guest", match.id);
    } else {
      throw new Error(
        "対戦開始処理が設定されていません"
      );
    }
  } catch (error) {
    console.error("対戦準備エラー:", error);

    setMessage(
      error instanceof Error
        ? error.message
        : String(error)
    );
  }
}

  async function rejectMatchInvite(invite) {
    if (!user) return;

    const { data, error } = await supabase
      .from("match_invites")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invite.id)
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) {
      console.error(
        "対戦招待拒否エラー:",
        error
      );
      setMessage(
        `対戦招待拒否エラー：${error.message}`
      );
      return;
    }

    if (!data) {
      setMessage(
        "この招待はすでに処理されています"
      );
      return;
    }

    setMatchInvites((current) =>
      current.filter(
        (item) => item.id !== invite.id
      )
    );

    showNotification(
      "対戦招待を断りました"
    );
  }

    if (loading) {
    return (
      <div className="friends-page">
        <div className="friends-loading">
          <div className="friends-loading-spinner" />
          <p>FRIENDS DATA LOADING...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="friends-page">
        <div className="friends-profile-create-card">
          <button
            className="friends-back-button"
            type="button"
            onClick={onBack}
          >
            ← BACK
          </button>

          <div className="friends-create-icon">
            👤
          </div>

          <p className="friends-eyebrow">
            CHAOS CARDS
          </p>

          <h1>CREATE PROFILE</h1>

          <p className="friends-create-description">
            フレンド機能で使用する
            ニックネームを設定してください。
          </p>

          <label className="friends-input-label">
            NICKNAME
            <input
              className="friends-input"
              type="text"
              value={nickname}
              maxLength={16}
              placeholder="1〜16文字"
              onChange={(event) =>
                setNickname(event.target.value)
              }
            />
          </label>

          <button
            className="friends-primary-button"
            type="button"
            onClick={createProfile}
          >
            プロフィールを作成
          </button>

          {message && (
            <p className="friends-message">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      {notification && (
        <div className="friends-notification">
          <span>{notification}</span>

          <button
            className="friends-notification-close"
            type="button"
            onClick={closeNotification}
            aria-label="通知を閉じる"
          >
            ×
          </button>
        </div>
      )}

      <div className="friends-shell">
        <header className="friends-header">
          <button
            className="friends-back-button"
            type="button"
            onClick={onBack}
          >
            ← BACK
          </button>

          <div className="friends-header-title">
            <span>CHAOS CARDS</span>
            <h1>FRIENDS</h1>
          </div>

          <div className="friends-online-badge">
            <span className="friends-online-dot" />
            ONLINE
          </div>
        </header>

        {message && (
          <p className="friends-message">
            {message}
          </p>
        )}

        <main className="friends-dashboard">
          {/* 左カラム */}
          <aside className="friends-sidebar">
            <section className="friends-panel friends-profile-panel">
              <div className="friends-panel-heading">
                <div>
                  <span>PLAYER DATA</span>
                  <h2>YOUR PROFILE</h2>
                </div>
              </div>

              <div className="friends-avatar">
                {profile.nickname
                  ?.charAt(0)
                  .toUpperCase() || "?"}
              </div>

              <div className="friends-profile-name">
                <span>PLAYER NAME</span>
                <strong>{profile.nickname}</strong>
              </div>

              <label className="friends-input-label">
                NICKNAME
                <input
                  className="friends-input"
                  type="text"
                  value={nickname}
                  maxLength={16}
                  onChange={(event) =>
                    setNickname(event.target.value)
                  }
                />
              </label>

              <button
                className="friends-secondary-button"
                type="button"
                onClick={updateNickname}
                disabled={
                  nickname.trim() ===
                  profile.nickname
                }
              >
                名前を変更
              </button>

              <div className="friend-code-box">
                <span>YOUR FRIEND CODE</span>
                <strong>
                  {profile.friend_code}
                </strong>
              </div>
            </section>

            <section className="friends-panel friends-add-panel">
              <div className="friends-panel-heading">
                <div>
                  <span>SEARCH PLAYER</span>
                  <h2>ADD FRIEND</h2>
                </div>
              </div>

              <p className="friends-panel-description">
                相手の8文字のフレンドコードを
                入力してください。
              </p>

              <input
                className="friends-input friends-code-input"
                type="text"
                value={friendCodeInput}
                maxLength={8}
                placeholder="ABCD1234"
                onChange={(event) =>
                  setFriendCodeInput(
                    event.target.value.toUpperCase()
                  )
                }
              />

              <button
                className="friends-primary-button"
                type="button"
                onClick={sendFriendRequest}
              >
                ＋ フレンド申請
              </button>
            </section>
          </aside>

          {/* 中央カラム */}
          <section className="friends-main-panel friends-panel">
            <div className="friends-panel-heading friends-list-heading">
              <div>
                <span>CONNECTED PLAYERS</span>
                <h2>FRIEND LIST</h2>
              </div>

              <div className="friends-count-badge">
                {friends.length}
              </div>
            </div>

            {friends.length === 0 ? (
              <div className="friends-empty-state">
                <div className="friends-empty-icon">
                  👥
                </div>

                <h3>NO FRIENDS YET</h3>

                <p>
                  フレンドコードを使って
                  プレイヤーを追加しましょう。
                </p>
              </div>
            ) : (
              <div className="friends-card-list">
                {friends.map((friend) => (
                  <article
                    className="friends-player-card"
                    key={friend.id}
                  >
                    <div className="friends-player-avatar">
                      {friend.nickname
                        ?.charAt(0)
                        .toUpperCase() || "?"}

                      <span
  className={`friends-status-dot ${
    friend.status ?? "offline"
  }`}
/>
                    </div>

                    <div className="friends-player-info">
                      <div className="friends-player-name-row">
                        <strong>
                          {friend.nickname}
                        </strong>

                        <span className="friends-status-label">
  {friend.status === "battle"
    ? "IN MATCH"
    : friend.status === "online"
    ? "ONLINE"
    : "OFFLINE"}
</span>
                      </div>

                      <small>
                        ID: {friend.friend_code}
                      </small>
                    </div>

                    <div className="friend-actions">
                      <button
                        className="friends-invite-button"
                        type="button"
                        onClick={() =>
                          sendMatchInvite(friend)
                        }
                      >
                        ⚔ CHALLENGE
                      </button>

                      <button
                        className="delete-friend-button"
                        type="button"
                        onClick={() =>
                          deleteFriend(friend)
                        }
                        aria-label={`${friend.nickname}を削除`}
                      >
                        🗑
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* 右カラム */}
          <aside className="friends-notification-column">
            <section className="friends-panel">
              <div className="friends-panel-heading">
                <div>
                  <span>BATTLE REQUESTS</span>
                  <h2>MATCH INVITES</h2>
                </div>

                <div className="friends-count-badge">
                  {matchInvites.length}
                </div>
              </div>

              {matchInvites.length === 0 ? (
                <div className="friends-mini-empty">
                  <span>⚔️</span>
                  <p>
                    対戦招待はありません
                  </p>
                </div>
              ) : (
                <div className="friends-request-list">
                  {matchInvites.map((invite) => (
                    <article
                      className="friends-request-card friends-match-request"
                      key={invite.id}
                    >
                      <div className="friends-request-header">
                        <div className="friends-small-avatar">
                          {invite.sender?.nickname
                            ?.charAt(0)
                            .toUpperCase() || "?"}
                        </div>

                        <div>
                          <strong>
                            {invite.sender?.nickname ??
                              "プレイヤー"}
                          </strong>

                          <small>
                            対戦に招待しています
                          </small>
                        </div>
                      </div>

                      <div className="friends-request-actions">
                        <button
                          className="friends-accept-button"
                          type="button"
                          onClick={() =>
                            acceptMatchInvite(invite)
                          }
                        >
                          対戦する
                        </button>

                        <button
                          className="friends-reject-button"
                          type="button"
                          onClick={() =>
                            rejectMatchInvite(invite)
                          }
                        >
                          断る
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="friends-panel">
              <div className="friends-panel-heading">
                <div>
                  <span>PLAYER REQUESTS</span>
                  <h2>FRIEND REQUESTS</h2>
                </div>

                <div className="friends-count-badge">
                  {receivedRequests.length}
                </div>
              </div>

              {receivedRequests.length === 0 ? (
                <div className="friends-mini-empty">
                  <span>👤</span>
                  <p>
                    フレンド申請はありません
                  </p>
                </div>
              ) : (
                <div className="friends-request-list">
                  {receivedRequests.map(
                    (request) => (
                      <article
                        className="friends-request-card"
                        key={request.id}
                      >
                        <div className="friends-request-header">
                          <div className="friends-small-avatar">
                            {request.sender.nickname
                              ?.charAt(0)
                              .toUpperCase() || "?"}
                          </div>

                          <div>
                            <strong>
                              {request.sender.nickname}
                            </strong>

                            <small>
                              {
                                request.sender
                                  .friend_code
                              }
                            </small>
                          </div>
                        </div>

                        <div className="friends-request-actions">
                          <button
                            className="friends-accept-button"
                            type="button"
                            onClick={() =>
                              acceptFriendRequest(
                                request
                              )
                            }
                          >
                            承認
                          </button>

                          <button
                            className="friends-reject-button"
                            type="button"
                            onClick={() =>
                              rejectFriendRequest(
                                request
                              )
                            }
                          >
                            拒否
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}