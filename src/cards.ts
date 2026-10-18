import { CardTemplate, EncounterDef, PersonalityTrait } from './types';

export const TRAIT_INFO: Record<
  PersonalityTrait,
  {
    emoji: string;
    color: string;
    bg: string;
    shortRule: string;
    fullRule: string;
  }
> = {
  Hotheaded: {
    emoji: '💢',
    color: '#ff5c5c',
    bg: 'rgba(255, 92, 92, 0.16)',
    shortRule: '+1 ATK on Kill',
    fullRule: 'Bravado: Whenever this character lands a killing blow, it permanently gains +1 Attack for the fight.'
  },
  Obsessive: {
    emoji: '🤓',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.16)',
    shortRule: '+1 ATK this turn per Gadget',
    fullRule: 'Overclock: Whenever you play a Gadget, all Obsessive characters gain +1 Attack for this turn.'
  },
  Stressed: {
    emoji: '😰',
    color: '#facc15',
    bg: 'rgba(250, 204, 21, 0.16)',
    shortRule: '+2 ATK while Targeted',
    fullRule: 'Adrenaline: While an enemy is aiming an attack at this character, it gets +2 Attack! (Great when Intercepting!)'
  },
  Controlling: {
    emoji: '🕵️',
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.16)',
    shortRule: 'Attacks Weaken (-1 ATK)',
    fullRule: 'Red Tape: Whenever a Controlling character attacks an enemy, that enemy gets -1 Attack this turn.'
  },
  Unbothered: {
    emoji: '🧘',
    color: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.16)',
    shortRule: 'If unused: +2 Shield',
    fullRule: 'Poise: If this character does NOT attack during your turn, it gains +2 Shield at the end of the turn.'
  }
};

