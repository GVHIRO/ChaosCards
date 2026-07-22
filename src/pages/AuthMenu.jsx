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

      if (currentUser?.is_anonymous) {
        const { error } =
          await supabase.auth.updateUser({
            email,
            password,
          });

        if (error) {
          throw error;
        }

        setMessage(
          "確認メールを送りました。メール内のリンクを開いてください。"
        );
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setMessage(
        "確認メールを送りました。メール内のリンクを開いてください。"
      );
    } catch (error) {
      console.error("登録エラー:", error);
      setMessage(
        `登録失敗：${
          error?.message || "登録できませんでした"
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