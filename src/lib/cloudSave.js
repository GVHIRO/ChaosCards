import { supabase } from
  "./supabase";

import {
  COLLECTION_CHANGE_EVENT,
  COIN_CHANGE_EVENT,
  PACK_PITY_CHANGE_EVENT,
  getCardCollection,
  getCoins,
  getPackPity,
  replaceCardCollection,
  replaceCoins,
  replacePackPity,
} from "./collection";
import {
  PROGRESS_CHANGE_EVENT,
  getLocalProgressSnapshot,
  replaceLocalProgressSnapshot,
} from "./progressStorage";
import {
  DECK_CHANGE_EVENT,
  getLocalDeckSnapshot,
  replaceLocalDeckSnapshot,
} from "./deckStorage";
export const CLOUD_SAVE_STATUS_EVENT =
  "chaos-cloud-save-status";

let currentCloudSaveStatus = {
  state: "idle",
  message: "",
};

function emitCloudSaveStatus(
  state,
  message = "",
) {
  currentCloudSaveStatus = {
    state,
    message,
  };

  window.dispatchEvent(
    new CustomEvent(
      CLOUD_SAVE_STATUS_EVENT,
      {
        detail: {
          ...currentCloudSaveStatus,
        },
      },
    ),
  );
}

export function getCloudSaveStatus() {
  return {
    ...currentCloudSaveStatus,
  };
}
const CLOUD_SAVE_DELAY_MS =
  700;

let activeUserId = null;
let saveTimerId = null;
let listenersAttached = false;

let isApplyingCloudSnapshot =
  false;

let initializationPromise =
  null;

let initializationUserId =
  null;

let cloudSaveGeneration = 0;

function getUserId(user) {
  if (!user?.id) {
    return null;
  }

  return String(user.id);
}

function isCurrentCloudSession(
  userId,
  generation,
) {
  return (
    activeUserId === userId &&
    cloudSaveGeneration ===
      generation
  );
}

function getLocalSnapshot() {
  return {
    coins:
      getCoins(),

    packPity:
      getPackPity(),

    cards:
      getCardCollection(),

    decks:
      getLocalDeckSnapshot(),

    progress:
      getLocalProgressSnapshot(),
  };
}

async function uploadCollectionSnapshot(
  userId,
) {
  if (!supabase) {
    throw new Error(
      "Supabaseが初期化されていません",
    );
  }

  if (
    !userId ||
    activeUserId !== userId
  ) {
    throw new Error(
      "クラウド保存ユーザーが一致しません",
    );
  }

  const snapshot =
    getLocalSnapshot();

  const {
    error,
  } = await supabase.rpc(
    "save_player_collection",
    {
      p_coins:
        snapshot.coins,

      p_pack_pity:
        snapshot.packPity,

      p_cards:
        snapshot.cards,
    },
  );

  if (error) {
    throw error;
  }

  return snapshot;
}
async function uploadDeckSnapshot(
  userId,
) {
  if (!supabase) {
    throw new Error(
      "Supabaseが初期化されていません",
    );
  }

  if (
    !userId ||
    activeUserId !== userId
  ) {
    throw new Error(
      "クラウド保存ユーザーが一致しません",
    );
  }

  const decks =
    getLocalDeckSnapshot();

  const {
    error,
  } = await supabase.rpc(
    "save_player_decks",
    {
      p_presets:
        decks.presets,

      p_active_preset_id:
        decks.activePresetId,

      p_active_card_ids:
        decks.activeCardIds,
    },
  );

  if (error) {
    throw error;
  }

  return decks;
}
async function uploadProgressSnapshot(
  userId,
) {
  if (!supabase) {
    throw new Error(
      "Supabaseが初期化されていません",
    );
  }

  if (
    !userId ||
    activeUserId !== userId
  ) {
    throw new Error(
      "クラウド保存ユーザーが一致しません",
    );
  }

  const progress =
    getLocalProgressSnapshot();

  const {
    error,
  } = await supabase.rpc(
    "save_player_progress",
    {
      p_progress_data:
        progress,
    },
  );

  if (error) {
    throw error;
  }

  return progress;
}

