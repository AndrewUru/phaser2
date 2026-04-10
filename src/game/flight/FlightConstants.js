export const DEFAULT_FLIGHT_CONSTANTS = {
  gravity: 12,
  atmosphereHeight: 2800,
  minAirDensity: 0.18,
  dragLinear: 0.045,
  dragQuadratic: 0.0024,
  thrustMultiplier: 1.45,
  thrustRampUpRate: 2.4,
  thrustRampDownRate: 3.1,
  fuelConsumptionRate: 6.2,
  fuelMassFactor: 0.008,
  rotationAcceleration: 1.85,
  maxAngularSpeed: 1.35,
  angularDamping: 2.1,
  steeringAssist: 0.9,
  autoLevelStrength: 1.15,
  stabilityInfluence: 0.78,
  stabilityRecoveryDelay: 0.08,
  tiltWarningDegrees: 42,
  maxTiltDegrees: 74,
  tiltFailureAltitude: 120,
  tiltFailureDuration: 1.1,
  tiltControlPenalty: 0.32,
  targetAltitude: 2000,
  cameraFollowStartAltitude: 120,
  cameraFollowLookahead: 240,
  cameraVelocityLookahead: 0.9,
  cameraFollowSpeed: 3.2,
  worldPixelsPerUnit: 0.22,
  touchdownAltitude: -12,
  crashVerticalSpeed: -18,
  crashHorizontalSpeed: 14,
  crashTiltDegrees: 28,
  stageSeparationImpulse: 6,
  minimumStageGapTime: 0.22
};

export const FLIGHT_CONSTANTS = {
  ...DEFAULT_FLIGHT_CONSTANTS
};

export function resetFlightTuningToDefaults() {
  Object.keys(DEFAULT_FLIGHT_CONSTANTS).forEach((key) => {
    FLIGHT_CONSTANTS[key] = DEFAULT_FLIGHT_CONSTANTS[key];
  });

  return FLIGHT_CONSTANTS;
}

if (typeof globalThis !== 'undefined') {
  globalThis.__rocketFlightTuning = FLIGHT_CONSTANTS;
}

export const FLIGHT_RESULT_CODES = {
  SUCCESS: 'success',
  OUT_OF_FUEL: 'out_of_fuel',
  EXCESSIVE_TILT: 'excessive_tilt',
  IMPACT: 'impact'
};
