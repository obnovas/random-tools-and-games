import type { SpecialistDefinition, SpecialistId } from "./types";

export const CHARACTERS: Record<SpecialistId, SpecialistDefinition> = {
  mara: {
    id: "mara",
    name: "Mara",
    role: "Market Caller",
    bio: "Mara can make a quiet corner feel like the place to be.",
    strength: "Signals reach farther and curious visitors linger longer.",
    limitation: "A crowd can form faster than a narrow path can clear it.",
    color: "#b84747",
    accent: "#f2c15c",
    speed: 0.95,
    ability: {
      name: "Gather Round",
      description: "Assign Mara to a signal or stall to increase its attraction radius.",
      toolBonuses: {
        bell: "+60% signal range; rings a little less often.",
        handcart: "Curious visitors value this cart more highly.",
      },
    },
  },
  pip: {
    id: "pip",
    name: "Pip",
    role: "Quick Porter",
    bio: "Pip knows every shortcut, and takes pride in keeping things moving.",
    strength: "Moves carts quickly and clears minor queues.",
    limitation: "Always favors the shortest visible route, even when it is crowded.",
    color: "#3f7f68",
    accent: "#d9e59d",
    speed: 1.25,
    ability: {
      name: "Keep It Moving",
      description: "Assign Pip to a route or cart to improve flow along it.",
      toolBonuses: {
        handcart: "Serves visitors faster.",
        signpost: "Frequently clears stalled visitors near this sign.",
      },
    },
  },
  orin: {
    id: "orin",
    name: "Orin",
    role: "Patient Joiner",
    bio: "Orin builds slowly, carefully, and rarely needs to build twice.",
    strength: "Reinforces structures and reduces their upkeep.",
    limitation: "Works slowly and dislikes being reassigned midway through a job.",
    color: "#5c668f",
    accent: "#e3b37a",
    speed: 0.78,
    ability: {
      name: "Built to Last",
      description: "Assign Orin to a crossing to increase its capacity and reliability.",
      toolBonuses: {
        footbridge: "Doubles safe traffic before the bridge needs recovery.",
        handcart: "Reduces service interruptions.",
      },
    },
  },
};

export const CHARACTER_ORDER: SpecialistId[] = ["mara", "pip", "orin"];
