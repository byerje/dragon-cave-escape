/* Additional narrative content kept separate from the game rules. */
const STORY_DETAILS = {
  prologue: [
    "The mountain wind presses against the cave mouth, carrying the smell of pine, smoke, and something older than either.",
    "Somewhere below, the stolen coins wait in the dark. Somewhere beyond them waits the choice that brought you here."
  ],
  entrance: [
    "The stone beneath your boots is scored with long marks, as though something enormous has been dragged through the passage.",
    "Every sound travels strangely here. A breath behind you might be your own, or it might be the cave listening."
  ],
  leftTunnel: [
    "The walls narrow until your shoulders nearly brush both sides. Old boot prints overlap in the dust, but none lead back out.",
    "A faint metallic smell hangs beneath the scent of wet stone. The tunnel may hold more than bones and rubble."
  ],
  armory: [
    "Dust lies thick over the room, undisturbed since the blacksmith made his final journey. The quiet feels less like peace than a held breath.",
    "A faded Ashmere crest is carved into the pedestal. Whoever built this place expected someone brave to return for the blade."
  ],
  rightTunnel: [
    "Water ticks steadily in the darkness, marking time with the patience of a clock. The sound grows louder with every step.",
    "Your torchlight catches pale mineral veins in the walls, glowing like a map whose destination has been rubbed away."
  ],
  river: [
    "The current carries leaves from somewhere above, proof that the mountain still has a way through this buried world.",
    "Across the water, the orange glow pulses against the ceiling. It is too warm to be sunlight and too steady to be firelight."
  ],
  dragonChamber: [
    "The hoard is not merely treasure. Broken crowns, merchant seals, and household keepsakes gleam among the coins, each one carrying a story stolen from the valleys below.",
    "The dragon's breathing makes the chamber tremble. Dust falls from the ceiling in tiny silver curtains, and the mountain seems to wait with you."
  ],
  escapeExit: [
    "The wind outside smells of rain and cedar. For the first time since entering the mountain, the world feels wide enough to hold a future.",
    "Below, Ashmere is only a scatter of rooftops and chimney smoke. From here, the village looks small, but the lives depending on you are not."
  ]
};

function additionalStory(roomId) {
  return STORY_DETAILS[roomId] || [];
}
