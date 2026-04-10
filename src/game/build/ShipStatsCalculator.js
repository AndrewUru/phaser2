import { BUILD_LIMITS } from './buildConstants.js';
import { getPartDefinition } from './partsCatalog.js';

export class ShipStatsCalculator {
  static calculate(placements) {
    if (placements.length === 0) {
      return {
        totalMass: 0,
        totalThrust: 0,
        totalFuel: 0,
        centerOfMass: { x: 0, y: 0 },
        dimensions: {
          minX: 0,
          maxX: 0,
          minY: 0,
          maxY: 0,
          width: 0,
          height: 0
        },
        stabilityScore: 0,
        thrustToWeight: 0
      };
    }

    let totalMass = 0;
    let totalThrust = 0;
    let totalFuel = 0;
    let weightedX = 0;
    let weightedY = 0;
    let thrustWeightedX = 0;
    let thrustWeightTotal = 0;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let leftMass = 0;
    let rightMass = 0;

    placements.forEach((placement) => {
      const definition = getPartDefinition(placement.partId);
      const centerX = placement.origin.x + definition.size.width * 0.5 - 0.5;
      const centerY = placement.origin.y + definition.size.height * 0.5 - 0.5;

      totalMass += definition.mass;
      totalThrust += definition.thrust;
      totalFuel += definition.fuel;
      weightedX += centerX * definition.mass;
      weightedY += centerY * definition.mass;

      if (definition.thrust > 0) {
        thrustWeightedX += centerX * definition.thrust;
        thrustWeightTotal += definition.thrust;
      }

      if (centerX < 0) {
        leftMass += definition.mass;
      } else if (centerX > 0) {
        rightMass += definition.mass;
      }

      minX = Math.min(minX, placement.origin.x);
      maxX = Math.max(maxX, placement.origin.x + definition.size.width - 1);
      minY = Math.min(minY, placement.origin.y);
      maxY = Math.max(maxY, placement.origin.y + definition.size.height - 1);
    });

    const centerOfMass = {
      x: totalMass > 0 ? weightedX / totalMass : 0,
      y: totalMass > 0 ? weightedY / totalMass : 0
    };

    const dimensions = {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };

    const thrustCenterX = thrustWeightTotal > 0 ? thrustWeightedX / thrustWeightTotal : 0;
    const lateralPenalty = Math.abs(centerOfMass.x) * 22;
    const thrustPenalty = Math.abs(thrustCenterX - centerOfMass.x) * 18;
    const symmetryPenalty = totalMass > 0 ? (Math.abs(leftMass - rightMass) / totalMass) * 24 : 0;
    const verticalRatio =
      dimensions.height > 0 ? (centerOfMass.y - dimensions.minY) / dimensions.height : 0;
    const verticalBonus = verticalRatio * 28;
    const widthBonus = Math.min(10, Math.max(0, dimensions.width - 1) * 4);

    const stabilityScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          56 + verticalBonus + widthBonus - lateralPenalty - thrustPenalty - symmetryPenalty
        )
      )
    );

    const thrustToWeight =
      totalMass > 0 ? totalThrust / (totalMass * BUILD_LIMITS.gravityFactor) : 0;

    return {
      totalMass,
      totalThrust,
      totalFuel,
      centerOfMass,
      dimensions,
      stabilityScore,
      thrustToWeight
    };
  }
}
