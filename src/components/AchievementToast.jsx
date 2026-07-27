import "./AchievementToast.css";

import {
  useEffect,
  useState,
} from "react";

import {
  ACHIEVEMENT_UNLOCK_EVENT,
  syncExistingAchievements,
} from "../lib/achievements";

export default function AchievementToast() {
  const [queue, setQueue] =
    useState([]);

  const [
    activeAchievement,
    setActiveAchievement,
  ] = useState(null);

 useEffect(() => {
  function handleAchievementUnlock(
    event,
  ) {
    const unlocked =
      Array.isArray(event.detail)
        ? event.detail
        : [];

    if (unlocked.length === 0) {
      return;
    }

    setQueue(
      (currentQueue) => [
        ...currentQueue,
        ...unlocked,
      ],
    );
  }

  window.addEventListener(
    ACHIEVEMENT_UNLOCK_EVENT,
    handleAchievementUnlock,
  );

  /*
    イベントを受け取れる状態にしてから、
    過去のチャレンジ進行を確認する。
  */
  syncExistingAchievements();

  return () => {
    window.removeEventListener(
      ACHIEVEMENT_UNLOCK_EVENT,
      handleAchievementUnlock,
    );
  };
}, []);

  useEffect(() => {
    if (
      activeAchievement ||
      queue.length === 0
    ) {
      return;
    }

    const [
      nextAchievement,
      ...remainingAchievements
    ] = queue;

    setActiveAchievement(
      nextAchievement,
    );

    setQueue(
      remainingAchievements,
    );
  }, [
    activeAchievement,
    queue,
  ]);

  useEffect(() => {
    if (!activeAchievement) {
      return undefined;
    }

    const timerId =
      window.setTimeout(() => {
        setActiveAchievement(null);
      }, 3800);

    return () => {
      window.clearTimeout(
        timerId,
      );
    };
  }, [activeAchievement]);

  if (!activeAchievement) {
    return null;
  }

  return (
    <aside
      className="achievement-toast"
      role="status"
      aria-live="polite"
    >
      <div className="achievement-toast-icon">
        {activeAchievement.icon}
      </div>

      <div className="achievement-toast-content">
        <small>
          ACHIEVEMENT UNLOCKED
        </small>

        <strong>
          {activeAchievement.title}
        </strong>

        <p>
          {
            activeAchievement.description
          }
        </p>
      </div>

      <div className="achievement-toast-shine" />
    </aside>
  );
}