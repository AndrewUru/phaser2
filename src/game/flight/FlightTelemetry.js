import { DEFAULT_MISSION_ID } from '../mission/MissionDefinitions.js';
import { evaluateMission } from '../mission/MissionEvaluator.js';
import { calculateMissionScore } from '../mission/ScoreCalculator.js';

function radiansToDegrees(value) {
  return (value * 180) / Math.PI;
}

export function createFlightTelemetry(state) {
  const speed = Math.hypot(state.velocity.x, state.velocity.y);

  return {
    altitude: Math.max(0, state.position.y),
    velocity: {
      x: state.velocity.x,
      y: state.velocity.y,
      magnitude: speed
    },
    verticalVelocity: state.velocity.y,
    angle: state.angle,
    angleDegrees: radiansToDegrees(state.angle),
    angularVelocity: state.angularVelocity,
    fuelRemaining: state.fuelRemaining,
    activeStageFuelRemaining: state.activeStageFuelRemaining,
    thrustActive: state.thrustActive,
    throttle: state.throttle,
    maxAltitude: state.maxAltitude,
    maxSpeed: state.maxSpeed,
    elapsedTime: state.elapsedTime,
    currentMass: state.currentMass,
    currentTwr: state.currentTwr,
    stabilityValue: state.stabilityScore,
    currentStage: state.currentStageIndex + 1,
    stageCount: state.stages.length,
    stagesUsed: state.stagesUsed,
    activeStageId: state.activeStage?.id ?? null,
    activeStageThrust: state.activeStageThrust,
    status: state.status,
    resultCode: state.resultCode,
    resultLabel: state.resultLabel,
    stageReady: state.stageReady
  };
}

export function createMissionResult(state, telemetry, missionId = DEFAULT_MISSION_ID) {
  const baseResult = {
    success: state.status === 'success',
    code: state.resultCode,
    title: state.resultLabel,
    summary: state.resultSummary,
    reason: state.resultLabel,
    targetAltitude: state.targetAltitude,
    altitude: Math.max(0, state.position.y),
    maxAltitude: state.maxAltitude,
    maxSpeed: state.maxSpeed,
    elapsedTime: state.elapsedTime,
    fuelRemaining: state.fuelRemaining,
    stagesUsed: state.stagesUsed,
    stageCount: state.stages.length,
    finalVelocity: {
      x: state.velocity.x,
      y: state.velocity.y,
      magnitude: Math.hypot(state.velocity.x, state.velocity.y)
    },
    finalAngle: {
      radians: state.angle,
      degrees: radiansToDegrees(state.angle)
    },
    telemetry
  };

  const mission = evaluateMission(baseResult, missionId);
  const score = calculateMissionScore(baseResult, mission);

  return {
    ...baseResult,
    missionId: mission.mission.id,
    missionTitle: mission.title,
    missionBrief: mission.mission.brief,
    missionOutcome: mission.outcomeText,
    success: mission.success,
    score: score.total,
    scoreBreakdown: score.breakdown,
    title: mission.success ? 'Mission Success' : baseResult.title || 'Mission Failed'
  };
}
