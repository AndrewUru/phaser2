import { FLIGHT_CONSTANTS } from './FlightConstants.js';

function getPartCenterY(part) {
  return part.origin.y + part.size.height * 0.5 - 0.5;
}

function getPartCenterX(part) {
  return part.origin.x + part.size.width * 0.5 - 0.5;
}

function getPartBottomY(part) {
  return part.origin.y + part.size.height - 1;
}

function sumStageStat(parts, key) {
  return parts.reduce((total, part) => total + (part.stats?.[key] ?? 0), 0);
}

function computeBounds(parts) {
  return {
    minX: Math.min(...parts.map((part) => part.origin.x)),
    maxX: Math.max(...parts.map((part) => part.origin.x + part.size.width - 1)),
    minY: Math.min(...parts.map((part) => part.origin.y)),
    maxY: Math.max(...parts.map((part) => part.origin.y + part.size.height - 1))
  };
}

export class StagePlanner {
  static planStages(parts = []) {
    if (!parts.length) {
      return [];
    }

    const separators = parts
      .filter((part) => part.partId === 'decoupler')
      .map((part) => ({
        id: part.id,
        centerY: getPartCenterY(part)
      }))
      .sort((a, b) => a.centerY - b.centerY);

    const stageLevels = new Map();

    parts.forEach((part) => {
      const partCenterY = getPartCenterY(part);
      const level = separators.filter((separator) => separator.centerY <= partCenterY).length;
      stageLevels.set(part.id, level);
    });

    const uniqueLevels = [...new Set(stageLevels.values())].sort((a, b) => b - a);
    const stageLevelToIndex = new Map(uniqueLevels.map((level, index) => [level, index]));

    const grouped = new Map();
    parts.forEach((part) => {
      const stageIndex = stageLevelToIndex.get(stageLevels.get(part.id));
      if (!grouped.has(stageIndex)) {
        grouped.set(stageIndex, []);
      }

      grouped.get(stageIndex).push(part);
    });

    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([stageIndex, stageParts], index, collection) => {
        const orderedParts = [...stageParts].sort((a, b) => {
          if (getPartBottomY(a) === getPartBottomY(b)) {
            return getPartCenterX(a) - getPartCenterX(b);
          }

          return getPartBottomY(b) - getPartBottomY(a);
        });
        const mass = sumStageStat(orderedParts, 'mass');
        const thrust = sumStageStat(orderedParts, 'thrust');
        const fuel = sumStageStat(orderedParts, 'fuel');
        const dryMass = Math.max(0.8, mass - fuel * FLIGHT_CONSTANTS.fuelMassFactor);
        const bounds = computeBounds(orderedParts);
        const separatorIds = orderedParts
          .filter((part) => part.partId === 'decoupler')
          .map((part) => part.id);

        return {
          id: `stage-${index + 1}`,
          number: index + 1,
          order: stageIndex,
          name: `Stage ${index + 1}`,
          partIds: orderedParts.map((part) => part.id),
          separatorIds,
          mass,
          dryMass,
          thrust,
          fuel,
          bounds,
          partCount: orderedParts.length,
          isFinalStage: index === collection.length - 1
        };
      });
  }
}
