import "./Menu.css";
export default function Menu({
  onStart,
  onOnline,
  onDeckBuilder,
  onFriends,
  onSettings,
  openAuthMenu,
  currentUser,
  handleLogout,
}) {
  const isAnonymous = currentUser?.is_anonymous;

  return (
    <main className="home-page">
      <div className="home-background-glow home-glow-one" />
      <div className="home-background-glow home-glow-two" />

      <section className="home-shell">
        <header className="home-header">
          <div className="home-brand">
            <span className="home-brand-kicker">
              TURN BASED CARD BATTLE
            </span>

            <h1 className="home-title">
              <span>CHAOS</span>
              <strong>CARDS</strong>
            </h1>

            <p className="home-subtitle">
              戦略と混沌がぶつかるカードバトル
            </p>
          </div>

          <div className="home-account-panel">
            <span className="home-account-label">
              PLAYER
            </span>

            <strong className="home-account-name">
              {isAnonymous
                ? "GUEST PLAYER"
                : currentUser?.email || "PLAYER"}
            </strong>

            <span
              className={`home-account-status ${
                isAnonymous ? "guest" : "online"
              }`}
            >
              <i />
              {isAnonymous
                ? "ゲストプレイ中"
                : "ログイン中"}
            </span>
          </div>
        </header>

        <section className="home-menu-grid">
          <button
            type="button"
            className="home-mode-card home-mode-main"
            onClick={onStart}
          >
            <span className="home-mode-icon">⚔️</span>

            <span className="home-mode-content">
              <small>SOLO BATTLE</small>
              <strong>CPU対戦</strong>
              <span>
                CPUを相手にデッキを試す
              </span>
            </span>

            <span className="home-mode-arrow">›</span>
          </button>

          <button
            type="button"
            className="home-mode-card"
            onClick={onOnline}
          >
            <span className="home-mode-icon">🌐</span>

            <span className="home-mode-content">
              <small>ONLINE MATCH</small>
              <strong>オンライン対戦</strong>
              <span>
                世界のプレイヤーと戦う
              </span>
            </span>

            <span className="home-mode-arrow">›</span>
          </button>

          <button
            type="button"
            className="home-mode-card"
            onClick={onFriends}
          >
            <span className="home-mode-icon">👥</span>

            <span className="home-mode-content">
              <small>FRIENDS</small>
              <strong>フレンド</strong>
              <span>
                フレンド管理・対戦招待
              </span>
            </span>

            <span className="home-mode-arrow">›</span>
          </button>

          <button
            type="button"
            className="home-mode-card"
            onClick={onDeckBuilder}
          >
            <span className="home-mode-icon">🃏</span>

            <span className="home-mode-content">
              <small>DECK BUILDER</small>
              <strong>デッキ編集</strong>
              <span>
                20枚のデッキを構築する
              </span>
            </span>

            <span className="home-mode-arrow">›</span>
          </button>
          <button
  type="button"
  className="home-mode-card"
  onClick={onSettings}
>
  <span className="home-mode-icon">⚙️</span>

  <span className="home-mode-content">
    <small>SETTINGS</small>
    <strong>設定</strong>
    <span>
      BGM・SE・演出を変更する
    </span>
  </span>

  <span className="home-mode-arrow">›</span>
</button>
        </section>

        <footer className="home-footer">
          <div className="home-tip">
            <span>⚡</span>
            <p>
              レアリティとコストのバランスを考えて、
              自分だけのデッキを作ろう。
            </p>
          </div>

          <div className="home-account-actions">
            {isAnonymous ? (
              <button
                type="button"
                className="home-secondary-button"
                onClick={openAuthMenu}
              >
                ログイン・アカウント登録
              </button>
            ) : (
              <button
                type="button"
                className="home-secondary-button danger"
                onClick={handleLogout}
              >
                ログアウト
              </button>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}