export const DEFAULT_MISSION_ID = 'orbital-hop';

export const MISSION_DEFINITIONS = {
  'orbital-hop': {
    id: 'orbital-hop',
    title: 'Mission: Orbital Hop',
    brief:
      'Assemble a launch-worthy rocket, reach target altitude, and keep enough control to avoid tumbling or crashing.',
    targetAltitude: 2000,
    successLabel: 'Reach target altitude',
    hints: [
      'Start with a capsule, fuel tank, and engine.',
      'Add a decoupler for a cleaner staged ascent.',
      'Throttle up, steer gently, and separate only after burnout.'
    ]
  }
};

export function getMissionDefinition(missionId = DEFAULT_MISSION_ID) {
  return MISSION_DEFINITIONS[missionId] ?? MISSION_DEFINITIONS[DEFAULT_MISSION_ID];
}
