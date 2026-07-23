import "./Card.css";

export default function Card({
  card,
  onPlay,
  isDrawn,
  disabled,
  isPlayed,
}) {
  return (
    <div
 className={`card ${card.type} rarity-${card.rarity.toLowerCase()} ${
  isDrawn ? "card-draw" : ""
} ${disabled ? "card-disabled" : ""} ${
  isPlayed ? "card-played" : ""
}`}
  onClick={disabled ? undefined : onPlay}
>
      <div className="card-header">
        <span>{card.name}</span>
        <span>{card.cost}⚡</span>
      </div>

      <div className="card-image">
        {card.emoji}
      </div>

      <div className="rarity">
        {card.rarity}
      </div>

      <div className="card-type">
  {card.type === "attack" && "⚔ 攻撃"}
  {card.type === "heal" && "💚 回復"}
  {card.type === "shield" && "🛡 防御"}
</div>

      <div className="card-description">
        {card.description}
      </div>

      <div className="card-value">
  {card.type === "attack" && `${card.damage} ダメージ`}

  {card.type === "heal" && `${card.heal} 回復`}

  {card.type === "shield" && "次のダメージ半減"}
</div>
    </div>
  );
}