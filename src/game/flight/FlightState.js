import { FLIGHT_CONSTANTS } from "./FlightConstants.js";
import { StagePlanner } from "./StagePlanner.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getLaunchStats(snapshot) {
  return snapshot?.stats ?? snapshot?.totals ?? null;
}

function cloneStages(snapshot) {
  const stages = snapshot?.stages?.length
    ? snapshot.stages
    : StagePlanner.planStages(snapshot?.parts ?? []);

  return stages.map((stage) => ({
    ...structuredClone(stage),
    remainingFuel: stage.fuel,
    detached: false,
  }));
}

function getAttachedStages(state) {
  return state.stages.filter(
    (stage, index) => !stage.detached && index >= state.currentStageIndex,
  );
}

function getAttachedPartIds(attachedStages) {
  return attachedStages.flatMap((stage) => stage.partIds);
}

export function refreshFlightStageContext(state) {
  const attachedStages = getAttachedStages(state);
  const activeStage = attachedStages[0] ?? null;
  const totalFuelRemaining = attachedStages.reduce(
    (total, stage) => total + stage.remainingFuel,
    0,
  );
  const attachedDryMass = attachedStages.reduce(
    (total, stage) => total + stage.dryMass,
    0,
  );
  const attachedFuelMass = totalFuelRemaining * FLIGHT_CONSTANTS.fuelMassFactor;
  const currentMass = Math.max(1.1, attachedDryMass + attachedFuelMass);

  state.activePartIds = getAttachedPartIds(attachedStages);
  state.activeStage = activeStage;
  state.attachedStages = attachedStages.map((stage) => stage.id);
  state.fuelRemaining = totalFuelRemaining;
  state.totalFuelCapacity = attachedStages.reduce(
    (total, stage) => total + stage.fuel,
    0,
  );
  state.activeStageFuelRemaining = activeStage?.remainingFuel ?? 0;
  state.activeStageThrust = activeStage?.thrust ?? 0;
  state.currentMass = currentMass;
  state.stageReady = Boolean(
    activeStage &&
    activeStage.remainingFuel <= 0 &&
    state.currentStageIndex < state.stages.length - 1,
  );
  state.currentTwr =
    currentMass > 0
      ? (state.activeStageThrust * FLIGHT_CONSTANTS.thrustMultiplier) /
        (currentMass * FLIGHT_CONSTANTS.gravity)
      : 0;

  return state;
}

export function createFlightStateFromSnapshot(snapshot) {
  const stats = getLaunchStats(snapshot);

  if (!snapshot || !stats) {
    return null;
  }

  const stabilityScore = clamp(
    stats.stability ?? stats.stabilityScore ?? 50,
    0,
    100,
  );
  const stages = cloneStages(snapshot);

  const state = {
    payloadVersion: snapshot.version ?? 1,
    parts: structuredClone(snapshot.parts ?? []),
    stages,
    currentStageIndex: 0,
    stagesUsed: stages.length > 0 ? 1 : 0,
    stageSeparationCount: 0,
    totalThrust: Math.max(0, stats.thrust ?? 0),
    targetAltitude: snapshot.targetAltitude ?? FLIGHT_CONSTANTS.targetAltitude,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    angle: 0,
    angularVelocity: 0,
    fuelRemaining: Math.max(0, stats.fuel ?? 0),
    totalFuelCapacity: Math.max(0, stats.fuel ?? 0),
    activeStageFuelRemaining: 0,
    activeStageThrust: 0,
    throttle: 0,
    thrustActive: false,
    stabilityFactor: stabilityScore / 100,
    stabilityScore,
    maxAltitude: 0,
    maxSpeed: 0,
    elapsedTime: 0,
    cameraAltitude: 0,
    currentMass: Math.max(1.5, stats.mass ?? 1.5),
    currentTwr: 0,
    status: "flying",
    resultCode: null,
    resultLabel: "",
    resultSummary: "",
    finalVelocity: { x: 0, y: 0 },
    finalAngle: 0,
    eventMessage: "Stage 1 ready",
    eventTimer: 1.6,
    tiltExposure: 0,
    steeringIdleTime: 0,
    stageCooldown: 0,
    stageReady: false,
    activeStage: null,
    activePartIds: [],
    attachedStages: [],
    launchHold: true,
    liftoffTime: -1,
    horizontalVelocity: 0,
    orbitalVelocityRequired: 0,
    isOrbitalVelocityAchieved: false,
    orbitalStable: false,
    timeInStableOrbit: 0,
  };

  return refreshFlightStageContext(state);
}
