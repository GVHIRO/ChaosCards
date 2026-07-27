import "./StarterDeckNotice.css";

export default function StarterDeckNotice({
  onClose,
  onOpenDeck,
}) {
  return (
    <div
      className="starter-notice-overlay"
      role="presentation"
    >
      <section
        className="starter-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="starter-notice-title"
      >
        <div className="starter-notice-icon">
          🃏
        </div>

        <small>
          CARD SYSTEM UPDATE
        </small>

        <h2 id="starter-notice-title">
          デッキを変更しました
        </h2>

        <p>
          カード入手システムの導入に伴い、
          これまでの所持カードをリセットしました。
        </p>

        <div className="starter-notice-change">
          <span>
            使用中のデッキ
          </span>

          <strong>
            スターターデッキ
          </strong>

          <small>
            20枚・8種類
          </small>
        </div>

        <p className="starter-notice-subtext">
          スターターデッキ以外のカードは
          パック開封などで入手できます。
          所持コインはリセットされていません。
        </p>

        <div className="starter-notice-actions">
          <button
            type="button"
            className="starter-notice-deck-button"
            onClick={onOpenDeck}
          >
            デッキを確認
          </button>

          <button
            type="button"
            className="starter-notice-close-button"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </section>
    </div>
  );
}