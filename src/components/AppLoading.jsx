import "./AppLoading.css";

export default function AppLoading() {
  return (
    <main className="app-loading-screen" aria-live="polite">
      <div className="app-loading-background" aria-hidden="true">
        <span className="app-loading-orb app-loading-orb-left" />
        <span className="app-loading-orb app-loading-orb-right" />
      </div>

      <section className="app-loading-content">
        <p className="app-loading-kicker">
          TURN BASED CARD BATTLE
        </p>

        <h1 className="app-loading-logo">
          <span>CHAOS</span>
          <strong>CARDS</strong>
        </h1>

        <p className="app-loading-subtitle">
          戦略と混沌がぶつかるカードバトル
        </p>

        <div
          className="app-loading-indicator"
          role="status"
          aria-label="ゲームを準備しています"
        >
          <div className="app-loading-symbol" aria-hidden="true">
            <span className="app-loading-card app-loading-card-back" />
            <span className="app-loading-card app-loading-card-front">
              ⚡
            </span>
          </div>

          <div className="app-loading-status">
            <div className="app-loading-status-row">
              <span>ゲームを準備中</span>

              <span className="app-loading-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>

            <div className="app-loading-track" aria-hidden="true">
              <span />
            </div>

            <small>プレイヤーデータを読み込んでいます</small>
          </div>
        </div>
      </section>

      <p className="app-loading-footer">
        CHAOS CARDS
        <span>•</span>
        CONNECTING
      </p>
    </main>
  );
}