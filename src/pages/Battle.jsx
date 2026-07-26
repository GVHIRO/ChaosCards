import "./Battle.css";
import { getSettings } from "../lib/settings";
import Settings from "./Settings";
import {
  startBattleBgm,
  stopBattleBgm,
  unlockAudio,
  playSound,
} from "../lib/sound";
import { updateStatus } from "../lib/status";
import BattleStatus from "../components/BattleStatus";
import BattleField from "../components/BattleField";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import BattleLog from "../components/BattleLog";
import Card from "../components/Card";
import cards from "../data/cards";


const INITIAL_HP = 40;
const MAX_HP = 40;
const INITIAL_ENERGY = 3;
const MAX_ENERGY = 5;
const ENERGY_PER_TURN = 3;
const INITIAL_HAND_SIZE = 5;
const MAX_HAND_SIZE = 7;
const HEARTBEAT_INTERVAL = 5000;
const DISCONNECT_TIMEOUT = 20000;

function getHpColor(currentHp, maxHp) {
  const rate = currentHp / maxHp;
  if (rate > 0.6) return "#32d74b";
  if (rate > 0.3) return "#ffcc00";
  return "#ff453a";
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createDefaultDeck() {
  const newDeck = [];

  cards.forEach((card) => {
    let copies = 1;
    if (card.rarity === "Common") copies = 3;
    if (card.rarity === "Rare") copies = 2;

    for (let index = 0; index < copies; index += 1) {
      newDeck.push(card);
    }
  });

  return shuffle(newDeck);
}

function loadDeck() {
  const savedDeck =
    localStorage.getItem("chaosCardsDeck");

  if (savedDeck) {
    try {
      const parsedDeck =
        JSON.parse(savedDeck);

      if (
        Array.isArray(parsedDeck) &&
        parsedDeck.length > 0
      ) {
        /*
          保存データからIDだけを取り出し、
          cards.jsの最新データへ置き換える。

          古い形式：{ id, name, description... }
          新しい形式：idだけ
          どちらにも対応。
        */
        const latestDeck = parsedDeck
          .map((savedCard) => {
            const savedId =
              typeof savedCard === "object"
                ? savedCard.id
                : savedCard;

            return cards.find(
              (currentCard) =>
                String(currentCard.id) ===
                String(savedId)
            );
          })
          .filter(Boolean);

        if (latestDeck.length > 0) {
          return shuffle(latestDeck);
        }
      }
    } catch (error) {
      console.error(
        "デッキ読込エラー:",
        error
      );
    }
  }

  return createDefaultDeck();
}

function getShieldValue(card) {
  if (typeof card.shield === "number") return card.shield;
  if (!card.shield) return 0;

  // 古いカードデータ（shield: true）との互換用
  return 4 + Number(card.cost || 0) * 3;
}

function getCardDamage(card, actorHp) {
  const hits = Math.max(
    1,
    Number(card.hits || 1),
  );

  let damage =
    Number(card.damage || 0) * hits;

  const threshold =
    Number(card.lowHpThreshold || 0);

  const bonus =
    Number(card.lowHpBonusDamage || 0);

  if (
    bonus > 0 &&
    threshold > 0 &&
    Number(actorHp) <= threshold
  ) {
    damage += bonus;
  }

  return Math.max(0, damage);
}

function summarizeCards(
  selectedCards,
  actorHp,
) {
  return selectedCards.reduce(
    (summary, selected) => {
      const card =
        selected.card ?? selected;

      const cardDamage =
        getCardDamage(
          card,
          actorHp,
        );

      const cardBurn =
        Math.max(
          0,
          Number(card.burn || 0),
        );

      const cardBurnTurns =
        Math.max(
          0,
          Number(card.burnTurns || 0),
        );

      summary.damage += cardDamage;

      summary.heal += Math.max(
        0,
        Number(card.heal || 0),
      );

      summary.shield += Math.max(
        0,
        getShieldValue(card),
      );

      summary.pierce += Math.min(
        cardDamage,
        Math.max(
          0,
          Number(card.pierce || 0),
        ),
      );

      summary.shieldBreak +=
        Math.max(
          0,
          Number(
            card.shieldBreak || 0,
          ),
        );

      summary.draw += Math.max(
        0,
        Number(card.draw || 0),
      );

      summary.energyGain +=
        Math.max(
          0,
          Number(
            card.energyGain || 0,
          ),
        );

      summary.energyDrain +=
        Math.max(
          0,
          Number(
            card.energyDrain || 0,
          ),
        );

      summary.recoil += Math.max(
        0,
        Number(card.recoil || 0),
      );

      /*
        弱体化は加算せず、
        一番強い値だけを採用する。
      */
      summary.weaken = Math.max(
        summary.weaken,
        Math.max(
          0,
          Number(card.weaken || 0),
        ),
      );

      summary.cleanse =
        summary.cleanse ||
        Boolean(card.cleanse);

      /*
        炎上は単純加算しない。
        合計予定ダメージが強い方を残す。
      */
      const currentBurnTotal =
        summary.burn *
        summary.burnTurns;

      const cardBurnTotal =
        cardBurn *
        cardBurnTurns;

      if (
        cardBurnTotal >
          currentBurnTotal ||
        (
          cardBurnTotal ===
            currentBurnTotal &&
          cardBurn > summary.burn
        )
      ) {
        summary.burn =
          cardBurn;

        summary.burnTurns =
          cardBurnTurns;
      }

      summary.names.push(card.name);

      return summary;
    },
    {
      damage: 0,
      heal: 0,
      shield: 0,
      pierce: 0,
      shieldBreak: 0,
      burn: 0,
      burnTurns: 0,
      draw: 0,
      energyGain: 0,
      energyDrain: 0,
      weaken: 0,
      cleanse: false,
      recoil: 0,
      names: [],
    },
  );
}

function mergeBurn(
  currentDamage,
  currentTurns,
  newDamage,
  newTurns,
) {
  const current = {
    damage: Math.max(
      0,
      Number(currentDamage || 0),
    ),

    turns: Math.max(
      0,
      Number(currentTurns || 0),
    ),
  };

  const incoming = {
    damage: Math.max(
      0,
      Number(newDamage || 0),
    ),

    turns: Math.max(
      0,
      Number(newTurns || 0),
    ),
  };

  const currentTotal =
    current.damage *
    current.turns;

  const incomingTotal =
    incoming.damage *
    incoming.turns;

  if (
    incomingTotal > currentTotal ||
    (
      incomingTotal === currentTotal &&
      incoming.damage >
        current.damage
    )
  ) {
    return incoming;
  }

  return current;
}

function applyAdvancedDamage(
  hp,
  shield,
  damage,
  pierce,
  shieldBreak,
) {
  const safeHp =
    Math.max(
      0,
      Number(hp || 0),
    );

  const safeShield =
    Math.max(
      0,
      Number(shield || 0),
    );

  const safeDamage =
    Math.max(
      0,
      Number(damage || 0),
    );

  const safePierce =
    Math.min(
      safeDamage,
      Math.max(
        0,
        Number(pierce || 0),
      ),
    );

  /*
    シールド破壊を先に処理する。
  */
  const brokenShield =
    Math.min(
      safeShield,
      Math.max(
        0,
        Number(shieldBreak || 0),
      ),
    );

  const shieldAfterBreak =
    safeShield -
    brokenShield;

  /*
    貫通分を除いたダメージだけ、
    シールドで防御する。
  */
  const normalDamage =
    safeDamage -
    safePierce;

  const blocked =
    Math.min(
      shieldAfterBreak,
      normalDamage,
    );

  const requestedHpDamage =
    safePierce +
    Math.max(
      0,
      normalDamage - blocked,
    );

  const hpDamage =
    Math.min(
      safeHp,
      requestedHpDamage,
    );

  return {
    hp: Math.max(
      0,
      safeHp -
        requestedHpDamage,
    ),

    shield: Math.max(
      0,
      shieldAfterBreak -
        blocked,
    ),

    blocked,
    brokenShield,
    hpDamage,

    pierceDamage:
      Math.min(
        safeHp,
        safePierce,
      ),
  };
}

function resolveTurnEffects({
  selectedCards,

  actorHp,
  actorShield,
  actorEnergy,
  actorBurnDamage,
  actorBurnTurns,
  actorWeaken,

  targetHp,
  targetShield,
  targetEnergy,
  targetBurnDamage,
  targetBurnTurns,
  targetWeaken,
}) {
  const summary =
    summarizeCards(
      selectedCards,
      actorHp,
    );

  let nextActorBurnDamage =
    Math.max(
      0,
      Number(
        actorBurnDamage || 0,
      ),
    );

  let nextActorBurnTurns =
    Math.max(
      0,
      Number(
        actorBurnTurns || 0,
      ),
    );

  let nextActorWeaken =
    Math.max(
      0,
      Number(actorWeaken || 0),
    );

  const cleansedBurn =
    summary.cleanse &&
    nextActorBurnTurns > 0;

  const cleansedWeaken =
    summary.cleanse &&
    nextActorWeaken > 0;

  /*
    浄化は攻撃計算より先に処理。
    浄化カードと攻撃カードを同時使用した場合、
    弱体化による攻撃減少を受けない。
  */
  if (summary.cleanse) {
    nextActorBurnDamage = 0;
    nextActorBurnTurns = 0;
    nextActorWeaken = 0;
  }

  let weakenConsumed = 0;
  let effectiveDamage =
    summary.damage;

  /*
    攻撃を行った場合だけ弱体化を消費。
    回復だけのターンなら残る。
  */
  if (
    effectiveDamage > 0 &&
    nextActorWeaken > 0
  ) {
    weakenConsumed =
      Math.min(
        effectiveDamage,
        nextActorWeaken,
      );

    effectiveDamage =
      Math.max(
        0,
        effectiveDamage -
          nextActorWeaken,
      );

    nextActorWeaken = 0;
  }

  const effectivePierce =
    Math.min(
      summary.pierce,
      effectiveDamage,
    );

  const damageResult =
    applyAdvancedDamage(
      targetHp,
      targetShield,
      effectiveDamage,
      effectivePierce,
      summary.shieldBreak,
    );

  /*
    回復を先に行い、その後に反動。
  */
  const healedActorHp =
    Math.min(
      MAX_HP,
      Number(actorHp || 0) +
        summary.heal,
    );

  const actualHeal =
    Math.max(
      0,
      healedActorHp -
        Number(actorHp || 0),
    );

  /*
    反動ではHP1未満にならない。
  */
  const recoilDamage =
    Math.min(
      summary.recoil,
      Math.max(
        0,
        healedActorHp - 1,
      ),
    );

  let nextActorHp =
    Math.max(
      0,
      healedActorHp -
        recoilDamage,
    );

  /*
    炎上は行動した本人の
    ターン終了時に発生する。
    炎上はシールドを無視する。
  */
  let burnTickDamage = 0;

  if (
    nextActorBurnTurns > 0 &&
    nextActorBurnDamage > 0
  ) {
    burnTickDamage =
      Math.min(
        nextActorHp,
        nextActorBurnDamage,
      );

    nextActorHp =
      Math.max(
        0,
        nextActorHp -
          nextActorBurnDamage,
      );

    nextActorBurnTurns =
      Math.max(
        0,
        nextActorBurnTurns - 1,
      );

    if (
      nextActorBurnTurns === 0
    ) {
      nextActorBurnDamage = 0;
    }
  }

  const mergedTargetBurn =
    mergeBurn(
      targetBurnDamage,
      targetBurnTurns,
      summary.burn,
      summary.burnTurns,
    );

  const previousTargetWeaken =
    Math.max(
      0,
      Number(targetWeaken || 0),
    );

  const nextTargetWeaken =
    Math.max(
      previousTargetWeaken,
      summary.weaken,
    );

  const nextActorEnergy =
    Math.min(
      MAX_ENERGY,
      Math.max(
        0,
        Number(actorEnergy || 0),
      ) +
        summary.energyGain,
    );

  const nextTargetEnergy =
    Math.max(
      0,
      Number(targetEnergy || 0) -
        summary.energyDrain,
    );

  return {
    summary,
    damageResult,

    actorHp:
      nextActorHp,

    actorShield:
      Math.max(
        0,
        Number(actorShield || 0),
      ) +
      summary.shield,

    actorEnergy:
      nextActorEnergy,

    actorBurnDamage:
      nextActorBurnDamage,

    actorBurnTurns:
      nextActorBurnTurns,

    actorWeaken:
      nextActorWeaken,

    targetHp:
      damageResult.hp,

    targetShield:
      damageResult.shield,

    targetEnergy:
      nextTargetEnergy,

    targetBurnDamage:
      mergedTargetBurn.damage,

    targetBurnTurns:
      mergedTargetBurn.turns,

    targetWeaken:
      nextTargetWeaken,

    actualHeal,

    actualEnergyGain:
      Math.max(
        0,
        nextActorEnergy -
          Number(
            actorEnergy || 0,
          ),
      ),

    actualEnergyDrain:
      Math.max(
        0,
        Number(
          targetEnergy || 0,
        ) -
          nextTargetEnergy,
      ),

    recoilDamage,
    burnTickDamage,
    weakenConsumed,
    cleansedBurn,
    cleansedWeaken,

    burnChanged:
      mergedTargetBurn.damage !==
        Math.max(
          0,
          Number(
            targetBurnDamage || 0,
          ),
        ) ||
      mergedTargetBurn.turns !==
        Math.max(
          0,
          Number(
            targetBurnTurns || 0,
          ),
        ),

    weakenChanged:
      nextTargetWeaken !==
      previousTargetWeaken,
  };
}

function createCardEffectLogs(
  actor,
  target,
  selectedCards,
  result,
) {
  const logs =
    createCardLogs(
      actor,
      selectedCards,
    );

  if (
    result.cleansedBurn ||
    result.cleansedWeaken
  ) {
    logs.push(
      `　└ ✨ ${actor}の弱体効果を解除`,
    );
  }

  if (
    result.weakenConsumed > 0
  ) {
    logs.push(
      `　└ ⬇️ ${actor}の攻撃が${result.weakenConsumed}減少`,
    );
  }

  if (
    result.damageResult
      .brokenShield > 0
  ) {
    logs.push(
      `　└ 💥 ${target}のシールドを${result.damageResult.brokenShield}破壊`,
    );
  }

  if (
    result.damageResult.blocked > 0
  ) {
    logs.push(
      `　└ 🛡️ ${target}のシールドが${result.damageResult.blocked}防御`,
    );
  }

  if (
    result.damageResult.hpDamage > 0
  ) {
    logs.push(
      `　└ ⚔️ ${target}に${result.damageResult.hpDamage}ダメージ`,
    );
  }

  if (result.actualHeal > 0) {
    logs.push(
      `　└ 💚 ${actor}が${result.actualHeal}回復`,
    );
  }

  if (
    result.summary.shield > 0
  ) {
    logs.push(
      `　└ 🛡️ ${actor}がシールド${result.summary.shield}獲得`,
    );
  }

  if (
    result.actualEnergyGain > 0
  ) {
    logs.push(
      `　└ ⚡ ${actor}がエネルギー${result.actualEnergyGain}獲得`,
    );
  }

  if (
    result.actualEnergyDrain > 0
  ) {
    logs.push(
      `　└ ⚡ ${target}のエネルギーを${result.actualEnergyDrain}減少`,
    );
  }

  if (result.summary.draw > 0) {
    logs.push(
      `　└ 🃏 ${actor}に追加ドロー${result.summary.draw}枚`,
    );
  }

  if (result.burnChanged) {
    logs.push(
      `　└ 🔥 ${target}を${result.targetBurnDamage}ダメージ×${result.targetBurnTurns}ターンの炎上状態にした`,
    );
  }

  if (result.weakenChanged) {
    logs.push(
      `　└ ⬇️ ${target}の次の攻撃を${result.targetWeaken}弱体化`,
    );
  }

  if (
    result.recoilDamage > 0
  ) {
    logs.push(
      `　└ 💢 ${actor}が反動で${result.recoilDamage}ダメージ`,
    );
  }

  if (
    result.burnTickDamage > 0
  ) {
    logs.push(
      `　└ 🔥 ${actor}が炎上で${result.burnTickDamage}ダメージ`,
    );
  }

  return logs;
}

function nextRole(role) {
  return role === "host" ? "guest" : "host";
}

function roleLabel(
  role,
  myRole,
  myName,
  enemyName
) {
  return role === myRole
    ? myName
    : enemyName;
}
function createCardLogs(actor, usedCards) {
  if (!Array.isArray(usedCards) || usedCards.length === 0) {
    return [`⏭️ ${actor}はカードを使用しなかった`];
  }

  return usedCards.map((selected) => {
    const card = selected.card ?? selected;

    return `🎴 ${actor}：${card.name}`;
  });
}
function getCardsFromBattleLogs(battleLogs) {
  if (!Array.isArray(battleLogs)) {
    return [];
  }

  const cardNames = battleLogs
    .filter(
      (log) =>
        typeof log === "string" &&
        log.startsWith("🎴")
    )
    .map((log) => {
      const separatorIndex = log.indexOf("：");

      if (separatorIndex === -1) {
        return "";
      }

      return log
        .slice(separatorIndex + 1)
        .trim();
    })
    .filter(Boolean);

  return cardNames
    .map((name) =>
      cards.find((card) => card.name === name)
    )
    .filter(Boolean);
}
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = (event) => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
export default function Battle({
  mode,
  roomId,
  matchId,
  playerRole,
  currentUserId,
  playerName = "YOU",
  playerAvatarUrl = "",
  restartGame,
  onRematchStart,
  goToMenu,
}) {
  const [playerHP, setPlayerHP] = useState(INITIAL_HP);
  const [enemyHP, setEnemyHP] = useState(INITIAL_HP);
  const [playerShield, setPlayerShield] = useState(0);
  const [enemyShield, setEnemyShield] = useState(0);
  const [energy, setEnergy] = useState(INITIAL_ENERGY);
  const [cpuEnergy, setCpuEnergy] = useState(INITIAL_ENERGY);
  const [turnNumber, setTurnNumber] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [firstPlayer, setFirstPlayer] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRequestingRematch, setIsRequestingRematch] =
  useState(false);

const [rematchError, setRematchError] =
  useState("");
  const [isLoadingMatch, setIsLoadingMatch] = useState(mode === "online");
  const [coinVisible, setCoinVisible] = useState(true);
  const [drawnIndex, setDrawnIndex] = useState(null);
  const [playerEffect, setPlayerEffect] = useState(null);
  const [enemyEffect, setEnemyEffect] = useState(null);
  const [winner, setWinner] = useState(null);
  const [match, setMatch] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [deck, setDeck] =
  useState(loadDeck);

const [hand, setHand] =
  useState([]);

/*
  CPUも実際の手札とデッキを持つ。
  プレイヤーと同じデッキ構成を
  別々にシャッフルして使用する。
*/
const [cpuDeck, setCpuDeck] =
  useState(loadDeck);

const [cpuHand, setCpuHand] =
  useState([]);

const [
  cpuDiscardPile,
  setCpuDiscardPile,
] = useState([]);

const [
  playerBurn,
  setPlayerBurn,
] = useState({
  damage: 0,
  turns: 0,
});

const [
  enemyBurn,
  setEnemyBurn,
] = useState({
  damage: 0,
  turns: 0,
});

const [
  playerWeaken,
  setPlayerWeaken,
] = useState(0);

const [
  enemyWeaken,
  setEnemyWeaken,
] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] =
  useState(false);
  const [discardPile, setDiscardPile] = useState([]);
  const [cardAnimation, setCardAnimation] = useState(null);
  const [battleEffect, setBattleEffect] = useState(null);
  const [playedCards, setPlayedCards] = useState([]);
  const [screenShake, setScreenShake] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [gameSettings, setGameSettings] = useState(getSettings());
  const [turnPopup, setTurnPopup] = useState(null);
  const [battleUiScale, setBattleUiScale] =
    useState(1);
  const [opponentName, setOpponentName] = useState(
    mode === "online" ? "ENEMY" : "CPU",
  );
  const [opponentAvatarUrl, setOpponentAvatarUrl] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOpponentProfile() {
      if (mode !== "online") {
        setOpponentName("CPU");
        setOpponentAvatarUrl("");
        return;
      }

      if (!roomId || !currentUserId) {
        setOpponentName("ENEMY");
        setOpponentAvatarUrl("");
        return;
      }

      try {
        const { data: room, error: roomError } =
          await supabase
            .from("rooms")
            .select("host_id, guest_id")
            .eq("id", roomId)
            .maybeSingle();

        if (roomError) {
          throw roomError;
        }

        if (!room) {
          throw new Error(
            "対戦部屋を取得できませんでした",
          );
        }

        let opponentUserId = null;

        if (
          String(room.host_id) ===
          String(currentUserId)
        ) {
          opponentUserId = room.guest_id;
        } else if (
          String(room.guest_id) ===
          String(currentUserId)
        ) {
          opponentUserId = room.host_id;
        } else {
          throw new Error(
            "この対戦部屋の参加者ではありません",
          );
        }

        if (!opponentUserId) {
          setOpponentName("ENEMY");
          setOpponentAvatarUrl("");
          return;
        }

        const {
          data: opponentProfile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "username, nickname, avatar_url",
          )
          .eq("id", opponentUserId)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (cancelled) {
          return;
        }

        setOpponentName(
          opponentProfile?.username?.trim() ||
            opponentProfile?.nickname?.trim() ||
            "ENEMY",
        );
        setOpponentAvatarUrl(
          opponentProfile?.avatar_url ?? "",
        );
      } catch (error) {
        console.error(
          "相手プロフィール取得エラー:",
          error,
        );

        if (!cancelled) {
          setOpponentName("ENEMY");
          setOpponentAvatarUrl("");
        }
      }
    }

    loadOpponentProfile();

    return () => {
      cancelled = true;
    };
  }, [mode, roomId, currentUserId]);

  const cardAnimationTimerRef = useRef(null);
  const handRef =
  useRef(hand);

