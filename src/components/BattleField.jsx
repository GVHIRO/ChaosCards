import "./BattleField.css";
export default function BattleField({
  isMyTurn,
  cardAnimation,
}) {
  const animatedCards = Array.isArray(cardAnimation?.cards)
  ? cardAnimation.cards
  : cardAnimation?.card
    ? [cardAnimation.card]
    : cardAnimation
      ? [cardAnimation]
      : [];

const animatedCard = animatedCards[0];

const effectIcons = animatedCards.map((card) => {
  const type = card.type ?? "attack";

  const icon =
    type === "heal"
      ? "✚"
      : type === "shield"
        ? "🛡"
        : "⚔";

  return {
    type,
    icon,
  };
});

const cardName =
  animatedCard?.name ??
  animatedCard?.title ??
  "CARD";

const cardIcon =
  animatedCard?.icon ??
  animatedCard?.emoji ??
  "🃏";

  const animationSide =
    cardAnimation?.side ??
    cardAnimation?.owner ??
    "player";

  return (
    <section className="battle-field">
      <div className="battle-field-grid" />

      <div
        className={[
          "battle-turn-banner",
          isMyTurn
            ? "battle-turn-player"
            : "battle-turn-enemy",
        ].join(" ")}
      >
        <small>CURRENT TURN</small>

        <strong>
          {isMyTurn
            ? "YOUR TURN"
            : "ENEMY TURN"}
        </strong>
      </div>

      <div className="battle-field-center">
        <span className="battle-field-symbol">
          ⚔
        </span>

        <span className="battle-field-label">
          BATTLEFIELD
        </span>
      </div>

    {cardAnimation && (
  <div
    key={`impact-${cardAnimation.id ?? cardName}`}
    className="battle-impact-sequence"
  >
    {effectIcons.map((effect, index) => (
      <div
        key={`${effect.type}-${index}`}
        className={`battle-impact impact-${effect.type}`}
        style={{
         animationDelay: `${index * 0.45}s`,
        }}
      >
        <span
          style={{
            animationDelay: `${index * 0.45}s`,
          }}
        >
          {effect.icon}
        </span>

        <div
          className="battle-impact-ring"
          style={{
           animationDelay: `${index * 0.45}s`,
          }}
        />
      </div>
    ))}
  </div>
)}

      {cardAnimation && (
        <div
          key={
  cardAnimation.id ??
  cardAnimation.animationId ??
  cardName
}
          className={[
            "battle-card-animation",
            animationSide === "enemy"
              ? "from-enemy"
              : "from-player",
          ].join(" ")}
        >
          <div className="battle-used-cards">
  {animatedCards.map((card, index) => (
  <div
    className="battle-used-card-entry"
    style={{
     animationDelay: `${index * 0.6}s`,
    }}
      key={`${card.id ?? card.name ?? "card"}-${index}`}
    >
      <span className="battle-used-card-icon">
        {card.icon ?? card.emoji ?? "🃏"}
      </span>

      <div className="battle-used-card-info">
        <small>
          {animationSide === "enemy"
            ? "ENEMY USED"
            : "YOU USED"}
        </small>

        <strong>
          {card.name ?? card.title ?? "CARD"}
        </strong>
      </div>
    </div>
  ))}
</div>
        </div>
      )}

      <div className="battle-field-line" />
    </section>
  );
}