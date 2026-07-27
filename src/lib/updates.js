import {
  APP_VERSION,
} from "../data/updates";

export const UPDATE_READ_EVENT =
  "chaos-update-read";

const LAST_SEEN_VERSION_KEY =
  "chaosCardsLastSeenVersion";

export function getLastSeenVersion() {
  try {
    return (
      localStorage.getItem(
        LAST_SEEN_VERSION_KEY,
      ) ?? ""
    );
  } catch (error) {
    console.error(
      "確認済みバージョン読込エラー:",
      error,
    );

    return "";
  }
}

export function hasUnreadUpdates() {
  return (
    getLastSeenVersion() !==
    APP_VERSION
  );
}

export function markCurrentUpdateAsSeen() {
  try {
    localStorage.setItem(
      LAST_SEEN_VERSION_KEY,
      APP_VERSION,
    );

    window.dispatchEvent(
      new CustomEvent(
        UPDATE_READ_EVENT,
        {
          detail: {
            version:
              APP_VERSION,
          },
        },
      ),
    );

    return true;
  } catch (error) {
    console.error(
      "確認済みバージョン保存エラー:",
      error,
    );

    return false;
  }
}