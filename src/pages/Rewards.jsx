import "./Rewards.css";

import {
  useEffect,
  useState,
} from "react";

import {
  COLLECTION_CHANGE_EVENT,
  COIN_CHANGE_EVENT,
} from "../lib/collection";

import {
  REWARD_CHANGE_EVENT,
  claimAchievementReward,
  claimAllAvailableRewards,
  claimCollectionReward,
  claimDailyCompletionBonus,
  claimDailyLogin,
  claimDailyMission,
  exchangeDuplicateCard,
  getRewardsSnapshot,
} from "../lib/rewards";

import {
  ACHIEVEMENT_UNLOCK_EVENT,
} from "../lib/achievements";

export default function Rewards({
  onBack,
}) {
  const [
    snapshot,
    setSnapshot,
  ] = useState(
    getRewardsSnapshot,
  );

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    function refresh() {
      setSnapshot(
        getRewardsSnapshot(),
      );
    }

    refresh();

    const events = [
      REWARD_CHANGE_EVENT,
      COIN_CHANGE_EVENT,
      COLLECTION_CHANGE_EVENT,
      ACHIEVEMENT_UNLOCK_EVENT,
    ];

    events.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          refresh,
        );
      },
    );

    return () => {
      events.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            refresh,
          );
        },
      );
    };
  }, []);

  function runAction(
    action,
  ) {
    const result =
      action();

    setMessage(
      result?.message ?? "",
    );

    setSnapshot(
      getRewardsSnapshot(),
    );
  }

  return (
    <main className="rewards-page">
      <div className="rewards-glow rewards-glow-one" />
      <div className="rewards-glow rewards-glow-two" />

      <section className="rewards-shell">
        <header className="rewards-header">
          <button
            type="button"
            className="rewards-back"
            onClick={onBack}
          >
            ← メニューへ戻る
          </button>

          <div>
            <small>
              CHAOS REWARD CENTER
            </small>

            <h1>
              🎁 報酬センター
            </h1>

            <p>
              ミッションや実績を達成してコインを獲得しよう
            </p>
          </div>

          <div className="rewards-coins">
            <span>
              COINS
            </span>

            <strong>
              🪙 {snapshot.coins}
            </strong>
          </div>
        </header>
<section
  className={[
    "rewards-claim-all-panel",
    snapshot.claimableCount > 0
      ? "has-rewards"
      : "",
  ]
    .filter(Boolean)
    .join(" ")}
>
  <div className="rewards-claim-all-info">
    <span>
      {snapshot.claimableCount > 0
        ? "🎁"
        : "✅"}
    </span>

    <div>
      <small>
        CLAIM ALL REWARDS
      </small>

      <strong>
        {snapshot.claimableCount > 0
          ? `受取可能な報酬が${snapshot.claimableCount}件あります`
          : "現在受け取れる報酬はありません"}
      </strong>

      <p>
        ログイン・デイリー・実績・収集報酬をまとめて受け取ります
      </p>
    </div>
  </div>

  <button
    type="button"
    onClick={() => {
      runAction(
        claimAllAvailableRewards,
      );
    }}
    disabled={
      snapshot.claimableCount <= 0
    }
  >
    {snapshot.claimableCount > 0
      ? `🪙 一括受け取り（${snapshot.claimableCount}件）`
      : "✓ すべて受取済み"}
  </button>
</section>
        {message && (
          <div
            className="rewards-message"
            role="status"
          >
            {message}
          </div>
        )}

        <section className="reward-section">
  <div className="reward-section-heading">
    <div>
      <small>
        DAILY LOGIN
      </small>

      <h2>
        ログインボーナス
      </h2>
    </div>
  </div>

  <div
    className={[
      "login-reward-status",
      snapshot.dailyLogin.canClaim
        ? "is-claimable"
        : "is-claimed",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <span className="login-reward-status-icon">
      {snapshot.dailyLogin.canClaim
        ? "🎁"
        : "✅"}
    </span>

    <div>
      <small>
        {snapshot.dailyLogin.canClaim
          ? "TODAY'S REWARD"
          : "RECEIVED"}
      </small>

      <strong>
        {snapshot.dailyLogin.canClaim
          ? `DAY ${snapshot.dailyLogin.dayNumber}のログイン報酬`
          : "本日のログイン報酬は受取済み"}
      </strong>

      <p>
        {snapshot.dailyLogin.canClaim
          ? `🪙 ${snapshot.dailyLogin.reward}コインを受け取れます`
          : "次のログイン報酬は明日受け取れます"}
      </p>
    </div>

    <button
      type="button"
      onClick={() => {
        runAction(
          claimDailyLogin,
        );
      }}
      disabled={
        !snapshot.dailyLogin
          .canClaim
      }
    >
      {snapshot.dailyLogin.canClaim
        ? `🪙 ${snapshot.dailyLogin.reward}コインを受け取る`
        : "✓ 本日受取済み"}
    </button>
  </div>

  <div className="login-reward-grid">
    {snapshot.dailyLogin
      .rewardItems.map(
        (item) => (
          <div
            key={item.dayNumber}
            className={[
              item.isActive
                ? "is-current"
                : "",

              item.claimed
                ? "is-claimed"
                : "",

              item.canClaim
                ? "is-claimable"
                : "",

              item.claimedToday
                ? "is-claimed-today"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.claimed && (
              <span className="login-day-check">
                ✓
              </span>
            )}

            <small>
              DAY {item.dayNumber}
            </small>

            <span className="login-day-coin">
              🪙
            </span>

            <strong>
              {item.reward}
            </strong>

            <em>
              {item.claimedToday
                ? "本日受取済み"
                : item.canClaim
                  ? "今日受け取る"
                  : item.claimed
                    ? "受取済み"
                    : "未到達"}
            </em>
          </div>
        ),
      )}
  </div>
</section>

        <section className="reward-section">
          <div className="reward-section-heading">
            <div>
              <small>
                DAILY MISSIONS
              </small>

              <h2>
                デイリーミッション
              </h2>
            </div>

            <span className="reward-reset-label">
              毎日0時に更新
            </span>
          </div>

          <div className="daily-mission-grid">
            {snapshot.dailyMissions.map(
              (mission) => {
                const progressRate =
                  Math.min(
                    100,
                    (
                      mission.progress /
                      mission.target
                    ) *
                      100,
                  );

                return (
                  <article
                    key={mission.id}
                    className={[
                      "daily-mission-card",
                      mission.completed
                        ? "is-complete"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="daily-mission-icon">
                      {mission.icon}
                    </span>

                    <div className="daily-mission-content">
                      <small>
                        DAILY MISSION
                      </small>

                      <strong>
                        {mission.title}
                      </strong>

                      <p>
                        {
                          mission.description
                        }
                      </p>

                      <div className="daily-progress-row">
                        <div>
                          <span
                            style={{
                              width:
                                `${progressRate}%`,
                            }}
                          />
                        </div>

                        <strong>
                          {mission.progress}/
                          {mission.target}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        runAction(() =>
                          claimDailyMission(
                            mission.id,
                          ),
                        );
                      }}
                      disabled={
                        !mission.canClaim
                      }
                    >
                      {mission.claimed
  ? "✓ 受取済み"
  : mission.completed
    ? `🪙 ${mission.reward} 受け取る`
    : "進行中"}
                    </button>
                  </article>
                );
              },
            )}
          </div>

          <div
            className={[
              "daily-completion-bonus",
              snapshot.dailyCompletion
                .completed
                ? "is-complete"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div>
              <span>
                🌟
              </span>

              <div>
                <small>
                  ALL CLEAR BONUS
                </small>

                <strong>
                  デイリー全達成
                </strong>

                <p>
                  3つのミッションをすべて達成
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                runAction(
                  claimDailyCompletionBonus,
                );
              }}
              disabled={
                !snapshot
                  .dailyCompletion
                  .canClaim
              }
            >
              {snapshot
  .dailyCompletion
  .claimed
    ? "✓ 受取済み"
    : snapshot
        .dailyCompletion
        .canClaim
      ? `🪙 ${snapshot.dailyCompletion.reward} 受け取る`
      : "未達成"}
            </button>
          </div>
        </section>

        <section className="reward-section">
          <div className="reward-section-heading">
            <div>
              <small>
                ACHIEVEMENT REWARDS
              </small>

              <h2>
                実績報酬
              </h2>
            </div>
          </div>

          <div className="reward-card-grid">
            {snapshot.achievementRewards.map(
              (rewardData) => (
                <article
                  key={
                    rewardData
                      .achievement.id
                  }
                  className={[
                    "reward-small-card",
                    rewardData.unlocked
                      ? "is-complete"
                      : "is-locked",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span>
                    {rewardData.unlocked
                      ? rewardData
                          .achievement
                          .icon
                      : "🔒"}
                  </span>

                  <div>
                    <small>
                      {
                        rewardData
                          .achievement
                          .category
                      }
                    </small>

                    <strong>
                      {
                        rewardData
                          .achievement
                          .title
                      }
                    </strong>

                    <p>
                      🪙{" "}
                      {rewardData.amount}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      runAction(() =>
                        claimAchievementReward(
                          rewardData
                            .achievement
                            .id,
                        ),
                      );
                    }}
                    disabled={
                      !rewardData
                        .canClaim
                    }
                  >
                    {rewardData.claimed
  ? "✓ 受取済み"
  : rewardData.unlocked
    ? `🪙 ${rewardData.amount} 受け取る`
    : "未解除"}
                  </button>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="reward-section">
          <div className="reward-section-heading">
            <div>
              <small>
                COLLECTION REWARDS
              </small>

              <h2>
                カード収集報酬
              </h2>
            </div>

            <span className="reward-reset-label">
              現在{" "}
              {snapshot.ownedUniqueCards}
              種類
            </span>
          </div>

          <div className="collection-reward-grid">
            {snapshot.collectionRewards.map(
              (rewardData) => (
                <article
                  key={
                    rewardData.threshold
                  }
                  className={
                    rewardData.completed
                      ? "is-complete"
                      : ""
                  }
                >
                  <span>
                    📚
                  </span>

                  <small>
                    COLLECTION
                  </small>

                  <strong>
                    {
                      rewardData.threshold
                    }
                    種類
                  </strong>

                  <p>
                    🪙{" "}
                    {
                      rewardData.reward
                    }
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      runAction(() =>
                        claimCollectionReward(
                          rewardData
                            .threshold,
                        ),
                      );
                    }}
                    disabled={
                      !rewardData.canClaim
                    }
                  >
                    {rewardData.claimed
  ? "✓ 受取済み"
  : rewardData.completed
    ? `🪙 ${rewardData.reward} 受け取る`
    : `${snapshot.ownedUniqueCards}/${rewardData.threshold}`}
                  </button>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="reward-section">
          <div className="reward-section-heading">
            <div>
              <small>
                DUPLICATE EXCHANGE
              </small>

              <h2>
                余剰カード交換
              </h2>
            </div>

            <span className="reward-reset-label">
              デッキ上限を超えた分だけ交換
            </span>
          </div>

          {snapshot.duplicates.length >
          0 ? (
            <div className="duplicate-grid">
              {snapshot.duplicates.map(
                (item) => (
                  <article
                    key={
                      item.card.id
                    }
                  >
                    <span className="duplicate-emoji">
                      {
                        item.card
                          .emoji
                      }
                    </span>

                    <div>
                      <small>
                        {
                          item.card
                            .rarity
                        }
                      </small>

                      <strong>
                        {
                          item.card
                            .name
                        }
                      </strong>

                      <p>
                        所持
                        {item.ownedCount}
                        枚・交換可能
                        {item.extraCount}
                        枚
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        runAction(() =>
                          exchangeDuplicateCard(
                            item.card.id,
                          ),
                        );
                      }}
                    >
                      🪙{" "}
                      {item.totalValue}
                      へ交換
                    </button>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="reward-empty">
              <span>
                🃏
              </span>

              <strong>
                交換可能なカードはありません
              </strong>

              <p>
                パックで余剰カードを入手すると表示されます
              </p>
            </div>
          )}
        </section>

        <section className="reward-section">
          <div className="reward-section-heading">
            <div>
              <small>
                CHALLENGE BONUS
              </small>

              <h2>
                チャレンジ追加報酬
              </h2>
            </div>
          </div>

          <div className="challenge-reward-grid">
  {snapshot.challengeBonuses.map(
    (bonus) => (
      <article
        key={bonus.id}
        className={[
          bonus.hasClaimed
            ? "is-claimed"
            : "",

          bonus.completed
            ? "is-complete"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {bonus.hasClaimed && (
          <span className="challenge-reward-check">
            ✓
          </span>
        )}

        <span className="challenge-reward-icon">
          {bonus.icon}
        </span>

        <strong>
          {bonus.title}
        </strong>

        <small>
          各チャレンジ初回達成
        </small>

        <p>
          🪙 {bonus.reward}
        </p>

        <div className="challenge-stage-status">
          {bonus.stageStatuses.map(
            (stage) => (
              <span
                key={stage.id}
                className={
                  stage.claimed
                    ? "is-claimed"
                    : ""
                }
                title={
                  `${stage.title}：${
                    stage.claimed
                      ? "獲得済み"
                      : "未達成"
                  }`
                }
              >
                {stage.claimed
                  ? "✓"
                  : stage.number}
              </span>
            ),
          )}
        </div>

        <em>
          {bonus.completed
            ? "✓ 全ステージ獲得済み"
            : bonus.hasClaimed
              ? `✓ ${bonus.claimedCount}/${bonus.totalCount}ステージ獲得`
              : `0/${bonus.totalCount}ステージ`}
        </em>
      </article>
    ),
  )}
</div>
        </section>
      </section>
    </main>
  );
}