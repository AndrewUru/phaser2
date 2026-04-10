export const FLIGHT_TEST_ROCKETS = {
  stableSingleStage: {
    id: 'stable-single-stage',
    label: 'Stable Starter',
    description: 'Capsule + tank + engine. Simple and forgiving for first launches.',
    placements: [
      { id: 'part-1', partId: 'capsule', origin: { x: 0, y: 0 } },
      { id: 'part-2', partId: 'fuel_tank', origin: { x: 0, y: 1 } },
      { id: 'part-3', partId: 'fuel_tank', origin: { x: 0, y: 3 } },
      { id: 'part-4', partId: 'engine', origin: { x: 0, y: 5 } }
    ]
  },
  unstableRocket: {
    id: 'unstable-rocket',
    label: 'Unstable Test',
    description: 'Off-balance test rocket for tilt and warning QA.',
    placements: [
      { id: 'part-1', partId: 'capsule', origin: { x: 0, y: 0 } },
      { id: 'part-2', partId: 'fuel_tank', origin: { x: 0, y: 1 } },
      { id: 'part-3', partId: 'fuel_tank', origin: { x: 0, y: 3 } },
      { id: 'part-4', partId: 'side_booster', origin: { x: 1, y: 2 } },
      { id: 'part-5', partId: 'engine', origin: { x: 0, y: 5 } }
    ]
  },
  stagedRocket: {
    id: 'staged-rocket',
    label: 'Two-Stage Test',
    description: 'Starter staged vehicle with a decoupler for separation tests.',
    placements: [
      { id: 'part-1', partId: 'capsule', origin: { x: 0, y: 0 } },
      { id: 'part-2', partId: 'fuel_tank', origin: { x: 0, y: 1 } },
      { id: 'part-3', partId: 'fuel_tank', origin: { x: 0, y: 3 } },
      { id: 'part-4', partId: 'decoupler', origin: { x: 0, y: 5 } },
      { id: 'part-5', partId: 'fuel_tank', origin: { x: 0, y: 6 } },
      { id: 'part-6', partId: 'engine', origin: { x: 0, y: 8 } }
    ]
  }
};

export function getFlightTestRocketList() {
  return Object.values(FLIGHT_TEST_ROCKETS);
}

export function getFlightTestRocket(id) {
  return (
    FLIGHT_TEST_ROCKETS[id] ??
    Object.values(FLIGHT_TEST_ROCKETS).find((rocket) => rocket.id === id) ??
    FLIGHT_TEST_ROCKETS.stableSingleStage
  );
}
