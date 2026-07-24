import { getSettings } from "./settings";

const defaultVolumes = {
  bgm: 0.15,

  card: 0.4,
  damage: 0.6,
  heal: 0.6,
  shield: 0.35,
  turn: 0.25,
  victory: 0.6,
  defeat: 0.45,
};

const soundPaths = {
  card: "/sounds/card.mp3",
  damage: "/sounds/damage.mp3",
  heal: "/sounds/heal.mp3",
  shield: "/sounds/shield.mp3",
  turn: "/sounds/turn.mp3",
  victory: "/sounds/victory.mp3",
  defeat: "/sounds/defeat.mp3",
};

const audioCache = {};

export function playSound(name) {
  const path = soundPaths[name];

  if (!path) {
    console.warn(`存在しないSEです: ${name}`);
    return;
  }

  try {
    if (!audioCache[name]) {
      audioCache[name] = new Audio(path);
    }

    const audio = audioCache[name].cloneNode();
    const settings = getSettings();

    const settingVolume = Math.max(
      0,
      Math.min(1, Number(settings.seVolume) / 100)
    );

    const baseVolume = defaultVolumes[name] ?? 0.5;

    audio.volume = Math.max(
      0,
      Math.min(1, baseVolume * settingVolume)
    );

    audio.play().catch((error) => {
      console.warn("SE再生エラー:", error);
    });
  } catch (error) {
    console.error("SE作成エラー:", error);
  }
}

let battleBgm = null;

export function startBattleBgm() {
  if (!battleBgm) {
    battleBgm = new Audio("/sounds/battle-bgm.mp3");
    battleBgm.loop = true;
  }

  const settings = getSettings();

  const settingVolume = Math.max(
    0,
    Math.min(1, Number(settings.bgmVolume) / 100)
  );

  battleBgm.volume = defaultVolumes.bgm * settingVolume;

  battleBgm.play().catch((error) => {
    console.warn("BGM再生エラー:", error);
  });
}

export function stopBattleBgm() {
  if (!battleBgm) return;

  battleBgm.pause();
  battleBgm.currentTime = 0;
}

export function setBattleBgmVolume(volume) {
  const settingVolume = Math.max(
    0,
    Math.min(1, Number(volume) / 100)
  );

  if (battleBgm) {
    battleBgm.volume =
      defaultVolumes.bgm * settingVolume;
  }
}