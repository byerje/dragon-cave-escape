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
const questEl     = document.getElementById("quest");
const storyEl     = document.getElementById("story");
const choicesEl   = document.getElementById("choices");
const bestScoreEl = document.getElementById("best-score");
const restartBtn  = document.getElementById("restart-button");
const mapButton   = document.getElementById("map-button");
const mapOverlay  = document.getElementById("map-overlay");
const mapGridEl   = document.getElementById("map-grid");
const mapCloseBtn = document.getElementById("map-close");
const speechButton = document.getElementById("speech-button");

// Whether the story text should be read aloud. Declared early because
// startGame() below runs render() immediately, which checks this flag.
let speechEnabled = false;


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
    currentRoom: "prologue",
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

// The village needs this much gold to survive the winter.
const RANSOM = 20;

// One short line telling the player what they are trying to achieve right now.
function currentObjective() {
  if (state.dragonSlain) {
    if (state.gold >= RANSOM) {
      return "Objective: Vharoth is dead and the gold is secure. Head for the light.";
    }
    return "Objective: Vharoth is dead, but Ashmere's gold still lies under the hoard. Take it before you leave.";
  }
  if (state.gold >= RANSOM) {
    return "Objective: You have the village's winter gold. Kill the dragon, or run for the light.";
  }
  if (has("Sword")) {
    return "Objective: You hold Ashmere's old blade. Slay Vharoth, or take back " + RANSOM + " gold.";
  }
  return "Objective: Slay the dragon Vharoth, or recover at least " + RANSOM + " gold for Ashmere.";
}