export const CHARACTER_CARDS: CardTemplate[] = [
  // ==========================================
  // BASIC FOUNDATION CHARACTERS (No Special Abilities)
  // ==========================================
  {
    id: 'arthur',
    name: 'Arthur',
    title: 'Clipboard Auditor',
    kind: 'character',
    tier: 'basic',
    cost: 1,
    attack: 2,
    health: 4,
    trait: 'Controlling',
    image: '/characters/arthur.jpg',
    keywords: [],
    flavorText: '"Form 27-B was supposed to be filed in triplicate YESTERDAY!"'
  },
  {
    id: 'barry',
    name: 'Barry',
    title: 'Tangled Sysadmin',
    kind: 'character',
    tier: 'basic',
    cost: 2,
    attack: 3,
    health: 5,
    trait: 'Stressed',
    image: '/characters/barry.jpg',
    keywords: [],
    flavorText: '"If anyone unplugs the yellow cable, the entire building goes dark."'
  },
  {
    id: 'swami',
    name: 'Swami Pretzel',
    title: 'Twisted Mystic',
    kind: 'character',
    tier: 'basic',
    cost: 2,
    attack: 2,
    health: 7,
    trait: 'Unbothered',
    image: '/characters/swami.jpg',
    keywords: ['Guard'],
    flavorText: '"Pain is temporary. This knot in my left hamstring is permanent."'
  },
  {
    id: 'bloodshot',
    name: 'Inspector Bloodshot',
    title: 'Sleepless Detective',
    kind: 'character',
    tier: 'basic',
    cost: 3,
    attack: 4,
    health: 5,
    trait: 'Obsessive',
    image: '/characters/bloodshot.jpg',
    keywords: [],
    flavorText: '"I haven\'t blinked since Tuesday, and I\'m not starting now."'
  },
  {
    id: 'higgins',
    name: 'Constable Higgins',
    title: 'Furious Bobby',
    kind: 'character',
    tier: 'basic',
    cost: 3,
    attack: 3,
    health: 8,
    trait: 'Hotheaded',
    image: '/characters/higgins.jpg',
    keywords: ['Guard'],
    flavorText: '"OI! DO YOU HAVE A LICENSE FOR THAT TURN ORDER?!"'
  },
  {
    id: 'miller',
    name: 'Sgt. Miller',
    title: 'Heavy Commando',
    kind: 'character',
    tier: 'basic',
    cost: 4,
    attack: 5,
    health: 7,
    trait: 'Hotheaded',
    image: '/characters/miller.jpg',
    keywords: [],
    flavorText: '"The drone is broken, so we\'re doing this the loud way."'
  },

  // ==========================================
  // SPECIALIST CHARACTERS (Extra Abilities!)
  // ==========================================
  {
    id: 'brenda',
    name: 'Brenda',
    title: 'Cloud Evangelist',
    kind: 'character',
    tier: 'specialist',
    cost: 2,
    attack: 2,
    health: 4,
    trait: 'Obsessive',
    image: '/characters/brenda.jpg',
    keywords: [],
    abilityTitle: '🎬 Entrance: Read Manual',
    abilityText: 'Draw 1 Gadget card from your deck (or add a Basic Patch Cord to hand).',
    flavorText: '"Have you migrated your defense strategy to the cloud yet?"',
    entranceEffect: 'draw_gadget'
  },
  {
    id: 'pai',
    name: 'Master Pai',
    title: 'Exhausted Sifu',
    kind: 'character',
    tier: 'specialist',
    cost: 3,
    attack: 3,
    health: 6,
    trait: 'Unbothered',
    image: '/characters/pai.jpg',
    keywords: ['Guard'],
    abilityTitle: '🔁 Crane Counter',
    abilityText: 'Guard (+2 Shield on Intercept). Whenever attacked, strikes the attacker back for 2 DMG.',
    flavorText: '"Strike first, strike hard, then take a twenty-minute nap."',
    passiveEffect: 'thorns_2'
  },
  {
    id: 'kenji',
    name: 'Kenji',
    title: 'Caffeine Ronin',
    kind: 'character',
    tier: 'specialist',
    cost: 3,
    attack: 4,
    health: 4,
    trait: 'Stressed',
    image: '/characters/kenji.jpg',
    keywords: ['Impatient'],
    abilityTitle: '⚡ Impatient Rush',
    abilityText: 'Can attack on the exact turn he is played!',
    flavorText: '"Seven espressos and a rusty katana."'
  },
  {
    id: 'server01',
    name: 'Server 01',
    title: 'The Overmind Rack',
    kind: 'contraption',
    tier: 'specialist',
    cost: 3,
    attack: 1,
    health: 7,
    trait: 'Obsessive',
    image: '/characters/server01.jpg',
    keywords: ['Contraption'],
    abilityTitle: '🔁 Packet Zap',
    abilityText: 'Whenever you play a Gadget, Server 01 zaps the lowest-HP enemy for 2 damage.',
    flavorText: '"ERROR 502: BAD GATEWAY TO YOUR BRAIN."',
    passiveEffect: 'server_zap_2'
  },
  {
    id: 'djinn',
    name: 'DJ-1NN',
    title: 'Lamp Automaton',
    kind: 'character',
    tier: 'specialist',
    cost: 4,
    attack: 4,
    health: 6,
    trait: 'Controlling',
    image: '/characters/djinn.jpg',
    keywords: [],
    abilityTitle: '🎬 Entrance: System Wish',
    abilityText: 'Reduces ALL enemies\' Attack by -2 this turn and heals your Player HP by +3.',
    flavorText: '"PHENOMENAL COSMIC COMPUTING POWER... itty-bitty brass housing."',
    entranceEffect: 'weaken_enemies_2'
  }
];

