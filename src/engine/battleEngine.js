// src/engine/battleEngine.js
// Chaos Cardsの戦闘計算をReact/Supabaseから分離した純粋ロジックです。

export const BATTLE_CONFIG = {
  initialHp: 40,
  initialMaxHp: 40,
  initialEnergy: 3,
  initialMaxEnergy: 5,
  energyPerTurn: 3,
  maxHandSize: 7,
};

export function createFighterState(overrides = {}) {
  return {
    hp: BATTLE_CONFIG.initialHp,
    maxHp: BATTLE_CONFIG.initialMaxHp,
    energy: BATTLE_CONFIG.initialEnergy,
    maxEnergy: BATTLE_CONFIG.initialMaxEnergy,

    shield: false,
    armor: 0,
    armorTurns: 0,
    reflectPercent: 0,
    reflectHits: 0,
    counterDamage: 0,
    counterTurns: 0,
    invulnerableTurns: 0,

    poisonDamage: 0,
    poisonTurns: 0,
    burnDamage: 0,
    burnTurns: 0,
    regeneration: 0,
    regenerationTurns: 0,

    freezeTurns: 0,
    silenceTurns: 0,
    healLockTurns: 0,
    increasedCost: 0,
    increasedCostTurns: 0,

    nextTurnEnergy: 0,
    nextCardCostReduction: 0,
    nextCardFree: false,
    repeatNextCard: 0,
    extraTurn: false,

    reviveHp: 0,
    reviveAvailable: false,
    damageBonus: 0,
    comboBonus: 0,
    comboTurns: 0,

    lastDamageTaken: 0,
    lastCard: null,
    statuses: [],
    ...overrides,
  };
}

