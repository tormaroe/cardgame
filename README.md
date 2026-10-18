# ON THE EDGE — Tactical Personality Card Game

A single-player tactical roguelike card game built around an eclectic cast of stressed-out specialists, bureaucrats, warriors, and weirdos.

Combines an open squad board and escalating energy with telegraphed enemy intents and a **Personality Trait** system.

## Core Mechanics

* **Basic Foundation vs. ★ Specialist Cards:**
  * **Basic Characters** form the stat backbone of your squad (Energy Cost, Attack, Health, and a Personality Trait).
  * **★ Specialist Characters** trade raw stats for unique entrance or passive abilities.
* **One-Way Attacks & Telegraphed Enemy Intents:**
  * Your characters do not take automatic strike-back damage when attacking on your turn.
  * Every enemy telegraphs their exact next move (aiming at one of your characters, aiming directly at your Player HP, sweeping the board, or fortifying allies).
* **Universal Intercept & Guard:**
  * Any character on your board can use **🎯 Intercept Enemy Aim** once per turn (including on the turn they are played) to step in front of an enemy attack aimed at your Player HP or another ally.
  * Characters with **🛡️ Guard** automatically gain **+2 Shield** when intercepting.
* **5 Personality Traits:**
  * **💢 Hotheaded (*Bravado*):** Permanently gains `+1 ATK` whenever it lands a killing blow.
  * **🤓 Obsessive (*Overclock*):** Gains `+1 ATK` this turn whenever you play a Gadget.
  * **😰 Stressed (*Adrenaline*):** Gets `+2 ATK` while targeted by an enemy intent.
  * **🕵️ Controlling (*Red Tape*):** Attacks reduce the target enemy's Attack by `-1 ATK` this turn.
  * **🧘 Unbothered (*Poise*):** Gains `+2 Shield` at the end of your turn if it did not attack.
* **Browser-Only Persistence:**
  * Run state and lifetime stats are saved automatically in `localStorage`.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build static production bundle into dist/
npm run build
```
