import { getMissionDefinition } from './MissionDefinitions.js';

export function evaluateMission(result, missionId) {
  const mission = getMissionDefinition(missionId);
  const reachedTarget = (result?.maxAltitude ?? 0) >= mission.targetAltitude;
  const success = Boolean(result?.success && reachedTarget);

  return {
    mission,
    success,
    reachedTarget,
    targetAltitude: mission.targetAltitude,
    title: mission.title,
    outcomeText: success ? 'Mission Success' : 'Mission Failed'
  };
}
