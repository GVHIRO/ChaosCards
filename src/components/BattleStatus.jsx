import "./BattleStatus.css";

export default function BattleStatus({
  name,
  icon,
  hp,
  maxHp,
  shield = 0,
  energy,
  maxEnergy,
  active = false,
  effect,
  enemy = false,
}) {
  const safeMaxHp = Math.max(1, maxHp);

  const hpRate = Math.max(
    0,
    Math.min(100, (hp / safeMaxHp) * 100),
  );

  const hpState =
    hpRate > 60
      ? "healthy"
      : hpRate > 30
        ? "warning"
        : "danger";

  return (
    <section
      className={[
        "battle-status",
        active ? "battle-status-active" : "",
        enemy ? "battle-status-enemy" : "",
        effect?.type === "damage"
          ? "battle-status-damaged"
          : "",
        effect?.type === "heal"
          ? "battle-status-healed"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="battle-status-heading">
        <div className="battle-status-player">
          <span className="battle-status-avatar">
            {icon}
          </span>

          <div className="battle-status-player-info">
            <small>
              {enemy ? "ENEMY" : "PLAYER"}
            </small>

            <h2>{name}</h2>
          </div>
        </div>

        {active && (
          <span className="battle-status-turn">
            ACTIVE
          </span>
        )}
      </div>

      {effect && (
        <div
          key={effect.id}
          className={`battle-effect ${effect.type}`}
        >
          {effect.text}
        </div>
      )}

      <div className="battle-hp-header">
        <span>HP</span>

        <strong>
          {hp}
          <small> / {maxHp}</small>
        </strong>
      </div>

      <div className="battle-hp-track">
        <div
          className={`battle-hp-fill ${hpState}`}
          style={{ width: `${hpRate}%` }}
        />

        <div className="battle-hp-shine" />
      </div>

      <div className="battle-resource-row battle-resource-row-single">
        <div className="battle-resource">
          <span className="battle-resource-icon">
            🛡️
          </span>

          <div>
            <small>SHIELD</small>
            <strong>{shield}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}