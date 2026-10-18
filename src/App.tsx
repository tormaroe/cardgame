import React, { useEffect, useMemo, useState } from 'react';
import {
  CHARACTER_CARDS,
  ENCOUNTERS,
  GADGET_CARDS,
  STARTER_DECK_IDS,
  TRAIT_INFO,
  getCardById
} from './cards';
import {
  BoardUnit,
  CardTemplate,
  EnemySpawnSpec,
  HandCard,
  PersonalityTrait,
  SavedStats
} from './types';

const STORAGE_RUN_KEY = 'on_the_edge_active_run_v3';
const STORAGE_STATS_KEY = 'on_the_edge_stats_v2';

let uidCounter = 1000;
function nextUid(prefix = 'id'): string {
  uidCounter += 1;
  return `${prefix}_${Date.now()}_${uidCounter}`;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createBoardUnit(
  template: CardTemplate,
  isEnemy: boolean,
  customSpec?: EnemySpawnSpec
): BoardUnit {
  const maxHealth = customSpec ? customSpec.hp : template.health;
  const baseAttack = customSpec ? customSpec.atk : template.attack;
  const startingShield = customSpec?.shield ?? 0;
  const hasImpatient = template.keywords.includes('Impatient');

  return {
    instanceId: nextUid(isEnemy ? 'enemy' : 'ally'),
    templateId: template.id,
    name: template.name,
    title: template.title,
    kind: template.kind,
    tier: template.tier,
    trait: template.trait,
    image: template.image,
    icon: template.icon,
    maxHealth,
    currentHealth: maxHealth,
    baseAttack,
    bonusAttack: 0,
    tempAttack: 0,
    shield: startingShield,
    ready: !isEnemy && hasImpatient,
    attackedThisTurn: false,
    interceptedThisTurn: false,
    keywords: [...template.keywords],
    abilityTitle: template.abilityTitle,
    abilityText: template.abilityText,
    flavorText: template.flavorText,
    passiveEffect: template.passiveEffect,
    isEnemy,
    weakened: 0,
    exposed: 0
  };
}

function computeEnemyIntents(
  enemies: BoardUnit[],
  allies: BoardUnit[],
  turnNum: number
): BoardUnit[] {
  return enemies.map((enemy, idx) => {
    const baseDmg = Math.max(1, enemy.baseAttack + enemy.bonusAttack);

    if (
      (enemy.templateId === 'server01' || enemy.templateId === 'djinn') &&
      turnNum % 2 === 0
    ) {
      return {
        ...enemy,
        intent: {
          type: 'aoe_sweep',
          damage: Math.max(2, Math.floor(baseDmg * 0.75))
        }
      };
    }

    if (
      (enemy.templateId === 'swami' || enemy.templateId === 'brenda') &&
      turnNum % 3 === 2
    ) {
      return {
        ...enemy,
        intent: {
          type: 'fortify_all',
          damage: baseDmg,
          shield: 3
        }
      };
    }

    if (allies.length > 0) {
      const guards = allies.filter((a) => a.keywords.includes('Guard'));
      if (guards.length > 0 && idx === 0) {
        const g = guards[turnNum % guards.length];
        return {
          ...enemy,
          intent: {
            type: 'attack_unit',
            damage: baseDmg,
            targetInstanceId: g.instanceId
          }
        };
      }

      if ((turnNum + idx) % 2 === 1) {
        const target = allies[(turnNum + idx) % allies.length];
        return {
          ...enemy,
          intent: {
            type: 'attack_unit',
            damage: baseDmg,
            targetInstanceId: target.instanceId
          }
        };
      }
    }

    return {
      ...enemy,
      intent: {
        type: 'attack_player',
        damage: baseDmg
      }
    };
  });
}

export function App() {
  const [stats, setStats] = useState<SavedStats>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_STATS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return { runsStarted: 1, runsWon: 0, enemiesDefeated: 0, bestStage: 1 };
  });

  const [stageIndex, setStageIndex] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(20);
  const [maxPlayerHp] = useState<number>(20);
  const [runDeckIds, setRunDeckIds] = useState<string[]>(STARTER_DECK_IDS);

  const [turn, setTurn] = useState<number>(1);
  const [maxEnergy, setMaxEnergy] = useState<number>(2);
  const [energy, setEnergy] = useState<number>(2);

  const [drawPile, setDrawPile] = useState<HandCard[]>([]);
  const [hand, setHand] = useState<HandCard[]>([]);
  const [discardPile, setDiscardPile] = useState<HandCard[]>([]);

  const [allies, setAllies] = useState<BoardUnit[]>([]);
  const [enemies, setEnemies] = useState<BoardUnit[]>([]);

  const [selectedAllyId, setSelectedAllyId] = useState<string | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [floatingBanner, setFloatingBanner] = useState<string | null>(null);

  const [screen, setScreen] = useState<'battle' | 'victory_draft' | 'run_won' | 'game_over'>(
    'battle'
  );
  const [draftCharacters, setDraftCharacters] = useState<CardTemplate[]>([]);
  const [draftGadgets, setDraftGadgets] = useState<CardTemplate[]>([]);
  const [pickedCharId, setPickedCharId] = useState<string | null>(null);
  const [pickedGadgetId, setPickedGadgetId] = useState<string | null>(null);

  const [showCodexModal, setShowCodexModal] = useState<boolean>(false);
  const [showEndTurnConfirm, setShowEndTurnConfirm] = useState<boolean>(false);
  const [hoveredTrait, setHoveredTrait] = useState<PersonalityTrait | null>(null);

  const updateStats = (updater: (prev: SavedStats) => SavedStats) => {
    setStats((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const addLog = (msg: string) => {
    setCombatLog((prev) => [msg, ...prev.slice(0, 24)]);
  };

  const showToast = (msg: string) => {
    setFloatingBanner(msg);
    setTimeout(() => {
      setFloatingBanner((cur) => (cur === msg ? null : cur));
    }, 2400);
  };

  const startEncounter = (
    targetStageIdx: number,
    deckIdsToUse: string[],
    currentHp: number
  ) => {
    const enc = ENCOUNTERS[targetStageIdx] || ENCOUNTERS[0];
    const fullCards: HandCard[] = shuffle(
      deckIdsToUse.map((id) => ({
        instanceId: nextUid('card'),
        template: getCardById(id)
      }))
    );

    const initialHand = fullCards.slice(0, 4);
    const remainingDraw = fullCards.slice(4);

    const spawnedEnemies = enc.enemies.map((spec) =>
      createBoardUnit(getCardById(spec.id), true, spec)
    );
    const withIntents = computeEnemyIntents(spawnedEnemies, [], 1);

    setStageIndex(targetStageIdx);
    setPlayerHp(currentHp);
    setTurn(1);
    setMaxEnergy(2);
    setEnergy(2);
    setAllies([]);
    setEnemies(withIntents);
    setHand(initialHand);
    setDrawPile(remainingDraw);
    setDiscardPile([]);
    setSelectedAllyId(null);
    setScreen('battle');
    setCombatLog([`⚔️ ${enc.title} — Play a character and click "Intercept Aim" to block Player HP damage!`]);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RUN_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.enemies && parsed.hand) {
          setStageIndex(parsed.stageIndex ?? 0);
          setPlayerHp(parsed.playerHp ?? 20);
          setRunDeckIds(parsed.runDeckIds ?? STARTER_DECK_IDS);
          setTurn(parsed.turn ?? 1);
          setMaxEnergy(parsed.maxEnergy ?? 2);
          setEnergy(parsed.energy ?? 2);
          setAllies(parsed.allies ?? []);
          setEnemies(parsed.enemies ?? []);
          setHand(parsed.hand ?? []);
          setDrawPile(parsed.drawPile ?? []);
          setDiscardPile(parsed.discardPile ?? []);
          setScreen(parsed.screen ?? 'battle');
          setDraftCharacters(parsed.draftCharacters ?? []);
          setDraftGadgets(parsed.draftGadgets ?? []);
          setCombatLog(parsed.combatLog ?? ['💾 Resumed saved run from browser storage!']);
          return;
        }
      }
    } catch {
      // ignore
    }
    startEncounter(0, STARTER_DECK_IDS, 20);
  }, []);

  useEffect(() => {
    if (enemies.length === 0 && screen === 'battle') return;
    try {
      const payload = {
        stageIndex,
        playerHp,
        runDeckIds,
        turn,
        maxEnergy,
        energy,
        allies,
        enemies,
        hand,
        drawPile,
        discardPile,
        screen,
        draftCharacters,
        draftGadgets,
        combatLog
      };
      localStorage.setItem(STORAGE_RUN_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [
    stageIndex,
    playerHp,
    runDeckIds,
    turn,
    maxEnergy,
    energy,
    allies,
    enemies,
    hand,
    drawPile,
    discardPile,
    screen,
    draftCharacters,
    draftGadgets,
    combatLog
  ]);

  const startNewRun = () => {
    updateStats((s) => ({ ...s, runsStarted: s.runsStarted + 1 }));
    setRunDeckIds(STARTER_DECK_IDS);
    startEncounter(0, STARTER_DECK_IDS, 20);
    showToast('🔄 Started a fresh Run!');
  };

  const targetedAllyMap = useMemo(() => {
    const map: Record<string, { totalDamage: number; attackers: string[] }> = {};
    const hasAoe = enemies.some((e) => e.intent?.type === 'aoe_sweep');

    allies.forEach((ally) => {
      map[ally.instanceId] = { totalDamage: 0, attackers: [] };
    });

    enemies.forEach((enemy) => {
      if (!enemy.intent) return;
      const netDmg = Math.max(0, enemy.intent.damage - enemy.weakened);
      if (enemy.intent.type === 'attack_unit' && enemy.intent.targetInstanceId) {
        const slot = map[enemy.intent.targetInstanceId];
        if (slot) {
          slot.totalDamage += netDmg;
          slot.attackers.push(enemy.name);
        }
      } else if (enemy.intent.type === 'aoe_sweep' && hasAoe) {
        allies.forEach((a) => {
          map[a.instanceId].totalDamage += netDmg;
          map[a.instanceId].attackers.push(`${enemy.name} (AoE)`);
        });
      }
    });
    return map;
  }, [allies, enemies]);

  const incomingPlayerDamage = useMemo(() => {
    return enemies.reduce((sum, e) => {
      if (!e.intent) return sum;
      const netDmg = Math.max(0, e.intent.damage - e.weakened);
      if (e.intent.type === 'attack_player') {
        return sum + netDmg;
      }
      if (
        e.intent.type === 'attack_unit' &&
        (!e.intent.targetInstanceId ||
          !allies.some((a) => a.instanceId === e.intent?.targetInstanceId))
      ) {
        return sum + netDmg;
      }
      return sum;
    }, 0);
  }, [enemies, allies]);

  const getEffectiveAttack = (unit: BoardUnit): number => {
    let atk = unit.baseAttack + unit.bonusAttack + unit.tempAttack;
    if (!unit.isEnemy && unit.trait === 'Stressed') {
      const isTargeted = (targetedAllyMap[unit.instanceId]?.attackers.length ?? 0) > 0;
      if (isTargeted) {
        atk += 2;
      }
    }
    if (unit.isEnemy) {
      atk = Math.max(0, atk - unit.weakened);
    }
    return Math.max(0, atk);
  };

  const drawCards = (
    count: number,
    curHand: HandCard[],
    curDraw: HandCard[],
    curDiscard: HandCard[]
  ) => {
    const nextHand = [...curHand];
    let nextDraw = [...curDraw];
    let nextDiscard = [...curDiscard];

    for (let i = 0; i < count; i++) {
      if (nextHand.length >= 7) break;
      if (nextDraw.length === 0 && nextDiscard.length > 0) {
        nextDraw = shuffle(nextDiscard);
        nextDiscard = [];
      }
      if (nextDraw.length > 0) {
        nextHand.push(nextDraw[0]);
        nextDraw = nextDraw.slice(1);
      }
    }
    return { nextHand, nextDraw, nextDiscard };
  };

  const checkVictory = (remainingEnemies: BoardUnit[]) => {
    if (remainingEnemies.length > 0) return false;
    updateStats((s) => ({
      ...s,
      bestStage: Math.max(s.bestStage, stageIndex + 1),
      runsWon: stageIndex >= ENCOUNTERS.length - 1 ? s.runsWon + 1 : s.runsWon
    }));

    if (stageIndex >= ENCOUNTERS.length - 1) {
      setScreen('run_won');
      addLog('🏆 YOU BEAT ALL 5 STAGES! Full Run Victory!');
      return true;
    }

    const unownedChars = CHARACTER_CARDS.filter((c) => !runDeckIds.includes(c.id));
    const charPool = unownedChars.length >= 3 ? unownedChars : CHARACTER_CARDS;
    const offeredChars = shuffle(charPool).slice(0, 3);
    const offeredGadgets = shuffle(GADGET_CARDS).slice(0, 3);

    setDraftCharacters(offeredChars);
    setDraftGadgets(offeredGadgets);
    setPickedCharId(offeredChars[0]?.id ?? null);
    setPickedGadgetId(offeredGadgets[0]?.id ?? null);
    setScreen('victory_draft');
    return true;
  };

  const handlePlayCard = (card: HandCard) => {
    if (screen !== 'battle') return;
    const tpl = card.template;

    if (energy < tpl.cost) {
      showToast(`⚠️ Need ${tpl.cost} Energy to play ${tpl.name}!`);
      return;
    }

    if ((tpl.kind === 'character' || tpl.kind === 'contraption') && allies.length >= 6) {
      showToast('⚠️ Your board is full (max 6 slots)!');
      return;
    }

    if (
      tpl.kind === 'gadget' &&
      allies.length === 0 &&
      tpl.gadgetEffect !== 'audit_weaken' &&
      tpl.gadgetEffect !== 'emp_blast'
    ) {
      showToast('⚠️ Play a Character onto the board first before using this Gadget!');
      return;
    }

    const nextEnergy = energy - tpl.cost;
    let nextHand = hand.filter((h) => h.instanceId !== card.instanceId);
    let nextDraw = [...drawPile];
    let nextDiscard = [...discardPile];
    let nextAllies = [...allies];
    let nextEnemies = [...enemies];
    let nextPlayerHp = playerHp;

    if (tpl.kind === 'character' || tpl.kind === 'contraption') {
      const newUnit = createBoardUnit(tpl, false);
      nextAllies.push(newUnit);
      addLog(
        `🃏 Deployed ${tpl.name} (${tpl.tier.toUpperCase()} • ${TRAIT_INFO[tpl.trait].emoji} ${
          tpl.trait
        }). Can Intercept an enemy attack right away!`
      );

      if (tpl.entranceEffect === 'draw_gadget') {
        const gadgetIdx = nextDraw.findIndex((c) => c.template.kind === 'gadget');
        if (gadgetIdx !== -1 && nextHand.length < 7) {
          nextHand.push(nextDraw[gadgetIdx]);
          nextDraw.splice(gadgetIdx, 1);
          addLog('📘 Brenda drew a Gadget card from your deck!');
        } else if (nextHand.length < 7) {
          nextHand.push({
            instanceId: nextUid('card'),
            template: getCardById('gadget_patch_cord')
          });
          addLog('📘 Brenda added a Basic Patch Cord to your hand!');
        }
      } else if (tpl.entranceEffect === 'weaken_enemies_2') {
        nextEnemies = nextEnemies.map((e) => ({ ...e, weakened: e.weakened + 2 }));
        nextPlayerHp = Math.min(maxPlayerHp, nextPlayerHp + 3);
        addLog('🧞 DJ-1NN weakened all enemies (-2 ATK) and restored +3 Player HP!');
      }
    } else if (tpl.kind === 'gadget') {
      nextDiscard.push(card);
      addLog(`⚡ Played Gadget: ${tpl.name}!`);

      if (tpl.gadgetEffect === 'shield_ally_4') {
        const sorted = [...nextAllies].sort((a, b) => {
          const dmgA = targetedAllyMap[a.instanceId]?.totalDamage ?? 0;
          const dmgB = targetedAllyMap[b.instanceId]?.totalDamage ?? 0;
          if (dmgB !== dmgA) return dmgB - dmgA;
          return a.currentHealth - b.currentHealth;
        });
        const target = sorted[0];
        if (target) {
          nextAllies = nextAllies.map((a) =>
            a.instanceId === target.instanceId ? { ...a, shield: a.shield + 4 } : a
          );
          addLog(`📘 Hardcover Manual gave ${target.name} +4 Shield!`);
        }
      } else if (tpl.gadgetEffect === 'boost_ally_2') {
        const readyAlly = nextAllies.find((a) => a.ready) || nextAllies[0];
        if (readyAlly) {
          nextAllies = nextAllies.map((a) =>
            a.instanceId === readyAlly.instanceId
              ? { ...a, tempAttack: a.tempAttack + 2 }
              : a
          );
          addLog(`☕ Double Espresso gave ${readyAlly.name} +2 Attack this turn!`);
        }
      } else if (tpl.gadgetEffect === 'reroute_to_tank') {
        const sorted = [...nextAllies].sort(
          (a, b) =>
            (b.keywords.includes('Guard') ? 50 : 0) +
            b.currentHealth +
            b.shield -
            ((a.keywords.includes('Guard') ? 50 : 0) + a.currentHealth + a.shield)
        );
        const tank = sorted[0];
        if (tank) {
          nextAllies = nextAllies.map((a) =>
            a.instanceId === tank.instanceId ? { ...a, shield: a.shield + 3 } : a
          );
          nextEnemies = nextEnemies.map((e) =>
            e.intent && (e.intent.type === 'attack_unit' || e.intent.type === 'attack_player')
              ? {
                  ...e,
                  intent: {
                    ...e.intent,
                    type: 'attack_unit',
                    targetInstanceId: tank.instanceId
                  }
                }
              : e
          );
          addLog(`🔌 Rerouted all single-target enemies onto ${tank.name} (+3 Shield)!`);
        }
      } else if (tpl.gadgetEffect === 'audit_weaken') {
        nextEnemies = nextEnemies.map((e) => ({ ...e, weakened: e.weakened + 2 }));
        addLog("📋 Sticky-Note Blizzard reduced all enemies' Attack by -2 this turn!");
      } else if (tpl.gadgetEffect === 'emp_blast') {
        nextEnemies = nextEnemies
          .map((e) => {
            let remDmg = 3;
            const sBlocked = Math.min(e.shield, remDmg);
            remDmg -= sBlocked;
            return {
              ...e,
              shield: e.shield - sBlocked,
              currentHealth: e.currentHealth - remDmg
            };
          })
          .filter((e) => e.currentHealth > 0);
        addLog('💥 Short-Circuit Surge dealt 3 damage to all enemies!');
      } else if (tpl.gadgetEffect === 'ready_ally') {
        const sleeping = nextAllies.find((a) => !a.ready) || nextAllies[0];
        if (sleeping) {
          nextAllies = nextAllies.map((a) =>
            a.instanceId === sleeping.instanceId ? { ...a, ready: true } : a
          );
          addLog(`⚡ Defibrillator Jumper readied ${sleeping.name} to attack immediately!`);
        }
      }

      // Trigger 🤓 Obsessive trait (+1 Attack this turn)
      let obsessiveCount = 0;
      nextAllies = nextAllies.map((ally) => {
        if (ally.trait === 'Obsessive') {
          obsessiveCount += 1;
          return { ...ally, tempAttack: ally.tempAttack + 1 };
        }
        return ally;
      });
      if (obsessiveCount > 0) {
        addLog(
          `🤓 Overclock: ${obsessiveCount} Obsessive character(s) gained +1 Attack this turn!`
        );
      }

      // Specialist Server 01 passive zap
      const servers = nextAllies.filter((a) => a.passiveEffect === 'server_zap_2');
      servers.forEach(() => {
        if (nextEnemies.length > 0) {
          let lowIdx = 0;
          nextEnemies.forEach((e, idx) => {
            if (e.currentHealth < nextEnemies[lowIdx].currentHealth) lowIdx = idx;
          });
          const target = nextEnemies[lowIdx];
          let rem = 2;
          const sBlock = Math.min(target.shield, rem);
          rem -= sBlock;
          nextEnemies[lowIdx] = {
            ...target,
            shield: target.shield - sBlock,
            currentHealth: target.currentHealth - rem
          };
          addLog(`🧠 Server 01 zapped ${target.name} for 2 damage!`);
          nextEnemies = nextEnemies.filter((e) => e.currentHealth > 0);
        }
      });
    }

    setEnergy(nextEnergy);
    setPlayerHp(nextPlayerHp);
    setHand(nextHand);
    setDrawPile(nextDraw);
    setDiscardPile(nextDiscard);
    setAllies(nextAllies);
    setEnemies(nextEnemies);

    checkVictory(nextEnemies);
  };

  /**
   * UNIVERSAL INTERCEPT ACTION (Available on ANY character once per turn, including the turn they are played!)
   * - Pulls 1 enemy attack onto this character (prioritizing enemies aiming at Player HP first, then enemies aiming at other allies).
   * - If the character has the 🛡️ Guard keyword, they ALSO gain +2 Shield when intercepting!
   */
  const handleUnitIntercept = (allyUnit: BoardUnit, e: React.MouseEvent) => {
    e.stopPropagation();

    if (allyUnit.interceptedThisTurn) {
      showToast(`⏳ ${allyUnit.name} already intercepted an attack this turn!`);
      return;
    }

    // Prioritize an enemy currently aiming at Player HP; otherwise an enemy aiming at a different ally
    let targetEnemyIdx = enemies.findIndex(
      (en) =>
        en.intent &&
        (en.intent.type === 'attack_player' ||
          (en.intent.type === 'attack_unit' &&
            (!en.intent.targetInstanceId ||
              !allies.some((a) => a.instanceId === en.intent?.targetInstanceId))))
    );

    if (targetEnemyIdx === -1) {
      targetEnemyIdx = enemies.findIndex(
        (en) =>
          en.intent &&
          en.intent.type === 'attack_unit' &&
          en.intent.targetInstanceId !== allyUnit.instanceId
      );
    }

    if (targetEnemyIdx === -1) {
      showToast(`🎯 All single-target enemies are already aiming at ${allyUnit.name}!`);
      return;
    }

    const isGuard = allyUnit.keywords.includes('Guard');
    const shieldBonus = isGuard ? 2 : 0;

    const updatedEnemies = enemies.map((en, idx) =>
      idx === targetEnemyIdx && en.intent
        ? {
            ...en,
            intent: {
              ...en.intent,
              type: 'attack_unit' as const,
              targetInstanceId: allyUnit.instanceId
            }
          }
        : en
    );

    const updatedAllies = allies.map((a) =>
      a.instanceId === allyUnit.instanceId
        ? {
            ...a,
            interceptedThisTurn: true,
            shield: a.shield + shieldBonus
          }
        : a
    );

    setEnemies(updatedEnemies);
    setAllies(updatedAllies);

    const enemyName = enemies[targetEnemyIdx].name;
    if (isGuard) {
      addLog(
        `🛡️ Guard ${allyUnit.name} intercepted ${enemyName}'s attack and gained +2 Shield!`
      );
      showToast(`🛡️ ${allyUnit.name} intercepted ${enemyName} (+2 Shield)!`);
    } else {
      addLog(
        `🎯 ${allyUnit.name} stepped in to intercept ${enemyName}'s attack${
          allyUnit.trait === 'Stressed' ? ' (Adrenaline +2 ATK activated!)' : '!'
        }`
      );
      showToast(`🎯 ${allyUnit.name} is now blocking ${enemyName}'s attack!`);
    }
  };

  const handleAttackEnemy = (enemy: BoardUnit) => {
    if (screen !== 'battle') return;
    if (!selectedAllyId) {
      showToast('👆 Click one of your READY (green) characters first, then click an enemy!');
      return;
    }

    const attacker = allies.find((a) => a.instanceId === selectedAllyId);
    if (!attacker || !attacker.ready) {
      setSelectedAllyId(null);
      return;
    }

    const rawDmg = getEffectiveAttack(attacker) + enemy.exposed;
    const shieldBlocked = Math.min(enemy.shield, rawDmg);
    const hpDmg = rawDmg - shieldBlocked;
    const remainingHp = enemy.currentHealth - hpDmg;
    const killed = remainingHp <= 0;

    const controllingWeaken = attacker.trait === 'Controlling' ? 1 : 0;

    const nextEnemies = enemies
      .map((e) =>
        e.instanceId === enemy.instanceId
          ? {
              ...e,
              shield: e.shield - shieldBlocked,
              currentHealth: remainingHp,
              weakened: e.weakened + controllingWeaken
            }
          : e
      )
      .filter((e) => e.currentHealth > 0);

    const nextAllies = allies.map((a) => {
      if (a.instanceId !== attacker.instanceId) return a;
      let nextBonusAtk = a.bonusAttack;

      if (killed && a.trait === 'Hotheaded') {
        nextBonusAtk += 1;
        addLog(`💢 Bravado! ${a.name} knocked out ${enemy.name} and gained +1 Attack!`);
      }

      return {
        ...a,
        bonusAttack: nextBonusAtk,
        ready: false,
        attackedThisTurn: true
      };
    });

    if (controllingWeaken > 0 && !killed) {
      addLog(
        `🕵️ ${attacker.name} hit ${enemy.name} for ${rawDmg} DMG and applied -1 ATK (Controlling)!`
      );
    } else if (killed) {
      updateStats((s) => ({ ...s, enemiesDefeated: s.enemiesDefeated + 1 }));
      addLog(`💥 ${attacker.name} struck ${enemy.name} for ${rawDmg} DMG — KO!`);
    } else {
      addLog(`⚔️ ${attacker.name} struck ${enemy.name} for ${rawDmg} DMG!`);
    }

    setAllies(nextAllies);
    setEnemies(nextEnemies);
    setSelectedAllyId(null);

    checkVictory(nextEnemies);
  };

  const handleRequestEndTurn = () => {
    if (screen !== 'battle') return;
    const readyAllies = allies.filter((a) => a.ready);
    if (readyAllies.length > 0) {
      setShowEndTurnConfirm(true);
      return;
    }
    handleEndTurn();
  };

  const handleEndTurn = () => {
    if (screen !== 'battle') return;
    setShowEndTurnConfirm(false);
    setSelectedAllyId(null);

    let nextAllies = [...allies];
    let nextEnemies = [...enemies];
    let nextPlayerHp = playerHp;

    // 1. Trigger 🧘 Unbothered Poise (+2 Shield if unused this turn)
    nextAllies = nextAllies.map((ally) => {
      if (ally.trait === 'Unbothered' && !ally.attackedThisTurn) {
        addLog(`🧘 Poise: ${ally.name} didn't attack and gained +2 Shield!`);
        return {
          ...ally,
          shield: ally.shield + 2
        };
      }
      return ally;
    });

    // 2. Enemies execute their telegraphed intents!
    const applyDamageToAlly = (
      targetId: string,
      rawDmg: number,
      attackerEnemy: BoardUnit
    ) => {
      const idx = nextAllies.findIndex((a) => a.instanceId === targetId);
      if (idx === -1) {
        const guardIdx = nextAllies.findIndex((a) => a.keywords.includes('Guard'));
        if (guardIdx !== -1) {
          applyDamageToAlly(nextAllies[guardIdx].instanceId, rawDmg, attackerEnemy);
          return;
        }
        nextPlayerHp = Math.max(0, nextPlayerHp - rawDmg);
        addLog(`💥 ${attackerEnemy.name} hit YOUR Player HP for ${rawDmg} damage!`);
        return;
      }

      const target = { ...nextAllies[idx] };
      const blocked = Math.min(target.shield, rawDmg);
      const hpLoss = rawDmg - blocked;
      target.shield -= blocked;
      target.currentHealth -= hpLoss;

      addLog(
        `🎯 ${attackerEnemy.name} hit ${target.name} for ${rawDmg} DMG (${
          blocked > 0 ? `${blocked} blocked, ` : ''
        }${hpLoss} HP lost)!`
      );

      if (target.passiveEffect === 'thorns_2' && rawDmg > 0) {
        attackerEnemy.currentHealth -= 2;
        addLog(`🥋 ${target.name} countered ${attackerEnemy.name} for 2 DMG!`);
      }

      if (target.currentHealth <= 0) {
        addLog(`💀 ${target.name} was knocked out!`);
        nextAllies.splice(idx, 1);
      } else {
        nextAllies[idx] = target;
      }
    };

    nextEnemies.forEach((enemy) => {
      if (enemy.currentHealth <= 0 || !enemy.intent) return;
      const netDmg = Math.max(0, enemy.intent.damage - enemy.weakened);

      if (enemy.intent.type === 'attack_unit' && enemy.intent.targetInstanceId) {
        applyDamageToAlly(enemy.intent.targetInstanceId, netDmg, enemy);
      } else if (enemy.intent.type === 'attack_player') {
        if (netDmg > 0) {
          nextPlayerHp = Math.max(0, nextPlayerHp - netDmg);
          addLog(`💥 ${enemy.name} attacked YOUR Player HP directly for ${netDmg} DMG!`);
        }
      } else if (enemy.intent.type === 'aoe_sweep') {
        addLog(`💣 ${enemy.name} swept your board for ${netDmg} DMG to all allies!`);
        const currentIds = nextAllies.map((a) => a.instanceId);
        currentIds.forEach((id) => applyDamageToAlly(id, netDmg, enemy));
      } else if (enemy.intent.type === 'fortify_all') {
        nextEnemies = nextEnemies.map((e) => ({
          ...e,
          shield: e.shield + 3,
          bonusAttack: e.bonusAttack + 1
        }));
        addLog(`🛡️ ${enemy.name} fortified all enemies (+3 Shield & +1 ATK)!`);
      }
    });

    nextEnemies = nextEnemies.filter((e) => e.currentHealth > 0);
    if (checkVictory(nextEnemies)) {
      setAllies(nextAllies);
      setEnemies(nextEnemies);
      setPlayerHp(nextPlayerHp);
      return;
    }

    if (nextPlayerHp <= 0) {
      setPlayerHp(0);
      setAllies(nextAllies);
      setEnemies(nextEnemies);
      setScreen('game_over');
      addLog('☠️ Your Player HP hit 0! Run Over.');
      return;
    }

    const nextTurnNum = turn + 1;
    const nextMaxEnergy = Math.min(10, maxEnergy + 1);

    nextAllies = nextAllies.map((a) => ({
      ...a,
      ready: true,
      attackedThisTurn: false,
      interceptedThisTurn: false,
      tempAttack: 0
    }));

    const cleanedEnemies = nextEnemies.map((e) => ({
      ...e,
      weakened: 0,
      exposed: 0
    }));
    const enemiesWithNewIntents = computeEnemyIntents(
      cleanedEnemies,
      nextAllies,
      nextTurnNum
    );

    const drawn = drawCards(1, hand, drawPile, discardPile);

    setTurn(nextTurnNum);
    setMaxEnergy(nextMaxEnergy);
    setEnergy(nextMaxEnergy);
    setPlayerHp(nextPlayerHp);
    setAllies(nextAllies);
    setEnemies(enemiesWithNewIntents);
    setHand(drawn.nextHand);
    setDrawPile(drawn.nextDraw);
    setDiscardPile(drawn.nextDiscard);
    addLog(`🔔 Turn ${nextTurnNum} — Energy: ${nextMaxEnergy}, Drew 1 card.`);
  };

  const handleConfirmDraft = () => {
    const newDeck = [...runDeckIds];
    if (pickedCharId) newDeck.push(pickedCharId);
    if (pickedGadgetId) newDeck.push(pickedGadgetId);
    setRunDeckIds(newDeck);

    const healedHp = Math.min(maxPlayerHp, playerHp + 5);
    const nextIdx = stageIndex + 1;
    startEncounter(nextIdx, newDeck, healedHp);
  };

  const currentEncounter = ENCOUNTERS[stageIndex] || ENCOUNTERS[0];
  const selectedAlly = allies.find((a) => a.instanceId === selectedAllyId) || null;

  return (
    <div className="game-shell">
      <header className="top-bar">
        <div className="brand-block">
          <span className="brand-badge">PROTOTYPE v0.3</span>
          <h1 className="brand-title">ON THE EDGE</h1>
          <span className="stage-pill">
            {currentEncounter.title} ({stageIndex + 1}/{ENCOUNTERS.length})
          </span>
        </div>

        <div className="trait-strip">
          {(Object.keys(TRAIT_INFO) as PersonalityTrait[]).map((t) => {
            const info = TRAIT_INFO[t];
            return (
              <div
                key={t}
                className="trait-chip"
                style={{ borderColor: info.color, background: info.bg }}
                onMouseEnter={() => setHoveredTrait(t)}
                onMouseLeave={() => setHoveredTrait(null)}
              >
                <span>{info.emoji}</span>
                <strong>{t}:</strong>
                <span className="trait-chip-rule">{info.shortRule}</span>
              </div>
            );
          })}
        </div>

        <div className="top-actions">
          <div className="stats-mini">
            <span>🏆 Wins: {stats.runsWon}</span>
            <span>💀 KOs: {stats.enemiesDefeated}</span>
          </div>
          <button className="btn-secondary" onClick={() => setShowCodexModal(true)}>
            📖 Cards & Sandbox ({runDeckIds.length})
          </button>
          <button className="btn-secondary" onClick={startNewRun}>
            🔄 New Run
          </button>
        </div>
      </header>

      {hoveredTrait && (
        <div className="trait-tooltip-banner">
          <strong>
            {TRAIT_INFO[hoveredTrait].emoji} {hoveredTrait}:
          </strong>{' '}
          {TRAIT_INFO[hoveredTrait].fullRule}
        </div>
      )}

      <div className={`guidance-bar ${selectedAlly ? 'attack-mode' : ''}`}>
        {floatingBanner ? (
          <strong>{floatingBanner}</strong>
        ) : selectedAlly ? (
          <span>
            ⚔️ <strong>{selectedAlly.name}</strong> is aiming ({getEffectiveAttack(selectedAlly)}{' '}
            DMG) — <strong>Click any Enemy card below to strike them!</strong>
          </span>
        ) : (
          <span>
            💡 <strong>Turn {turn}:</strong> Any character on your board can click{' '}
            <strong>🎯 Intercept Aim</strong> (even on the turn you play them!) to pull an enemy
            attack off your Player HP! <strong>🛡️ Guard</strong> characters also gain +2 Shield when
            intercepting.
          </span>
        )}
      </div>

      <main className="battlefield">
        {/* ENEMY ROW */}
        <section className="board-row enemy-row">
          <div className="row-label">
            <span>👹 ENEMY SQUAD — TELEGRAPHED INTENTS</span>
            <span className="row-sub">{currentEncounter.subtitle}</span>
          </div>

          <div className="units-container">
            {enemies.map((enemy) => {
              const intent = enemy.intent;
              const netIntentDmg = intent ? Math.max(0, intent.damage - enemy.weakened) : 0;
              const targetAlly =
                intent?.type === 'attack_unit'
                  ? allies.find((a) => a.instanceId === intent.targetInstanceId)
                  : null;
              const traitMeta = TRAIT_INFO[enemy.trait];

              return (
                <div
                  key={enemy.instanceId}
                  className={`unit-card enemy-card ${
                    selectedAlly ? 'targetable-enemy' : ''
                  }`}
                  onClick={() => handleAttackEnemy(enemy)}
                >
                  {intent && (
                    <div className={`intent-banner intent-${intent.type}`}>
                      {intent.type === 'attack_unit' && (
                        <>
                          🎯 Aiming <strong>{netIntentDmg} DMG</strong> at{' '}
                          <span className="intent-target-name">
                            {targetAlly ? targetAlly.name : 'YOUR HP'}
                          </span>
                        </>
                      )}
                      {intent.type === 'attack_player' && (
                        <>
                          💥 Aiming <strong>{netIntentDmg} DMG</strong> at{' '}
                          <span className="intent-target-name danger">YOUR PLAYER HP!</span>
                        </>
                      )}
                      {intent.type === 'aoe_sweep' && (
                        <>
                          💣 AoE Sweep: <strong>{netIntentDmg} DMG</strong> to ALL Allies!
                        </>
                      )}
                      {intent.type === 'fortify_all' && (
                        <>🛡️ Fortifying All Enemies (+3 Shield & +1 ATK)</>
                      )}
                    </div>
                  )}

                  <div className="unit-header">
                    <span className="unit-name">{enemy.name}</span>
                    <span
                      className="unit-trait-badge"
                      style={{ color: traitMeta.color, background: traitMeta.bg }}
                    >
                      {traitMeta.emoji} {enemy.trait}
                    </span>
                  </div>

                  <div className="unit-art-wrap">
                    {enemy.image ? (
                      <img src={enemy.image} alt={enemy.name} className="unit-art" />
                    ) : (
                      <div className="unit-icon-art">{enemy.icon || '🤖'}</div>
                    )}
                    <div className="status-pills-overlay">
                      {enemy.shield > 0 && (
                        <span className="status-pill shield-pill">🛡️ {enemy.shield} Shield</span>
                      )}
                      {enemy.weakened > 0 && (
                        <span className="status-pill weaken">📋 -{enemy.weakened} ATK</span>
                      )}
                    </div>
                  </div>

                  <div className="unit-ability-box">
                    <div className="ability-title">{enemy.title}</div>
                    {selectedAlly && (
                      <div className="attack-preview-tag">
                        ⚔️ Click to deal {getEffectiveAttack(selectedAlly)} DMG!
                      </div>
                    )}
                  </div>

                  <div className="unit-footer">
                    <div className="stat-badge atk-badge">⚔️ {getEffectiveAttack(enemy)}</div>
                    <div className="hp-bar-wrap">
                      <div
                        className="hp-bar-fill enemy-hp"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, (enemy.currentHealth / enemy.maxHealth) * 100)
                          )}%`
                        }}
                      />
                      <span className="hp-text">
                        ❤️ {enemy.currentHealth} / {enemy.maxHealth}
                        {enemy.shield > 0 ? ` (+${enemy.shield}🛡️)` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PLAYER SQUAD ROW */}
        <section className="board-row player-row">
          <div className="row-label">
            <span>🛡️ YOUR SQUAD BOARD ({allies.length} / 6 Slots)</span>
            <span className="row-sub">
              Every character can Intercept 1 enemy attack per turn (even on the turn played)!
            </span>
          </div>

          <div className="units-container">
            {allies.length === 0 ? (
              <div className="empty-board-hint">
                Play Character cards from your hand below to deploy your squad!
              </div>
            ) : (
              allies.map((ally) => {
                const incoming = targetedAllyMap[ally.instanceId];
                const isTargeted = (incoming?.attackers.length ?? 0) > 0;
                const isSelected = selectedAllyId === ally.instanceId;
                const traitMeta = TRAIT_INFO[ally.trait];
                const effAtk = getEffectiveAttack(ally);
                const stressedActive = ally.trait === 'Stressed' && isTargeted;
                const isGuard = ally.keywords.includes('Guard');

                // Can this unit intercept an enemy that isn't already aiming at it?
                const canInterceptSomeone =
                  !ally.interceptedThisTurn &&
                  enemies.some(
                    (en) =>
                      en.intent &&
                      (en.intent.type === 'attack_player' ||
                        (en.intent.type === 'attack_unit' &&
                          en.intent.targetInstanceId !== ally.instanceId))
                  );

                return (
                  <div
                    key={ally.instanceId}
                    className={`unit-card ally-card tier-${ally.tier} ${
                      ally.ready ? 'unit-ready' : 'unit-resting'
                    } ${isSelected ? 'unit-selected' : ''} ${
                      isTargeted ? 'unit-targeted' : ''
                    }`}
                    onClick={() => {
                      if (!ally.ready) {
                        showToast(
                          `⏳ ${ally.name} can Attack next turn—or click "Intercept Aim" below to block right now!`
                        );
                        return;
                      }
                      setSelectedAllyId(isSelected ? null : ally.instanceId);
                    }}
                  >
                    <div className="ally-top-badges">
                      {ally.ready ? (
                        <span className="badge-ready">
                          {isSelected ? '🎯 AIMING — Click Enemy!' : '⚔️ READY — Click to Attack'}
                        </span>
                      ) : (
                        <span className="badge-sleeping">💤 Attacks Next Turn</span>
                      )}

                      {isTargeted && (
                        <span className="badge-incoming">
                          ⚠️ Incoming {incoming.totalDamage} DMG
                        </span>
                      )}
                    </div>

                    <div className="unit-header">
                      <span className="unit-name">
                        {ally.tier === 'specialist' ? '★ ' : ''}
                        {ally.name}
                      </span>
                      <span
                        className="unit-trait-badge"
                        style={{ color: traitMeta.color, background: traitMeta.bg }}
                      >
                        {traitMeta.emoji} {ally.trait}
                      </span>
                    </div>

                    <div className="unit-art-wrap">
                      {ally.image ? (
                        <img src={ally.image} alt={ally.name} className="unit-art" />
                      ) : (
                        <div className="unit-icon-art">{ally.icon || '🚁'}</div>
                      )}
                      <div className="status-pills-overlay">
                        {ally.shield > 0 && (
                          <span className="status-pill shield-pill">🛡️ {ally.shield} Shield</span>
                        )}
                        {stressedActive && (
                          <span className="status-pill adrenaline-pill">
                            😰 Adrenaline +2 ATK!
                          </span>
                        )}
                        {isGuard && <span className="status-pill guard-pill">🛡️ Guard</span>}
                      </div>
                    </div>

                    <div className="unit-ability-box">
                      {ally.abilityText ? (
                        <div className="ability-text-short">
                          <strong className="specialist-label">{ally.abilityTitle}:</strong>{' '}
                          {ally.abilityText}
                        </div>
                      ) : (
                        <div className="basic-flavor-box">
                          <span className="basic-tag">BASIC</span> {ally.flavorText}
                        </div>
                      )}

                      {/* UNIVERSAL INTERCEPT BUTTON ON EVERY CHARACTER */}
                      <button
                        className={`btn-guard-taunt ${
                          !canInterceptSomeone ? 'btn-intercept-disabled' : ''
                        } ${isGuard ? 'btn-guard-bonus' : ''}`}
                        onClick={(e) => handleUnitIntercept(ally, e)}
                        disabled={!canInterceptSomeone}
                        title={
                          ally.interceptedThisTurn
                            ? 'Already intercepted an attack this turn'
                            : 'Pull an enemy attack off your Player HP (or another ally) onto this character!'
                        }
                      >
                        {ally.interceptedThisTurn
                          ? '✓ Intercepted This Turn'
                          : isGuard
                          ? '🛡️ Guard Intercept (+2🛡️)'
                          : '🎯 Intercept Enemy Aim'}
                      </button>
                    </div>

                    <div className="unit-footer">
                      <div
                        className={`stat-badge atk-badge ${
                          effAtk > ally.baseAttack ? 'stat-buffed' : ''
                        }`}
                      >
                        ⚔️ {effAtk}
                      </div>
                      <div className="hp-bar-wrap">
                        <div
                          className="hp-bar-fill ally-hp"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, (ally.currentHealth / ally.maxHealth) * 100)
                            )}%`
                          }}
                        />
                        <span className="hp-text">
                          ❤️ {ally.currentHealth} / {ally.maxHealth}
                          {ally.shield > 0 ? ` (+${ally.shield}🛡️)` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <footer className="bottom-hud">
        <div className="vitals-panel">
          <div className={`player-hp-box ${incomingPlayerDamage > 0 ? 'hp-danger-pulse' : ''}`}>
            <div className="hp-label-row">
              <span>❤️ YOUR SANITY / HP</span>
              <strong>
                {playerHp} / {maxPlayerHp}
              </strong>
            </div>
            <div className="player-hp-bar">
              <div
                className="player-hp-fill"
                style={{ width: `${(playerHp / maxPlayerHp) * 100}%` }}
              />
            </div>
            {incomingPlayerDamage > 0 ? (
              <div className="incoming-face-warning">
                ⚠️ Incoming {incomingPlayerDamage} DMG to your HP! Click{' '}
                <strong>🎯 Intercept Enemy Aim</strong> on any character to block it!
              </div>
            ) : (
              <div className="incoming-face-safe">✅ Your Player HP is safe this turn</div>
            )}
          </div>

          <div className="energy-deck-row">
            <div className="energy-orb">
              <span className="energy-num">
                ⚡ {energy} / {maxEnergy}
              </span>
              <span className="energy-sub">ENERGY (+1/turn • Draw 1/turn)</span>
            </div>
            <div className="deck-counts">
              <div>📚 Draw: {drawPile.length}</div>
              <div>♻️ Discard: {discardPile.length}</div>
            </div>
          </div>
        </div>

        {/* HAND OF CARDS */}
        <div className="hand-zone">
          <div className="hand-cards-row">
            {hand.map((hCard) => {
              const tpl = hCard.template;
              const playable =
                energy >= tpl.cost && (tpl.kind === 'gadget' || allies.length < 6);
              const traitMeta = TRAIT_INFO[tpl.trait];

              return (
                <div
                  key={hCard.instanceId}
                  className={`hand-card ${playable ? 'card-playable' : 'card-unplayable'} kind-${
                    tpl.kind
                  } tier-${tpl.tier}`}
                  onClick={() => handlePlayCard(hCard)}
                >
                  <div className="hand-card-top">
                    <span className="cost-gem">⚡{tpl.cost}</span>
                    <span className="hand-card-name">{tpl.name}</span>
                    {tpl.tier === 'specialist' ? (
                      <span className="tier-pill specialist">★ EXTRA</span>
                    ) : (
                      <span className="tier-pill basic">BASIC</span>
                    )}
                  </div>

                  <div className="hand-card-art">
                    {tpl.image ? (
                      <img src={tpl.image} alt={tpl.name} />
                    ) : (
                      <div className="gadget-icon-display">{tpl.icon || '⚡'}</div>
                    )}
                    <span
                      className="hand-trait-tag"
                      style={{ color: traitMeta.color, background: traitMeta.bg }}
                    >
                      {traitMeta.emoji} {tpl.trait}
                    </span>
                  </div>

                  <div className="hand-card-body">
                    {tpl.keywords.includes('Guard') && (
                      <div className="keyword-line">🛡️ Guard (+2 Shield on Intercept)</div>
                    )}
                    {tpl.abilityText ? (
                      <>
                        <div className="hand-ability-title">{tpl.abilityTitle}</div>
                        <p className="hand-ability-desc">{tpl.abilityText}</p>
                      </>
                    ) : (
                      <p className="hand-flavor-desc">{tpl.flavorText}</p>
                    )}
                  </div>

                  <div className="hand-card-footer">
                    {tpl.kind === 'gadget' ? (
                      <span className="gadget-type-pill">⚡ GADGET ACTION</span>
                    ) : (
                      <>
                        <span className="hand-stat atk">⚔️ {tpl.attack}</span>
                        <span className="hand-stat hp">❤️ {tpl.health}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="right-controls">
          <button
            className={`btn-end-turn ${
              allies.some((a) => a.ready) ? 'has-attacks-left' : 'all-attacks-done'
            }`}
            onClick={handleRequestEndTurn}
          >
            <span className="end-turn-main">
              {allies.some((a) => a.ready)
                ? `END TURN (${allies.filter((a) => a.ready).length} READY)`
                : 'END TURN ➡️'}
            </span>
            <span className="end-turn-sub">
              {allies.some((a) => a.ready)
                ? '⚠️ Click to confirm skipping attacks'
                : '✅ All attacks used — Resolve Enemy Turn'}
            </span>
          </button>

          <div className="combat-log-box">
            <div className="log-header">📜 Live Action Log</div>
            <div className="log-entries">
              {combatLog.map((entry, idx) => (
                <div key={idx} className="log-line">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* END TURN CONFIRMATION MODAL WHEN READY CHARACTERS REMAIN */}
      {showEndTurnConfirm && (
        <div className="modal-backdrop" onClick={() => setShowEndTurnConfirm(false)}>
          <div
            className="modal-card confirm-end-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>⚔️ You Still Have Unused Attacks!</h2>
            <p className="modal-sub">
              The following character(s) on your board are <strong>READY</strong> and haven&apos;t
              attacked this turn:
            </p>

            <div className="ready-reminder-list">
              {allies
                .filter((a) => a.ready)
                .map((a) => (
                  <div key={a.instanceId} className="ready-reminder-item">
                    <strong>
                      ⚔️ {a.name} ({getEffectiveAttack(a)} DMG)
                    </strong>
                    {a.trait === 'Unbothered' ? (
                      <span className="poise-note">
                        🧘 Unbothered: Gains +2 Shield if you don&apos;t attack!
                      </span>
                    ) : (
                      <span className="attack-note">Ready to strike an enemy for free!</span>
                    )}
                  </div>
                ))}
            </div>

            <div className="confirm-actions-row">
              <button
                className="btn-primary-large"
                onClick={() => {
                  const firstReady = allies.find((a) => a.ready);
                  if (firstReady) {
                    setSelectedAllyId(firstReady.instanceId);
                  }
                  setShowEndTurnConfirm(false);
                }}
              >
                ↩️ Go Back & Attack ({allies.find((a) => a.ready)?.name})
              </button>
              <button className="btn-secondary btn-end-anyway" onClick={handleEndTurn}>
                ➡️ End Turn Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST-BATTLE DRAFT MODAL */}
      {screen === 'victory_draft' && (
        <div className="modal-backdrop">
          <div className="modal-card draft-modal">
            <h2>🎉 Stage {stageIndex + 1} Cleared! Recruit & Upgrade</h2>
            <p className="modal-sub">
              You recovered <strong>+5 HP</strong>! Pick <strong>1 Character</strong> and{' '}
              <strong>1 Gadget</strong>:
            </p>

            <div className="draft-section">
              <h3>1. Recruit a Character</h3>
              <div className="draft-row">
                {draftCharacters.map((c) => {
                  const selected = pickedCharId === c.id;
                  const traitMeta = TRAIT_INFO[c.trait];
                  return (
                    <div
                      key={c.id}
                      className={`draft-choice-card ${selected ? 'draft-selected' : ''}`}
                      onClick={() => setPickedCharId(c.id)}
                    >
                      <div className="draft-card-header">
                        <span>⚡{c.cost}</span>
                        <strong>
                          {c.tier === 'specialist' ? '★ ' : ''}
                          {c.name}
                        </strong>
                        <span style={{ color: traitMeta.color }}>
                          {traitMeta.emoji} {c.trait}
                        </span>
                      </div>
                      {c.image && <img src={c.image} alt={c.name} className="draft-art" />}
                      <div className="draft-ability">
                        {c.abilityText ? (
                          <>
                            <strong style={{ color: '#fde047' }}>
                              ★ {c.abilityTitle}:
                            </strong>{' '}
                            {c.abilityText}
                          </>
                        ) : (
                          <>
                            <span className="basic-tag">BASIC FOUNDATION</span>{' '}
                            <em>{c.flavorText}</em>
                          </>
                        )}
                      </div>
                      <div className="draft-stats">
                        <span>⚔️ {c.attack} ATK</span>
                        <span>❤️ {c.health} HP</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="draft-section">
              <h3>2. Pick a Tactical Gadget</h3>
              <div className="draft-row">
                {draftGadgets.map((g) => {
                  const selected = pickedGadgetId === g.id;
                  const traitMeta = TRAIT_INFO[g.trait];
                  return (
                    <div
                      key={g.id}
                      className={`draft-choice-card gadget-draft ${
                        selected ? 'draft-selected' : ''
                      }`}
                      onClick={() => setPickedGadgetId(g.id)}
                    >
                      <div className="draft-card-header">
                        <span>⚡{g.cost}</span>
                        <strong>
                          {g.tier === 'specialist' ? '★ ' : ''}
                          {g.name}
                        </strong>
                        <span style={{ color: traitMeta.color }}>
                          {traitMeta.emoji} {g.trait}
                        </span>
                      </div>
                      <div className="draft-gadget-icon">{g.icon}</div>
                      <div className="draft-ability">
                        <strong>{g.abilityTitle}:</strong> {g.abilityText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button className="btn-primary-large" onClick={handleConfirmDraft}>
              🚀 Add Cards & Start Stage {stageIndex + 2}
            </button>
          </div>
        </div>
      )}

      {(screen === 'run_won' || screen === 'game_over') && (
        <div className="modal-backdrop">
          <div className="modal-card end-modal">
            <h2>
              {screen === 'run_won'
                ? '🏆 VICTORY! You Survived the Singularity Audit!'
                : '💥 MELTDOWN! Your Sanity Hit Zero'}
            </h2>
            <p className="modal-sub">
              {screen === 'run_won'
                ? 'Your squad of Basic backbones and Specialist wildcards conquered all 5 stages!'
                : `You fell at ${currentEncounter.title}. Remember: any character can click "Intercept Enemy Aim" to block attacks aimed at your Player HP!`}
            </p>
            <button className="btn-primary-large" onClick={startNewRun}>
              🔄 Play Another Run
            </button>
          </div>
        </div>
      )}

      {showCodexModal && (
        <div className="modal-backdrop" onClick={() => setShowCodexModal(false)}>
          <div className="modal-card codex-modal" onClick={(e) => e.stopPropagation()}>
            <div className="codex-header">
              <h2>📖 Card Roster (Basic Foundation vs. ★ Specialist) & Stage Sandbox</h2>
              <button className="btn-secondary" onClick={() => setShowCodexModal(false)}>
                ✖ Close
              </button>
            </div>

            <div className="sandbox-bar">
              <span>⚡ Jump directly to any Stage to test balance:</span>
              {ENCOUNTERS.map((enc, idx) => (
                <button
                  key={enc.stage}
                  className="btn-secondary"
                  onClick={() => {
                    startEncounter(idx, runDeckIds, 20);
                    setShowCodexModal(false);
                  }}
                >
                  Stage {enc.stage}
                </button>
              ))}
            </div>

            <h3>Basic Foundation Characters (6 Cards — Pure Stats & Trait)</h3>
            <div className="codex-grid">
              {CHARACTER_CARDS.filter((c) => c.tier === 'basic').map((c) => {
                const traitMeta = TRAIT_INFO[c.trait];
                const inDeck = runDeckIds.includes(c.id);
                return (
                  <div key={c.id} className="codex-card">
                    <div className="draft-card-header">
                      <span>⚡{c.cost}</span>
                      <strong>{c.name}</strong>
                      <span style={{ color: traitMeta.color }}>
                        {traitMeta.emoji} {c.trait}
                      </span>
                    </div>
                    {c.image && <img src={c.image} alt={c.name} className="draft-art" />}
                    <div className="draft-ability">
                      <span className="basic-tag">BASIC</span>{' '}
                      {c.keywords.includes('Guard') && <strong>[🛡️ Guard] </strong>}
                      <em>{c.flavorText}</em>
                    </div>
                    <div className="draft-stats">
                      <span>⚔️ {c.attack}</span>
                      <span>❤️ {c.health}</span>
                      {inDeck && <span className="in-deck-pill">✓ In Deck</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <h3>★ Specialist Characters (5 Cards — Extra Abilities!)</h3>
            <div className="codex-grid">
              {CHARACTER_CARDS.filter((c) => c.tier === 'specialist').map((c) => {
                const traitMeta = TRAIT_INFO[c.trait];
                const inDeck = runDeckIds.includes(c.id);
                return (
                  <div key={c.id} className="codex-card specialist-codex-card">
                    <div className="draft-card-header">
                      <span>⚡{c.cost}</span>
                      <strong style={{ color: '#fde047' }}>★ {c.name}</strong>
                      <span style={{ color: traitMeta.color }}>
                        {traitMeta.emoji} {c.trait}
                      </span>
                    </div>
                    {c.image && <img src={c.image} alt={c.name} className="draft-art" />}
                    <div className="draft-ability">
                      <strong style={{ color: '#fde047' }}>{c.abilityTitle}:</strong>{' '}
                      {c.abilityText}
                    </div>
                    <div className="draft-stats">
                      <span>⚔️ {c.attack}</span>
                      <span>❤️ {c.health}</span>
                      {inDeck && <span className="in-deck-pill">✓ In Deck</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
