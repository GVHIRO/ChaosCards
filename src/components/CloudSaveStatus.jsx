import "./CloudSaveStatus.css";

import {
  useEffect,
  useState,
} from "react";

import {
  CLOUD_SAVE_STATUS_EVENT,
  getCloudSaveStatus,
  retryCloudSave,
} from "../lib/cloudSave";

const STATUS_INFORMATION = {
  idle: {
    icon: "☁️",
    label: "待機中",
  },

  syncing: {
    icon: "↻",
    label: "同期中",
  },

  saving: {
    icon: "↑",
    label: "保存中",
  },

  saved: {
    icon: "✓",
    label: "保存済み",
  },

  error: {
    icon: "!",
    label: "同期エラー",
  },
};

export default function CloudSaveStatus({
  currentUser,
}) {
  const [
    status,
    setStatus,
  ] = useState(
    getCloudSaveStatus,
  );

  const [
    retrying,
    setRetrying,
  ] = useState(false);

  useEffect(() => {
    function handleStatusChange(
      event,
    ) {
      setStatus(
        event.detail ??
          getCloudSaveStatus(),
      );
    }

    window.addEventListener(
      CLOUD_SAVE_STATUS_EVENT,
      handleStatusChange,
    );

    return () => {
      window.removeEventListener(
        CLOUD_SAVE_STATUS_EVENT,
        handleStatusChange,
      );
    };
  }, []);

  if (!currentUser) {
    return null;
  }

  const information =
    STATUS_INFORMATION[
      status.state
    ] ??
    STATUS_INFORMATION.idle;

  async function handleRetry() {
    if (retrying) {
      return;
    }

    setRetrying(true);

    try {
      await retryCloudSave(
        currentUser,
      );
    } finally {
      setRetrying(false);
    }
  }

  return (
    <aside
      className={[
        "cloud-save-status",
        `is-${status.state}`,
      ].join(" ")}
      aria-live="polite"
      title={
        status.message ||
        information.label
      }
    >
      <span className="cloud-save-status-icon">
        {information.icon}
      </span>

      <div className="cloud-save-status-content">
        <small>
          {currentUser.is_anonymous
            ? "GUEST SAVE"
            : "CLOUD SAVE"}
        </small>

        <strong>
          {information.label}
        </strong>

        {status.message && (
          <p>
            {status.message}
          </p>
        )}
      </div>

      {status.state ===
        "error" && (
        <button
          type="button"
          onClick={
            handleRetry
          }
          disabled={retrying}
        >
          {retrying
            ? "再試行中"
            : "再試行"}
        </button>
      )}
    </aside>
  );
}