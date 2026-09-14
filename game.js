/* ============================================================
   DRAGON CAVE ESCAPE
   ------------------------------------------------------------
   A beginner-friendly text adventure written in plain JavaScript.

   How the game works, in four steps:
     1. `state` holds everything about the current playthrough.
     2. `rooms` describes every location: its text and its choices.
     3. When you click a choice, its `action()` runs and changes state.
     4. `render()` redraws the screen from the state. Always.

   Nothing here needs a framework or a server - just open index.html.
   ============================================================ */


/* ------------------------------------------------------------
   1. GRAB THE PAGE ELEMENTS WE WILL UPDATE
   ------------------------------------------------------------ */
const healthEl    = document.getElementById("stat-health");
const goldEl      = document.getElementById("stat-gold");
const inventoryEl = document.getElementById("stat-inventory");
const storyEl     = document.getElementById("story");
const choicesEl   = document.getElementById("choices");
const bestScoreEl = document.getElementById("best-score");
const restartBtn  = document.getElementById("restart-button");


/* ------------------------------------------------------------
   2. GAME STATE
   ------------------------------------------------------------
   One plain object describing the whole playthrough.
   `newGame()` returns a fresh copy so restarting is easy.
   ------------------------------------------------------------ */
function newGame() {
  return {
    health: 10,
    gold: 0,
    inventory: ["Torch"],
    torchLit: false,        // needed to spot the hidden passage
    dragonAwake: false,     // once true, the dragon hunts you
    dragonSlain: false,     // true if you beat it in a fight
    stoleGold: false,       // true if you looted the hoard
    armor: [],              // each piece soaks 1 point of damage
    currentRoom: "entrance",
    visited: {},            // rooms already seen (so text can change)
    gameOver: false
  };
}

let state = newGame();

// Lines of text queued up by the last action (damage, rewards, warnings).
// They are printed above the room description, then cleared.
let messages = [];


/* ------------------------------------------------------------
   3. SMALL HELPER FUNCTIONS
   ------------------------------------------------------------ */

// Returns true roughly `percent` of the time. chance(70) === 70% likely.
function chance(percent) {
  return Math.random() * 100 < percent;
}

// Picks one random item out of an array.
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Queues a line of story text. `type` controls its colour.
function say(text, type) {
  messages.push({ text: text, type: type || "" });
}

// Does the player carry this item?
function has(item) {
  return state.inventory.includes(item);
}

// Adds an item once, and announces it.
function addItem(item) {
  if (!has(item)) {
    state.inventory.push(item);
    say("You now carry: " + item + ".", "msg-good");
  }
}

// Gold going up (or down) with a message.
function addGold(amount) {
  state.gold += amount;
  say("+" + amount + " Gold.", "msg-gold");
  playSound("coin");
}

// Damage, reduced by 1 for every piece of armor worn (never below 1).
function damage(amount) {
  const soaked = Math.min(state.armor.length, amount - 1);
  const final = amount - soaked;

  state.health -= final;
  say("-" + final + " Health" + (soaked > 0 ? " (armor absorbed " + soaked + ")" : "") + ".", "msg-bad");
  playSound("hurt");

  if (state.health <= 0) {
    state.health = 0;
    endGame("burned");
  }
}


/* ------------------------------------------------------------
   4. MOVING BETWEEN ROOMS
   ------------------------------------------------------------
   Every move through a doorway runs the dragon's "chase" check,
   but only after the dragon has woken up.
   ------------------------------------------------------------ */
function goTo(roomId) {
  state.currentRoom = roomId;

  if (state.dragonAwake && !state.dragonSlain && !state.gameOver) {
    say("You hear thunderous footsteps behind you.", "msg-alert");

    if (chance(10)) {
      endGame("eaten");
      return;
    }
    if (chance(25)) {
      say("The dragon breathes fire down the tunnel!", "msg-bad");
      damage(2);
      if (state.gameOver) return;
    }
  }

  state.visited[roomId] = true;
  render();
}

// Used when a choice changes something but keeps you in the same room.
function stay() {
  render();
}


/* ------------------------------------------------------------
   5. THE ROOMS
   ------------------------------------------------------------
   Each room has:
     text()    -> a string (or array of strings) describing the place
     choices() -> an array of { label, action } objects

   They are functions rather than plain text so the room can react
   to the current state (torch lit, dragon awake, sword taken...).
   ------------------------------------------------------------ */

