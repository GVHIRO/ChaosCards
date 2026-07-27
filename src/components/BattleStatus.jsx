import "./BattleStatus.css";

export default function BattleStatus({
  name,
  title = "",
  icon,
  avatarUrl = "",
  hp,
  maxHp,
  shield,
  energy = 0,
  maxEnergy = 0,
  burn = {
    damage: 0,
    turns: 0,
  },
  weaken = 0,
  active,
  effect,
  enemy,
}) {
  const safeMaxHp = Math.max(
    1,
    Number(maxHp) || 1,
  );
const safeTitle =
  typeof title === "string"
    ? title.trim()
    : "";
  const safeHp = Math.max(
    0,
    Number(hp) || 0,
  );

  const safeMaxEnergy = Math.max(
    0,
    Number(maxEnergy) || 0,
  );

  const safeEnergy = Math.max(
    0,
    Math.min(
      safeMaxEnergy,
      Number(energy) || 0,
    ),
  );

  const burnDamage = Math.max(
    0,
    Number(burn?.damage) || 0,
  );

  const burnTurns = Math.max(
    0,
    Number(burn?.turns) || 0,
  );

  const weakenValue = Math.max(
    0,
    Number(weaken) || 0,
  );

  const hasBurn =
    burnDamage > 0 &&
    burnTurns > 0;

  const hasWeaken =
    weakenValue > 0;

  const hasStatusEffects =
    hasBurn || hasWeaken;

  const hpRate = Math.max(
    0,
    Math.min(
      100,
      (safeHp / safeMaxHp) * 100,
    ),
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
        active
          ? "battle-status-active"
          : "",
        enemy
          ? "battle-status-enemy"
          : "",
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
          <div className="battle-status-avatar battle-status-avatar-frame">
            {avatarUrl ? (
              <img
                className="battle-status-avatar-image"
                src={avatarUrl}
                alt={`${name}のプロフィール画像`}
              />
            ) : (
              <span className="battle-status-avatar-fallback">
                {icon}
              </span>
            )}
          </div>

          <div className="battle-status-player-info">
            <small>
              {enemy
                ? "ENEMY"
                : "PLAYER"}
            </small>

            <h2>{name}</h2>

{safeTitle && (
  <span className="battle-status-player-title">
    ［{safeTitle}］
  </span>
)}
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

        <div className="battle-hp-header-values">
          <strong>
            {safeHp}
            <small>
              {" "}
              / {safeMaxHp}
            </small>
          </strong>

          {safeMaxEnergy > 0 && (
            <span
              className="battle-status-energy"
              aria-label={`エネルギー ${safeEnergy}/${safeMaxEnergy}`}
            >
              <span className="battle-status-energy-icon">
                ⚡
              </span>

              <span className="battle-status-energy-value">
                {safeEnergy}
                <small>
                  {" "}
                  / {safeMaxEnergy}
                </small>
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="battle-hp-track">
        <div
          className={`battle-hp-fill ${hpState}`}
          style={{
            width: `${hpRate}%`,
          }}
        />

        <div className="battle-hp-shine" />
      </div>

      <div className="battle-resource-row battle-resource-row-single">
        <div className="battle-resource">
          <span className="battle-resource-icon">
            🛡️
          </span>

          <div
            className={`battle-shield-panel ${
              shield > 0
                ? "has-shield"
                : "no-shield"
            }`}
          >
            <div className="battle-shield-content">
              <div className="battle-shield-heading">
                <span>SHIELD</span>

                <small>
                  次の相手ターン終了まで有効
                </small>
              </div>

              <strong>
                {Math.max(
                  0,
                  Number(shield) || 0,
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {hasStatusEffects && (
        <div className="battle-status-effects">
          <span className="battle-status-effects-label">
            STATUS EFFECT
          </span>

          <div className="battle-status-effect-list">
            {hasBurn && (
              <div className="battle-status-effect-badge battle-status-effect-burn">
                <span className="battle-status-effect-icon">
                  🔥
                </span>

                <div>
                  <strong>
                    炎上
                  </strong>

                  <small>
                    {burnDamage}ダメージ
                    ×残り{burnTurns}ターン
                  </small>
                </div>
              </div>
            )}

            {hasWeaken && (
              <div className="battle-status-effect-badge battle-status-effect-weaken">
                <span className="battle-status-effect-icon">
                  ⬇️
                </span>

                <div>
                  <strong>
                    攻撃弱体化
                  </strong>

                  <small>
                    次の攻撃ダメージ
                    -{weakenValue}
                  </small>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}