export function createBattleState(overrides = {}) {
  return {
    turnNumber: 1,
    phase: "selecting",
    winner: null,
    host: createFighterState(),
    guest: createFighterState(),
    logs: [],
    events: {
      host: [],
      guest: [],
    },
    ...overrides,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max, random = Math.random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function getCard(entry) {
  return entry?.card ?? entry;
}

function addLog(context, text) {
  context.logs.push(text);
}

function addEvent(context, role, event) {
  context.events[role].push(event);
}

function otherRole(role) {
  return role === "host" ? "guest" : "host";
}

function roleLabel(role) {
  return role === "host" ? "YOU" : "相手";
}

function healFighter(context, role, amount) {
  const fighter = context.state[role];

  if (fighter.hp <= 0 || amount <= 0) return 0;

  const oldHp = fighter.hp;
  fighter.hp = clamp(fighter.hp + Math.floor(amount), 0, fighter.maxHp);
  const actual = fighter.hp - oldHp;

  if (actual > 0) {
    addLog(context, `💚 ${roleLabel(role)}は${actual}回復した！`);
  }

  return actual;
}

function damageFighter(
  context,
  sourceRole,
  targetRole,
  amount,
  options = {}
) {
  const source = context.state[sourceRole];
  const target = context.state[targetRole];

  if (amount <= 0 || target.hp <= 0) return 0;

  let damage = Math.max(0, Math.floor(amount));

  if (target.invulnerableTurns > 0 && !options.ignoreInvulnerable) {
    addLog(context, `🛡️ ${roleLabel(targetRole)}はダメージを無効化した！`);
    return 0;
  }

  if (
    target.shield &&
    !options.ignoreShield &&
    damage > 0
  ) {
    damage = Math.ceil(damage / 2);
    target.shield = false;
    addLog(context, `🛡️ ${roleLabel(targetRole)}の盾がダメージを半減！`);
  }

  if (
    target.armor > 0 &&
    !options.ignoreArmor &&
    damage > 0
  ) {
    damage = Math.max(0, damage - target.armor);
  }

  const oldHp = target.hp;
  target.hp = Math.max(0, target.hp - damage);
  const actual = oldHp - target.hp;
  target.lastDamageTaken = actual;

  if (actual > 0) {
    addLog(
      context,
      `⚔️ ${roleLabel(sourceRole)}の攻撃！ ${actual}ダメージ！`
    );
  }

  if (
    actual > 0 &&
    target.reflectPercent > 0 &&
    target.reflectHits > 0 &&
    !options.isReflected
  ) {
    const reflected = Math.max(
      1,
      Math.floor(actual * target.reflectPercent / 100)
    );

    target.reflectHits -= 1;

    damageFighter(
      context,
      targetRole,
      sourceRole,
      reflected,
      {
        ignoreShield: true,
        isReflected: true,
      }
    );

    addLog(context, `🪞 ${roleLabel(targetRole)}が${reflected}ダメージを反射！`);
  }

  if (
    actual > 0 &&
    target.counterDamage > 0 &&
    target.counterTurns > 0 &&
    !options.isCounter
  ) {
    damageFighter(
      context,
      targetRole,
      sourceRole,
      target.counterDamage,
      {
        isCounter: true,
      }
    );

    addLog(
      context,
      `🥋 ${roleLabel(targetRole)}が${target.counterDamage}ダメージで反撃！`
    );
  }

  if (target.hp <= 0 && target.reviveAvailable) {
    target.hp = Math.min(target.maxHp, target.reviveHp);
    target.reviveAvailable = false;
    addLog(context, `🔥 ${roleLabel(targetRole)}がHP${target.hp}で復活した！`);
  }

  return actual;
}

function applyStatusDamage(context, role, key, turnsKey, emoji, label) {
  const fighter = context.state[role];

  if (fighter[turnsKey] <= 0 || fighter[key] <= 0) return;

  const opponent = otherRole(role);

  damageFighter(
    context,
    opponent,
    role,
    fighter[key],
    {
      ignoreShield: true,
      ignoreArmor: true,
    }
  );

  addLog(
    context,
    `${emoji} ${roleLabel(role)}は${label}で${fighter[key]}ダメージ！`
  );

  fighter[turnsKey] -= 1;

  if (fighter[turnsKey] <= 0) {
    fighter[key] = 0;
  }
}

export function startTurn(state, role) {
  const next = structuredClone(state);
  const fighter = next[role];

  applySimpleStartTurnEffects(next, role);

  fighter.energy = Math.min(
    fighter.maxEnergy,
    BATTLE_CONFIG.energyPerTurn + fighter.nextTurnEnergy
  );
  fighter.nextTurnEnergy = 0;

  return next;
}

function applySimpleStartTurnEffects(state, role) {
  const fighter = state[role];

  if (fighter.regenerationTurns > 0 && fighter.regeneration > 0) {
    fighter.hp = Math.min(
      fighter.maxHp,
      fighter.hp + fighter.regeneration
    );
    fighter.regenerationTurns -= 1;

    if (fighter.regenerationTurns <= 0) {
      fighter.regeneration = 0;
    }
  }

  if (fighter.freezeTurns > 0) fighter.freezeTurns -= 1;
  if (fighter.silenceTurns > 0) fighter.silenceTurns -= 1;
  if (fighter.healLockTurns > 0) fighter.healLockTurns -= 1;
}

function reduceTimedEffects(fighter) {
  const timed = [
    ["armorTurns", "armor"],
    ["counterTurns", "counterDamage"],
    ["increasedCostTurns", "increasedCost"],
    ["comboTurns", "comboBonus"],
    ["invulnerableTurns", null],
  ];

  timed.forEach(([turnsKey, valueKey]) => {
    if (fighter[turnsKey] > 0) {
      fighter[turnsKey] -= 1;

      if (fighter[turnsKey] <= 0 && valueKey) {
        fighter[valueKey] = 0;
      }
    }
  });
}

function calculateCardCost(fighter, card) {
  if (fighter.nextCardFree) return 0;

  return Math.max(
    0,
    (card.cost ?? 0) +
      fighter.increasedCost -
      fighter.nextCardCostReduction
  );
}

function consumeCostModifiers(fighter) {
  fighter.nextCardFree = false;
  fighter.nextCardCostReduction = 0;
}

function canUseCard(fighter, card, cardsPlayed) {
  if (fighter.freezeTurns > 0 && cardsPlayed >= 1) {
    return false;
  }

  const specialTypes = new Set([
    "poison",
    "burn",
    "freeze",
    "silence",
    "stealEnergy",
    "discardRandom",
    "drawChoose",
    "costReduction",
    "maxEnergyUp",
    "maxHpUp",
    "armor",
    "reflect",
    "counter",
    "swapHp",
    "swapEnergy",
    "copyLastCard",
    "undoLastDamage",
    "cleanse",
    "transferDebuffs",
    "regeneration",
    "revive",
    "comboStarter",
    "repeatNextCard",
    "lockCardType",
    "extraTurn",
    "refillHand",
    "shuffleDiscardIntoDeck",
    "increaseOpponentCost",
    "makeNextCardFree",
    "exhaustFromHand",
    "chaosRandom",
  ]);

  if (fighter.silenceTurns > 0 && specialTypes.has(card.type)) {
    return false;
  }

  if (
    fighter.healLockTurns > 0 &&
    [
      "heal",
      "healMissing",
      "drain",
      "regeneration",
      "maxHpUp",
    ].includes(card.type)
  ) {
    return false;
  }

  return true;
}

function applyAttackCard(context, role, card, bonus = 0) {
  const opponent = otherRole(role);
  const fighter = context.state[role];

  switch (card.type) {
    case "attack":
    case "piercingAttack": {
      const hits = card.hits ?? 1;
      const damage = (card.damage ?? 0) + bonus + fighter.damageBonus;

      for (let i = 0; i < hits; i += 1) {
        damageFighter(
          context,
          role,
          opponent,
          damage,
          {
            ignoreShield: Boolean(card.ignoreShield),
            ignoreArmor: Boolean(card.ignoreArmor),
          }
        );
      }
      break;
    }

    case "multiAttack": {
      const hits = card.hits ?? 1;

      for (let i = 0; i < hits; i += 1) {
        damageFighter(
          context,
          role,
          opponent,
          (card.damage ?? 0) + bonus + fighter.damageBonus
        );
      }
      break;
    }

    case "chainAttack": {
      for (const amount of card.damageSequence ?? []) {
        damageFighter(
          context,
          role,
          opponent,
          amount + bonus + fighter.damageBonus
        );
      }
      break;
    }

    case "randomMultiAttack": {
      for (let i = 0; i < (card.hits ?? 1); i += 1) {
        const amount = randomInt(
          card.minDamage ?? 1,
          card.maxDamage ?? 1,
          context.random
        );

        damageFighter(
          context,
          role,
          opponent,
          amount + bonus + fighter.damageBonus
        );
      }
      break;
    }

    case "criticalAttack": {
      let amount = (card.damage ?? 0) + bonus + fighter.damageBonus;
      const roll = context.random() * 100;

      if (roll < (card.criticalChance ?? 0)) {
        amount = Math.floor(
          amount * (card.criticalMultiplier ?? 2)
        );
        addLog(context, "🎯 会心の一撃！");
      }

      damageFighter(context, role, opponent, amount);
      break;
    }

    case "diceDamage": {
      let amount = 0;

      for (let i = 0; i < (card.dice ?? 1); i += 1) {
        amount += randomInt(1, card.sides ?? 6, context.random);
      }

      addLog(context, `🎲 ダイスの合計は${amount}！`);
      damageFighter(
        context,
        role,
        opponent,
        amount + bonus + fighter.damageBonus
      );
      break;
    }

    case "lowHpAttack": {
      let amount = card.damage ?? 0;

      if (
        fighter.hp / fighter.maxHp <=
        (card.hpThresholdPercent ?? 0) / 100
      ) {
        amount += card.bonusDamage ?? 0;
      }

      damageFighter(
        context,
        role,
        opponent,
        amount + bonus + fighter.damageBonus
      );
      break;
    }

    case "execute": {
      const enemy = context.state[opponent];
      const isExecute =
        enemy.hp / enemy.maxHp <=
        (card.executeThresholdPercent ?? 0) / 100;

      damageFighter(
        context,
        role,
        opponent,
        isExecute
          ? card.executeDamage ?? card.damage ?? 0
          : card.damage ?? 0
      );
      break;
    }

    case "coinFlip": {
      if (context.random() < 0.5) {
        addLog(context, "🎰 ギャンブル成功！");
        damageFighter(
          context,
          role,
          opponent,
          card.successDamage ?? 0
        );
      } else {
        addLog(context, "💥 ギャンブル失敗！");
        damageFighter(
          context,
          opponent,
          role,
          card.failSelfDamage ?? 0,
          { ignoreShield: true }
        );
      }
      break;
    }

    case "selfDamageAttack": {
      damageFighter(
        context,
        opponent,
        role,
        card.selfDamage ?? 0,
        {
          ignoreShield: true,
          ignoreArmor: true,
        }
      );

      damageFighter(
        context,
        role,
        opponent,
        (card.damage ?? 0) + bonus + fighter.damageBonus
      );
      break;
    }

    default:
      break;
  }
}

function applyCard(context, role, card, cardsPlayed) {
  const fighter = context.state[role];
  const opponentRole = otherRole(role);
  const opponent = context.state[opponentRole];

  if (!canUseCard(fighter, card, cardsPlayed)) {
    addLog(context, `🚫 ${roleLabel(role)}は${card.name}を使えなかった！`);
    return;
  }

  fighter.lastCard = card;

  const comboBonus =
    cardsPlayed >= 1 && fighter.comboTurns > 0
      ? fighter.comboBonus
      : 0;

  if (
    [
      "attack",
      "multiAttack",
      "chainAttack",
      "randomMultiAttack",
      "criticalAttack",
      "diceDamage",
      "lowHpAttack",
      "execute",
      "coinFlip",
      "selfDamageAttack",
      "piercingAttack",
    ].includes(card.type)
  ) {
    applyAttackCard(context, role, card, comboBonus);
    return;
  }

  switch (card.type) {
    case "heal":
      healFighter(context, role, card.heal ?? 0);
      break;

    case "shield":
      fighter.shield = true;
      addLog(context, `🛡️ ${roleLabel(role)}は盾を構えた！`);
      break;

    case "energyGain":
      fighter.energy = Math.min(
        fighter.maxEnergy,
        fighter.energy + (card.energyGain ?? 0)
      );
      addLog(context, `⚡ ${roleLabel(role)}はエネルギーを回復！`);
      break;

    case "energyNextTurn":
      fighter.nextTurnEnergy += card.energyNextTurn ?? 0;
      break;

    case "healMissing": {
      const missing = fighter.maxHp - fighter.hp;
      healFighter(
        context,
        role,
        Math.floor(
          missing * (card.healMissingPercent ?? 0) / 100
        )
      );
      break;
    }

    case "drain": {
      const actual = damageFighter(
        context,
        role,
        opponentRole,
        card.damage ?? 0
      );

      healFighter(
        context,
        role,
        Math.floor(
          actual * (card.healFromDamagePercent ?? 100) / 100
        )
      );
      break;
    }

    case "poison":
      opponent.poisonDamage = Math.max(
        opponent.poisonDamage,
        card.poisonDamage ?? 0
      );
      opponent.poisonTurns = Math.max(
        opponent.poisonTurns,
        card.poisonTurns ?? 0
      );
      addLog(context, `☠️ ${roleLabel(opponentRole)}は毒状態になった！`);
      break;

    case "burn":
      opponent.burnDamage = Math.max(
        opponent.burnDamage,
        card.burnDamage ?? 0
      );
      opponent.burnTurns = Math.max(
        opponent.burnTurns,
        card.burnTurns ?? 0
      );
      addLog(context, `🔥 ${roleLabel(opponentRole)}は火傷した！`);
      break;

    case "freeze":
      opponent.freezeTurns = Math.max(
        opponent.freezeTurns,
        card.freezeTurns ?? 1
      );
      break;

    case "silence":
      opponent.silenceTurns = Math.max(
        opponent.silenceTurns,
        card.silenceTurns ?? 1
      );
      break;

    case "stealEnergy": {
      const amount = Math.min(
        opponent.energy,
        card.stealEnergy ?? 0
      );
      opponent.energy -= amount;
      fighter.energy = Math.min(
        fighter.maxEnergy,
        fighter.energy + amount
      );
      break;
    }

    case "discardRandom":
      addEvent(context, opponentRole, {
        type: "discardRandom",
        count: card.discardCount ?? 1,
      });
      break;

    case "draw":
      addEvent(context, role, {
        type: "draw",
        count: card.draw ?? 1,
      });
      break;

    case "drawChoose":
      addEvent(context, role, {
        type: "drawChoose",
        lookAt: card.lookAt ?? 3,
        take: card.take ?? 1,
      });
      break;

    case "costReduction":
      fighter.nextCardCostReduction =
        card.costReduction ?? 1;
      break;

    case "maxEnergyUp":
      fighter.maxEnergy += card.maxEnergyUp ?? 1;
      fighter.energy = Math.min(
        fighter.maxEnergy,
        fighter.energy + (card.maxEnergyUp ?? 1)
      );
      break;

    case "maxHpUp":
      fighter.maxHp += card.maxHpUp ?? 0;
      healFighter(context, role, card.heal ?? 0);
      break;

    case "armor":
      fighter.armor = Math.max(
        fighter.armor,
        card.armor ?? 0
      );
      fighter.armorTurns = Math.max(
        fighter.armorTurns,
        card.armorTurns ?? 1
      );
      break;

    case "reflect":
      fighter.reflectPercent =
        card.reflectPercent ?? 0;
      fighter.reflectHits =
        card.durationHits ?? 1;
      break;

    case "counter":
      fighter.counterDamage =
        card.counterDamage ?? 0;
      fighter.counterTurns =
        card.durationTurns ?? 1;
      break;

    case "selfDamageEnergy":
      damageFighter(
        context,
        opponentRole,
        role,
        card.selfDamage ?? 0,
        {
          ignoreShield: true,
          ignoreArmor: true,
        }
      );
      fighter.energy = Math.min(
        fighter.maxEnergy,
        fighter.energy + (card.energyGain ?? 0)
      );
      break;

    case "swapHp": {
      const ownHp = fighter.hp;
      fighter.hp = Math.min(fighter.maxHp, opponent.hp);
      opponent.hp = Math.min(opponent.maxHp, ownHp);
      break;
    }

    case "swapEnergy": {
      const ownEnergy = fighter.energy;
      fighter.energy = Math.min(
        fighter.maxEnergy,
        opponent.energy
      );
      opponent.energy = Math.min(
        opponent.maxEnergy,
        ownEnergy
      );
      break;
    }

    case "copyLastCard":
      if (opponent.lastCard) {
        applyCard(
          context,
          role,
          {
            ...opponent.lastCard,
            name: `${opponent.lastCard.name}（コピー）`,
          },
          cardsPlayed
        );
      }
      break;

    case "undoLastDamage":
      healFighter(context, role, fighter.lastDamageTaken);
      fighter.lastDamageTaken = 0;
      break;

    case "cleanse":
      fighter.poisonDamage = 0;
      fighter.poisonTurns = 0;
      fighter.burnDamage = 0;
      fighter.burnTurns = 0;
      fighter.freezeTurns = 0;
      fighter.silenceTurns = 0;
      fighter.healLockTurns = 0;
      break;

    case "transferDebuffs": {
      const debuffs = [
        ["poisonDamage", "poisonTurns"],
        ["burnDamage", "burnTurns"],
      ];

      debuffs.forEach(([valueKey, turnsKey]) => {
        if (fighter[turnsKey] > 0) {
          opponent[valueKey] = fighter[valueKey];
          opponent[turnsKey] = fighter[turnsKey];
          fighter[valueKey] = 0;
          fighter[turnsKey] = 0;
        }
      });

      opponent.freezeTurns = Math.max(
        opponent.freezeTurns,
        fighter.freezeTurns
      );
      opponent.silenceTurns = Math.max(
        opponent.silenceTurns,
        fighter.silenceTurns
      );
      fighter.freezeTurns = 0;
      fighter.silenceTurns = 0;
      break;
    }

    case "regeneration":
      fighter.regeneration =
        card.healPerTurn ?? 0;
      fighter.regenerationTurns =
        card.turns ?? 1;
      break;

    case "revive":
      fighter.reviveHp = card.reviveHp ?? 1;
      fighter.reviveAvailable = true;
      break;

    case "berserk":
      fighter.damageBonus = Math.min(
        card.maxBonusDamage ?? 0,
        Math.floor(
          (fighter.maxHp - fighter.hp) *
            (card.damageBonusPerMissingHp ?? 0)
        )
      );
      break;

    case "comboStarter":
      fighter.comboBonus = card.comboBonus ?? 0;
      fighter.comboTurns = card.durationTurns ?? 1;
      break;

    case "repeatNextCard":
      fighter.repeatNextCard =
        card.repeatCount ?? 1;
      break;

    case "lockCardType":
      if (card.lockedType === "heal") {
        opponent.healLockTurns =
          card.turns ?? 1;
      }
      break;

    case "extraTurn":
      fighter.extraTurn = true;
      break;

    case "refillHand":
      addEvent(context, role, {
        type: "refillHand",
        handSize: card.handSize ?? 5,
      });
      break;

    case "shuffleDiscardIntoDeck":
      addEvent(context, role, {
        type: "shuffleDiscardIntoDeck",
      });
      break;

    case "increaseOpponentCost":
      opponent.increasedCost =
        card.increaseCost ?? 1;
      opponent.increasedCostTurns =
        card.durationTurns ?? 1;
      break;

    case "makeNextCardFree":
      fighter.nextCardFree = true;
      break;

    case "drawWhenLowHp":
      addEvent(context, role, {
        type: "draw",
        count:
          fighter.hp / fighter.maxHp <=
          (card.hpThresholdPercent ?? 0) / 100
            ? card.draw ?? 3
            : 1,
      });
      break;

    case "invulnerable":
      fighter.invulnerableTurns =
        card.turns ?? 1;
      break;

    case "exhaustFromHand":
      addEvent(context, role, {
        type: "exhaustFromHand",
        count: card.exhaustCount ?? 1,
      });
      break;

    case "chaosRandom": {
      const outcomes = card.outcomes ?? [];
      const outcome =
        outcomes[
          Math.floor(context.random() * outcomes.length)
        ];

      if (outcome === "damage12") {
        damageFighter(context, role, opponentRole, 12);
      } else if (outcome === "heal12") {
        healFighter(context, role, 12);
      } else if (outcome === "energy3") {
        fighter.energy = Math.min(
          fighter.maxEnergy,
          fighter.energy + 3
        );
      } else if (outcome === "draw3") {
        addEvent(context, role, {
          type: "draw",
          count: 3,
        });
      } else if (outcome === "selfDamage6") {
        damageFighter(
          context,
          opponentRole,
          role,
          6,
          {
            ignoreShield: true,
            ignoreArmor: true,
          }
        );
      } else if (outcome === "shield") {
        fighter.shield = true;
      }

      addLog(context, `🎡 カオスルーレット：${outcome}`);
      break;
    }

    default:
      addLog(context, `❓ ${card.name}の効果は未登録です`);
      break;
  }
}

function playCardsForRole(context, role, cardEntries) {
  const fighter = context.state[role];
  let cardsPlayed = 0;

  for (const entry of cardEntries) {
    if (context.state.winner) break;

    const card = getCard(entry);
    if (!card) continue;

    const effectiveCost = calculateCardCost(
      fighter,
      card
    );

    if (fighter.energy < effectiveCost) {
      addLog(
        context,
        `⚡ ${roleLabel(role)}は${card.name}を使うエネルギーが足りない！`
      );
      continue;
    }

    fighter.energy -= effectiveCost;
    consumeCostModifiers(fighter);

    addLog(
      context,
      `${card.emoji ?? "🃏"} ${roleLabel(role)}は${card.name}を使用！`
    );

    const repeats = 1 + fighter.repeatNextCard;
    fighter.repeatNextCard = 0;

    for (let i = 0; i < repeats; i += 1) {
      applyCard(context, role, card, cardsPlayed);
    }

    cardsPlayed += 1;

    checkWinner(context.state);
  }
}

function checkWinner(state) {
  if (state.host.hp <= 0 && state.guest.hp <= 0) {
    state.winner = "draw";
    state.phase = "finished";
  } else if (state.host.hp <= 0) {
    state.winner = "guest";
    state.phase = "finished";
  } else if (state.guest.hp <= 0) {
    state.winner = "host";
    state.phase = "finished";
  }

  return state.winner;
}

export function resolveRound(
  previousState,
  hostCards,
  guestCards,
  options = {}
) {
  const state = structuredClone(
    previousState ?? createBattleState()
  );

  state.logs = [];
  state.events = {
    host: [],
    guest: [],
  };
  state.phase = "resolving";

  const context = {
    state,
    logs: state.logs,
    events: state.events,
    random: options.random ?? Math.random,
  };

  // ターン開始時の継続効果
  applyStatusDamage(
    context,
    "host",
    "burnDamage",
    "burnTurns",
    "🔥",
    "火傷"
  );
  applyStatusDamage(
    context,
    "guest",
    "burnDamage",
    "burnTurns",
    "🔥",
    "火傷"
  );

  checkWinner(state);

  if (!state.winner) {
    // 同時ターン制を維持するため、奇数ターンはhost先行、
    // 偶数ターンはguest先行にして公平性を持たせる。
    const order =
      state.turnNumber % 2 === 1
        ? [
            ["host", hostCards],
            ["guest", guestCards],
          ]
        : [
            ["guest", guestCards],
            ["host", hostCards],
          ];

    for (const [role, selectedCards] of order) {
      playCardsForRole(
        context,
        role,
        selectedCards ?? []
      );

      if (state.winner) break;
    }
  }

  if (!state.winner) {
    applyStatusDamage(
      context,
      "host",
      "poisonDamage",
      "poisonTurns",
      "☠️",
      "毒"
    );
    applyStatusDamage(
      context,
      "guest",
      "poisonDamage",
      "poisonTurns",
      "☠️",
      "毒"
    );

    checkWinner(state);
  }

  reduceTimedEffects(state.host);
  reduceTimedEffects(state.guest);

  if (!state.winner) {
    const hostExtra = state.host.extraTurn;
    const guestExtra = state.guest.extraTurn;

    state.host.extraTurn = false;
    state.guest.extraTurn = false;

    if (hostExtra && !guestExtra) {
      state.extraTurnRole = "host";
    } else if (guestExtra && !hostExtra) {
      state.extraTurnRole = "guest";
    } else {
      state.extraTurnRole = null;
      state.turnNumber += 1;
    }

    state.phase = "selecting";
  }

  return state;
}

export function getEffectiveCardCost(fighter, card) {
  return calculateCardCost(fighter, card);
}

export function getVisibleStateForRole(state, role) {
  if (role === "host") return state;

  return {
    ...state,
    host: state.guest,
    guest: state.host,
    logs: (state.logs ?? []).map((log) =>
      log
        .replaceAll("YOU", "__HOST__")
        .replaceAll("相手", "YOU")
        .replaceAll("__HOST__", "相手")
    ),
    events: {
      host: state.events?.guest ?? [],
      guest: state.events?.host ?? [],
    },
    winner:
      state.winner === "host"
        ? "guest"
        : state.winner === "guest"
          ? "host"
          : state.winner,
  };
}
