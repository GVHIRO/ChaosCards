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
function getProfileName(profile) {
  return (
    profile?.username?.trim() ||
    profile?.nickname?.trim() ||
    "PLAYER"
  );
}
const EMPTY_BATTLE_STATS = {
  total_battles: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  win_rate: 0,
  current_win_streak: 0,
  best_win_streak: 0,
};

function getBattleResultLabel(result) {
  if (result === "win") {
    return "WIN";
  }

  if (result === "loss") {
    return "LOSE";
  }

  return "DRAW";
}

function formatBattleDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}
export default function Friends({
  onBack,
  onMatchStart,
  onProfileUpdated,
}) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [
  nicknameInput,
  setNicknameInput,
] = useState("");
  const [friendCodeInput, setFriendCodeInput] =
    useState("");

  const [receivedRequests, setReceivedRequests] =
    useState([]);
  const [friends, setFriends] = useState([]);
  const [matchInvites, setMatchInvites] = useState([]);

const [
  battleStats,
  setBattleStats,
] = useState(
  EMPTY_BATTLE_STATS
);

const [
  battleHistory,
  setBattleHistory,
] = useState([]);

const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [notification, setNotification] =
    useState("");

  const avatarInputRef = useRef(null);

const [
  uploadingAvatar,
  setUploadingAvatar,
] = useState(false);

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

  try {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!currentUser) {
      throw new Error(
        "ユーザー情報を取得できませんでした"
      );
    }

    setUser(currentUser);

    const currentProfile = await loadProfile(
      currentUser.id
    );

    if (!currentProfile) {
      throw new Error(
        "プロフィールを取得できませんでした"
      );
    }

    setProfile(currentProfile);

