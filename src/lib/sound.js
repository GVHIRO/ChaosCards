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

let audioContext = null;
let battleBgm = null;
let battleBgmSource = null;
let battleBgmGain = null;
let battleBgmStarting = false;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      console.warn(
        "Web Audio APIに対応していません"
      );
      return null;
    }

    audioContext = new AudioContextClass();
  }

  return audioContext;
}

export async function unlockAudio() {
  const context = getAudioContext();

  if (!context) return;

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch (error) {
      console.warn(
        "音声の有効化に失敗:",
        error
      );
    }
  }
}

/* =========================
   SE
========================= */

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

    const settingVolume = clamp(
      Number(settings.seVolume) / 100
    );

    const baseVolume =
      defaultVolumes[name] ?? 0.5;

    audio.volume = clamp(
      baseVolume * settingVolume
    );

    audio.play().catch((error) => {
      console.warn("SE再生エラー:", error);
    });
  } catch (error) {
    console.error("SE作成エラー:", error);
  }
}

/* =========================
   BGM
========================= */

export async function startBattleBgm() {
  if (battleBgmStarting) return;

  /*
   * すでにBGMが存在して再生中なら、
   * 新しく作らない。
   */
  if (battleBgm && !battleBgm.paused) {
    setBattleBgmVolume(
      getSettings().bgmVolume
    );
    return;
  }

  battleBgmStarting = true;

  try {
    const context = getAudioContext();

    if (!context) return;

    await unlockAudio();

    if (!battleBgm) {
      battleBgm =
        new Audio("/sounds/battle-bgm.mp3");

      battleBgm.loop = true;
      battleBgm.preload = "auto";

      /*
       * MediaElementSourceは同じAudio要素に対して
       * 1回だけ作成する。
       */
      battleBgmSource =
        context.createMediaElementSource(
          battleBgm
        );

      battleBgmGain =
        context.createGain();

      battleBgmSource.connect(
        battleBgmGain
      );

      battleBgmGain.connect(
        context.destination
      );
    }

    setBattleBgmVolume(
      getSettings().bgmVolume
    );

    await battleBgm.play();
  } catch (error) {
    console.warn("BGM再生エラー:", error);
  } finally {
    battleBgmStarting = false;
  }
}

export function stopBattleBgm() {
  if (!battleBgm) return;

  battleBgm.pause();
  battleBgm.currentTime = 0;
}

/*
 * BGMを止めたり再生し直したりせず、
 * GainNodeの音量だけ変更する。
 */
export function setBattleBgmVolume(volume) {
  if (!battleBgmGain || !audioContext) {
    return;
  }

  const settingVolume = clamp(
    Number(volume) / 100
  );

  const finalVolume =
    defaultVolumes.bgm * settingVolume;

  battleBgmGain.gain.cancelScheduledValues(
    audioContext.currentTime
  );

  battleBgmGain.gain.setTargetAtTime(
    finalVolume,
    audioContext.currentTime,
    0.03
  );
}