const rooms = {

  /* ---------- PROLOGUE ---------- */
  prologue: {
    text: function () {
      return [
        "Three nights ago the dragon Vharoth came down on the village of Ashmere.",
        "It did not eat anyone. It did something worse: it took the winter stores - every coin the village had saved to buy grain - and dragged them up the mountain. Without that gold, Ashmere starves before spring.",
        "The village had one old sword, kept above the hearth. The blacksmith carried it up the mountain first. He did not come back.",
        "So you went. You climbed the scree, crawled into the dragon's cave, and something struck you from behind in the dark.",
        "Now you are awake, and there are only two ways to end this: leave with the gold, or leave with the dragon dead."
      ];
    },
    choices: function () {
      return [
        { label: "Open your eyes", action: function () { goTo("entrance"); } }
      ];
    }
  },

  /* ---------- CAVE ENTRANCE ---------- */
  entrance: {
    text: function () {
      return [
        "You wake up on cold stone at the mouth of a cave. Your head aches and your pack is gone - all but a single torch.",
        "A distant roar echoes through the tunnel. Vharoth is somewhere below you, sleeping on Ashmere's gold.",
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
          : "The blacksmith of Ashmere lies against the pedestal, long past helping. The old sword is still in his hand, unbloodied - he never got close enough to swing it."
      ];
    },
    choices: function () {
      const list = [];

      if (!has("Sword")) {
        list.push({
          label: "Take the sword",
          action: function () {
            addItem("Sword");
            playSound("sword");
            say("The blade is lighter than it looks. You promise the blacksmith you will use it better than he could.", "msg-good");
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
          state.stoleGold
            ? "Ashmere's coin chests are already stacked at your feet."
            : "Ashmere's coin chests still sit near the top of the pile, ready for the taking.",
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
        "Ashmere's coin chests sit near the top of the pile, their lids torn off.",
        "A tunnel on the far side leads toward daylight."
      ];
    },
    choices: function () {
      const list = [];

      if (state.dragonSlain) {
        if (!state.stoleGold) {
          list.push({
            label: "Loot Ashmere's gold from the hoard",
            action: function () {
              addGold(20);
              state.stoleGold = true;
              say("With Vharoth dead, you take your time counting out every last coin.", "msg-good");
              stay();
            }
          });
        }
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
          label: "Take back Ashmere's gold",
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
      const lines = [
        "Sunlight shines ahead, warm and impossibly bright after the dark.",
        "Far below, you can see the roofs of Ashmere."
      ];

      // The exit is only a full victory if the dragon is dead AND the gold is secured.
      if (state.dragonSlain && state.gold >= RANSOM) {
        lines.push("Vharoth will never come down that mountain again, and Ashmere's gold is on your back. You are done here.");
      } else if (state.dragonSlain) {
        lines.push("Vharoth is dead, but Ashmere's gold is still buried under its corpse. Leave now and the village still starves.");
      } else if (state.gold >= RANSOM) {
        lines.push("The gold is heavy in your arms - enough to feed the village. But Vharoth still breathes, and it knows the way back to Ashmere.");
      } else {
        lines.push("You have " + state.gold + " gold. Ashmere needs " + RANSOM + ". Walk out now and you walk home to a starving village.");
      }
      return lines;
    },
    choices: function () {
      const questDone = state.dragonSlain && state.gold >= RANSOM;

      const leaveLabel = questDone
        ? "Leave the cave"
        : "Leave the cave without finishing the job";

      const backLabel = state.dragonSlain
        ? "Go back for the gold"
        : (state.gold >= RANSOM ? "Go back and finish the dragon" : "Go back for the gold");

      return [
        { label: leaveLabel, action: function () { endGame("escape"); } },
        { label: backLabel, action: function () { goTo("dragonChamber"); } }
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
    endingLines = ["The dragon's flames consume you. Ashmere waits for a rescuer who never comes down the mountain."];
  } else if (kind === "eaten") {
    endingTitle = "Eaten";
    endingLines = ["The dragon devours you in a single, unhurried motion, then goes back to sleep on your village's gold."];
  } else {
    // The player escaped - now work out WHICH escape this was.
    // Order matters: the rarest ending is checked first.
    // Killing the dragon AND securing the gold are both required to truly win.
    if (state.dragonSlain && state.gold >= RANSOM && state.stoleGold) {
      endingTitle = "King of Dragons";
      endingLines = [
        "You walk into Ashmere with the winter gold on your back and Vharoth's blood on the blacksmith's blade.",
        "The village eats. The mountain is quiet. They will sing about this for a hundred years, and none of it will be exaggerated."
      ];
    } else if (state.dragonSlain && state.gold >= RANSOM) {
      endingTitle = "Dragon Slayer";
      endingLines = [
        "Vharoth is dead, and Ashmere's gold is safe in your pack. The village eats, and the mountain is quiet at last.",
        "You hand the old sword back to the blacksmith's widow."
      ];
    } else if (state.dragonSlain) {
      endingTitle = "Hollow Victory";
      endingLines = [
        "Vharoth is dead, but you left its gold buried under the corpse. Ashmere still needs " + (RANSOM - state.gold) + " more gold before the snow comes.",
        "You hand the old sword back to the blacksmith's widow. It does not fill the village's grain stores."
      ];
    } else if (state.gold >= RANSOM) {
      endingTitle = "Master Treasure Hunter";
      endingLines = [
        "You carry " + state.gold + " gold down the scree. Ashmere will buy grain and survive the winter.",
        "But Vharoth still lives, and on still nights the whole village watches the mountain."
      ];
    } else {
      endingTitle = "Empty Hands";
      endingLines = [
        "You escaped the Dragon Cave with your life, and nothing else.",
        "Ashmere needed " + RANSOM + " gold. You brought back " + state.gold + ". Nobody blames you out loud."
      ];
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
  // Mark wherever the player currently stands as discovered, for the map.
  state.visited[state.currentRoom] = true;
  if (!mapOverlay.hidden) renderMap();

  // --- Stats ---
  healthEl.textContent = "\u2764\uFE0F Health: " + state.health;
  goldEl.textContent = "\uD83E\uDE99 Gold: " + state.gold;
  inventoryEl.textContent = "\uD83C\uDF92 Inventory: " + state.inventory.join(", ");
  bestScoreEl.textContent = "Best gold: " + getBestGold();

  // --- Objective (hidden during the prologue and the endings) ---
  if (state.gameOver || state.currentRoom === "prologue") {
    questEl.style.display = "none";
  } else {
    questEl.style.display = "block";
    questEl.textContent = currentObjective();
  }

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

  // Read the freshly rendered story text aloud, if the player asked for it.
  speakStory();
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


/* ------------------------------------------------------------
   11. MAP
   ------------------------------------------------------------
   A small overlay showing every room the player has discovered.
   The prologue is not part of the cave, so it has no map node.
   ------------------------------------------------------------ */
const MAP_ROOMS = {
  entrance:      { label: "Cave Entrance",      area: "entrance" },
  leftTunnel:    { label: "Left Tunnel",         area: "left" },
  armory:        { label: "Abandoned Armory",    area: "armory" },
  rightTunnel:   { label: "Right Tunnel",        area: "right" },
  river:         { label: "Underground River",   area: "river" },
  dragonChamber: { label: "Dragon's Lair",       area: "dragon" },
  escapeExit:    { label: "Cave Exit",           area: "exit" }
};

function renderMap() {
  mapGridEl.innerHTML = "";

  Object.keys(MAP_ROOMS).forEach(function (roomId) {
    const info = MAP_ROOMS[roomId];
    const discovered = !!state.visited[roomId];
    const isCurrent = discovered && roomId === state.currentRoom && !state.gameOver;

    const node = document.createElement("div");
    node.className = "map-node" + (discovered ? " discovered" : "") + (isCurrent ? " current" : "");
    node.style.gridArea = info.area;
    node.textContent = discovered ? info.label + (isCurrent ? " (you)" : "") : "???";
    mapGridEl.appendChild(node);
  });
}

function openMap() {
  renderMap();
  mapOverlay.hidden = false;
}

function closeMap() {
  mapOverlay.hidden = true;
}

mapButton.addEventListener("click", openMap);
mapCloseBtn.addEventListener("click", closeMap);

// Clicking the dark backdrop (but not the panel itself) closes the map.
mapOverlay.addEventListener("click", function (event) {
  if (event.target === mapOverlay) closeMap();
});

// The M key toggles the map; Escape always closes it.
document.addEventListener("keydown", function (event) {
  if (event.key === "m" || event.key === "M") {
    mapOverlay.hidden ? openMap() : closeMap();
  } else if (event.key === "Escape" && !mapOverlay.hidden) {
    closeMap();
  } else if (event.key === "r" || event.key === "R") {
    toggleSpeech();
  }
});


/* ------------------------------------------------------------
   12. READ ALOUD (TEXT-TO-SPEECH)
   ------------------------------------------------------------
   Uses the browser's built-in Web Speech API, so no server, API
   key, or network call is needed - the voice runs on your device.
   ------------------------------------------------------------ */
function speechSupported() {
  return "speechSynthesis" in window;
}

function updateSpeechButtonLabel() {
  if (!speechSupported()) {
    speechButton.textContent = "Read Aloud: Unsupported";
    speechButton.disabled = true;
    return;
  }
  speechButton.textContent = "Read Aloud: " + (speechEnabled ? "On" : "Off") + " (R)";
}

function toggleSpeech() {
  if (!speechSupported()) return;

  speechEnabled = !speechEnabled;
  updateSpeechButtonLabel();

  if (!speechEnabled) {
    window.speechSynthesis.cancel();
  } else {
    speakStory();
  }
}

// Reads whatever is currently displayed in the story panel.
function speakStory() {
  if (!speechEnabled || !speechSupported()) return;

  window.speechSynthesis.cancel();

  const text = storyEl.textContent.trim();
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

speechButton.addEventListener("click", toggleSpeech);
updateSpeechButtonLabel();