// Armor pieces that can be found while exploring.
const ARMOR_PIECES = ["Rusty Helm", "Leather Bracers", "Dented Breastplate", "Iron Greaves"];

const rooms = {

  /* ---------- CAVE ENTRANCE ---------- */
  entrance: {
    text: function () {
      return [
        "You wake up on cold stone at the mouth of a cave. Your head aches and your pack is gone - all but a single torch.",
        "A distant roar echoes through the tunnel.",
        state.torchLit
          ? "Your torch burns steadily, pushing the shadows back."
          : "Two passages lead into the dark: one left, one right."
      ];
    },
    choices: function () {
      const list = [];

      if (!state.torchLit) {
        list.push({
          label: "Light Torch",
          action: function () {
            state.torchLit = true;
            say("The torch flares to life. You can see much further now.", "msg-good");
            stay();
          }
        });
      }

      list.push({ label: "Go Left", action: function () { goTo("leftTunnel"); } });
      list.push({ label: "Go Right", action: function () { goTo("rightTunnel"); } });
      return list;
    }
  },

  /* ---------- LEFT TUNNEL ---------- */
  leftTunnel: {
    text: function () {
      return [
        "A narrow tunnel disappears into darkness. Loose gravel crunches underfoot.",
        state.torchLit
          ? "By torchlight you notice a seam in the wall - possibly a sealed doorway."
          : "Without light, you cannot make out much beyond arm's reach."
      ];
    },
    choices: function () {
      const list = [
        {
          // A random event: the heart of the game's replayability.
          label: "Explore the tunnel",
          action: function () {
            const roll = Math.floor(Math.random() * 4);

            if (roll === 0) {
              say("You pry a handful of coins from a cracked skull's jaw.", "msg-gold");
              addGold(5);
            } else if (roll === 1) {
              say("A swarm of bats bursts from the ceiling and claws at your face!", "msg-bad");
              damage(2);
            } else if (roll === 2) {
              const piece = pickRandom(ARMOR_PIECES);
              if (state.armor.includes(piece)) {
                say("You find another piece of armor, but it is too rusted to wear.");
              } else {
                state.armor.push(piece);
                addItem(piece);
                say("Armor reduces the damage you take.", "msg-good");
              }
            } else {
              say("You poke around in the dust. Nothing but old bones.");
            }

            if (!state.gameOver) stay();
          }
        }
      ];

      // The armory can only be found with a lit torch.
      if (state.torchLit && !has("Sword")) {
        list.push({
          label: "Force open the sealed doorway",
          action: function () { goTo("armory"); }
        });
      }

      list.push({ label: "Return to the entrance", action: function () { goTo("entrance"); } });
      return list;
    }
  },

  /* ---------- ABANDONED ARMORY (hidden) ---------- */
  armory: {
    text: function () {
      return [
        "The stone slab grinds aside, revealing an abandoned armory.",
        has("Sword")
          ? "The pedestal at the centre of the room stands empty."
          : "An ancient sword rests on a stone pedestal, still bright despite the centuries."
      ];
    },
    choices: function () {
      const list = [];

      if (!has("Sword")) {
        list.push({
          label: "Take Sword",
          action: function () {
            addItem("Sword");
            playSound("sword");
            say("The blade is lighter than it looks. You feel braver already.", "msg-good");
            stay();
          }
        });
      }

      list.push({ label: "Return to the tunnel", action: function () { goTo("leftTunnel"); } });
      return list;
    }
  },

  /* ---------- RIGHT TUNNEL ---------- */
  rightTunnel: {
    text: function () {
      return [
        "The right-hand passage slopes downward. You hear running water somewhere ahead.",
        "The air here is cool and damp."
      ];
    },
    choices: function () {
      return [
        { label: "Follow the water", action: function () { goTo("river"); } },
        { label: "Return to the entrance", action: function () { goTo("entrance"); } }
      ];
    }
  },

  /* ---------- UNDERGROUND RIVER ---------- */
  river: {
    text: function () {
      return [
        "An underground river cuts across the cavern. A rotten rope bridge sways above it.",
        "Beyond the bridge, a warm orange glow flickers against the rock."
      ];
    },
    choices: function () {
      return [
        {
          label: "Cross the bridge",
          action: function () {
            if (chance(70)) {
              say("You edge across. The planks hold.", "msg-good");
              goTo("dragonChamber");
            } else {
              say("A plank snaps! You slam into the rocks below and haul yourself out.", "msg-bad");
              damage(2);
              if (!state.gameOver) stay();
            }
          }
        },
        {
          label: "Swim the river",
          action: function () {
            say("The freezing current drags you downstream.", "msg-bad");
            damage(1);
            if (state.gameOver) return;
            say("You wash up beside a crack of daylight - a shortcut!", "msg-good");
            goTo("escapeExit");
          }
        },
        { label: "Go back up the passage", action: function () { goTo("rightTunnel"); } }
      ];
    }
  },

  /* ---------- DRAGON CHAMBER ---------- */
  dragonChamber: {
    text: function () {
      if (state.dragonSlain) {
        return [
          "The dragon lies still upon its ruined hoard. Gold glitters in every direction.",
          "A tunnel on the far side leads toward daylight."
        ];
      }
      if (state.dragonAwake) {
        return [
          "The dragon is awake. Its eyes track you like a cat watching a mouse.",
          "Smoke curls from between its teeth."
        ];
      }
      return [
        "A giant sleeping dragon lies on a mountain of gold. Each breath rattles the stones.",
        "A tunnel on the far side leads toward daylight."
      ];
    },
    choices: function () {
      const list = [];

      if (state.dragonSlain) {
        list.push({ label: "Head for the daylight", action: function () { goTo("escapeExit"); } });
        return list;
      }

      list.push({
        label: "Sneak past the dragon",
        action: function () {
          if (chance(60)) {
            say("You slip past the dragon, one silent step at a time.", "msg-good");
            goTo("escapeExit");
          } else {
            say("A pebble skitters. The dragon awakens!", "msg-alert");
            state.dragonAwake = true;
            playSound("roar");
            stay();
          }
        }
      });

      if (!state.stoleGold) {
        list.push({
          label: "Steal gold from the hoard",
          action: function () {
            addGold(20);
            state.stoleGold = true;
            state.dragonAwake = true;
            say("Coins clatter across the stone. The dragon's eye snaps open!", "msg-alert");
            playSound("roar");
            stay();
          }
        });
      }

      list.push({
        label: "Attack the dragon",
        action: function () {
          if (!has("Sword")) {
            say("You foolishly charge the dragon barehanded.", "msg-bad");
            endGame("eaten");
            return;
          }
          state.dragonAwake = true;
          playSound("sword");

          if (chance(50)) {
            state.dragonSlain = true;
            say("You drive the ancient blade home. The dragon collapses with a final, shuddering roar.", "msg-good");
            stay();
          } else {
            say("The dragon knocks you aside like a doll and fire fills the chamber.", "msg-bad");
            endGame("burned");
          }
        }
      });

      list.push({ label: "Retreat to the river", action: function () { goTo("river"); } });
      return list;
    }
  },

  /* ---------- ESCAPE EXIT ---------- */
  escapeExit: {
    text: function () {
      return [
        "Sunlight shines ahead, warm and impossibly bright after the dark.",
        "Fresh air moves against your face. Freedom is a dozen steps away."
      ];
    },
    choices: function () {
      return [
        {
          label: "Leave the cave",
          action: function () { endGame("escape"); }
        },
        {
          label: "Turn back into the cave",
          action: function () { goTo("dragonChamber"); }
        }
      ];
    }
  }
};


