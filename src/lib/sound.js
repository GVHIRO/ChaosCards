import { getSettings } from "./settings";
const defaultVolumes = {
  bgm: 0.15,

  card: 0.40,
  damage: 0.60,
  heal: 0.60,
  shield: 0.35,
  turn: 0.25,
  victory: 0.60,
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

audio.volume =
  (defaultVolumes[name] ?? 0.6) *
  (settings.seVolume / 100);
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

battleBgm.volume =
  defaultVolumes.bgm *
  (settings.bgmVolume / 100);

  battleBgm.play().catch((error) => {
    console.warn("BGM再生エラー:", error);
  });
}

export function stopBattleBgm() {
  if (!battleBgm) return;

  battleBgm.pause();
  battleBgm.currentTime = 0;
}

export function setBattleBgmVolume(
  settingsVolume
) {
  if (!battleBgm) return;

  battleBgm.volume = Math.max(
    0,
    Math.min(
      1,
      defaultVolumes.bgm *
        (settingsVolume / 100)
    )
  );
}