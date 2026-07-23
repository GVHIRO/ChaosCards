import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import BattleLog from "../components/BattleLog";
import Card from "../components/Card";
import cards from "../data/cards";
import "../App.css";

const INITIAL_HP = 40;
const MAX_HP = 40;
const INITIAL_ENERGY = 3;
const MAX_ENERGY = 5;
const ENERGY_PER_TURN = 3;
const INITIAL_HAND_SIZE = 5;
const MAX_HAND_SIZE = 7;

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
  const savedDeck = localStorage.getItem("chaosCardsDeck");

  if (savedDeck) {
    try {
      const parsed = JSON.parse(savedDeck);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return shuffle(parsed);
      }
    } catch (error) {
      console.error("デッキ読込エラー:", error);
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

function summarizeCards(selectedCards) {
  return selectedCards.reduce(
    (summary, selected) => {
      const card = selected.card ?? selected;
      const hits = Number(card.hits || 1);

      summary.damage += Number(card.damage || 0) * hits;
      summary.heal += Number(card.heal || 0);
      summary.shield += getShieldValue(card);
      summary.names.push(card.name);
      return summary;
    },
    { damage: 0, heal: 0, shield: 0, names: [] }
  );
}

function applyDamage(hp, shield, damage) {
  const blocked = Math.min(shield, damage);
  const hpDamage = Math.max(0, damage - blocked);

  return {
    hp: Math.max(0, hp - hpDamage),
    shield: Math.max(0, shield - blocked),
    blocked,
    hpDamage,
  };
}

function nextRole(role) {
  return role === "host" ? "guest" : "host";
}

function roleLabel(role, myRole) {
  return role === myRole ? "YOU" : "相手";
}

export default function Battle({
  mode = "cpu",
  matchId,
  playerRole,
  restartGame,
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
  const [isLoadingMatch, setIsLoadingMatch] = useState(mode === "online");
  const [coinVisible, setCoinVisible] = useState(true);
  const [drawnIndex, setDrawnIndex] = useState(null);
  const [playerEffect, setPlayerEffect] = useState(null);
  const [enemyEffect, setEnemyEffect] = useState(null);
  const [winner, setWinner] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [deck, setDeck] = useState(loadDeck);
  const [hand, setHand] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);

  const handRef = useRef(hand);
  const deckRef = useRef(deck);
  const discardRef = useRef(discardPile);
  const selectedRef = useRef(selectedCards);
  const matchRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    handRef.current = hand;
  }, [hand]);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);
  useEffect(() => {
    discardRef.current = discardPile;
  }, [discardPile]);
  useEffect(() => {
    selectedRef.current = selectedCards;
  }, [selectedCards]);

  const isMyTurn = useMemo(() => {
    if (mode === "cpu") return currentPlayer === "player";
    return currentPlayer === playerRole;
  }, [currentPlayer, mode, playerRole]);

  const opponentName = mode === "online" ? "OPPONENT" : "CPU";

  const addLogs = useCallback((newLogs) => {
    setLogs((previous) => [...newLogs, ...previous].slice(0, 12));
  }, []);

  const showPlayerEffect = useCallback((text, type) => {
    setPlayerEffect({ text, type, id: Date.now() });
    window.setTimeout(() => setPlayerEffect(null), 900);
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

  const consumeSelectedCards = useCallback(() => {
    const usedIndexes = new Set(selectedRef.current.map((item) => item.handIndex));
    const usedCards = selectedRef.current.map((item) => item.card);
    const remainingHand = handRef.current.filter((_, index) => !usedIndexes.has(index));

    const newDiscard = [...discardRef.current, ...usedCards];
    discardRef.current = newDiscard;
    setDiscardPile(newDiscard);

    handRef.current = remainingHand;
    const replacements = drawFromDeck(usedCards.length, remainingHand);
    const nextHand = [...remainingHand, ...replacements];

    handRef.current = nextHand;
    setHand(nextHand);
    setSelectedCards([]);
    selectedRef.current = [];

    if (replacements.length > 0) {
      setDrawnIndex(nextHand.length - 1);
      window.setTimeout(() => setDrawnIndex(null), 500);
    }
  }, [drawFromDeck]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const openingHand = drawFromDeck(INITIAL_HAND_SIZE, []);
    handRef.current = openingHand;
    setHand(openingHand);

    if (mode === "cpu") {
      const first = Math.random() < 0.5 ? "player" : "cpu";
      setFirstPlayer(first);
      setCurrentPlayer(first);
      setCoinVisible(true);
      addLogs([
        `🪙 コイントス！${first === "player" ? "YOU" : "CPU"}が先攻！`,
      ]);

      window.setTimeout(() => setCoinVisible(false), 1700);
    }
  }, [addLogs, drawFromDeck, mode]);

  const syncMatchToView = useCallback(
    (match) => {
      matchRef.current = match;
      setTurnNumber(Number(match.turn_number || 1));
      setCurrentPlayer(match.current_player);
      setFirstPlayer(match.first_player);

      if (playerRole === "host") {
        setPlayerHP(match.host_hp);
        setEnemyHP(match.guest_hp);
        setPlayerShield(match.host_shield || 0);
        setEnemyShield(match.guest_shield || 0);
        setEnergy(match.host_energy);
      } else {
        setPlayerHP(match.guest_hp);
        setEnemyHP(match.host_hp);
        setPlayerShield(match.guest_shield || 0);
        setEnemyShield(match.host_shield || 0);
        setEnergy(match.guest_energy);
      }

      if (match.phase === "finished" && match.winner) {
        if (match.winner === "draw") setWinner("draw");
        else setWinner(match.winner === playerRole ? "player" : "enemy");
      }
    },
    [playerRole]
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
        `🪙 コイントス結果：${roleLabel(data.first_player, playerRole)}が先攻！`,
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
          const previous = matchRef.current;
          const next = payload.new;
          syncMatchToView(next);

          if (previous && Number(next.turn_number) > Number(previous.turn_number)) {
            const battleLogs = Array.isArray(next.battle_logs) ? next.battle_logs : [];
            addLogs([
              `🔄 ターン${next.turn_number}：${roleLabel(next.current_player, playerRole)}の番`,
              ...battleLogs,
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [addLogs, matchId, mode, playerRole, syncMatchToView]);

  function playCard(index) {
    if (!isMyTurn || isProcessing || winner) return;

    const card = hand[index];
    if (!card) return;

    const selectedIndex = selectedCards.findIndex((item) => item.handIndex === index);

    if (selectedIndex >= 0) {
      setSelectedCards((previous) =>
        previous.filter((_, itemIndex) => itemIndex !== selectedIndex)
      );
      setEnergy((value) => Math.min(MAX_ENERGY, value + Number(card.cost)));
      addLogs([`↩️ ${card.name}の選択を解除`]);
      return;
    }

    if (energy < Number(card.cost)) {
      addLogs(["⚡ エネルギーが足りない！"]);
      return;
    }

    setEnergy((value) => value - Number(card.cost));
    setSelectedCards((previous) => [...previous, { card, handIndex: index }]);
    addLogs([`✅ ${card.name}を選択`]);
  }

  function chooseCpuCards(availableEnergy) {
    let remaining = availableEnergy;
    const chosen = [];
    let attempts = 0;

    while (remaining > 0 && attempts < 20) {
      attempts += 1;
      const affordable = cards.filter((card) => Number(card.cost) <= remaining);
      if (affordable.length === 0) break;

      // HPが少ないと回復・防御を少し優先する
      let pool = affordable;
      if (enemyHP <= 15) {
        const survival = affordable.filter((card) => card.heal || card.shield);
        if (survival.length > 0 && Math.random() < 0.65) pool = survival;
      }

      const card = pool[Math.floor(Math.random() * pool.length)];
      chosen.push(card);
      remaining -= Number(card.cost);
    }

    return { chosen, remaining };
  }

  async function executeCpuTurn() {
    if (winner || currentPlayer !== "cpu" || isProcessing) return;
    setIsProcessing(true);

    await new Promise((resolve) => window.setTimeout(resolve, 850));

    const { chosen, remaining } = chooseCpuCards(cpuEnergy);
    const summary = summarizeCards(chosen);
    const damaged = applyDamage(playerHP, playerShield, summary.damage);
    const healedEnemy = Math.min(MAX_HP, enemyHP + summary.heal);

    setPlayerHP(damaged.hp);
    setPlayerShield(damaged.shield);
    setEnemyHP(healedEnemy);
    setEnemyShield((value) => value + summary.shield);
    setCpuEnergy(remaining);

    const turnLogs = [
      chosen.length > 0
        ? `🤖 CPU：${summary.names.join("、")}`
        : "🤖 CPUは何もしなかった",
    ];

    if (damaged.blocked > 0) turnLogs.push(`🛡️ YOUの盾が${damaged.blocked}ダメージ防御`);
    if (damaged.hpDamage > 0) {
      turnLogs.push(`⚔️ YOUに${damaged.hpDamage}ダメージ`);
      showPlayerEffect(`-${damaged.hpDamage}`, "damage");
    }
    if (summary.heal > 0) {
      const actual = healedEnemy - enemyHP;
      if (actual > 0) {
        turnLogs.push(`💚 CPUが${actual}回復`);
        showEnemyEffect(`+${actual}`, "heal");
      }
    }
    if (summary.shield > 0) turnLogs.push(`🛡️ CPUがシールド${summary.shield}獲得`);

    addLogs(turnLogs);

    if (damaged.hp <= 0) {
      setWinner("enemy");
      setIsProcessing(false);
      return;
    }

    setTurnNumber((value) => value + 1);
    setCurrentPlayer("player");
    setEnergy((value) => Math.min(MAX_ENERGY, value + ENERGY_PER_TURN));
    // 自分のターン開始時、前の自分のターンから残った盾は消える
    setPlayerShield(0);
    setIsProcessing(false);
  }

  useEffect(() => {
    if (mode === "cpu" && currentPlayer === "cpu" && !winner) {
      executeCpuTurn();
    }
    // executeCpuTurnは現在値を使うため、ターン変更時だけ起動
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, mode, winner]);

  async function endCpuPlayerTurn() {
    const summary = summarizeCards(selectedCards);
    const damaged = applyDamage(enemyHP, enemyShield, summary.damage);
    const healedPlayer = Math.min(MAX_HP, playerHP + summary.heal);

    setEnemyHP(damaged.hp);
    setEnemyShield(damaged.shield);
    setPlayerHP(healedPlayer);
    setPlayerShield((value) => value + summary.shield);

    const turnLogs = [
      selectedCards.length > 0
        ? `🎴 YOU：${summary.names.join("、")}`
        : "⏭️ YOUは何もせずターン終了",
    ];

    if (damaged.blocked > 0) turnLogs.push(`🛡️ CPUの盾が${damaged.blocked}ダメージ防御`);
    if (damaged.hpDamage > 0) {
      turnLogs.push(`⚔️ CPUに${damaged.hpDamage}ダメージ`);
      showEnemyEffect(`-${damaged.hpDamage}`, "damage");
    }
    if (summary.heal > 0) {
      const actual = healedPlayer - playerHP;
      if (actual > 0) {
        turnLogs.push(`💚 YOUが${actual}回復`);
        showPlayerEffect(`+${actual}`, "heal");
      }
    }
    if (summary.shield > 0) turnLogs.push(`🛡️ YOUがシールド${summary.shield}獲得`);

    addLogs(turnLogs);
    consumeSelectedCards();

    if (damaged.hp <= 0) {
      setWinner("player");
      return;
    }

    setTurnNumber((value) => value + 1);
    setCurrentPlayer("cpu");
    setCpuEnergy((value) => Math.min(MAX_ENERGY, value + ENERGY_PER_TURN));
    setEnemyShield(0);
  }

  async function endOnlineTurn() {
    const match = matchRef.current;

    if (!match || !matchId || !playerRole) {
      addLogs(["❌ 試合データがありません"]);
      return;
    }

    if (match.current_player !== playerRole) {
      addLogs(["⏳ 今は相手のターンです"]);
      return;
    }

    setIsProcessing(true);

    const actingIsHost = playerRole === "host";
    const myHp = actingIsHost ? match.host_hp : match.guest_hp;
    const opponentHp = actingIsHost ? match.guest_hp : match.host_hp;
    const opponentShield = actingIsHost
      ? Number(match.guest_shield || 0)
      : Number(match.host_shield || 0);

    const summary = summarizeCards(selectedRef.current);
    const damageResult = applyDamage(opponentHp, opponentShield, summary.damage);
    const healedHp = Math.min(MAX_HP, myHp + summary.heal);
    const currentMyShield = actingIsHost
      ? Number(match.host_shield || 0)
      : Number(match.guest_shield || 0);
    const newMyShield = currentMyShield + summary.shield;
    const followingPlayer = nextRole(playerRole);
    const nextTurn = Number(match.turn_number) + 1;

    const turnLogs = [
      selectedRef.current.length > 0
        ? `🎴 ${playerRole}：${summary.names.join("、")}`
        : `⏭️ ${playerRole}は何もせずターン終了`,
    ];

    if (damageResult.blocked > 0) {
      turnLogs.push(`🛡️ ${followingPlayer}の盾が${damageResult.blocked}ダメージ防御`);
    }
    if (damageResult.hpDamage > 0) {
      turnLogs.push(`⚔️ ${followingPlayer}に${damageResult.hpDamage}ダメージ`);
    }
    const actualHeal = healedHp - myHp;
    if (actualHeal > 0) turnLogs.push(`💚 ${playerRole}が${actualHeal}回復`);
    if (summary.shield > 0) turnLogs.push(`🛡️ ${playerRole}がシールド${summary.shield}獲得`);

    let matchWinner = null;
    if (damageResult.hp <= 0) matchWinner = playerRole;

    const updates = {
      battle_logs: turnLogs,
      current_player: matchWinner ? playerRole : followingPlayer,
      turn_number: matchWinner ? match.turn_number : nextTurn,
      phase: matchWinner ? "finished" : "playing",
      winner: matchWinner,
    };

    if (actingIsHost) {
      updates.host_hp = healedHp;
      updates.host_shield = newMyShield;
      updates.host_energy = energy;
      updates.guest_hp = damageResult.hp;
      updates.guest_shield = matchWinner ? damageResult.shield : 0;
      updates.guest_energy = matchWinner
        ? match.guest_energy
        : Math.min(MAX_ENERGY, Number(match.guest_energy) + ENERGY_PER_TURN);
    } else {
      updates.guest_hp = healedHp;
      updates.guest_shield = newMyShield;
      updates.guest_energy = energy;
      updates.host_hp = damageResult.hp;
      updates.host_shield = matchWinner ? damageResult.shield : 0;
      updates.host_energy = matchWinner
        ? match.host_energy
        : Math.min(MAX_ENERGY, Number(match.host_energy) + ENERGY_PER_TURN);
    }

    const { data: updatedMatch, error } = await supabase
      .from("matches")
      .update(updates)
      .eq("id", matchId)
      .eq("current_player", playerRole)
      .eq("turn_number", match.turn_number)
      .select("*")
      .maybeSingle();

    if (error) {
      addLogs([`❌ ターン更新エラー：${error.message}`]);
      setIsProcessing(false);
      return;
    }

    if (!updatedMatch) {
      addLogs(["⚠️ 相手側で先に状態が更新されました。再同期します"]);
      const { data } = await supabase.from("matches").select("*").eq("id", matchId).single();
      if (data) syncMatchToView(data);
      setIsProcessing(false);
      return;
    }

    consumeSelectedCards();
    syncMatchToView(updatedMatch);
    addLogs(turnLogs);

    if (damageResult.hpDamage > 0) showEnemyEffect(`-${damageResult.hpDamage}`, "damage");
    if (actualHeal > 0) showPlayerEffect(`+${actualHeal}`, "heal");

    setIsProcessing(false);
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

    return (
      <div className="app">
        <div className="result-screen">
          <div className="result-icon">{isDraw ? "🤝" : playerWon ? "🏆" : "💀"}</div>
          <h1>{isDraw ? "DRAW!" : playerWon ? "YOU WIN!" : "YOU LOSE..."}</h1>
          <p>{isDraw ? "引き分け！" : playerWon ? "勝利した！" : "次の戦いで取り返そう！"}</p>
          <div className="result-buttons">
            <button type="button" onClick={restartGame}>🔄 もう一回</button>
            <button type="button" onClick={goToMenu}>🏠 メニューへ戻る</button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingMatch) {
    return <div className="app"><h2>⚔️ 試合を読み込んでいます…</h2></div>;
  }

  return (
    <div className="app">
      <h1>CHAOS CARDS</h1>

      {coinVisible && firstPlayer && (
        <div className="coin-toss-overlay">
          <div className="coin">🪙</div>
          <strong>
            {mode === "cpu"
              ? firstPlayer === "player" ? "YOUが先攻！" : "CPUが先攻！"
              : firstPlayer === playerRole ? "あなたが先攻！" : "相手が先攻！"}
          </strong>
        </div>
      )}

      <div className="battle">
        <div className={`player character-area ${!isMyTurn ? "active-turn" : ""}`}>
          <h2>{mode === "online" ? "🌐 OPPONENT" : "🤖 CPU"}</h2>
          {enemyEffect && <div className={`battle-effect ${enemyEffect.type}`}>{enemyEffect.text}</div>}
          <div className="hp-text">❤️ {enemyHP}</div>
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${Math.max(0, (enemyHP / MAX_HP) * 100)}%`, background: getHpColor(enemyHP, MAX_HP) }} />
          </div>
          <div className="shield-text">🛡️ {enemyShield}</div>
        </div>

        <div className={`player character-area ${isMyTurn ? "active-turn" : ""}`}>
          <h2>😀 YOU</h2>
          {playerEffect && <div className={`battle-effect ${playerEffect.type}`}>{playerEffect.text}</div>}
          <div className="hp-text">❤️ {playerHP}</div>
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${Math.max(0, (playerHP / MAX_HP) * 100)}%`, background: getHpColor(playerHP, MAX_HP) }} />
          </div>
          <div className="shield-text">🛡️ {playerShield}</div>
          <div className="energy-text">⚡ {energy}/{MAX_ENERGY}</div>
        </div>
      </div>

      <div className={`turn-display ${isMyTurn ? "player-turn" : "cpu-turn"}`}>
        <strong>ターン {turnNumber}</strong>
        <span>{isMyTurn ? "⚡ あなたの番" : "⏳ 相手の番"}</span>
      </div>

      <h3>手札</h3>
      <p className="deck-info">🃏 山札：{deck.length}枚　🗑️ 捨て札：{discardPile.length}枚</p>

      <div className="hand">
        {hand.map((card, index) => {
          const isSelected = selectedCards.some((item) => item.handIndex === index);
          const disabled = !isMyTurn || isProcessing || (!isSelected && energy < Number(card.cost));

          return (
            <div className={`hand-card-wrapper ${isSelected ? "card-selected" : ""}`} key={`${card.id}-${index}`}>
              <Card card={card} index={index} isDrawn={drawnIndex === index} disabled={disabled} onPlay={() => playCard(index)} />
              {isSelected && <div className="selected-overlay"><span>選択中</span><small>もう一度押すと解除</small></div>}
            </div>
          );
        })}
      </div>

      <button className="end-turn-button" onClick={endTurn} disabled={!isMyTurn || isProcessing}>
        {isProcessing ? "処理中…" : isMyTurn ? "ターン終了" : "相手のターンです"}
      </button>

      <BattleLog logs={logs} />
    </div>
  );
}