/* ------------------------------------------------------------
   6. ENDINGS
   ------------------------------------------------------------
   `endGame` decides which ending text to show, saves the score,
   and flips `gameOver` so only the restart choice is offered.
   ------------------------------------------------------------ */
let endingTitle = "";
let endingLines = [];

function endGame(kind) {
  state.gameOver = true;

  if (kind === "burned") {
    endingTitle = "Burned";
    endingLines = ["The dragon's flames consume you. The cave keeps its treasure."];
  } else if (kind === "eaten") {
    endingTitle = "Eaten";
    endingLines = ["The dragon devours you in a single, unhurried motion."];
  } else {
    // The player escaped - now work out WHICH escape this was.
    // Order matters: the rarest ending is checked first.
    if (state.dragonSlain && state.stoleGold && has("Sword")) {
      endingTitle = "King of Dragons";
      endingLines = [
        "You walk out of the mountain with a dragon's hoard on your back and a dragon's blood on your blade.",
        "Songs will be sung about this day - and none of them will exaggerate."
      ];
    } else if (state.dragonSlain) {
      endingTitle = "Dragon Slayer";
      endingLines = ["The beast is dead. You carry the ancient sword into the sunlight, and the valley is safe."];
    } else if (state.gold >= 20) {
      endingTitle = "Master Treasure Hunter";
      endingLines = ["You escaped the Dragon Cave rich beyond reason. Somewhere behind you, something is very angry."];
    } else {
      endingTitle = "Escaped";
      endingLines = ["You escaped the Dragon Cave with your life. Sometimes that is the whole prize."];
    }
    endingLines.push("Health remaining: " + state.health);
    endingLines.push("Gold collected: " + state.gold);
    saveBestGold(state.gold);
  }

  render();
}