const deckRef =
  useRef(deck);

const discardRef =
  useRef(discardPile);

const cpuHandRef =
  useRef(cpuHand);

const cpuDeckRef =
  useRef(cpuDeck);

const cpuDiscardRef =
  useRef(cpuDiscardPile);

const selectedRef =
  useRef(selectedCards);
  const energyRef = useRef(energy);
  const matchRef = useRef(null);
  const initializedRef = useRef(false);
  const previousTurnRef = useRef(null);
  const battleEndingRef = useRef(false);
const resultTimerRef = useRef(null);
const resultFrameRef = useRef(null);
const rematchResettingRef = useRef(false);
const rematchNavigatingRef = useRef(false);
const RESULT_DELAY = 1150;

function finishBattle(result) {
  if (battleEndingRef.current) {
    return;
  }

  battleEndingRef.current = true;

  /*
    HPを0にするReactの更新が画面へ描画されてから、
    結果画面への切り替えを開始する。
  */
  resultFrameRef.current =
    window.requestAnimationFrame(() => {
      resultFrameRef.current =
        window.requestAnimationFrame(() => {
          resultTimerRef.current =
            window.setTimeout(() => {
              setWinner(result);
            }, RESULT_DELAY);
        });
    });
}
useEffect(() => {
  const updateBattleUiScale = () => {
    const viewportWidth =
      window.innerWidth;

    const viewportHeight =
      window.innerHeight;

    /*
      このサイズを基準にUI全体を縮小する。
      実際の画面がこれより小さいと、
      横と縦の厳しい方に合わせて縮小される。
    */
    const designWidth = 1760;
    const designHeight = 900;

    /*
      スマホは現在のスマホ用CSSを使う。
    */
    if (viewportWidth < 1100) {
      setBattleUiScale(1);
      return;
    }

    const widthScale =
      viewportWidth / designWidth;

    const heightScale =
      viewportHeight / designHeight;

    const nextScale = Math.min(
      1,
      widthScale,
      heightScale,
    );

    /*
      小さくなりすぎるのを防ぐ。
      これ以下で収まらない場合は
      縦スクロールを使う。
    */
    setBattleUiScale(
      Math.max(0.55, nextScale),
    );
  };

  updateBattleUiScale();

  window.addEventListener(
    "resize",
    updateBattleUiScale,
  );

  return () => {
    window.removeEventListener(
      "resize",
      updateBattleUiScale,
    );
  };
}, []);
  useEffect(() => {
    handRef.current = hand;
  }, [hand]);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);
  useEffect(() => {
  discardRef.current =
    discardPile;
}, [discardPile]);