async function uploadLocalSnapshot(
  userId,
) {
  const [
    collectionSnapshot,
    deckSnapshot,
    progressSnapshot,
  ] = await Promise.all([
    uploadCollectionSnapshot(
      userId,
    ),

    uploadDeckSnapshot(
      userId,
    ),

    uploadProgressSnapshot(
      userId,
    ),
  ]);

  return {
    collection:
      collectionSnapshot,

    decks:
      deckSnapshot,

    progress:
      progressSnapshot,
  };
}

async function downloadCollectionSnapshot(
  userId,
  wallet,
) {
  const {
    data: cardRows,
    error: cardError,
  } = await supabase
    .from("player_cards")
    .select(
      "card_id, owned_count",
    )
    .eq(
      "user_id",
      userId,
    );

  if (cardError) {
    throw cardError;
  }

  const cloudCollection = {};

  (
    cardRows ?? []
  ).forEach((row) => {
    const cardId =
      String(row.card_id);

    const ownedCount =
      Math.max(
        0,
        Math.floor(
          Number(
            row.owned_count,
          ) || 0,
        ),
      );

    if (ownedCount <= 0) {
      return;
    }

    cloudCollection[
      cardId
    ] = ownedCount;
  });

  isApplyingCloudSnapshot =
    true;

  try {
    replaceCardCollection(
      cloudCollection,
    );

    replaceCoins(
      wallet.coins,
    );

    replacePackPity(
      wallet.pack_pity,
    );
  } finally {
    isApplyingCloudSnapshot =
      false;
  }
}

function downloadDeckSnapshot(
  cloudDeck,
) {
  isApplyingCloudSnapshot =
    true;

  try {
    return replaceLocalDeckSnapshot({
      presets:
        cloudDeck.presets,

      activePresetId:
        cloudDeck
          .active_preset_id,

      activeCardIds:
        cloudDeck
          .active_card_ids,
    });
  } finally {
    isApplyingCloudSnapshot =
      false;
  }
}
function downloadProgressSnapshot(
  cloudProgress,
) {
  isApplyingCloudSnapshot =
    true;

  try {
    return replaceLocalProgressSnapshot(
      cloudProgress
        .progress_data,
    );
  } finally {
    isApplyingCloudSnapshot =
      false;
  }
}
function clearSaveTimer() {
  if (!saveTimerId) {
    return;
  }

  window.clearTimeout(
    saveTimerId,
  );

  saveTimerId = null;
}

function scheduleCloudUpload() {
  if (
    isApplyingCloudSnapshot ||
    !activeUserId
  ) {
    return;
  }

  clearSaveTimer();

  emitCloudSaveStatus(
    "saving",
    "変更内容を保存しています",
  );

  const scheduledUserId =
    activeUserId;

  const scheduledGeneration =
    cloudSaveGeneration;

  saveTimerId =
    window.setTimeout(
      async () => {
        saveTimerId = null;

        if (
          !isCurrentCloudSession(
            scheduledUserId,
            scheduledGeneration,
          )
        ) {
          return;
        }

        try {
          await uploadLocalSnapshot(
            scheduledUserId,
          );

          if (
            !isCurrentCloudSession(
              scheduledUserId,
              scheduledGeneration,
            )
          ) {
            return;
          }

          console.log(
            "クラウドセーブ完了",
          );

          emitCloudSaveStatus(
            "saved",
            "クラウドに保存しました",
          );
        } catch (error) {
          console.error(
            "クラウドセーブエラー:",
            error,
          );

          emitCloudSaveStatus(
            "error",
            error instanceof Error
              ? error.message
              : "クラウドへ保存できませんでした",
          );
        }
      },
      CLOUD_SAVE_DELAY_MS,
    );
}

function handleLocalSaveChange() {
  scheduleCloudUpload();
}

