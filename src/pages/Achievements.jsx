import "./Achievements.css";
import {
  REWARD_CHANGE_EVENT,
  claimAchievementReward,
  getAchievementRewardState,
} from "../lib/rewards";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import achievements from
  "../data/achievements";

import {
  ACHIEVEMENT_UNLOCK_EVENT,
  EQUIPPED_TITLE_CHANGE_EVENT,
  equipAchievementTitle,
  getAchievementStats,
  getEquippedAchievementId,
  getUnlockedAchievementIds,
} from "../lib/achievements";

export default function Achievements({
  onBack,
}) {
  const [
    unlockedAchievementIds,
    setUnlockedAchievementIds,
  ] = useState(
    getUnlockedAchievementIds,
  );

  const [
    equippedAchievementId,
    setEquippedAchievementId,
  ] = useState(
    getEquippedAchievementId,
  );

  const [stats, setStats] =
    useState(
      getAchievementStats,
    );

  const unlockedSet =
    useMemo(
      () =>
        new Set(
          unlockedAchievementIds,
        ),
      [unlockedAchievementIds],
    );

  const equippedAchievement =
    useMemo(() => {
      return (
        achievements.find(
          (achievement) =>
            achievement.id ===
            equippedAchievementId,
        ) ?? null
      );
    }, [
      equippedAchievementId,
    ]);

useEffect(() => {
  function refreshAchievements() {
    setUnlockedAchievementIds(
      getUnlockedAchievementIds(),
    );

    setStats(
      getAchievementStats(),
    );
  }

  function refreshEquippedTitle() {
    setEquippedAchievementId(
      getEquippedAchievementId(),
    );
  }

  function refreshRewards() {
    /*
      新しいオブジェクトを入れて
      実績報酬の受取状態を再描画する。
    */
    setStats(
      getAchievementStats(),
    );
  }

  window.addEventListener(
    ACHIEVEMENT_UNLOCK_EVENT,
    refreshAchievements,
  );

  window.addEventListener(
    EQUIPPED_TITLE_CHANGE_EVENT,
    refreshEquippedTitle,
  );

  window.addEventListener(
    REWARD_CHANGE_EVENT,
    refreshRewards,
  );

  return () => {
    window.removeEventListener(
      ACHIEVEMENT_UNLOCK_EVENT,
      refreshAchievements,
    );

    window.removeEventListener(
      EQUIPPED_TITLE_CHANGE_EVENT,
      refreshEquippedTitle,
    );

    window.removeEventListener(
      REWARD_CHANGE_EVENT,
      refreshRewards,
    );
  };
}, []);

  const unlockedCount =
    achievements.filter(
      (achievement) =>
        unlockedSet.has(
          achievement.id,
        ),
    ).length;

  const progress =
    achievements.length > 0
      ? (
          unlockedCount /
          achievements.length
        ) *
        100
      : 0;

  function handleTitleToggle(
    achievement,
  ) {
    const isCurrentlyEquipped =
      equippedAchievementId ===
      achievement.id;

    const nextAchievement =
      equipAchievementTitle(
        isCurrentlyEquipped
          ? null
          : achievement.id,
      );

    setEquippedAchievementId(
      nextAchievement?.id ?? null,
    );
  }

  return (
    <main className="achievements-page">
      <div className="achievements-glow achievements-glow-one" />
      <div className="achievements-glow achievements-glow-two" />

      <section className="achievements-shell">
        <header className="achievements-header">
          <button
            type="button"
            className="achievements-back-button"
            onClick={onBack}
          >
            ← メニューへ戻る
          </button>

          <div className="achievements-heading">
            <small>
              PLAYER ACHIEVEMENTS
            </small>

            <h1>
              🏆 実績
            </h1>

            <p>
              バトルを重ねてすべての実績を解除しよう
            </p>
          </div>

          <div className="achievements-total">
            <span>UNLOCKED</span>

            <strong>
              {unlockedCount}

              <small>
                /{achievements.length}
              </small>
            </strong>
          </div>
        </header>

        <section className="achievements-progress-panel">
          <div className="achievements-progress-text">
            <span>
              COMPLETION
            </span>

            <strong>
              {Math.round(progress)}%
            </strong>
          </div>

          <div className="achievements-progress-track">
            <span
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </section>

        <section
          className={[
            "equipped-title-panel",
            equippedAchievement
              ? "has-title"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="equipped-title-icon">
            {equippedAchievement
              ? equippedAchievement.icon
              : "🏷️"}
          </div>

          <div className="equipped-title-content">
            <small>
              CURRENT TITLE
            </small>

            <strong>
              {equippedAchievement
                ? `［${equippedAchievement.title}］`
                : "称号未装備"}
            </strong>

            <p>
              {equippedAchievement
                ? "プレイヤー名と一緒に表示されます"
                : "解除済みの実績から称号を選択できます"}
            </p>
          </div>

          {equippedAchievement && (
            <button
              type="button"
              onClick={() => {
                equipAchievementTitle(
                  null,
                );

                setEquippedAchievementId(
                  null,
                );
              }}
            >
              称号を外す
            </button>
          )}
        </section>

        <section className="achievement-stats-grid">
          <article>
            <span>⚔️</span>

            <div>
              <small>
                TOTAL BATTLES
              </small>

              <strong>
                {stats.totalBattles}
              </strong>
            </div>
          </article>

          <article>
            <span>🏆</span>

            <div>
              <small>
                TOTAL WINS
              </small>

              <strong>
                {stats.totalWins}
              </strong>
            </div>
          </article>

          <article>
            <span>🌐</span>

            <div>
              <small>
                ONLINE
              </small>

              <strong>
                {stats.onlineBattles}
              </strong>
            </div>
          </article>

          <article>
            <span>🎯</span>

            <div>
              <small>
                CHALLENGE
              </small>

              <strong>
                {stats.challengeBattles}
              </strong>
            </div>
          </article>
        </section>

        <section className="achievements-grid">
  {achievements.map(
    (achievement) => {
      const isUnlocked =
        unlockedSet.has(
          achievement.id,
        );

      const isEquipped =
        equippedAchievementId ===
        achievement.id;

      const rewardState =
        getAchievementRewardState(
          achievement.id,
        );

      return (
        <article
          key={achievement.id}
          className={[
            "achievement-card",
            isUnlocked
              ? "is-unlocked"
              : "is-locked",
            isEquipped
              ? "is-equipped"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="achievement-card-icon">
            {isUnlocked
              ? achievement.icon
              : "🔒"}
          </div>

          <div className="achievement-card-content">
            <small>
              {achievement.category}
            </small>

            <h2>
              {achievement.title}
            </h2>

            <p>
              {achievement.description}
            </p>
          </div>

          {isUnlocked && (
            <div className="achievement-card-actions">
              <button
                type="button"
                className={
                  isEquipped
                    ? "is-equipped"
                    : ""
                }
                aria-pressed={
                  isEquipped
                }
                onClick={() => {
                  handleTitleToggle(
                    achievement,
                  );
                }}
              >
                {isEquipped
                  ? "✓ 称号装備中"
                  : "称号として装備"}
              </button>

              <button
                type="button"
                className="achievement-coin-button"
                disabled={
                  !rewardState.canClaim
                }
                onClick={() => {
                  const result =
                    claimAchievementReward(
                      achievement.id,
                    );

                  if (result.ok) {
                    setStats(
                      getAchievementStats(),
                    );
                  }
                }}
              >
                {rewardState.claimed
                  ? `✓ 🪙 ${rewardState.amount} 受取済み`
                  : `🪙 ${rewardState.amount} 受け取る`}
              </button>
            </div>
          )}

          <span className="achievement-reward-value">
            🪙 {rewardState.amount}
          </span>

          <span className="achievement-card-status">
            {isEquipped
              ? "★ EQUIPPED"
              : isUnlocked
                ? "✓ UNLOCKED"
                : "LOCKED"}
          </span>
        </article>
      );
    },
  )}
</section>
      </section>
    </main>
  );
}