/* ------------------------------------------------------------
   7. BEST SCORE (saved in the browser with localStorage)
   ------------------------------------------------------------ */
const BEST_KEY = "dragonCaveEscape.bestGold";

function getBestGold() {
  const saved = Number(localStorage.getItem(BEST_KEY));
  return isNaN(saved) ? 0 : saved;
}

function saveBestGold(gold) {
  if (gold > getBestGold()) {
    localStorage.setItem(BEST_KEY, String(gold));
  }
}


/* ------------------------------------------------------------
   8. SOUND (tiny beeps made with the Web Audio API - no files)
   ------------------------------------------------------------ */
let audioCtx = null;

function playSound(kind) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Each sound is just a short tone at a different pitch and shape.
    const tones = {
      coin:  { freq: 980, type: "triangle", length: 0.12 },
      sword: { freq: 320, type: "sawtooth", length: 0.18 },
      hurt:  { freq: 140, type: "square",   length: 0.18 },
      roar:  { freq: 70,  type: "sawtooth", length: 0.6  }
    };
    const tone = tones[kind];
    if (!tone) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tone.type;
    osc.frequency.value = tone.freq;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + tone.length);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + tone.length);
  } catch (error) {
    // Audio is a bonus - if the browser blocks it, the game plays on.
  }
}


/* ------------------------------------------------------------
   9. RENDERING
   ------------------------------------------------------------
   Wipes the screen and rebuilds it from `state`. Called after
   every single action, so the display can never drift out of sync.
   ------------------------------------------------------------ */
function render() {
  // --- Stats ---
  healthEl.textContent = "\u2764\uFE0F Health: " + state.health;
  goldEl.textContent = "\uD83E\uDE99 Gold: " + state.gold;
  inventoryEl.textContent = "\uD83C\uDF92 Inventory: " + state.inventory.join(", ");
  bestScoreEl.textContent = "Best gold: " + getBestGold();

  // --- Story ---
  storyEl.innerHTML = "";

  // Queued event messages first...
  messages.forEach(function (msg) {
    storyEl.appendChild(makeParagraph(msg.text, msg.type));
  });
  messages = [];

  // ...then either the ending or the current room description.
  if (state.gameOver) {
    storyEl.appendChild(makeParagraph(endingTitle, "ending-title"));
    endingLines.forEach(function (line) {
      storyEl.appendChild(makeParagraph(line));
    });
  } else {
    const room = rooms[state.currentRoom];
    let lines = room.text();
    if (!Array.isArray(lines)) lines = [lines];
    lines.forEach(function (line) {
      storyEl.appendChild(makeParagraph(line));
    });
  }

  // --- Choices ---
  choicesEl.innerHTML = "";

  if (state.gameOver) {
    addChoiceButton("Play Again", startGame);
  } else {
    rooms[state.currentRoom].choices().forEach(function (choice) {
      addChoiceButton(choice.label, choice.action);
    });
  }
}

// Creates a <p> element with optional CSS class.
function makeParagraph(text, cssClass) {
  const p = document.createElement("p");
  p.textContent = text;
  if (cssClass) p.className = cssClass;
  return p;
}

// Creates a clickable choice button wired to its action.
function addChoiceButton(label, action) {
  const button = document.createElement("button");
  button.className = "choice-button";
  button.textContent = label;
  button.addEventListener("click", action);
  choicesEl.appendChild(button);
}


/* ------------------------------------------------------------
   10. START / RESTART
   ------------------------------------------------------------ */
function startGame() {
  state = newGame();
  messages = [];
  endingTitle = "";
  endingLines = [];
  render();
}

restartBtn.addEventListener("click", startGame);

// Kick everything off.
startGame();
