export const tutorialHints = {
  menu: {
    title: 'Quick Start',
    lines: [
      'Build a simple stack: capsule, fuel tank, engine.',
      'Optional decouplers let you stage away empty sections.',
      'Reach target altitude without tumbling or crashing.'
    ]
  },
  build: {
    title: 'Hangar Tips',
    lines: [
      'Place a capsule first, then stack tanks and an engine below it.',
      'Use side boosters on the flank of a core tank or decoupler.',
      'If the grid glows green, the placement is valid.'
    ]
  },
  flight: {
    title: 'Flight Tips',
    lines: [
      'Hold thrust to ramp up smoothly.',
      'Steer gently. High tilt will build danger over time.',
      'Separate stages after burnout to restore thrust-to-weight.'
    ]
  }
};

export function getTutorialHint(key) {
  return tutorialHints[key] ?? tutorialHints.menu;
}
