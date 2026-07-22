import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
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

export default function Friends({ onBack }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [nickname, setNickname] = useState("");
  const [friendCodeInput, setFriendCodeInput] =
    useState("");

  const [receivedRequests, setReceivedRequests] =
    useState([]);
  const [friends, setFriends] = useState([]);

  const [loading, setLoading] = useState(true);
const [message, setMessage] = useState("");
const [notification, setNotification] = useState("");

const notificationTimerRef = useRef(null);
function showNotification(text) {
  setNotification(text);

  if (notificationTimerRef.current) {
    window.clearTimeout(notificationTimerRef.current);
  }

  notificationTimerRef.current = window.setTimeout(() => {
    setNotification("");
    notificationTimerRef.current = null;
  }, 4000);
}

function closeNotification() {
  if (notificationTimerRef.current) {
    window.clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = null;
  }

  setNotification("");
}
  // 最初の読み込み
  useEffect(() => {
    initializeFriends();
  }, []);

  // リアルタイム監視
  useEffect(() => {
  if (!user?.id || !profile) return;

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
        console.log("申請イベント受信:", payload);

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
      console.log("Realtime状態:", status);
    });

  return () => {
    supabase.removeChannel(channel);

    if (notificationTimerRef.current) {
      window.clearTimeout(
        notificationTimerRef.current
      );
      notificationTimerRef.current = null;
    }
  };
}, [user?.id, profile]);
useEffect(() => {
  console.log("notificationの現在値:", notification);
}, [notification]);
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

      await Promise.all([
        loadReceivedRequests(currentUser.id),
        loadFriends(currentUser.id),
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
      console.error("プロフィール取得エラー:", error);
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

    for (let attempt = 0; attempt < 5; attempt += 1) {
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
        setMessage("プロフィールを作成しました！");
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
      setMessage(`名前変更エラー：${error.message}`);
      return;
    }

    setProfile(data);
    setNickname(data.nickname);
    setMessage("ニックネームを変更しました！");
  }

  async function sendFriendRequest() {
    if (!user || !profile) return;

    const enteredCode = friendCodeInput
      .trim()
      .toUpperCase();

    if (!enteredCode) {
      setMessage("フレンドコードを入力してください");
      return;
    }

    if (enteredCode === profile.friend_code) {
      setMessage("自分自身には申請できません");
      return;
    }

    const { data: receiver, error: searchError } =
      await supabase
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

    const { data: existingRequest } = await supabase
      .from("friend_requests")
      .select("id, status")
      .eq("sender_id", user.id)
      .eq("receiver_id", receiver.id)
      .maybeSingle();

    if (existingRequest?.status === "pending") {
      setMessage("すでに申請を送っています");
      return;
    }

    const { error: requestError } = await supabase
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

setMessage(
  `${receiver.nickname}にフレンド申請を送りました！`
);

alert(
  `${receiver.nickname}にフレンド申請を送りました！`
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
      console.error("申請一覧取得エラー:", error);
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

    const { error: friendsError } = await supabase
      .from("friends")
      .insert([
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

    const { error: updateError } = await supabase
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

    setMessage(
      `${request.sender.nickname}とフレンドになりました！`
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
      console.error("申請拒否エラー:", error);
      setMessage(
        `申請拒否エラー：${error.message}`
      );
      return;
    }

    setMessage("フレンド申請を拒否しました");
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
          friend_code
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

  if (loading) {
    return (
      <div className="friends-page">
        <p>読み込み中…</p>
      </div>
    );
  }

  if (!profile) {
  return (
  <div className="friends-page">
    

    <div className="friends-container">
      <button
        className="friends-back-button"
        type="button"
        onClick={onBack}
      >
        ← メニューに戻る
      </button>

      <h1>フレンド</h1>


        <section className="friends-section">
        <h2>プロフィール作成</h2>

        <p>
          最初にゲーム内で使う名前を決めてください。
        </p>

        <input
          type="text"
          value={nickname}
          maxLength={16}
          placeholder="ニックネーム"
          onChange={(event) =>
            setNickname(event.target.value)
          }
        />

        <button
          type="button"
          onClick={createProfile}
        >
          プロフィールを作成
        </button>
</section>
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

    <button type="button" onClick={onBack}>
        ← メニューに戻る
      </button>

      <h1>フレンド</h1>

      {message && (
        <p className="friends-message">
          {message}
        </p>
      )}

      <section className="friends-section">
        <h2>自分のプロフィール</h2>

        <label>
          ニックネーム
          <input
            type="text"
            value={nickname}
            maxLength={16}
            onChange={(event) =>
              setNickname(event.target.value)
            }
          />
        </label>

        <button
          type="button"
          onClick={updateNickname}
          disabled={
            nickname.trim() === profile.nickname
          }
        >
          名前を変更
        </button>

        <div className="friend-code-box">
          <span>自分のフレンドコード</span>
          <strong>{profile.friend_code}</strong>
        </div>
      </section>

      <section className="friends-section">
        <h2>フレンド申請を送る</h2>

        <div className="friend-request-form">
          <input
            type="text"
            value={friendCodeInput}
            maxLength={8}
            placeholder="8文字のフレンドコード"
            onChange={(event) =>
              setFriendCodeInput(
                event.target.value.toUpperCase()
              )
            }
          />

          <button
            type="button"
            onClick={sendFriendRequest}
          >
            申請する
          </button>
        </div>
      </section>

      <section className="friends-section">
        <h2>
          届いた申請（{receivedRequests.length}）
        </h2>

        {receivedRequests.length === 0 ? (
          <p>届いている申請はありません。</p>
        ) : (
          <div className="friend-list">
            {receivedRequests.map((request) => (
              <div
                className="friend-list-item"
                key={request.id}
              >
                <div>
                  <strong>
                    {request.sender.nickname}
                  </strong>
                  <small>
                    {request.sender.friend_code}
                  </small>
                </div>

                <div className="friend-actions">
                  <button
                    type="button"
                    onClick={() =>
                      acceptFriendRequest(request)
                    }
                  >
                    承認
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      rejectFriendRequest(request)
                    }
                  >
                    拒否
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="friends-section">
        <h2>フレンド一覧（{friends.length}）</h2>

        {friends.length === 0 ? (
          <p>フレンドはまだいません。</p>
        ) : (
          <div className="friend-list">
            {friends.map((friend) => (
              <div
                className="friend-list-item"
                key={friend.id}
              >
                <div>
                  <strong>{friend.nickname}</strong>
                  <small>{friend.friend_code}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}