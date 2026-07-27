import "./RewardToast.css";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  REWARD_TOAST_EVENT,
} from "../lib/rewards";

export default function RewardToast() {
  const [toasts, setToasts] =
    useState([]);

  const nextIdRef =
    useRef(1);

  useEffect(() => {
    function handleRewardToast(
      event,
    ) {
      const amount =
        Number(
          event.detail?.amount,
        ) || 0;

      if (amount <= 0) {
        return;
      }

      const id =
        nextIdRef.current;

      nextIdRef.current += 1;

      const toast = {
        id,
        amount,
        label:
          event.detail?.label ||
          "報酬獲得",
      };

      setToasts(
        (currentToasts) => [
          ...currentToasts,
          toast,
        ].slice(-4),
      );

      window.setTimeout(
        () => {
          setToasts(
            (currentToasts) =>
              currentToasts.filter(
                (currentToast) =>
                  currentToast.id !==
                  id,
              ),
          );
        },
        3200,
      );
    }

    window.addEventListener(
      REWARD_TOAST_EVENT,
      handleRewardToast,
    );

    return () => {
      window.removeEventListener(
        REWARD_TOAST_EVENT,
        handleRewardToast,
      );
    };
  }, []);

  return (
    <div
      className="reward-toast-stack"
      aria-live="polite"
    >
      {toasts.map(
        (toast) => (
          <div
            key={toast.id}
            className="reward-toast"
          >
            <span>
              🪙
            </span>

            <div>
              <small>
                {toast.label}
              </small>

              <strong>
                +{toast.amount}
                コイン
              </strong>
            </div>
          </div>
        ),
      )}
    </div>
  );
}