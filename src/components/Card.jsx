import "./Card.css";

const ELEMENTS = {
  physical: {
    icon: "⚔️",
    label: "PHYSICAL",
  },
  fire: {
    icon: "🔥",
    label: "FIRE",
  },
  water: {
    icon: "💧",
    label: "WATER",
  },
  thunder: {
    icon: "⚡",
    label: "THUNDER",
  },
  nature: {
    icon: "🌿",
    label: "NATURE",
  },
  light: {
    icon: "✨",
    label: "LIGHT",
  },
  dark: {
    icon: "🌙",
    label: "DARK",
  },
  chaos: {
    icon: "🌌",
    label: "CHAOS",
  },
};

function getCardType(card) {
  if (card.type === "attack") {
    return {
      icon: "⚔️",
      label: "攻撃",
    };
  }

  if (card.type === "multiAttack") {
    return {
      icon: "🥊",
      label: "連撃",
    };
  }

  if (card.type === "heal") {
    return {
      icon: "💚",
      label: "回復",
    };
  }

  if (card.type === "shield") {
    return {
      icon: "🛡️",
      label: "防御",
    };
  }

  return {
    icon: "🎴",
    label: "特殊",
  };
}

export default function Card({
  card,
  onPlay,
  isDrawn,
  disabled,
  isPlayed,
}) {
  const element =
    ELEMENTS[card.element] ??
    ELEMENTS.physical;

  const cardType =
    getCardType(card);

  const rarityClass = String(
    card.rarity || "Common",
  ).toLowerCase();

  const elementClass = String(
    card.element || "physical",
  ).toLowerCase();

  function handleKeyDown(event) {
    if (disabled || !onPlay) {
      return;
    }

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      onPlay();
    }
  }

  return (
    <div
      className={[
        "card",
        card.type,
        `rarity-${rarityClass}`,
        `element-${elementClass}`,
        isDrawn
          ? "card-draw"
          : "",
        disabled
          ? "card-disabled"
          : "",
        isPlayed
          ? "card-played"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={
        disabled
          ? undefined
          : onPlay
      }
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <div className="card-header">
        <span className="card-name">
          {card.name}
        </span>

        <span className="card-cost">
          {card.cost}
          <span>⚡</span>
        </span>
      </div>

      <div className="card-element">
        <span>{element.icon}</span>
        <strong>{element.label}</strong>
      </div>

      <div className="card-image">
        {card.emoji}
      </div>

      <div className="card-meta-row">
        <div className="rarity">
          {card.rarity}
        </div>

        <div className="card-type">
          <span>{cardType.icon}</span>
          {cardType.label}
        </div>
      </div>

      <div className="card-description">
        {card.description}
      </div>
    </div>
  );
}