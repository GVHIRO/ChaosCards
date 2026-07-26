import "./AuthMenu.css";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthMenu({ onClose }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        throw error;
      }

      setMessage("ログインしました！");

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("ログインエラー:", error);
      setMessage(
        `ログイン失敗：${
          error?.message || "ログインできませんでした"
        }`
      );
    } finally {
      setLoading(false);
    }
  }

 async function handleRegister(event) {
  event.preventDefault();

  const normalizedEmail =
    email.trim().toLowerCase();

  if (!normalizedEmail) {
    setMessage(
      "メールアドレスを入力してください"
    );
    return;
  }

  if (password.length < 6) {
    setMessage(
      "パスワードは6文字以上にしてください"
    );
    return;
  }

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

    /*
      ゲストアカウントを正式アカウントへ昇格
    */
    if (currentUser?.is_anonymous) {
      /*
        App.jsxがメール確認後に
        パスワード設定で使用する
      */
      sessionStorage.setItem(
        "pendingAccountPassword",
        password
      );

      /*
        ここではメールだけを追加する。
        パスワードはメール確認後に設定する。
      */
      const {
        error: updateEmailError,
      } = await supabase.auth.updateUser({
        email: normalizedEmail,
      });

      if (updateEmailError) {
        sessionStorage.removeItem(
          "pendingAccountPassword"
        );

        throw updateEmailError;
      }

      setMessage(
        "確認メールを送りました。メール内のリンクを開くと、ゲストデータを引き継いだまま登録が完了します。"
      );

      return;
    }

    /*
      すでに正式アカウントへログインしている場合
    */
    if (currentUser) {
      throw new Error(
        "すでにアカウントへログインしています"
      );
    }

    /*
      セッション自体がない場合の通常登録
    */
    const {
      error: signUpError,
    } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (signUpError) {
      throw signUpError;
    }

    setMessage(
      "確認メールを送りました。メール内のリンクを開いてください。"
    );
  } catch (error) {
    console.error(
      "登録エラー:",
      error
    );

    setMessage(
      `登録失敗：${
        error instanceof Error
          ? error.message
          : "登録できませんでした"
      }`
    );
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="auth-overlay">
      <div className="auth-panel">
        <button
          type="button"
          className="auth-close-button"
          onClick={onClose}
        >
          ×
        </button>

        <h2>
          {mode === "login"
            ? "アカウントログイン"
            : "アカウント登録"}
        </h2>

        <form
          onSubmit={
            mode === "login"
              ? handleLogin
              : handleRegister
          }
        >
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            minLength={6}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "処理中..."
              : mode === "login"
                ? "ログイン"
                : "登録"}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch-button"
          onClick={() => {
            setMode((currentMode) =>
              currentMode === "login"
                ? "register"
                : "login"
            );
            setMessage("");
          }}
        >
          {mode === "login"
            ? "初めての人はこちら"
            : "アカウントを持っている人はこちら"}
        </button>

        {message && (
          <p className="auth-message">{message}</p>
        )}
      </div>
    </div>
  );
}