useEffect(() => {
  cpuHandRef.current =
    cpuHand;
}, [cpuHand]);

useEffect(() => {
  cpuDeckRef.current =
    cpuDeck;
}, [cpuDeck]);

useEffect(() => {
  cpuDiscardRef.current =
    cpuDiscardPile;
}, [cpuDiscardPile]);

useEffect(() => {
  selectedRef.current =
    selectedCards;
}, [selectedCards]);
  useEffect(() => {
  energyRef.current = energy;
}, [energy]);

useEffect(() => {
  function handleSettingsChange(event) {
    const nextSettings =
      event.detail ?? getSettings();

    setGameSettings(nextSettings);
  }

  window.addEventListener(
    "chaos-settings-change",
    handleSettingsChange
  );

  return () => {
    window.removeEventListener(
      "chaos-settings-change",
      handleSettingsChange
    );
  };
}, []);
useEffect(() => {
  if (!gameSettings.cardAnimation) {
    setCardAnimation(null);

    if (cardAnimationTimerRef.current) {
      window.clearTimeout(
        cardAnimationTimerRef.current
      );

      cardAnimationTimerRef.current = null;
    }
  }

  if (!gameSettings.screenShake) {
    setScreenShake(false);
  }
}, [
  gameSettings.cardAnimation,
  gameSettings.screenShake,
]);
 useEffect(() => {
  async function initAudio() {
    await unlockAudio();
    await startBattleBgm();
  }

  initAudio();

  return () => {
    stopBattleBgm();
  };
}, []);
useEffect(() => {
  if (!winner) return;

  stopBattleBgm();

  if (winner === "player") {
    playSound("victory");
  } else if (winner === "enemy") {
    playSound("defeat");
  }
}, [winner]);

  const isMyTurn = useMemo(() => {
  if (mode === "cpu") {
    return currentPlayer === "player";
  }

  return currentPlayer === playerRole;
}, [currentPlayer, mode, playerRole]);

/*
  後攻の最初のターンだけは、
  現在のゲームルール上エネルギーが増えない。
*/
const isSecondPlayerFirstTurn =
  turnNumber === 1 &&
  currentPlayer === firstPlayer;

/*
  敵ターン中かつ、次の自分ターンで
  本当にエネルギーが追加される場合だけ表示する。
*/
const showNextEnergyPreview =
  currentPlayer !== null &&
  !isMyTurn &&
  !isSecondPlayerFirstTurn;

const nextTurnEnergy = showNextEnergyPreview
  ? Math.min(
      MAX_ENERGY,
      energy + ENERGY_PER_TURN,
    )
  : energy;
// 選択しているカードの合計コスト
const selectedEnergyCost = useMemo(() => {
  return selectedCards.reduce(
    (total, selected) => {
      return (
        total +
        Number(selected.card?.cost || 0)
      );
    },
    0,
  );
}, [selectedCards]);

// カードを選択する前に持っていたエネルギー
const energyBeforeSelection = Math.min(
  MAX_ENERGY,
  energy + selectedEnergyCost,
);
const opponentEnergy = useMemo(() => {
  if (mode === "cpu") {
    return cpuEnergy;
  }

  if (!match || !playerRole) {
    return 0;
  }

  const serverEnergy =
    playerRole === "host"
      ? match.guest_energy
      : match.host_energy;

  return Math.max(
    0,
    Math.min(
      MAX_ENERGY,
      Number(serverEnergy) || 0,
    ),
  );
}, [
  cpuEnergy,
  match,
  mode,
  playerRole,
]);
  const addLogs = useCallback((newLogs) => {
    setLogs((previous) => [...newLogs, ...previous].slice(0, 12));
  }, []);

  const showPlayerEffect = useCallback((text, type) => {
    setPlayerEffect({ text, type, id: Date.now() });
    window.setTimeout(() => setPlayerEffect(null), 900);
  }, []);

  const showCardAnimation = useCallback(
  (side, usedCards) => {
    if (!gameSettings.cardAnimation) {
      setCardAnimation(null);
      return;
    }

    if (
      !Array.isArray(usedCards) ||
      usedCards.length === 0
    ) {
      return;
    }

    if (cardAnimationTimerRef.current) {
      window.clearTimeout(
        cardAnimationTimerRef.current
      );
    }

    setCardAnimation({
      side,
      cards: usedCards,
      id: Date.now(),
    });

    const animationDisplayTime =
  2350 +
  Math.max(
    0,
    usedCards.length - 1,
  ) *
    220;

cardAnimationTimerRef.current =
  window.setTimeout(() => {
    setCardAnimation(null);
  }, animationDisplayTime);
  },
  [gameSettings.cardAnimation]
);
useEffect(() => {
  return () => {
    if (cardAnimationTimerRef.current) {
      window.clearTimeout(
        cardAnimationTimerRef.current
      );
    }
  };
}, []);
  const showEnemyEffect = useCallback((text, type) => {
    setEnemyEffect({ text, type, id: Date.now() });
    window.setTimeout(() => setEnemyEffect(null), 900);
  }, []);

  const drawFromDeck = useCallback((count, currentHand = handRef.current) => {
    let workingDeck = [...deckRef.current];
    let workingDiscard = [...discardRef.current];
    const drawn = [];
    const slots = Math.max(0, MAX_HAND_SIZE - currentHand.length);
    const drawCount = Math.min(count, slots);

    for (let index = 0; index < drawCount; index += 1) {
      if (workingDeck.length === 0 && workingDiscard.length > 0) {
        workingDeck = shuffle(workingDiscard);
        workingDiscard = [];
      }

      const card = workingDeck.shift();
      if (!card) break;
      drawn.push(card);
    }

    deckRef.current = workingDeck;
    discardRef.current = workingDiscard;
    setDeck(workingDeck);
    setDiscardPile(workingDiscard);
    return drawn;
  }, []);

  const consumeSelectedCards =
  useCallback(
    (extraDraw = 0) => {
      const usedIndexes =
        new Set(
          selectedRef.current.map(
            (item) =>
              item.handIndex,
          ),
        );

      const usedCards =
        selectedRef.current.map(
          (item) => item.card,
        );

      const remainingHand =
        handRef.current.filter(
          (_, index) =>
            !usedIndexes.has(index),
        );

      const newDiscard = [
        ...discardRef.current,
        ...usedCards,
      ];

      discardRef.current =
        newDiscard;

      setDiscardPile(
        newDiscard,
      );

      handRef.current =
        remainingHand;

      /*
        使用枚数分の通常補充に加えて、
        draw効果の枚数も引く。
      */
      const replacements =
        drawFromDeck(
          usedCards.length +
            Math.max(
              0,
              Number(extraDraw || 0),
            ),
          remainingHand,
        );

      const nextHand = [
        ...remainingHand,
        ...replacements,
      ];

      handRef.current =
        nextHand;

      setHand(nextHand);
      setSelectedCards([]);

      selectedRef.current = [];

      if (
        replacements.length > 0
      ) {
        setDrawnIndex(
          nextHand.length - 1,
        );

        window.setTimeout(
          () =>
            setDrawnIndex(null),
          500,
        );
      }
    },
    [drawFromDeck],
  );

