export type PersonalityTrait =
  | 'Hotheaded'
  | 'Obsessive'
  | 'Stressed'
  | 'Controlling'
  | 'Unbothered';

export type CardKind = 'character' | 'gadget' | 'contraption';
export type CardTier = 'basic' | 'specialist';

export type GadgetEffectType =
  | 'shield_ally_4'    // Basic: +4 Shield to most threatened ally
  | 'boost_ally_2'     // Basic: +2 Attack this turn to ready ally
  | 'reroute_to_tank'  // Basic: Redirect single-target enemies to healthiest ally +3 Shield
  | 'audit_weaken'     // Specialist: All enemies -2 ATK this turn
  | 'emp_blast'        // Specialist: Deal 3 DMG to all enemies
  | 'ready_ally';      // Specialist: Ready a character that already acted

export interface CardTemplate {
  id: string;
  name: string;
  title: string;
  kind: CardKind;
  tier: CardTier;
  cost: number;
  attack: number;
  health: number;
  trait: PersonalityTrait;
  image?: string;
  icon?: string;
  keywords: ('Guard' | 'Impatient' | 'Contraption')[];
  abilityTitle?: string;
  abilityText?: string;
  flavorText: string;
  entranceEffect?:
    | 'weaken_enemies_2'
    | 'expose_enemies_2'
    | 'summon_drone'
    | 'draw_gadget'
    | 'heal_player_3';
  passiveEffect?:
    | 'thorns_2'
    | 'server_zap_2'
    | 'reset_on_kill';
  gadgetEffect?: GadgetEffectType;
}

export type EnemyIntentType =
  | 'attack_unit'
  | 'attack_player'
  | 'aoe_sweep'
  | 'fortify_all';

export interface EnemyIntent {
  type: EnemyIntentType;
  damage: number;
  shield?: number;
  targetInstanceId?: string;
}

export interface BoardUnit {
  instanceId: string;
  templateId: string;
  name: string;
  title: string;
  kind: CardKind;
  tier: CardTier;
  trait: PersonalityTrait;
  image?: string;
  icon?: string;
  maxHealth: number;
  currentHealth: number;
  baseAttack: number;
  bonusAttack: number;
  tempAttack: number;
  shield: number;
  ready: boolean;
  attackedThisTurn: boolean;
  interceptedThisTurn: boolean; // Every character can Intercept 1 enemy attack per turn (even on the turn played!)
  keywords: ('Guard' | 'Impatient' | 'Contraption')[];
  abilityTitle?: string;
  abilityText?: string;
  flavorText: string;
  passiveEffect?: CardTemplate['passiveEffect'];
  isEnemy: boolean;
  weakened: number;
  exposed: number;
  intent?: EnemyIntent;
}

export interface HandCard {
  instanceId: string;
  template: CardTemplate;
}

export interface EnemySpawnSpec {
  id: string;
  hp: number;
  atk: number;
  shield?: number;
}

export interface EncounterDef {
  stage: number;
  title: string;
  subtitle: string;
  enemies: EnemySpawnSpec[];
}

export interface SavedStats {
  runsStarted: number;
  runsWon: number;
  enemiesDefeated: number;
  bestStage: number;
}