setNicknameInput(
  currentProfile.username ??
    currentProfile.nickname ??
    ""
);

    /*
      1つ失敗しても、ほかの読み込みを止めない
    */
    const results = await Promise.allSettled([
  loadReceivedRequests(currentUser.id),
  loadFriends(currentUser.id),
  loadMatchInvites(currentUser.id),
  loadBattleStats(),
  loadBattleHistory(currentUser.id),
]);

    const rejectedResult = results.find(
      (result) =>
        result.status === "rejected"
    );

    if (rejectedResult) {
      console.error(
        "フレンドデータ読込エラー:",
        rejectedResult.reason
      );

      setMessage(
        rejectedResult.reason?.message ??
          "一部のフレンドデータを取得できませんでした"
      );
    }
  } catch (error) {
    console.error(
      "フレンド画面初期化エラー:",
      error
    );

    setMessage(
      error instanceof Error
        ? error.message
        : String(error)
    );
  } finally {
    /*
      成功・失敗にかかわらず必ず実行
    */
    setLoading(false);
  }
}

  async function loadProfile(userId) {
  const {
    data,
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
      status
    `)
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `プロフィール取得エラー：${profileError.message}`
    );
  }

  return data;
}
async function loadBattleStats() {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_battle_stats"
  );

  if (error) {
    throw new Error(
      `戦績取得エラー：${error.message}`
    );
  }

  const stats =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!stats) {
    setBattleStats({
      ...EMPTY_BATTLE_STATS,
    });

    return;
  }

  setBattleStats({
    total_battles:
      Number(stats.total_battles) || 0,

    wins:
      Number(stats.wins) || 0,

    losses:
      Number(stats.losses) || 0,

    draws:
      Number(stats.draws) || 0,

    win_rate:
      Number(stats.win_rate) || 0,

    current_win_streak:
      Number(
        stats.current_win_streak
      ) || 0,

    best_win_streak:
      Number(
        stats.best_win_streak
      ) || 0,
  });
}

async function loadBattleHistory(userId) {
  const {
    data,
    error,
  } = await supabase
    .from("battle_history")
    .select(`
      id,
      match_id,
      rematch_count,
      result,
      user_final_hp,
      opponent_final_hp,
      opponent_name,
      opponent_avatar_url,
      finish_reason,
      finished_at
    `)
    .eq("user_id", userId)
    .order(
      "finished_at",
      {
        ascending: false,
      }
    )
    .limit(10);

  if (error) {
    throw new Error(
      `対戦履歴取得エラー：${error.message}`
    );
  }

  setBattleHistory(
    data ?? []
  );
}
  async function createProfile() {
    const trimmedNickname = nicknameInput.trim();

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
        setNicknameInput(data.nickname);
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
  const trimmedNickname =
    nicknameInput.trim();

  if (!profile || !user) {
    return;
  }

  if (
    trimmedNickname.length < 1 ||
    trimmedNickname.length > 16
  ) {
    showNotification(
      "⚠️ ニックネームは1〜16文字にしてください"
    );
    return;
  }

  /*
    以前の通常メッセージを消して、
    レイアウトに余白が残らないようにする
  */
  setMessage("");

  const {
    data: updatedProfile,
    error,
  } = await supabase
    .from("profiles")
    .update({
      username: trimmedNickname,
      nickname: trimmedNickname,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", user.id)
    .select(`
  id,
  username,
  nickname,
  friend_code,
  avatar_id,
  avatar_url,
  avatar_path,
  bio,
  status
`)
    .single();

  if (error) {
    console.error(
      "名前変更エラー:",
      error
    );

    if (error.code === "23505") {
      showNotification(
        "❌ そのニックネームは既に使用されています"
      );
      return;
    }

    showNotification(
      `❌ 名前を変更できませんでした：${error.message}`
    );
    return;
  }

  setProfile(updatedProfile);

  setNicknameInput(
    updatedProfile.username ??
      updatedProfile.nickname ??
      ""
  );

  /*
    App.jsx側にも変更を反映
  */
  onProfileUpdated?.(updatedProfile);

  /*
    通常メッセージではなくポップアップ通知
  */
  showNotification(
    "✅ ニックネームを変更しました！"
  );
}
async function uploadProfilePhoto(event) {
  const file =
    event.target.files?.[0];

  /*
    同じ画像を続けて選択した場合も
    changeイベントが動くようにリセット
  */
  event.target.value = "";

  if (!file) {
    return;
  }

  if (!user || !profile) {
    showNotification(
      "❌ プロフィールを読み込めません"
    );
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (
    !allowedTypes.includes(file.type)
  ) {
    showNotification(
      "❌ JPG・PNG・WebP画像を選択してください"
    );
    return;
  }

  const maxFileSize =
    5 * 1024 * 1024;

  if (file.size > maxFileSize) {
    showNotification(
      "❌ 画像は5MB以下にしてください"
    );
    return;
  }

  if (uploadingAvatar) {
    return;
  }

  setUploadingAvatar(true);
  setMessage("");

  let uploadedPath = null;

  try {
    const extensionMap = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension =
      extensionMap[file.type];

    const uniqueName =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    /*
      必ずユーザーIDのフォルダへ保存する。
      RLSポリシーもこの構造を前提としている。
    */
    uploadedPath =
      `${user.id}/${uniqueName}.${extension}`;

    const oldAvatarPath =
      profile.avatar_path;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("avatars")
      .upload(
        uploadedPath,
        file,
        {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    /*
      公開バケットの画像URLを取得
    */
    const {
      data: publicUrlData,
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(uploadedPath);

    const avatarUrl =
      publicUrlData?.publicUrl;

    if (!avatarUrl) {
      throw new Error(
        "画像URLを取得できませんでした"
      );
    }

    const {
      data: updatedProfile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        avatar_path: uploadedPath,
      })
      .eq("id", user.id)
      .select(`
        id,
        username,
        nickname,
        friend_code,
        avatar_id,
        avatar_url,
        avatar_path,
        bio,
        status
      `)
      .single();

    if (profileError) {
      /*
        DB保存に失敗した場合は、
        今アップロードした画像を削除
      */
      await supabase.storage
        .from("avatars")
        .remove([uploadedPath]);

      uploadedPath = null;

      throw profileError;
    }

    setProfile(updatedProfile);

    onProfileUpdated?.(
      updatedProfile
    );

    showNotification(
      "✅ プロフィール写真を変更しました！"
    );

    /*
      新しい写真の保存が成功したあとに
      古い写真を削除する
    */
    if (
      oldAvatarPath &&
      oldAvatarPath !== uploadedPath
    ) {
      const {
        error: removeError,
      } = await supabase.storage
        .from("avatars")
        .remove([oldAvatarPath]);

      if (removeError) {
        console.warn(
          "古いプロフィール画像を削除できませんでした:",
          removeError
        );
      }
    }
  } catch (error) {
    console.error(
      "プロフィール写真変更エラー:",
      error
    );

    showNotification(
      `❌ 写真を変更できませんでした：${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  } finally {
    setUploadingAvatar(false);
  }
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
  /*
    user_id・friend_idのどちら側に自分がいても
    正しく相手のIDを取り出す
  */
  const {
    data: friendshipRows,
    error: friendshipError,
  } = await supabase
    .from("friends")
    .select("user_id, friend_id")
    .or(
      `user_id.eq.${userId},friend_id.eq.${userId}`
    );

  if (friendshipError) {
    console.error(
      "フレンド関係取得エラー:",
      friendshipError
    );

    setMessage(
      `フレンド一覧取得エラー：${friendshipError.message}`
    );
    return;
  }

  /*
    各行から「自分ではない方」のIDだけを取得。
    自分自身を指す壊れた行も除外する。
  */
  const friendIds = [
    ...new Set(
      (friendshipRows ?? [])
        .map((row) => {
          const userIsMe =
            String(row.user_id) ===
            String(userId);

          return userIsMe
            ? row.friend_id
            : row.user_id;
        })
        .filter(
          (friendId) =>
            friendId &&
            String(friendId) !==
              String(userId)
        )
    ),
  ];

  if (friendIds.length === 0) {
    setFriends([]);
    return;
  }

  const {
  data: friendProfiles,
  error: friendProfilesError,
} = await supabase
  .from("profiles")
  .select(`
    id,
    username,
    nickname,
    friend_code,
    status,
    avatar_id,
    avatar_url
  `)
  .in("id", friendIds);

if (friendProfilesError) {
  console.error(
    "フレンドプロフィール取得エラー:",
    friendProfilesError
  );

  setMessage(
    `フレンドプロフィール取得エラー：${friendProfilesError.message}`
  );

  return;
}

  /*
    friendIdsの順番を維持しつつ、
    自分自身が紛れ込まないよう再確認する。
  */
  const orderedProfiles = friendIds
    .map((friendId) =>
      (friendProfiles ?? []).find(
        (friendProfile) =>
          String(friendProfile.id) ===
          String(friendId)
      )
    )
    .filter(
      (friendProfile) =>
        friendProfile &&
        String(friendProfile.id) !==
          String(userId)
    );

  setFriends(orderedProfiles);
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
    `${getProfileName(friend)}さんをフレンドから削除しますか？`
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
    `🗑️ ${getProfileName(friend)}さんをフレンドから削除しました`
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
        `⏳ ${getProfileName(friend)}の返事を待っています…`
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
          `⏳ ${getProfileName(friend)}の返事を待っています…`
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
      `⚔️ ${getProfileName(friend)}に対戦招待を送りました！`
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

        <button
          type="button"
          className="friends-back-button"
          onClick={onBack}
        >
          ← BACK
        </button>
      </div>
    </div>
  );
}
if (message && !profile) {
  return (
    <div className="friends-page">
      <div className="friends-profile-create-card">
        <button
          type="button"
          className="friends-back-button"
          onClick={onBack}
        >
          ← BACK
        </button>

        <h1>読み込みエラー</h1>

        <p className="friends-message">
          {message}
        </p>

        <button
          type="button"
          className="friends-primary-button"
          onClick={initializeFriends}
        >
          もう一度読み込む
        </button>
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
  CHANGE NICKNAME

  <input
  className="friends-input"
  type="text"
  value={nicknameInput}
  maxLength={16}
  autoComplete="off"
  onChange={(event) => {
    setNicknameInput(
      event.target.value
    );
  }}
/>
</label>

<button
  className="friends-secondary-button"
  type="button"
  onClick={updateNickname}
  disabled={
    !nicknameInput.trim() ||
    nicknameInput.trim() ===
      (
        profile.username ??
        profile.nickname ??
        ""
      )
  }
>
  変更を確定
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
            <span>FRIENDS</span>
            <h1>フレンド</h1>
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
                  <span>YOUR PROFILE</span>
                  <h2>自分のプロフィール</h2>
                </div>
              </div>

              <div className="friends-photo-editor">
  <button
    type="button"
    className="friends-avatar friends-photo-button"
    onClick={() =>
      avatarInputRef.current?.click()
    }
    disabled={uploadingAvatar}
    aria-label="プロフィール写真を変更"
  >
    <span className="friends-photo-frame">
  {profile.avatar_url ? (
    <img
      className="friends-profile-photo"
      src={profile.avatar_url}
      alt={`${getProfileName(
        profile
      )}のプロフィール写真`}
    />
  ) : (
    <span className="friends-avatar-fallback">
      {getProfileName(profile)
        .charAt(0)
        .toUpperCase()}
    </span>
  )}
</span>

    <span className="friends-photo-edit-badge">
      {uploadingAvatar
        ? "…"
        : "📷"}
    </span>
  </button>

  <input
    ref={avatarInputRef}
    className="friends-photo-input"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={uploadProfilePhoto}
    disabled={uploadingAvatar}
  />

  <small className="friends-photo-help">
    {uploadingAvatar
      ? "アップロード中..."
      : "クリックして写真を変更"}
  </small>
</div>

              <div className="friends-profile-name">
                <span>NICKNAME</span>
                <strong>
  {profile.username ??
    profile.nickname ??
    "PLAYER"}
</strong>
              </div>

              <label className="friends-input-label">
  CHANGE NICKNAME

  <input
    className="friends-input"
    type="text"
    value={nicknameInput}
    maxLength={16}
    autoComplete="off"
    onChange={(event) => {
      setNicknameInput(
        event.target.value
      );
    }}
  />
</label>

<button
  className="friends-secondary-button"
  type="button"
  onClick={updateNickname}
  disabled={
    !nicknameInput.trim() ||
    nicknameInput.trim() ===
      getProfileName(profile)
  }
>
  変更を確定
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
                  <span>ADD FRIEND</span>
                  <h2>フレンド追加</h2>
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
                <span>FRIEND LIST</span>
                <h2>フレンド一覧</h2>
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
                  フレンドがいません。
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
  {friend.avatar_url ? (
    <img
      className="friends-player-photo"
      src={friend.avatar_url}
      alt=""
    />
  ) : (
    <span>
      {getProfileName(friend)
        .charAt(0)
        .toUpperCase()}
    </span>
  )}

  <span
    className={`friends-status-dot ${
      friend.status ?? "offline"
    }`}
  />
</div>

                    <div className="friends-player-info">
                      <div className="friends-player-name-row">
                        <strong>
  {getProfileName(friend)}
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
                        aria-label={`${getProfileName(friend)}を削除`}
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
                  <span>MATCH INVITES</span>
                  <h2>対戦招待</h2>
                </div>

                <div className="friends-count-badge">
                  {matchInvites.length}
                </div>
              </div>

              {matchInvites.length === 0 ? (
                <div className="friends-mini-empty">
                  <span>⚔️</span>
                  <p>
                    対戦招待はありません。
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
                  <span>FRIEND REQUESTS</span>
                  <h2>フレンドリクエスト</h2>
                </div>

                <div className="friends-count-badge">
                  {receivedRequests.length}
                </div>
              </div>

              {receivedRequests.length === 0 ? (
                <div className="friends-mini-empty">
                  <span>👤</span>
                  <p>
                    フレンド申請はありません。
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

            <section className="friends-panel friends-history-panel">
              <div className="friends-panel-heading">
                <div>
                  <span>BATTLE RECORD</span>
                  <h2>オンライン戦績</h2>
                </div>

                <div className="friends-count-badge">
                  {battleStats.total_battles}
                </div>
              </div>

              <div className="friends-battle-summary">
                <div className="friends-win-rate-card">
                  <div>
                    <span>WIN RATE</span>

                    <small>
                      ONLINE BATTLE
                    </small>
                  </div>

                  <strong>
                    {Number(
                      battleStats.win_rate
                    ).toFixed(1)}
                    %
                  </strong>
                </div>

                <div className="friends-stats-grid">
                  <div className="friends-stat-item">
                    <span>PLAY</span>
                    <strong>
                      {
                        battleStats.total_battles
                      }
                    </strong>
                  </div>

                  <div className="friends-stat-item friends-stat-win">
                    <span>WIN</span>
                    <strong>
                      {battleStats.wins}
                    </strong>
                  </div>

                  <div className="friends-stat-item friends-stat-loss">
                    <span>LOSE</span>
                    <strong>
                      {battleStats.losses}
                    </strong>
                  </div>

                  <div className="friends-stat-item friends-stat-draw">
                    <span>DRAW</span>
                    <strong>
                      {battleStats.draws}
                    </strong>
                  </div>

                  <div className="friends-stat-item">
                    <span>STREAK</span>
                    <strong>
                      {
                        battleStats.current_win_streak
                      }
                    </strong>
                  </div>

                  <div className="friends-stat-item">
                    <span>BEST</span>
                    <strong>
                      {
                        battleStats.best_win_streak
                      }
                    </strong>
                  </div>
                </div>
              </div>

              <div className="friends-history-heading">
                <span>RECENT MATCHES</span>
                <small>最新10試合</small>
              </div>

              {battleHistory.length === 0 ? (
                <div className="friends-mini-empty friends-history-empty">
                  <span>📊</span>

                  <p>
                    まだオンライン対戦の
                    履歴がありません。
                  </p>
                </div>
              ) : (
                <div className="friends-history-list">
                  {battleHistory.map(
                    (battle) => (
                      <article
                        className={`friends-history-item friends-history-${battle.result}`}
                        key={battle.id}
                      >
                        <div className="friends-history-avatar">
                          {battle.opponent_avatar_url ? (
                            <img
                              src={
                                battle.opponent_avatar_url
                              }
                              alt=""
                            />
                          ) : (
                            <span>
                              {battle.opponent_name
                                ?.charAt(0)
                                .toUpperCase() ||
                                "?"}
                            </span>
                          )}
                        </div>

                        <div className="friends-history-info">
                          <strong>
                            {battle.opponent_name ||
                              "PLAYER"}
                          </strong>

                          <div className="friends-history-meta">
                            <span className="friends-history-hp">
                              HP{" "}
                              {
                                battle.user_final_hp
                              }
                              -
                              {
                                battle.opponent_final_hp
                              }
                            </span>

                            <time
                              dateTime={
                                battle.finished_at
                              }
                            >
                              {formatBattleDate(
                                battle.finished_at
                              )}
                            </time>
                          </div>
                        </div>

                        <span
                          className={`friends-history-result friends-history-result-${battle.result}`}
                        >
                          {getBattleResultLabel(
                            battle.result
                          )}
                        </span>
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