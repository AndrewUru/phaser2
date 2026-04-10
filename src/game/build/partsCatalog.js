export const PARTS_CATALOG = [
  {
    id: "capsule",
    name: "Capsule",
    description:
      "Command pod and crew module. Must sit at the top of the rocket.",
    profile: "capsule",
    stageHint: "core",
    size: { width: 1, height: 1 },
    mass: 2.4,
    thrust: 0,
    fuel: 0,
    connectors: {
      bottom: ["stack", "separator"],
    },
    paletteColor: 0x6ea0d7,
    accentColor: 0xcfe8ff,
  },
  {
    id: "fuel_tank",
    name: "Fuel Tank",
    description: "Core propellant storage for the main stack.",
    profile: "stack",
    stageHint: "core",
    size: { width: 1, height: 2 },
    mass: 3.6,
    thrust: 0,
    fuel: 120,
    connectors: {
      top: ["capsule", "stack", "separator"],
      bottom: ["stack", "separator", "engine"],
      left: ["radial"],
      right: ["radial"],
    },
    paletteColor: 0x4e7b5d,
    accentColor: 0x9fe1ad,
  },
  {
    id: "engine",
    name: "Engine",
    description: "Main engine for the core stack. Needs open exhaust below it.",
    profile: "engine",
    stageHint: "core",
    size: { width: 1, height: 1 },
    mass: 1.9,
    thrust: 200,
    fuel: 0,
    connectors: {
      top: ["stack", "separator"],
    },
    paletteColor: 0x796070,
    accentColor: 0xffbc83,
  },
  {
    id: "decoupler",
    name: "Decoupler",
    description: "Stage separator for future multi-phase rockets.",
    profile: "separator",
    stageHint: "core",
    size: { width: 1, height: 1 },
    mass: 0.6,
    thrust: 0,
    fuel: 0,
    connectors: {
      top: ["capsule", "stack", "separator"],
      bottom: ["stack", "separator", "engine"],
      left: ["radial"],
      right: ["radial"],
    },
    paletteColor: 0x87724d,
    accentColor: 0xffde99,
  },
  {
    id: "side_booster",
    name: "Side Booster",
    description: "Integrated radial booster with its own fuel and thrust.",
    profile: "radial",
    stageHint: "booster",
    size: { width: 1, height: 2 },
    mass: 2.8,
    thrust: 72,
    fuel: 80,
    connectors: {
      left: ["capsule", "stack", "separator"],
      right: ["capsule", "stack", "separator"],
    },
    paletteColor: 0x626ca7,
    accentColor: 0xc7d0ff,
  },
];

export const PARTS_BY_ID = Object.fromEntries(
  PARTS_CATALOG.map((part) => [part.id, part]),
);

export const PART_ASSET_KEYS = {
  capsule: 'part-capsule',
  fuel_tank: 'part-fuel-tank',
  engine: 'part-engine',
  decoupler: 'part-decoupler'
};

export function getPartDefinition(partId) {
  return PARTS_BY_ID[partId] ?? null;
}

export function getPartAssetKey(partId) {
  return PART_ASSET_KEYS[partId] ?? null;
}
