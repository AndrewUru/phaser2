import { BUILD_GRID } from './buildConstants.js';
import { getPartDefinition } from './partsCatalog.js';
import { StagePlanner } from '../flight/StagePlanner.js';

export function serializeBuildForLaunch(placements, stats, validation) {
  const sortedPlacements = [...placements].sort((a, b) => {
    if (a.origin.y === b.origin.y) {
      return a.origin.x - b.origin.x;
    }

    return a.origin.y - b.origin.y;
  });

  const parts = sortedPlacements.map((placement) => {
    const definition = getPartDefinition(placement.partId);

    return {
      id: placement.id,
      partId: placement.partId,
      name: definition.name,
      origin: {
        x: placement.origin.x,
        y: placement.origin.y
      },
      size: {
        width: definition.size.width,
        height: definition.size.height
      },
      profile: definition.profile,
      stageHint: definition.stageHint,
      stats: {
        mass: definition.mass,
        thrust: definition.thrust,
        fuel: definition.fuel
      }
    };
  });

  const stages = StagePlanner.planStages(parts);
  const separatorIds = stages.flatMap((stage) => stage.separatorIds);

  return {
    version: 2,
    builtAt: new Date().toISOString(),
    grid: {
      minX: BUILD_GRID.minX,
      maxX: BUILD_GRID.maxX,
      minY: BUILD_GRID.minY,
      maxY: BUILD_GRID.maxY
    },
    parts,
    stages,
    stats: {
      mass: stats.totalMass,
      thrust: stats.totalThrust,
      fuel: stats.totalFuel,
      stability: stats.stabilityScore,
      thrustToWeight: stats.thrustToWeight,
      centerOfMass: stats.centerOfMass
    },
    totals: {
      mass: stats.totalMass,
      thrust: stats.totalThrust,
      fuel: stats.totalFuel,
      centerOfMass: stats.centerOfMass,
      stabilityScore: stats.stabilityScore,
      thrustToWeight: stats.thrustToWeight
    },
    validation: {
      isValid: validation.isValid,
      blockerCount: validation.blockers.length,
      warningCount: validation.warnings.length
    },
    staging: {
      separatorIds,
      stageCount: stages.length
    }
  };
}
