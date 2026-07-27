import "./Menu.css";

export default function Menu({
  onStart,
  onChallenge,
  onOnline,
  onDeckBuilder,
  onPackOpening,
  onRewards,
  onFriends,
  onSettings,
  onCardLibrary,
  onAchievements,

  coins = 0,
  claimableRewardCount = 0,

  onOpenUpdates,
  appVersion = "1.0.0",
  hasUnreadUpdate = false,

  openAuthMenu,
  currentUser,
  handleLogout,
  playerName = "PLAYER",
  playerAvatarUrl = "",
  playerEmail = "",
  playerTitle = "",
}) {
  const isAnonymous =
    currentUser?.is_anonymous;

  const displayName =
    isAnonymous
      ? "GUEST PLAYER"
      : playerName?.trim() ||
        "PLAYER";

  const avatarFallback =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() || "P";

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
            <div className="home-version-row">
  <span className="home-version-badge">
    Ver.{appVersion}
  </span>

  <span className="home-version-status">
    OFFICIAL RELEASE
  </span>
</div>
          </div>

          <div className="home-account-panel">
  <div className="home-account-profile">
    <div className="home-account-avatar">
      {playerAvatarUrl ? (
        <img
          src={playerAvatarUrl}
          alt={`${displayName}のアイコン`}
        />
      ) : (
        <span>
          {avatarFallback}
        </span>
      )}
    </div>

    <div className="home-account-identity">
      <span className="home-account-label">
        PLAYER
      </span>

      <strong
        className="home-account-name"
        title={displayName}
      >
        {displayName}
      </strong>

      {playerTitle && (
        <span
          className="home-account-title"
          title={playerTitle}
        >
          ［{playerTitle}］
        </span>
      )}

      {!isAnonymous && playerEmail && (
        <span
          className="home-account-email"
          title={playerEmail}
        >
          {playerEmail}
        </span>
      )}

      <span
  className={`home-account-status ${
    isAnonymous
      ? "guest"
      : "online"
  }`}
>
  <i />

  {isAnonymous
    ? "ゲストプレイ中"
    : "ログイン中"}
</span>

<span className="home-account-coins">
  🪙 {coins}
</span>
    </div>
  </div>
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
  className="
    home-mode-card
    home-mode-challenge
  "
  onClick={onChallenge}
>
  <span className="home-mode-icon">
    🎯
  </span>

  <span className="home-mode-content">
    <small>
      CHALLENGE MODE
    </small>

    <strong>
      チャレンジ
    </strong>

    <span>
      特殊ルールのCPU戦を攻略する
    </span>
  </span>

  <span className="home-mode-arrow">
    ›
  </span>
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
  className={[
    "home-mode-card",
    "home-mode-pack",
  ].join(" ")}
  onClick={onPackOpening}
>
  <span className="home-mode-icon">
    🎁
  </span>

  <span className="home-mode-content">
    <small>
      CARD PACK
    </small>

    <strong>
      パック開封
    </strong>

    <span>
      コインを使ってカードを入手する
    </span>
  </span>

  <span className="home-mode-arrow">
    ›
  </span>
</button>

<button
  type="button"
  className={[
    "home-mode-card",
    "home-mode-rewards",
  ].join(" ")}
  onClick={onRewards}
>
  <span className="home-mode-icon">
    🎁
  </span>

  <span className="home-mode-content">
    <small>
      REWARD CENTER
    </small>

    <strong>
      報酬センター
    </strong>

    <span>
      デイリー・実績・収集報酬を受け取る
    </span>
  </span>

  {claimableRewardCount > 0 && (
    <span className="home-reward-badge">
      {claimableRewardCount > 99
        ? "99+"
        : claimableRewardCount}
    </span>
  )}

  <span className="home-mode-arrow">
    ›
  </span>
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

        <div
          className="home-fullscreen-note"
          role="note"
        >
          <span>🖥️</span>

          <p>
            ※PCでは、フルスクリーン表示でのプレイを推奨します。
          </p>
        </div>

        <footer className="home-footer">
          <div className="home-tip">
            <span>⚡</span>
            <p>
              レアリティとコストのバランスを考えて、
              自分だけのデッキを作ろう。
            </p>
          </div>

          <div className="home-account-actions">
            <button
  type="button"
  className="
    home-secondary-button
    home-updates-button
  "
  onClick={
    onOpenUpdates
  }
  aria-label={
    hasUnreadUpdate
      ? "未読のお知らせがあります"
      : "お知らせを開く"
  }
>
  <span>
    🔔 お知らせ
  </span>

  {hasUnreadUpdate && (
    <i
      className="home-update-unread"
      aria-label="未読"
    />
  )}
</button>
  <button
    type="button"
    className="
      home-secondary-button
      home-library-button
    "
    onClick={onCardLibrary}
  >
    📚 カード図鑑
  </button>
<button
  type="button"
  className="
    home-secondary-button
    home-achievements-button
  "
  onClick={onAchievements}
>
  🏆 実績
</button>
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
      className="
        home-secondary-button
        danger
      "
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