function attachSaveListeners() {
  if (listenersAttached) {
    return;
  }

  window.addEventListener(
    COLLECTION_CHANGE_EVENT,
    handleLocalSaveChange,
  );

  window.addEventListener(
    COIN_CHANGE_EVENT,
    handleLocalSaveChange,
  );

  window.addEventListener(
    PACK_PITY_CHANGE_EVENT,
    handleLocalSaveChange,
  );

  window.addEventListener(
    DECK_CHANGE_EVENT,
    handleLocalSaveChange,
  );

  window.addEventListener(
    PROGRESS_CHANGE_EVENT,
    handleLocalSaveChange,
  );

  listenersAttached = true;
}

function detachSaveListeners() {
  if (!listenersAttached) {
    return;
  }

  window.removeEventListener(
    COLLECTION_CHANGE_EVENT,
    handleLocalSaveChange,
  );

  window.removeEventListener(
    COIN_CHANGE_EVENT,
    handleLocalSaveChange,
  );

  window.removeEventListener(
    PACK_PITY_CHANGE_EVENT,
    handleLocalSaveChange,
  );

  window.removeEventListener(
    DECK_CHANGE_EVENT,
    handleLocalSaveChange,
  );

  window.removeEventListener(
    PROGRESS_CHANGE_EVENT,
    handleLocalSaveChange,
  );

  listenersAttached = false;
}

export function stopCloudSave(
  options = {},
) {
  const {
    showIdle = true,
  } = options;

  cloudSaveGeneration += 1;

  clearSaveTimer();
  detachSaveListeners();

  activeUserId = null;

  initializationPromise =
    null;

  initializationUserId =
    null;

  isApplyingCloudSnapshot =
    false;

  if (showIdle) {
    emitCloudSaveStatus(
      "idle",
      "",
    );
  }
}

