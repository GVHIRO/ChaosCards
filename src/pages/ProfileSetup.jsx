import { useState } from "react";
import { supabase } from "../lib/supabase";
import "./ProfileSetup.css";

export default function ProfileSetup({
  onComplete,
}) {

  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] =
    useState("default");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
const FRIEND_CODE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateFriendCode() {
  return Array.from(
    { length: 8 },
    () =>
      FRIEND_CODE_CHARS[
        Math.floor(
          Math.random() *
            FRIEND_CODE_CHARS.length
        )
      ]
  ).join("");
}
  const handleCreateProfile = async (event) => {
    event.preventDefault();

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 2) {
      setError(
        "プレイヤー名は2文字以上にしてください。"
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "ログイン情報を取得できませんでした。"
        );
      }

      /*
  既存アカウントにはすでにfriend_codeがあるので、
  先に取得して保持する
*/
const {
  data: existingProfile,
  error: existingProfileError,
} = await supabase
  .from("profiles")
  .select("friend_code")
  .eq("id", user.id)
  .maybeSingle();

if (existingProfileError) {
  throw existingProfileError;
}

let createdProfile = null;
let profileError = null;

/*
  新規プロフィールの場合はコードを生成。
  万が一コードが重複したら最大5回作り直す。
*/
for (
  let attempt = 0;
  attempt < 5;
  attempt += 1
) {
  const friendCode =
    existingProfile?.friend_code ??
    generateFriendCode();

  const result = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,

        username: trimmedUsername,

        /*
          古いフレンド機能との互換用
        */
        nickname: trimmedUsername,

        /*
          既存コードは維持。
          新規ユーザーだけ生成する。
        */
        friend_code: friendCode,

        avatar_id: selectedAvatar,
        bio: bio.trim(),
      },
      {
        onConflict: "id",
      }
    )
    .select(
      `
        id,
        username,
        nickname,
        friend_code,
        avatar_id,
        bio
      `
    )
    .single();

  createdProfile = result.data;
  profileError = result.error;

  if (!profileError) {
    break;
  }

  const errorText = `
    ${profileError.message ?? ""}
    ${profileError.details ?? ""}
  `.toLowerCase();

  const friendCodeCollision =
    profileError.code === "23505" &&
    errorText.includes("friend");

  /*
    既存コードのエラーや名前重複なら
    再生成しても直らないので終了
  */
  if (
    existingProfile?.friend_code ||
    !friendCodeCollision
  ) {
    break;
  }
}

     if (profileError) {
  const errorText = `
    ${profileError.message ?? ""}
    ${profileError.details ?? ""}
  `.toLowerCase();

  if (
    profileError.code === "23505" &&
    (
      errorText.includes("username") ||
      errorText.includes("nickname")
    )
  ) {
    throw new Error(
      "そのプレイヤー名は既に使用されています。"
    );
  }

  if (
    profileError.code === "23505" &&
    errorText.includes("friend")
  ) {
    throw new Error(
      "フレンドコードの作成に失敗しました。もう一度お試しください。"
    );
  }

  throw profileError;
}

onComplete?.(createdProfile);
    } catch (error) {
      console.error(
        "profile creation error:",
        error
      );

      setError(
        error?.message ??
          "プロフィールの作成に失敗しました。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="profile-setup-page">
      <form
        className="profile-setup-form"
        onSubmit={handleCreateProfile}
      >
        <h1>プロフィール設定</h1>

        <label>
          プレイヤー名
          <input
            type="text"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            maxLength={16}
            placeholder="プレイヤー名を入力"
            required
          />
        </label>

        <label>
          アイコン
          <select
            value={selectedAvatar}
            onChange={(event) =>
              setSelectedAvatar(
                event.target.value
              )
            }
          >
            <option value="default">
              デフォルト
            </option>

            <option value="fire">
              ファイア
            </option>

            <option value="ice">
              アイス
            </option>

            <option value="chaos">
              カオス
            </option>
          </select>
        </label>

        <label>
          一言コメント
          <textarea
            value={bio}
            onChange={(event) =>
              setBio(event.target.value)
            }
            maxLength={80}
            placeholder="よろしくお願いします！"
          />
        </label>

        {error && (
          <p className="profile-setup-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "保存中..."
            : "プロフィールを作成"}
        </button>
      </form>
    </main>
  );
}