const drawFromCpuDeck =
  useCallback(
    (
      count,
      currentHand =
        cpuHandRef.current,
    ) => {
      let workingDeck = [
        ...cpuDeckRef.current,
      ];

      let workingDiscard = [
        ...cpuDiscardRef.current,
      ];

      const drawn = [];

      const slots =
        Math.max(
          0,
          MAX_HAND_SIZE -
            currentHand.length,
        );

      const drawCount =
        Math.min(
          count,
          slots,
        );

      for (
        let index = 0;
        index < drawCount;
        index += 1
      ) {
        if (
          workingDeck.length ===
            0 &&
          workingDiscard.length > 0
        ) {
          workingDeck =
            shuffle(
              workingDiscard,
            );

          workingDiscard = [];
        }

        const card =
          workingDeck.shift();

        if (!card) {
          break;
        }

        drawn.push(card);
      }

      cpuDeckRef.current =
        workingDeck;

      cpuDiscardRef.current =
        workingDiscard;

      setCpuDeck(
        workingDeck,
      );

      setCpuDiscardPile(
        workingDiscard,
      );

      return drawn;
    },
    [],
  );

const consumeCpuCards =
  useCallback(
    (
      usedSelections,
      extraDraw = 0,
    ) => {
      const usedIndexes =
        new Set(
          usedSelections.map(
            (item) =>
              item.handIndex,
          ),
        );

      const usedCards =
        usedSelections.map(
          (item) => item.card,
        );

      const remainingHand =
        cpuHandRef.current.filter(
          (_, index) =>
            !usedIndexes.has(index),
        );

      const nextDiscard = [
        ...cpuDiscardRef.current,
        ...usedCards,
      ];

      cpuDiscardRef.current =
        nextDiscard;

      setCpuDiscardPile(
        nextDiscard,
      );

      const replacements =
        drawFromCpuDeck(
          usedCards.length +
            Math.max(
              0,
              Number(extraDraw || 0),
            ),
          remainingHand,
        );

      const nextHand = [
        ...remainingHand,
        ...replacements,
      ];

      cpuHandRef.current =
        nextHand;

      setCpuHand(nextHand);
    },
    [drawFromCpuDeck],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const openingHand =
  drawFromDeck(
    INITIAL_HAND_SIZE,
    [],
  );

handRef.current =
  openingHand;

setHand(openingHand);

if (mode === "cpu") {
  const openingCpuHand =
    drawFromCpuDeck(
      INITIAL_HAND_SIZE,
      [],
    );

  cpuHandRef.current =
    openingCpuHand;

  setCpuHand(
    openingCpuHand,
  );
      const first = Math.random() < 0.5 ? "player" : "cpu";
      setFirstPlayer(first);
      setCurrentPlayer(first);
      setCoinVisible(true);
      addLogs([
        `🪙 コイントス！${first === "player" ? playerName : "CPU"}が先攻！`,
      ]);

      window.setTimeout(() => setCoinVisible(false), 1700);
    }
  }, [
  addLogs,
  drawFromDeck,
  drawFromCpuDeck,
  mode,
  playerName,
]);
function getSelectedEnergyCost() {
  return selectedRef.current.reduce(
    (total, selected) =>
      total + Number(selected.card?.cost || 0),
    0
  );
}
  const syncMatchToView =
  useCallback(
    (nextMatch) => {
      matchRef.current =
        nextMatch;

      setMatch(nextMatch);

      setTurnNumber(
        Number(
          nextMatch.turn_number ||
            1,
        ),
      );

      setCurrentPlayer(
        nextMatch.current_player,
      );

      setFirstPlayer(
        nextMatch.first_player,
      );

      if (
        playerRole === "host"
      ) {
        const serverEnergy =
          Number(
            nextMatch.host_energy,
          ) || 0;

        const selectedCost =
          nextMatch.current_player ===
          playerRole
            ? getSelectedEnergyCost()
            : 0;

        const nextEnergy =
          Math.max(
            0,
            serverEnergy -
              selectedCost,
          );

        setPlayerHP(
          Number(
            nextMatch.host_hp,
          ),
        );

        setEnemyHP(
          Number(
            nextMatch.guest_hp,
          ),
        );

        setPlayerShield(
          Number(
            nextMatch.host_shield ||
              0,
          ),
        );

        setEnemyShield(
          Number(
            nextMatch.guest_shield ||
              0,
          ),
        );

        setPlayerBurn({
          damage:
            Number(
              nextMatch
                .host_burn_damage ||
                0,
            ),

          turns:
            Number(
              nextMatch
                .host_burn_turns ||
                0,
            ),
        });

        setEnemyBurn({
          damage:
            Number(
              nextMatch
                .guest_burn_damage ||
                0,
            ),

          turns:
            Number(
              nextMatch
                .guest_burn_turns ||
                0,
            ),
        });

        setPlayerWeaken(
          Number(
            nextMatch.host_weaken ||
              0,
          ),
        );

        setEnemyWeaken(
          Number(
            nextMatch.guest_weaken ||
              0,
          ),
        );

        energyRef.current =
          nextEnergy;

        setEnergy(nextEnergy);
      } else {
        const serverEnergy =
          Number(
            nextMatch.guest_energy,
          ) || 0;

        const selectedCost =
          nextMatch.current_player ===
          playerRole
            ? getSelectedEnergyCost()
            : 0;

        const nextEnergy =
          Math.max(
            0,
            serverEnergy -
              selectedCost,
          );

        setPlayerHP(
          Number(
            nextMatch.guest_hp,
          ),
        );

        setEnemyHP(
          Number(
            nextMatch.host_hp,
          ),
        );

        setPlayerShield(
          Number(
            nextMatch.guest_shield ||
              0,
          ),
        );

        setEnemyShield(
          Number(
            nextMatch.host_shield ||
              0,
          ),
        );

        setPlayerBurn({
          damage:
            Number(
              nextMatch
                .guest_burn_damage ||
                0,
            ),

          turns:
            Number(
              nextMatch
                .guest_burn_turns ||
                0,
            ),
        });

        setEnemyBurn({
          damage:
            Number(
              nextMatch
                .host_burn_damage ||
                0,
            ),

          turns:
            Number(
              nextMatch
                .host_burn_turns ||
                0,
            ),
        });

        setPlayerWeaken(
          Number(
            nextMatch.guest_weaken ||
              0,
          ),
        );

        setEnemyWeaken(
          Number(
            nextMatch.host_weaken ||
              0,
          ),
        );

        energyRef.current =
          nextEnergy;

        setEnergy(nextEnergy);
      }

      if (
        nextMatch.phase ===
          "finished" &&
        nextMatch.winner
      ) {
        const result =
          nextMatch.winner ===
          "draw"
            ? "draw"
            : nextMatch.winner ===
                playerRole
              ? "player"
              : "enemy";

        const isKnockout =
          Number(
            nextMatch.host_hp,
          ) <= 0 ||
          Number(
            nextMatch.guest_hp,
          ) <= 0;

        if (isKnockout) {
          finishBattle(result);
        } else {
          setWinner(result);
        }
      }
    },
    [playerRole],
  );

  useEffect(() => {
    if (mode !== "online" || !matchId || !playerRole) return undefined;

    let mounted = true;

    async function loadMatch() {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (!mounted) return;

      if (error) {
        addLogs([`❌ 試合読込エラー：${error.message}`]);
        setIsLoadingMatch(false);
        return;
      }

      syncMatchToView(data);
      setCoinVisible(true);
      setIsLoadingMatch(false);
      addLogs([
        `🪙 コイントス結果：${roleLabel(
  data.first_player,
  playerRole,
  playerName,
  opponentName
)}が先攻！`,
      ]);
      window.setTimeout(() => setCoinVisible(false), 1700);
    }

    loadMatch();

    const channel = supabase
      .channel(`turn-based-match-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
  console.log(
    "Realtime UPDATE",
    payload
  );

  const previous =
  matchRef.current;

const next =
  payload.new;

const previousRematchCount =
  Number(previous?.rematch_count || 0);

const nextRematchCount =
  Number(next?.rematch_count || 0);

const rematchStarted =
  previous?.phase === "finished" &&
  next.phase === "playing" &&
  nextRematchCount > previousRematchCount;

if (rematchStarted) {
  matchRef.current = next;

  if (!rematchNavigatingRef.current) {
    rematchNavigatingRef.current = true;
    onRematchStart?.();
  }

  return;
}

const previousLogs =
  Array.isArray(previous?.battle_logs)
    ? previous.battle_logs
    : [];

  const nextLogs =
    Array.isArray(next?.battle_logs)
      ? next.battle_logs
      : [];

  /*
    ターン数ではなく、バトルログが変化したかで
    カード使用を判定する。

    決着時はturn_numberが増えないため、
    この判定が必要。
  */
  const battleLogsChanged =
    JSON.stringify(previousLogs) !==
    JSON.stringify(nextLogs);

  /*
    自分のHPがどれだけ減ったかを、
    同期前のデータから計算する。
  */
  const previousMyHp =
    !previous
      ? null
      : playerRole === "host"
        ? Number(previous.host_hp)
        : Number(previous.guest_hp);

  const nextMyHp =
    playerRole === "host"
      ? Number(next.host_hp)
      : Number(next.guest_hp);

  const receivedDamage =
    previousMyHp === null
      ? 0
      : Math.max(
          0,
          previousMyHp - nextMyHp
        );

  /*
    更新前に相手のターンだった場合、
    この更新は相手のカード使用によるもの。
  */
  const opponentActed =
    Boolean(
      previous &&
      previous.current_player !==
        playerRole &&
      battleLogsChanged
    );
const previousEnemyShield =
  !previous
    ? 0
    : playerRole === "host"
      ? Number(
          previous.guest_shield || 0
        )
      : Number(
          previous.host_shield || 0
        );

const nextEnemyShield =
  playerRole === "host"
    ? Number(next.guest_shield || 0)
    : Number(next.host_shield || 0);

const gainedEnemyShield =
  Math.max(
    0,
    nextEnemyShield -
      previousEnemyShield
  );
  /*
    まずHPなどを最新状態へ反映する。
  */
  syncMatchToView(next);

  /*
    ターン表示
  */
  if (
    previousTurnRef.current !==
    next.current_player
  ) {
    previousTurnRef.current =
      next.current_player;

    showTurnPopup(
      next.current_player ===
        playerRole
    );
  }

  /*
    相手のカード演出。
    決着時も必ず実行される。
  */
  if (opponentActed) {
    if (gainedEnemyShield > 0) {
  playSound("shield");

  showEnemyEffect(
    `🛡 +${gainedEnemyShield}`,
    "shield"
  );
}
    try {
      const usedCards =
        getCardsFromBattleLogs(
          nextLogs
        );

      if (usedCards.length > 0) {
        showCardAnimation(
          "enemy",
          usedCards
        );
      }
    } catch (error) {
      console.error(
        "相手カード演出エラー:",
        error
      );
    }

    /*
      被ダメージ演出
  */
    if (receivedDamage > 0) {
      playSound("damage");

      showPlayerEffect(
        `-${receivedDamage}`,
        "damage"
      );

      if (
        gameSettings.screenShake
      ) {
        setScreenShake(true);

        window.setTimeout(() => {
          setScreenShake(false);
        }, 300);
      }
    }
  }

  if (
    next.phase === "finished" &&
    next.finish_reason ===
      "disconnect"
  ) {
    addLogs([
      next.winner === playerRole
        ? "🏆 相手が切断しました"
        : "❌ 接続が切断されました",
    ]);
  }

  const turnAdvanced =
    Boolean(
      previous &&
      Number(next.turn_number) >
        Number(previous.turn_number)
    );

  if (turnAdvanced) {
    playSound("turn");
  }

  /*
    決着時はターン数が変わらなくても、
    最後の攻撃ログを表示する。
  */
  if (battleLogsChanged) {
    const newLogs = [];

    if (turnAdvanced) {
      newLogs.push(
        `🔄 ターン${next.turn_number}：${roleLabel(
          next.current_player,
          playerRole,
          playerName,
          opponentName
        )}の番`
      );
    }

    newLogs.push(...nextLogs);

    addLogs(newLogs);
  }
}
      )
      .subscribe((status) => {
  console.log("Realtime status:", status);
});

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [
  addLogs,
  matchId,
  mode,
  onRematchStart,
  playerRole,
  syncMatchToView,
]);
useEffect(() => {
  /*
    再戦開始処理はホスト端末だけが行う。
    両方の端末から同時に試合初期化されるのを防ぐ。
  */
  if (
    mode !== "online" ||
    playerRole !== "host" ||
    !matchId ||
    match?.phase !== "finished" ||
    !match?.host_rematch ||
    !match?.guest_rematch ||
    rematchResettingRef.current
  ) {
    return undefined;
  }

  rematchResettingRef.current = true;

  async function startOnlineRematch() {
    const firstPlayer =
      Math.random() < 0.5
        ? "host"
        : "guest";

    const now =
      new Date().toISOString();

    const nextRematchCount =
      Number(match.rematch_count || 0) + 1;

    const {
      data: restartedMatch,
      error,
    } = await supabase
      .from("matches")
      .update({
        host_hp: INITIAL_HP,
        guest_hp: INITIAL_HP,

        host_energy: INITIAL_ENERGY,
        guest_energy: INITIAL_ENERGY,

        host_shield: 0,
guest_shield: 0,

host_burn_damage: 0,
host_burn_turns: 0,
guest_burn_damage: 0,
guest_burn_turns: 0,

host_weaken: 0,
guest_weaken: 0,

turn_number: 1,
        phase: "playing",

        first_player: firstPlayer,
        current_player: firstPlayer,

        winner: null,
        finish_reason: null,

        battle_logs: [
          `🪙 ${firstPlayer}が先攻`,
        ],

        host_last_seen: now,
        guest_last_seen: now,

        host_rematch: false,
        guest_rematch: false,

        rematch_count:
          nextRematchCount,
      })
      .eq("id", matchId)
      .eq("phase", "finished")
      .eq("host_rematch", true)
      .eq("guest_rematch", true)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error(
        "再戦開始エラー:",
        error
      );

      setRematchError(
        `再戦を開始できませんでした：${error.message}`
      );

      rematchResettingRef.current =
        false;

      return;
    }

    if (!restartedMatch) {
      setRematchError(
        "再戦の開始条件が変わりました。もう一度試してください。"
      );

      rematchResettingRef.current =
        false;

      return;
    }

    /*
      ホスト側はDB更新成功後、すぐ画面を作り直す。
      ゲスト側はRealtime更新から同じ処理が呼ばれる。
    */
    if (
      !rematchNavigatingRef.current
    ) {
      rematchNavigatingRef.current =
        true;

      onRematchStart?.();
    }
  }

  startOnlineRematch();

  return undefined;
}, [
  match,
  matchId,
  mode,
  onRematchStart,
  playerRole,
]);
// 自分が対戦画面を開いていることを5秒ごとに通知
useEffect(() => {
  if (
    !matchId ||
    !playerRole ||
    match?.phase !== "playing"
  ) {
    return undefined;
  }

  const lastSeenColumn =
    playerRole === "host"
      ? "host_last_seen"
      : "guest_last_seen";

  async function sendHeartbeat() {
    const { error } = await supabase
      .from("matches")
      .update({
        [lastSeenColumn]:
          new Date().toISOString(),
      })
      .eq("id", matchId)
      .eq("phase", "playing");

    if (error) {
      console.error(
        "生存確認の送信エラー:",
        error
      );
    }
  }

  sendHeartbeat();

  const intervalId = window.setInterval(
    sendHeartbeat,
    HEARTBEAT_INTERVAL
  );

  return () => {
    window.clearInterval(intervalId);
  };
}, [
  matchId,
  playerRole,
  match?.phase,
]);
// 相手の生存確認が20秒止まったら切断勝利
useEffect(() => {
  if (
    !matchId ||
    !playerRole ||
    match?.phase !== "playing"
  ) {
    return undefined;
  }

  let isChecking = false;

  async function checkOpponentConnection() {
    if (isChecking) return;

    isChecking = true;

    try {
      const { data: latestMatch, error } =
        await supabase
          .from("matches")
          .select(`
            id,
            phase,
            winner,
            host_last_seen,
            guest_last_seen
          `)
          .eq("id", matchId)
          .maybeSingle();

      if (error || !latestMatch) {
        console.error(
          "接続状態取得エラー:",
          error
        );
        return;
      }

      if (
        latestMatch.phase !== "playing" ||
        latestMatch.winner
      ) {
        return;
      }

      const opponentLastSeen =
        playerRole === "host"
          ? latestMatch.guest_last_seen
          : latestMatch.host_last_seen;

      if (!opponentLastSeen) {
        return;
      }

      const elapsed =
        Date.now() -
        new Date(opponentLastSeen).getTime();

      if (elapsed < DISCONNECT_TIMEOUT) {
        return;
      }

      const { error: finishError } =
        await supabase
          .from("matches")
          .update({
            winner: playerRole,
            phase: "finished",
            finish_reason: "disconnect",
          })
          .eq("id", matchId)
          .eq("phase", "playing")
          .is("winner", null);

      if (finishError) {
        console.error(
          "切断勝利処理エラー:",
          finishError
        );
      }
    } finally {
      isChecking = false;
    }
  }

  const intervalId = window.setInterval(
    checkOpponentConnection,
    5000
  );

  return () => {
    window.clearInterval(intervalId);
  };
}, [
  matchId,
  playerRole,
  match?.phase,
]);
useEffect(() => {
  return () => {
    if (resultTimerRef.current) {
      window.clearTimeout(
        resultTimerRef.current
      );
    }

    if (resultFrameRef.current) {
      window.cancelAnimationFrame(
        resultFrameRef.current
      );
    }
  };
}, []);
function showTurnPopup(myTurn) {
  setTurnPopup(myTurn ? "player" : "enemy");

  setTimeout(() => {
    setTurnPopup(null);
  }, 1200);
}
  function playCard(index) {
  if (!isMyTurn || isProcessing || winner) return;

  const card = handRef.current[index];
  if (!card) return;

  const cardCost = Number(card.cost || 0);

  const selectedIndex =
    selectedRef.current.findIndex(
      (item) => item.handIndex === index
    );

  // 選択解除
  if (selectedIndex >= 0) {
    const nextSelected =
      selectedRef.current.filter(
        (_, itemIndex) =>
          itemIndex !== selectedIndex
      );

    const nextEnergy = Math.min(
      MAX_ENERGY,
      energyRef.current + cardCost
    );

    selectedRef.current = nextSelected;
    energyRef.current = nextEnergy;

    setSelectedCards(nextSelected);
    setEnergy(nextEnergy);

    
    return;
  }

  // 最新値でエネルギー判定
  if (energyRef.current < cardCost) {
    return;
  }

  playSound("card");

  const nextEnergy =
    energyRef.current - cardCost;

  const nextSelected = [
    ...selectedRef.current,
    {
      card,
      handIndex: index,
    },
  ];

  // Reactの描画より先にRefを更新
  energyRef.current = nextEnergy;
  selectedRef.current = nextSelected;

  setEnergy(nextEnergy);
  setSelectedCards(nextSelected);
}

  function chooseCpuCards(
  availableEnergy,
) {
  let remaining =
    availableEnergy;

  const chosen = [];

  const availableCards =
    cpuHandRef.current.map(
      (card, handIndex) => ({
        card,
        handIndex,
      }),
    );

  let attempts = 0;

  while (
    remaining > 0 &&
    availableCards.length > 0 &&
    attempts < 20
  ) {
    attempts += 1;

    const affordable =
      availableCards.filter(
        (item) =>
          Number(
            item.card.cost || 0,
          ) <= remaining,
      );

    if (
      affordable.length === 0
    ) {
      break;
    }

    let pool = affordable;

    /*
      炎上・弱体化中は
      浄化を優先する。
    */
    if (
      (
        enemyBurn.turns > 0 ||
        enemyWeaken > 0
      ) &&
      Math.random() < 0.75
    ) {
      const cleanseCards =
        affordable.filter(
          (item) =>
            item.card.cleanse,
        );

      if (
        cleanseCards.length > 0
      ) {
        pool = cleanseCards;
      }
    } else if (
      enemyHP <= 15
    ) {
      const survivalCards =
        affordable.filter(
          (item) =>
            item.card.heal ||
            item.card.shield ||
            item.card.cleanse,
        );

      if (
        survivalCards.length > 0 &&
        Math.random() < 0.7
      ) {
        pool = survivalCards;
      }
    } else if (
      playerShield > 0 &&
      Math.random() < 0.55
    ) {
      const antiShieldCards =
        affordable.filter(
          (item) =>
            item.card.pierce ||
            item.card.shieldBreak,
        );

      if (
        antiShieldCards.length > 0
      ) {
        pool =
          antiShieldCards;
      }
    }

    const selected =
      pool[
        Math.floor(
          Math.random() *
            pool.length,
        )
      ];

    chosen.push(selected);

    remaining -=
      Number(
        selected.card.cost || 0,
      );

    const selectedPosition =
      availableCards.findIndex(
        (item) =>
          item.handIndex ===
          selected.handIndex,
      );

    if (
      selectedPosition >= 0
    ) {
      availableCards.splice(
        selectedPosition,
        1,
      );
    }
  }

  return {
    chosen,
    remaining,
  };
}

async function executeCpuTurn() {
  if (
    winner ||
    currentPlayer !== "cpu" ||
    isProcessing
  ) {
    return;
  }

  setIsProcessing(true);

  await new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        850,
      );
    },
  );

  const {
    chosen,
    remaining,
  } =
    chooseCpuCards(
      cpuEnergy,
    );

  const chosenCards =
    chosen.map(
      (selected) =>
        selected.card,
    );

  showCardAnimation(
    "enemy",
    chosenCards,
  );

  await new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        650,
      );
    },
  );

  const result =
    resolveTurnEffects({
      selectedCards: chosen,

      actorHp: enemyHP,
      actorShield: enemyShield,
      actorEnergy: remaining,

      actorBurnDamage:
        enemyBurn.damage,

      actorBurnTurns:
        enemyBurn.turns,

      actorWeaken:
        enemyWeaken,

      targetHp: playerHP,
      targetShield: playerShield,

      targetEnergy:
        energyRef.current,

      targetBurnDamage:
        playerBurn.damage,

      targetBurnTurns:
        playerBurn.turns,

      targetWeaken:
        playerWeaken,
    });

  const cpuDied =
    result.actorHp <= 0;

  const playerDied =
    result.targetHp <= 0;

  let battleResult = null;

  if (
    cpuDied &&
    playerDied
  ) {
    battleResult = "draw";
  } else if (playerDied) {
    battleResult = "enemy";
  } else if (cpuDied) {
    battleResult = "player";
  }

  const isPlayerFirstTurn =
    firstPlayer === "cpu" &&
    turnNumber === 1;

  const nextPlayerEnergy =
    battleResult
      ? result.targetEnergy
      : isPlayerFirstTurn
        ? result.targetEnergy
        : Math.min(
            MAX_ENERGY,
            result.targetEnergy +
              ENERGY_PER_TURN,
          );

  setPlayerHP(
    result.targetHp,
  );

  setPlayerShield(
    battleResult
      ? result.targetShield
      : 0,
  );

  setEnemyHP(
    result.actorHp,
  );

  setEnemyShield(
    result.actorShield,
  );

  setCpuEnergy(
    result.actorEnergy,
  );

  energyRef.current =
    nextPlayerEnergy;

  setEnergy(
    nextPlayerEnergy,
  );

  setPlayerBurn({
    damage:
      result.targetBurnDamage,

    turns:
      result.targetBurnTurns,
  });

  setEnemyBurn({
    damage:
      result.actorBurnDamage,

    turns:
      result.actorBurnTurns,
  });

  setPlayerWeaken(
    result.targetWeaken,
  );

  setEnemyWeaken(
    result.actorWeaken,
  );

  consumeCpuCards(
    chosen,
    result.summary.draw,
  );

  const turnLogs =
    createCardEffectLogs(
      "CPU",
      playerName,
      chosen,
      result,
    );

  addLogs(turnLogs);

  if (
    result.damageResult
      .hpDamage > 0
  ) {
    playSound("damage");

    showPlayerEffect(
      `-${result.damageResult.hpDamage}`,
      "damage",
    );

    if (
      gameSettings.screenShake
    ) {
      setScreenShake(true);

      window.setTimeout(
        () => {
          setScreenShake(false);
        },
        300,
      );
    }
  }

  if (
    result.actualHeal > 0
  ) {
    playSound("heal");

    showEnemyEffect(
      `+${result.actualHeal}`,
      "heal",
    );
  }

  if (
    result.summary.shield > 0
  ) {
    playSound("shield");

    showEnemyEffect(
      `🛡 +${result.summary.shield}`,
      "shield",
    );
  }

  const cpuSelfDamage =
    result.recoilDamage +
    result.burnTickDamage;

  if (cpuSelfDamage > 0) {
    showEnemyEffect(
      `-${cpuSelfDamage}`,
      "damage",
    );
  }

  if (battleResult) {
    finishBattle(
      battleResult,
    );

    setIsProcessing(false);
    return;
  }

  playSound("turn");

  setTurnNumber(
    (value) => value + 1,
  );

  setCurrentPlayer(
    "player",
  );

  showTurnPopup(true);

  setIsProcessing(false);
}
useEffect(() => {
  if (
    mode !== "cpu" ||
    currentPlayer !== "cpu" ||
    winner ||
    isProcessing ||
    coinVisible
  ) {
    return;
  }

  executeCpuTurn();

  // executeCpuTurnを依存配列に入れると
  // 毎レンダーで再実行される可能性があるため除外
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  currentPlayer,
  mode,
  winner,
  isProcessing,
  coinVisible,
]);
async function endCpuPlayerTurn() {
  const usedSelections = [
    ...selectedRef.current,
  ];

  setPlayedCards(
    usedSelections.map(
      (selected) =>
        selected.handIndex,
    ),
  );

  showCardAnimation(
    "player",

    usedSelections.map(
      (selected) =>
        selected.card,
    ),
  );

  await new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        650,
      );
    },
  );

  const result =
    resolveTurnEffects({
      selectedCards:
        usedSelections,

      actorHp: playerHP,
      actorShield:
        playerShield,

      /*
        選択時点ですでに
        エネルギーは減っている。
      */
      actorEnergy:
        energyRef.current,

      actorBurnDamage:
        playerBurn.damage,

      actorBurnTurns:
        playerBurn.turns,

      actorWeaken:
        playerWeaken,

      targetHp: enemyHP,
      targetShield:
        enemyShield,

      targetEnergy:
        cpuEnergy,

      targetBurnDamage:
        enemyBurn.damage,

      targetBurnTurns:
        enemyBurn.turns,

      targetWeaken:
        enemyWeaken,
    });

  const playerDied =
    result.actorHp <= 0;

  const cpuDied =
    result.targetHp <= 0;

  let battleResult = null;

  if (
    playerDied &&
    cpuDied
  ) {
    battleResult = "draw";
  } else if (cpuDied) {
    battleResult = "player";
  } else if (playerDied) {
    battleResult = "enemy";
  }

  const nextCpuEnergy =
    battleResult
      ? result.targetEnergy
      : Math.min(
          MAX_ENERGY,
          result.targetEnergy +
            ENERGY_PER_TURN,
        );

  setPlayerHP(
    result.actorHp,
  );

  setPlayerShield(
    result.actorShield,
  );

  setEnemyHP(
    result.targetHp,
  );

  setEnemyShield(
    battleResult
      ? result.targetShield
      : 0,
  );

  energyRef.current =
    result.actorEnergy;

  setEnergy(
    result.actorEnergy,
  );

  setCpuEnergy(
    nextCpuEnergy,
  );

  setPlayerBurn({
    damage:
      result.actorBurnDamage,

    turns:
      result.actorBurnTurns,
  });

  setEnemyBurn({
    damage:
      result.targetBurnDamage,

    turns:
      result.targetBurnTurns,
  });

  setPlayerWeaken(
    result.actorWeaken,
  );

  setEnemyWeaken(
    result.targetWeaken,
  );

  const turnLogs =
    createCardEffectLogs(
      playerName,
      "CPU",
      usedSelections,
      result,
    );

  addLogs(turnLogs);

  consumeSelectedCards(
    result.summary.draw,
  );

  setPlayedCards([]);

  if (
    result.damageResult
      .hpDamage > 0
  ) {
    playSound("damage");

    showEnemyEffect(
      `-${result.damageResult.hpDamage}`,
      "damage",
    );

    if (
      gameSettings.screenShake
    ) {
      setScreenShake(true);

      window.setTimeout(
        () => {
          setScreenShake(false);
        },
        300,
      );
    }
  }

  if (
    result.actualHeal > 0
  ) {
    playSound("heal");

    showPlayerEffect(
      `+${result.actualHeal}`,
      "heal",
    );
  }

  if (
    result.summary.shield > 0
  ) {
    playSound("shield");

    showPlayerEffect(
      `🛡 +${result.summary.shield}`,
      "shield",
    );
  }

  const playerSelfDamage =
    result.recoilDamage +
    result.burnTickDamage;

  if (
    playerSelfDamage > 0
  ) {
    showPlayerEffect(
      `-${playerSelfDamage}`,
      "damage",
    );
  }

  if (battleResult) {
    finishBattle(
      battleResult,
    );

    return;
  }

  playSound("turn");

  setTurnNumber(
    (value) => value + 1,
  );

  setCurrentPlayer("cpu");

  showTurnPopup(false);
}

  async function endOnlineTurn() {
  const currentMatch =
    matchRef.current;

  if (
    !currentMatch ||
    !matchId ||
    !playerRole
  ) {
    addLogs([
      "❌ 試合データがありません",
    ]);

    return;
  }

  if (
    currentMatch.current_player !==
    playerRole
  ) {
    addLogs([
      "⏳ 今は相手のターンです",
    ]);

    return;
  }

  setIsProcessing(true);

  const actingIsHost =
    playerRole === "host";

  const actorPrefix =
    actingIsHost
      ? "host"
      : "guest";

  const targetPrefix =
    actingIsHost
      ? "guest"
      : "host";

  const followingPlayer =
    nextRole(playerRole);

  const usedSelections = [
    ...selectedRef.current,
  ];

  setPlayedCards(
    usedSelections.map(
      (selected) =>
        selected.handIndex,
    ),
  );

  showCardAnimation(
    "player",

    usedSelections.map(
      (selected) =>
        selected.card,
    ),
  );

  await new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        650,
      );
    },
  );

  const spentEnergy =
    usedSelections.reduce(
      (total, selected) =>
        total +
        Number(
          selected.card?.cost ||
            0,
        ),
      0,
    );

  const actorServerEnergy =
    Number(
      currentMatch[
        `${actorPrefix}_energy`
      ] || 0,
    );

  const actorEnergyAfterCost =
    Math.max(
      0,
      actorServerEnergy -
        spentEnergy,
    );

  const result =
    resolveTurnEffects({
      selectedCards:
        usedSelections,

      actorHp:
        Number(
          currentMatch[
            `${actorPrefix}_hp`
          ] || 0,
        ),

      actorShield:
        Number(
          currentMatch[
            `${actorPrefix}_shield`
          ] || 0,
        ),

      actorEnergy:
        actorEnergyAfterCost,

      actorBurnDamage:
        Number(
          currentMatch[
            `${actorPrefix}_burn_damage`
          ] || 0,
        ),

      actorBurnTurns:
        Number(
          currentMatch[
            `${actorPrefix}_burn_turns`
          ] || 0,
        ),

      actorWeaken:
        Number(
          currentMatch[
            `${actorPrefix}_weaken`
          ] || 0,
        ),

      targetHp:
        Number(
          currentMatch[
            `${targetPrefix}_hp`
          ] || 0,
        ),

      targetShield:
        Number(
          currentMatch[
            `${targetPrefix}_shield`
          ] || 0,
        ),

      targetEnergy:
        Number(
          currentMatch[
            `${targetPrefix}_energy`
          ] || 0,
        ),

      targetBurnDamage:
        Number(
          currentMatch[
            `${targetPrefix}_burn_damage`
          ] || 0,
        ),

      targetBurnTurns:
        Number(
          currentMatch[
            `${targetPrefix}_burn_turns`
          ] || 0,
        ),

      targetWeaken:
        Number(
          currentMatch[
            `${targetPrefix}_weaken`
          ] || 0,
        ),
    });

  const actorDied =
    result.actorHp <= 0;

  const targetDied =
    result.targetHp <= 0;

  let matchWinner = null;

  if (
    actorDied &&
    targetDied
  ) {
    matchWinner = "draw";
  } else if (targetDied) {
    matchWinner =
      playerRole;
  } else if (actorDied) {
    matchWinner =
      followingPlayer;
  }

  const isSecondPlayerFirstTurn =
    Number(
      currentMatch.turn_number,
    ) === 1 &&
    currentMatch.current_player ===
      currentMatch.first_player;

  /*
    エネルギー妨害を先に行い、
    その後でターン開始分を追加する。
  */
  const nextTargetEnergy =
    matchWinner
      ? result.targetEnergy
      : isSecondPlayerFirstTurn
        ? result.targetEnergy
        : Math.min(
            MAX_ENERGY,
            result.targetEnergy +
              ENERGY_PER_TURN,
          );

  const turnLogs =
    createCardEffectLogs(
      playerName,
      opponentName,
      usedSelections,
      result,
    );

  const updates = {
    battle_logs:
      turnLogs,

    current_player:
      matchWinner
        ? playerRole
        : followingPlayer,

    turn_number:
      matchWinner
        ? currentMatch.turn_number
        : Number(
            currentMatch.turn_number,
          ) + 1,

    phase:
      matchWinner
        ? "finished"
        : "playing",

    winner:
      matchWinner,

    finish_reason:
      matchWinner
        ? "knockout"
        : null,

    [`${actorPrefix}_hp`]:
      result.actorHp,

    [`${actorPrefix}_shield`]:
      result.actorShield,

    [`${actorPrefix}_energy`]:
      result.actorEnergy,

    [`${actorPrefix}_burn_damage`]:
      result.actorBurnDamage,

    [`${actorPrefix}_burn_turns`]:
      result.actorBurnTurns,

    [`${actorPrefix}_weaken`]:
      result.actorWeaken,

    [`${targetPrefix}_hp`]:
      result.targetHp,

    /*
      相手側のシールドは、
      このターン終了時に期限切れ。
    */
    [`${targetPrefix}_shield`]:
      matchWinner
        ? result.targetShield
        : 0,

    [`${targetPrefix}_energy`]:
      nextTargetEnergy,

    [`${targetPrefix}_burn_damage`]:
      result.targetBurnDamage,

    [`${targetPrefix}_burn_turns`]:
      result.targetBurnTurns,

    [`${targetPrefix}_weaken`]:
      result.targetWeaken,
  };

  const {
    data: updatedMatch,
    error,
  } = await supabase
    .from("matches")
    .update(updates)
    .eq("id", matchId)
    .eq(
      "current_player",
      playerRole,
    )
    .eq(
      "turn_number",
      currentMatch.turn_number,
    )
    .select("*")
    .maybeSingle();

  if (error) {
    addLogs([
      `❌ ターン更新エラー：${error.message}`,
    ]);

    setIsProcessing(false);
    return;
  }

  if (!updatedMatch) {
    addLogs([
      "⚠️ 相手側で先に状態が更新されました。再同期します",
    ]);

    const { data } =
      await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

    if (data) {
      syncMatchToView(data);
    }

    setIsProcessing(false);
    return;
  }

  consumeSelectedCards(
    result.summary.draw,
  );

  setPlayedCards([]);

  syncMatchToView(
    updatedMatch,
  );

  addLogs(turnLogs);

  if (
    result.damageResult
      .hpDamage > 0
  ) {
    playSound("damage");

    showEnemyEffect(
      `-${result.damageResult.hpDamage}`,
      "damage",
    );

    if (
      gameSettings.screenShake
    ) {
      setScreenShake(true);

      window.setTimeout(
        () => {
          setScreenShake(false);
        },
        300,
      );
    }
  }

  if (
    result.actualHeal > 0
  ) {
    playSound("heal");

    showPlayerEffect(
      `+${result.actualHeal}`,
      "heal",
    );
  }

  if (
    result.summary.shield > 0
  ) {
    playSound("shield");

    showPlayerEffect(
      `🛡 +${result.summary.shield}`,
      "shield",
    );
  }

  const playerSelfDamage =
    result.recoilDamage +
    result.burnTickDamage;

  if (
    playerSelfDamage > 0
  ) {
    showPlayerEffect(
      `-${playerSelfDamage}`,
      "damage",
    );
  }

    setIsProcessing(false);
}

async function surrender() {
  const confirmed =
    window.confirm(
      "本当に降参しますか？",
    );

  if (!confirmed) {
    return;
  }

  /*
    CPU対戦
  */
  if (mode === "cpu") {
    setIsSettingsOpen(false);
    finishBattle("enemy");
    return;
  }

  /*
    オンライン対戦で必要な情報が
    欠けている場合は処理しない。
  */
  if (
    mode !== "online" ||
    !matchId ||
    !playerRole
  ) {
    addLogs([
      "❌ 降参処理に必要な試合情報がありません",
    ]);

    return;
  }

  setIsProcessing(true);

  const { error } =
    await supabase
      .from("matches")
      .update({
        winner:
          nextRole(playerRole),

        phase: "finished",

        finish_reason:
          "surrender",
      })
      .eq("id", matchId)
      .eq("phase", "playing");

  if (error) {
    console.error(
      "降参エラー:",
      error,
    );

    addLogs([
      `❌ 降参エラー：${error.message}`,
    ]);

    setIsProcessing(false);
    return;
  }

  setIsSettingsOpen(false);
  setIsProcessing(false);
}

async function requestRematch() {
  if (
    mode !== "online" ||
    !matchId ||
    !playerRole ||
    match?.phase !== "finished" ||
    isRequestingRematch
  ) {
    return;
  }

  const rematchColumn =
    playerRole === "host"
      ? "host_rematch"
      : "guest_rematch";

  const alreadyRequested =
    playerRole === "host"
      ? Boolean(match.host_rematch)
      : Boolean(match.guest_rematch);

  if (alreadyRequested) {
    return;
  }

  setIsRequestingRematch(true);
  setRematchError("");

  const {
    data: updatedMatch,
    error,
  } = await supabase
    .from("matches")
    .update({
      [rematchColumn]: true,
    })
    .eq("id", matchId)
    .eq("phase", "finished")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error(
      "再戦申請エラー:",
      error
    );

    setRematchError(
      `再戦を申し込めませんでした：${error.message}`
    );

    setIsRequestingRematch(false);
    return;
  }

  if (!updatedMatch) {
    setRematchError(
      "再戦申請を反映できませんでした。画面を開き直してください。"
    );

    setIsRequestingRematch(false);
    return;
  }

  syncMatchToView(updatedMatch);

  setIsRequestingRematch(false);
}

async function leaveBattleResult() {
  /*
    再戦申請後に退出した場合、
    自分の再戦希望を取り消しておく。
  */
  if (
    mode === "online" &&
    matchId &&
    playerRole &&
    match?.phase === "finished"
  ) {
    const rematchColumn =
      playerRole === "host"
        ? "host_rematch"
        : "guest_rematch";

    const { error } = await supabase
      .from("matches")
      .update({
        [rematchColumn]: false,
      })
      .eq("id", matchId)
      .eq("phase", "finished");

    if (error) {
      console.error(
        "再戦申請の解除エラー:",
        error
      );
    }
  }

  if (mode === "online") {
    restartGame();
  } else {
    goToMenu();
  }
}
  async function endTurn() {
    if (!isMyTurn || isProcessing || winner) return;
    setIsProcessing(true);

    try {
      if (mode === "cpu") await endCpuPlayerTurn();
      else await endOnlineTurn();
    } finally {
      if (mode === "cpu") setIsProcessing(false);
    }
  }

  if (winner) {
    const playerWon = winner === "player";
    const isDraw = winner === "draw";
    const playerResultClass = isDraw
      ? "result-player-draw"
      : playerWon
        ? "result-player-winner"
        : "result-player-loser";
    const opponentResultClass = isDraw
      ? "result-player-draw"
      : playerWon
        ? "result-player-loser"
        : "result-player-winner";
const myRematchRequested =
  mode === "online" && match
    ? playerRole === "host"
      ? Boolean(match.host_rematch)
      : Boolean(match.guest_rematch)
    : false;

const opponentRematchRequested =
  mode === "online" && match
    ? playerRole === "host"
      ? Boolean(match.guest_rematch)
      : Boolean(match.host_rematch)
    : false;

const bothRematchRequested =
  myRematchRequested &&
  opponentRematchRequested;

const rematchStatusText =
  rematchError
    ? rematchError
    : bothRematchRequested
      ? "両者が再戦を希望しました。試合を準備しています…"
      : myRematchRequested
        ? "相手の返事を待っています…"
        : opponentRematchRequested
          ? `${opponentName}が再戦を希望しています`
          : "両者が希望すると再戦が始まります";
    return (
      <div className="app battle-page">
        <div className="result-screen">
          <div className="result-icon">
            {isDraw ? "🤝" : playerWon ? "🏆" : "💀"}
          </div>

          <h1>
            {isDraw
              ? "DRAW!"
              : playerWon
                ? "YOU WIN!"
                : "YOU LOSE..."}
          </h1>

          <div className="result-players">
            <article
              className={`result-player-card ${playerResultClass}`}
            >
              <span className="result-player-side">
                PLAYER
              </span>

              <div className="result-player-avatar">
                {playerAvatarUrl ? (
                  <img
                    src={playerAvatarUrl}
                    alt={`${playerName}のプロフィール画像`}
                  />
                ) : (
                  <span>😀</span>
                )}
              </div>

              <strong className="result-player-name">
                {playerName}
              </strong>

              <span className="result-player-hp">
                HP {Math.max(0, playerHP)} / {MAX_HP}
              </span>

              <span className="result-player-outcome">
                {isDraw
                  ? "DRAW"
                  : playerWon
                    ? "WIN"
                    : "LOSE"}
              </span>
            </article>

            <div className="result-versus">VS</div>

            <article
              className={`result-player-card ${opponentResultClass}`}
            >
              <span className="result-player-side">
                {mode === "online" ? "ENEMY" : "CPU"}
              </span>

              <div className="result-player-avatar">
                {mode === "online" &&
                opponentAvatarUrl ? (
                  <img
                    src={opponentAvatarUrl}
                    alt={`${opponentName}のプロフィール画像`}
                  />
                ) : (
                  <span>
                    {mode === "online" ? "🌐" : "🤖"}
                  </span>
                )}
              </div>

              <strong className="result-player-name">
                {opponentName}
              </strong>

              <span className="result-player-hp">
                HP {Math.max(0, enemyHP)} / {MAX_HP}
              </span>

              <span className="result-player-outcome">
                {isDraw
                  ? "DRAW"
                  : playerWon
                    ? "LOSE"
                    : "WIN"}
              </span>
            </article>
          </div>

          <p>
            {match?.finish_reason === "disconnect"
              ? playerWon
                ? "相手が切断したため勝利しました"
                : "接続が切断されたため敗北しました"
              : match?.finish_reason === "surrender"
                ? playerWon
                  ? "相手が降参しました"
                  : "あなたは降参しました"
                : isDraw
                  ? "引き分け！"
                  : playerWon
                    ? "勝利した！"
                    : "次の戦いで取り返そう！"}
          </p>

          {mode === "online" && (
  <div
    className={`result-rematch-status ${
      rematchError
        ? "result-rematch-status-error"
        : ""
    }`}
    aria-live="polite"
  >
    {rematchStatusText}
  </div>
)}

<div className="result-buttons">
  {mode === "online" ? (
    <button
      type="button"
      onClick={requestRematch}
      disabled={
        isRequestingRematch ||
        myRematchRequested ||
        bothRematchRequested
      }
    >
      {isRequestingRematch
        ? "⏳ 送信中…"
        : bothRematchRequested
          ? "⚔️ 再戦準備中…"
          : myRematchRequested
            ? "✅ 再戦申請済み"
            : opponentRematchRequested
              ? "🔄 再戦を受ける"
              : "🔄 再戦を申し込む"}
    </button>
  ) : (
    <button
      type="button"
      onClick={restartGame}
    >
      🔄 もう一回
    </button>
  )}

  <button
    type="button"
    onClick={leaveBattleResult}
    disabled={
      mode === "online" &&
      bothRematchRequested
    }
  >
    {mode === "online"
      ? "🌐 オンラインへ戻る"
      : "🏠 メニューへ戻る"}
  </button>
</div>
        </div>
      </div>
    );
  }

  if (isLoadingMatch) {
    return (
      <div className="app battle-page">
        <h2>⚔️ 試合を読み込んでいます…</h2>
      </div>
    );
  }

return (
  <div className="app battle-page">
    <button
      type="button"
      className="battle-settings-button"
      onClick={() => {
        setIsSettingsOpen(true);
      }}
      aria-label="設定を開く"
      title="設定"
    >
      ⚙
    </button>

    <div
      className={`battle-content ${
        screenShake ? "screen-shake" : ""
      }`}
      style={{
        "--battle-ui-scale": battleUiScale,
        "--battle-ui-width":
          `${100 / battleUiScale}%`,
      }}
    >
      <h1 className="battle-title">
  <span>CHAOS</span>
  <strong>CARDS</strong>
</h1>

        {coinVisible && firstPlayer && (
          <div className="coin-toss-overlay">
            <div className="coin">🪙</div>
            <strong>
              {mode === "cpu"
                ? firstPlayer === "player"
                  ? "YOUが先攻！"
                  : "CPUが先攻！"
                : firstPlayer === playerRole
                  ? "あなたが先攻！"
                  : "相手が先攻！"}
            </strong>
          </div>
        )}

        

        <div className="battle-main-area">
  <div className="battle-stage-layout">
    <div className="battle-status-grid">
      <BattleStatus
  name={opponentName}
  icon={
    mode === "online"
      ? "🌐"
      : "🤖"
  }
  avatarUrl={
    mode === "online"
      ? opponentAvatarUrl
      : ""
  }
  hp={enemyHP}
  maxHp={MAX_HP}
  shield={enemyShield}
  energy={opponentEnergy}
  maxEnergy={MAX_ENERGY}
  burn={enemyBurn}
  weaken={enemyWeaken}
  active={!isMyTurn}
  effect={enemyEffect}
  enemy
/>

      <BattleStatus
  name={playerName}
  icon="😀"
  avatarUrl={playerAvatarUrl}
  hp={playerHP}
  maxHp={MAX_HP}
  shield={playerShield}
  energy={energy}
  maxEnergy={MAX_ENERGY}
  burn={playerBurn}
  weaken={playerWeaken}
  active={isMyTurn}
  effect={playerEffect}
/>
    </div>

    <div className="battle-stage-field">
      <BattleField
        isMyTurn={isMyTurn}
        cardAnimation={cardAnimation}
      />
    </div>
  </div>

          <div className="battle-controls">
  <div className="turn-summary">
    <div className="turn-summary-number">
      TURN {turnNumber}
    </div>

    <div
      className={`turn-summary-state ${
        isMyTurn ? "is-player" : "is-enemy"
      }`}
    >
      <span className="turn-summary-dot" />

      {isProcessing
  ? "PROCESSING..."
  : isMyTurn
    ? "YOUR TURN"
    : "ENEMY TURN"}
    </div>
  </div>

  <div className="resource-row">
    <div className="deck-counter">
      <span className="resource-icon">🃏</span>

      <span className="resource-label">
        DECK
      </span>

      <strong>{deck.length}</strong>
    </div>

    <div className="energy-panel">
      <div className="energy-panel-header">
        <span>ENERGY</span>
        <strong>
          {energy}/{MAX_ENERGY}
        </strong>
      </div>

      <div
  className="energy-orbs"
  aria-label={`エネルギー ${energy}/${MAX_ENERGY}`}
>
  {Array.from(
  { length: MAX_ENERGY },
  (_, index) => {
    // 今すぐ使えるエネルギー
    const isFilled =
      index < energy;

    // 選択したカードによって消費予定のエネルギー
    const isReservedEnergy =
      isMyTurn &&
      index >= energy &&
      index < energyBeforeSelection;

    // 敵ターン中、次ターンに追加されるエネルギー
    const isNextEnergy =
      showNextEnergyPreview &&
      index >= energy &&
      index < nextTurnEnergy;

    return (
      <span
        key={index}
        className={[
          "energy-orb",
          isFilled
            ? "filled"
            : "",
          isReservedEnergy
            ? "reserved-energy"
            : "",
          isNextEnergy
            ? "next-energy"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        ⚡
      </span>
    );
  },
)}
</div>
    </div>

    <div className="deck-counter">
      <span className="resource-icon">🗑️</span>

      <span className="resource-label">
        DISCARD
      </span>

      <strong>{discardPile.length}</strong>
    </div>
  </div>

  <button
    type="button"
    className={`end-turn-button ${
      isMyTurn && !isProcessing
        ? "end-turn-ready"
        : ""
    }`}
    onClick={endTurn}
    disabled={!isMyTurn || isProcessing}
  >
    <span className="end-turn-button-text">
      {isProcessing
        ? "処理中..."
        : isMyTurn
          ? "ターン終了"
          : "相手のターン"}
    </span>

    <span className="end-turn-button-icon">
      {isMyTurn && !isProcessing
        ? "➜"
        : "⌛"}
    </span>
  </button>
 </div>
</div>
<div className="battle-bottom-layout">
  <div className="battle-log-column">
    <BattleLog logs={logs} />
  </div>

  <div className="hand-section">
    <div className="hand-section-header">
      <div>
        <span className="hand-section-kicker">
          YOUR CARDS
        </span>

        <h3>手札</h3>
      </div>

      <span className="hand-count">
        {hand.length}/{MAX_HAND_SIZE}
      </span>
    </div>

    <div
      className={`hand ${
        isMobile
          ? "hand-mobile"
          : "hand-desktop"
      }`}
      aria-label="手札"
    >
      {hand.map((card, index) => {
        const isSelected =
          selectedCards.some(
            (item) =>
              item.handIndex === index
          );

        const disabled =
          !isMyTurn ||
          isProcessing ||
          (!isSelected &&
            energy < Number(card.cost));

        const center =
          (hand.length - 1) / 2;

        const angleStep =
          isMobile ? 0 : 6;

        const offsetStep =
          isMobile ? 0 : 10;

        const angle =
          (index - center) * angleStep;

        const offsetY =
          Math.abs(index - center) *
          offsetStep;

        return (
          <div
            key={`${card.id}-${index}`}
            className={`hand-card-wrapper ${
              isSelected
                ? "card-selected"
                : ""
            }`}
            style={{
              "--card-angle":
                `${angle}deg`,
              "--card-offset-y":
                `${offsetY}px`,
            }}
          >
            <Card
              card={card}
              index={index}
              isDrawn={
                drawnIndex === index
              }
              disabled={disabled}
              onPlay={() =>
                playCard(index)
              }
              isPlayed={playedCards.includes(
                index
              )}
            />

            {isSelected && (
              <div className="selected-overlay">
                <span>✓</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
</div>
      </div>

            {isSettingsOpen && (
  <div
    className="battle-settings-overlay"
    role="presentation"
    onClick={() => {
      setIsSettingsOpen(false);
    }}
  >
    <div
      className="battle-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-label="バトル設定"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <Settings
        isModal
        onClose={() => {
          setIsSettingsOpen(false);
        }}
        onSurrender={surrender}
      />
    </div>
  </div>
)}

      {turnPopup && (
        <div className="turn-popup-layer">
          <div
            className={`turn-popup-content ${turnPopup}`}
          >
            <span className="turn-icon">
              {turnPopup === "player" ? "⚡" : "⌛"}
            </span>

            <span>
              {turnPopup === "player"
                ? "YOUR TURN"
                : "ENEMY TURN"}
            </span>
          </div>
        </div>
     )}
    </div>
  );
}