export function initializeCloudSave(
  user,
) {
  const userId =
    getUserId(user);

  if (!supabase) {
    return Promise.resolve({
      ok: false,
      message:
        "Supabaseが初期化されていません",
    });
  }

  if (!userId) {
    return Promise.resolve({
      ok: false,
      message:
        "ユーザー情報がありません",
    });
  }

  if (
    activeUserId === userId &&
    listenersAttached
  ) {
    return Promise.resolve({
      ok: true,
      mode:
        "already-initialized",
    });
  }

  if (
    initializationPromise &&
    initializationUserId ===
      userId
  ) {
    return initializationPromise;
  }

  stopCloudSave({
  showIdle: false,
});

activeUserId = userId;

emitCloudSaveStatus(
  "syncing",
  "クラウドデータを確認しています",
);

  const currentGeneration =
    cloudSaveGeneration;

  initializationUserId =
    userId;

  const task =
    (async () => {
      const [
  walletResult,
  deckResult,
  progressResult,
] = await Promise.all([
  supabase
    .from("player_wallets")
    .select(`
      coins,
      pack_pity,
      initial_migration_complete
    `)
    .eq(
      "user_id",
      userId,
    )
    .maybeSingle(),

  supabase
    .from("player_decks")
    .select(`
      presets,
      active_preset_id,
      active_card_ids,
      initial_migration_complete
    `)
    .eq(
      "user_id",
      userId,
    )
    .maybeSingle(),

  supabase
    .from("player_progress")
    .select(`
      progress_data,
      initial_migration_complete
    `)
    .eq(
      "user_id",
      userId,
    )
    .maybeSingle(),
]);

if (walletResult.error) {
  throw walletResult.error;
}

if (deckResult.error) {
  throw deckResult.error;
}

if (progressResult.error) {
  throw progressResult.error;
}

      if (
        !isCurrentCloudSession(
          userId,
          currentGeneration,
        )
      ) {
        return {
          ok: false,
          cancelled: true,
        };
      }

      let collectionMode = "";
let deckMode = "";
let progressMode = "";

/*
  コイン・所持カード・パック天井
*/
const wallet =
  walletResult.data;

if (
  !wallet ||
  wallet
    .initial_migration_complete !==
    true
) {
  await uploadCollectionSnapshot(
    userId,
  );

  collectionMode =
    "uploaded-local";
} else {
  await downloadCollectionSnapshot(
    userId,
    wallet,
  );

  collectionMode =
    "downloaded-cloud";
}

if (
  !isCurrentCloudSession(
    userId,
    currentGeneration,
  )
) {
  return {
    ok: false,
    cancelled: true,
  };
}

/*
  デッキ3枠・使用中デッキ
*/
const cloudDeck =
  deckResult.data;

if (
  !cloudDeck ||
  cloudDeck
    .initial_migration_complete !==
    true
) {
  await uploadDeckSnapshot(
    userId,
  );

  deckMode =
    "uploaded-local";
} else {
  downloadDeckSnapshot(
    cloudDeck,
  );

  deckMode =
    "downloaded-cloud";
}

if (
  !isCurrentCloudSession(
    userId,
    currentGeneration,
  )
) {
  return {
    ok: false,
    cancelled: true,
  };
}

/*
  実績・チャレンジ・報酬
*/
const cloudProgress =
  progressResult.data;

if (
  !cloudProgress ||
  cloudProgress
    .initial_migration_complete !==
    true
) {
  await uploadProgressSnapshot(
    userId,
  );

  progressMode =
    "uploaded-local";
} else {
  downloadProgressSnapshot(
    cloudProgress,
  );

  progressMode =
    "downloaded-cloud";
}

if (
  !isCurrentCloudSession(
    userId,
    currentGeneration,
  )
) {
  return {
    ok: false,
    cancelled: true,
  };
}
attachSaveListeners();

emitCloudSaveStatus(
  "saved",
  "クラウド同期が完了しました",
);

console.log(
  "クラウドセーブ初期化完了:",
  {
    collection:
      collectionMode,

    decks:
      deckMode,

    progress:
      progressMode,
  },
);

      return {
  ok: true,

  mode: {
    collection:
      collectionMode,

    decks:
      deckMode,

    progress:
      progressMode,
  },
};
    })()
      .catch((error) => {
  console.error(
    "クラウドセーブ初期化エラー:",
    error,
  );

  const message =
    error instanceof Error
      ? error.message
      : String(error);

  emitCloudSaveStatus(
    "error",
    message,
  );

  return {
    ok: false,
    message,
  };
})
      .finally(() => {
        if (
          initializationPromise ===
          task
        ) {
          initializationPromise =
            null;

          initializationUserId =
            null;
        }
      });

  initializationPromise =
    task;

  return task;
}

export async function flushCloudSave() {
  if (!activeUserId) {
    const message =
      "クラウドセーブは開始されていません";

    emitCloudSaveStatus(
      "error",
      message,
    );

    return {
      ok: false,
      message,
    };
  }

  clearSaveTimer();

  emitCloudSaveStatus(
    "saving",
    "クラウドへ保存しています",
  );

  try {
    await uploadLocalSnapshot(
      activeUserId,
    );

    emitCloudSaveStatus(
      "saved",
      "クラウドに保存しました",
    );

    return {
      ok: true,
    };
  } catch (error) {
    console.error(
      "クラウドセーブ即時実行エラー:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    emitCloudSaveStatus(
      "error",
      message,
    );

    return {
      ok: false,
      message,
    };
  }
}

export async function retryCloudSave(
  user,
) {
  const userId =
    getUserId(user);

  if (!userId) {
    const message =
      "ユーザー情報を取得できません";

    emitCloudSaveStatus(
      "error",
      message,
    );

    return {
      ok: false,
      message,
    };
  }

  /*
    初期化済みなら現在のデータを即時保存する。
  */
  if (
    activeUserId === userId &&
    listenersAttached
  ) {
    return flushCloudSave();
  }

  /*
    初期同期自体に失敗していた場合は、
    最初から同期をやり直す。
  */
  return initializeCloudSave(
    user,
  );
}