import "./BattleField.css";

const EFFECT_STAGGER_SECONDS = 0.22;

const ELEMENT_EFFECTS = {
  physical: {
    kind: "physical",
    icon: "⚔",
  },
  fire: {
    kind: "fire",
    icon: "🔥",
  },
  water: {
    kind: "water",
    icon: "💧",
  },
  thunder: {
    kind: "thunder",
    icon: "⚡",
  },
  nature: {
    kind: "nature",
    icon: "🍃",
  },
  light: {
    kind: "light",
    icon: "✦",
  },
  dark: {
    kind: "dark",
    icon: "☾",
  },
  chaos: {
    kind: "chaos",
    icon: "✹",
  },
};

function getAnimatedCards(cardAnimation) {
  if (Array.isArray(cardAnimation?.cards)) {
    return cardAnimation.cards.filter(Boolean);
  }

  if (cardAnimation?.card) {
    return [cardAnimation.card];
  }

  if (cardAnimation) {
    return [cardAnimation];
  }

  return [];
}

function getBattleEffect(card, animationSide) {
  const type = card?.type ?? "attack";
  const element = card?.element ?? "physical";

  let effect;

  if (type === "heal") {
    effect = {
      kind: "heal",
      icon: "✚",
    };
  } else if (type === "shield") {
    effect = {
      kind: "shield",
      icon: "🛡",
    };
  } else {
    effect =
      ELEMENT_EFFECTS[element] ??
      ELEMENT_EFFECTS.physical;
  }

  const targetsSelf =
    type === "heal" ||
    type === "shield";

  let targetSide;

  if (targetsSelf) {
    targetSide = animationSide;
  } else {
    targetSide =
      animationSide === "enemy"
        ? "player"
        : "enemy";
  }

    return {
    ...effect,
    targetSide,
  };
}

function getEffectLeftPercent(
  index,
  total,
) {
  if (total <= 1) {
    return 50;
  }

  const edgePercent =
    total === 2
      ? 35
      : total === 3
        ? 25
        : total === 4
          ? 18
          : 14;

  const availableWidth =
    100 - edgePercent * 2;

  return (
    edgePercent +
    (availableWidth * index) /
      (total - 1)
  );
}

export default function BattleField({
  isMyTurn,
  cardAnimation,
}) {
  const animatedCards =
    getAnimatedCards(cardAnimation);

  const animatedCard =
    animatedCards[0];

  const cardName =
    animatedCard?.name ??
    animatedCard?.title ??
    "CARD";

  const animationSide =
    cardAnimation?.side ??
    cardAnimation?.owner ??
    "player";

    const battleEffects =
    animatedCards.map((card) =>
      getBattleEffect(
        card,
        animationSide,
      ),
    );

  const positionedBattleEffects =
    battleEffects.map(
      (effect, index, effects) => {
        const sameSideEffects =
          effects.filter(
            (currentEffect) =>
              currentEffect.targetSide ===
              effect.targetSide,
          );

        const sameSideIndex =
          effects
            .slice(0, index)
            .filter(
              (currentEffect) =>
                currentEffect.targetSide ===
                effect.targetSide,
            ).length;

        return {
          ...effect,
          leftPercent:
            getEffectLeftPercent(
              sameSideIndex,
              sameSideEffects.length,
            ),
        };
      },
    );

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

            {cardAnimation &&
        positionedBattleEffects.length > 0 && (
          <div
            key={`effects-${
              cardAnimation.id ??
              cardAnimation.animationId ??
              cardName
            }`}
            className="battle-impact-sequence"
            aria-hidden="true"
          >
                        {positionedBattleEffects.map(
              (effect, index) => {
                const effectDelay =
                  0.16 +
                  index *
                    EFFECT_STAGGER_SECONDS;

                return (
                  <div
                    key={`${effect.kind}-${index}`}
                    className={[
                      "battle-impact",
                      `impact-${effect.kind}`,
                      `target-${effect.targetSide}`,
                    ].join(" ")}
                                        style={{
                      "--impact-delay":
                        `${effectDelay}s`,

                      "--impact-left":
                        `${effect.leftPercent}%`,
                    }}
                  >
                    <span className="battle-impact-backdrop" />

                    <span className="battle-impact-ring" />

                    <span className="battle-impact-streak battle-impact-streak-one" />

                    <span className="battle-impact-streak battle-impact-streak-two" />

                    <span className="battle-impact-symbol">
                      {effect.icon}
                    </span>

                    <span className="battle-impact-particles">
                      {Array.from({
                        length: 8,
                      }).map(
                        (
                          _,
                          particleIndex,
                        ) => (
                          <i
                            key={
                              particleIndex
                            }
                            style={{
                              "--particle-angle":
                                `${
                                  particleIndex *
                                  45
                                }deg`,
                              "--particle-delay":
                                `${
                                  particleIndex *
                                  0.012
                                }s`,
                            }}
                          />
                        ),
                      )}
                    </span>
                  </div>
                );
              },
            )}
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
            {animatedCards.map(
              (card, index) => (
                <div
                  className="battle-used-card-entry"
                  style={{
                    animationDelay:
                      `${
                        index *
                        EFFECT_STAGGER_SECONDS
                      }s`,
                  }}
                  key={`${
                    card.id ??
                    card.name ??
                    "card"
                  }-${index}`}
                >
                  <span className="battle-used-card-icon">
                    {card.icon ??
                      card.emoji ??
                      "🃏"}
                  </span>

                  <div className="battle-used-card-info">
                    <small>
                      {animationSide ===
                      "enemy"
                        ? "ENEMY USED"
                        : "YOU USED"}
                    </small>

                    <strong>
                      {card.name ??
                        card.title ??
                        "CARD"}
                    </strong>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      <div className="battle-field-line" />
    </section>
  );
}