export const GADGET_CARDS: CardTemplate[] = [
  {
    id: 'gadget_firewall',
    name: 'Hardcover Manual',
    title: 'Basic Gadget',
    kind: 'gadget',
    tier: 'basic',
    cost: 1,
    attack: 0,
    health: 0,
    trait: 'Unbothered',
    icon: '📘',
    keywords: [],
    abilityTitle: 'Basic Shield',
    abilityText: 'Give your most threatened character +4 Shield.',
    flavorText: 'Thick enough to stop a truncheon.',
    gadgetEffect: 'shield_ally_4'
  },
  {
    id: 'gadget_espresso',
    name: 'Double Espresso',
    title: 'Basic Gadget',
    kind: 'gadget',
    tier: 'basic',
    cost: 1,
    attack: 0,
    health: 0,
    trait: 'Hotheaded',
    icon: '☕',
    keywords: [],
    abilityTitle: 'Basic Boost',
    abilityText: 'Give a ready character on your board +2 Attack this turn.',
    flavorText: 'Do not operate heavy machinery after drinking.',
    gadgetEffect: 'boost_ally_2'
  },
  {
    id: 'gadget_patch_cord',
    name: 'Tangled Patch Cord',
    title: 'Basic Gadget',
    kind: 'gadget',
    tier: 'basic',
    cost: 1,
    attack: 0,
    health: 0,
    trait: 'Obsessive',
    icon: '🔌',
    keywords: [],
    abilityTitle: 'Team Reroute',
    abilityText: 'Redirect ALL single-target enemies onto your healthiest character and give them +3 Shield.',
    flavorText: 'Wait, where does this end plug into?',
    gadgetEffect: 'reroute_to_tank'
  },
  {
    id: 'gadget_sticky_audit',
    name: 'Sticky-Note Blizzard',
    title: 'Specialist Gadget',
    kind: 'gadget',
    tier: 'specialist',
    cost: 1,
    attack: 0,
    health: 0,
    trait: 'Controlling',
    icon: '📋',
    keywords: [],
    abilityTitle: '⚡ Mass Audit',
    abilityText: 'Reduce ALL enemies\' Attack by -2 for this turn.',
    flavorText: 'Buried under yellow paper.',
    gadgetEffect: 'audit_weaken'
  },
  {
    id: 'gadget_emp',
    name: 'Short-Circuit Surge',
    title: 'Specialist Gadget',
    kind: 'gadget',
    tier: 'specialist',
    cost: 2,
    attack: 0,
    health: 0,
    trait: 'Stressed',
    icon: '💥',
    keywords: [],
    abilityTitle: '⚡ Board Blast',
    abilityText: 'Deal 3 damage to ALL enemies.',
    flavorText: 'Smells like burnt ozone.',
    gadgetEffect: 'emp_blast'
  },
  {
    id: 'gadget_overclock',
    name: 'Defibrillator Jumper',
    title: 'Specialist Gadget',
    kind: 'gadget',
    tier: 'specialist',
    cost: 1,
    attack: 0,
    health: 0,
    trait: 'Obsessive',
    icon: '⚡',
    keywords: [],
    abilityTitle: '⚡ Second Wind',
    abilityText: 'Ready a character on your board that already acted (or just entered play) so it can attack now!',
    flavorText: 'Clear!',
    gadgetEffect: 'ready_ally'
  }
];

export const ENCOUNTERS: EncounterDef[] = [
  {
    stage: 1,
    title: 'Stage 1: The Morning Standup',
    subtitle: 'Arthur and Barry are blocking the server room door—use Intercept to protect your Player HP!',
    enemies: [
      { id: 'arthur', hp: 6, atk: 3 },
      { id: 'barry', hp: 8, atk: 3 }
    ]
  },
  {
    stage: 2,
    title: 'Stage 2: The Compliance Patrol',
    subtitle: 'Constable Higgins shields Inspector Bloodshot while he lines up shots!',
    enemies: [
      { id: 'higgins', hp: 10, atk: 3, shield: 2 },
      { id: 'bloodshot', hp: 7, atk: 4 }
    ]
  },
  {
    stage: 3,
    title: 'Stage 3: Dojo of Inner Panic',
    subtitle: 'Three martial masters test your squad positioning and target priority.',
    enemies: [
      { id: 'swami', hp: 9, atk: 3 },
      { id: 'pai', hp: 9, atk: 3 },
      { id: 'kenji', hp: 7, atk: 5 }
    ]
  },
  {
    stage: 4,
    title: 'Stage 4: Cloud Migration Crisis',
    subtitle: 'Heavy firepower backed by mainframe shielding!',
    enemies: [
      { id: 'brenda', hp: 9, atk: 3 },
      { id: 'miller', hp: 12, atk: 5, shield: 2 },
      { id: 'arthur', hp: 8, atk: 3 }
    ]
  },
  {
    stage: 5,
    title: 'FINAL BOSS: The Singularity Audit',
    subtitle: 'Server 01, DJ-1NN, and Chief Higgins unleash full bureaucratic lockdown!',
    enemies: [
      { id: 'higgins', hp: 13, atk: 4, shield: 3 },
      { id: 'server01', hp: 15, atk: 4 },
      { id: 'djinn', hp: 14, atk: 5 }
    ]
  }
];

export const STARTER_DECK_IDS = [
  'arthur',
  'barry',
  'swami',
  'bloodshot',
  'higgins',
  'miller',
  'brenda',
  'gadget_firewall',
  'gadget_espresso',
  'gadget_patch_cord'
];

export function getCardById(id: string): CardTemplate {
  const found =
    CHARACTER_CARDS.find((c) => c.id === id) ||
    GADGET_CARDS.find((c) => c.id === id);
  if (!found) {
    return CHARACTER_CARDS[0];
  }
  return found;
}
