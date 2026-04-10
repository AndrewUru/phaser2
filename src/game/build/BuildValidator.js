import { BUILD_LIMITS } from './buildConstants.js';
import {
  areConnectorSidesCompatible,
  getConnectedPlacementIds,
  getPlacementNeighborContacts,
  getPlacementCells,
  createCellKey
} from './GridPlacementService.js';
import { getPartDefinition } from './partsCatalog.js';

export class BuildValidator {
  static validate(placements, stats) {
    const issues = [];

    if (placements.length === 0) {
      issues.push({
        severity: 'blocker',
        message: 'Place a capsule to begin the rocket.'
      });

      return this.#buildResult(issues);
    }

    const capsulePlacements = placements.filter((placement) => placement.partId === 'capsule');
    const thrustPlacements = placements.filter(
      (placement) => getPartDefinition(placement.partId).thrust > 0
    );

    if (capsulePlacements.length !== 1) {
      issues.push({
        severity: 'blocker',
        message: 'Exactly one capsule is required.'
      });
    }

    if (thrustPlacements.length === 0) {
      issues.push({
        severity: 'blocker',
        message: 'Add at least one engine or side booster for launch thrust.'
      });
    }

    const seenCells = new Set();
    placements.forEach((placement) => {
      const definition = getPartDefinition(placement.partId);
      const contacts = getPlacementNeighborContacts(placement, placements, {
        ignorePlacementId: placement.id
      });
      const compatibleContacts = contacts.filter((contact) =>
        areConnectorSidesCompatible(definition, contact.side, getPartDefinition(contact.neighbor.partId))
      );

      getPlacementCells(placement).forEach((cell) => {
        const cellKey = createCellKey(cell.x, cell.y);
        if (seenCells.has(cellKey)) {
          issues.push({
            severity: 'blocker',
            message: 'Two modules are overlapping.'
          });
        }

        seenCells.add(cellKey);
      });

      const incompatibleContact = contacts.find(
        (contact) =>
          !areConnectorSidesCompatible(definition, contact.side, getPartDefinition(contact.neighbor.partId))
      );

      if (incompatibleContact) {
        issues.push({
          severity: 'blocker',
          message: `${definition.name} is touching an incompatible attachment edge.`
        });
      }

      if (placement.partId === 'capsule' && compatibleContacts.some((contact) => contact.side === 'top')) {
        issues.push({
          severity: 'blocker',
          message: 'The capsule must remain at the top of the vehicle.'
        });
      }

      if (placement.partId === 'engine') {
        if (!compatibleContacts.some((contact) => contact.side === 'top')) {
          issues.push({
            severity: 'blocker',
            message: 'Every engine must attach beneath a stack component.'
          });
        }

        if (compatibleContacts.some((contact) => contact.side === 'bottom')) {
          issues.push({
            severity: 'blocker',
            message: 'Engine exhaust must remain clear below the nozzle.'
          });
        }
      }

      if (placement.partId === 'decoupler') {
        if (!compatibleContacts.some((contact) => contact.side === 'top')) {
          issues.push({
            severity: 'blocker',
            message: 'A decoupler needs a stage attached above it.'
          });
        }

        if (!compatibleContacts.some((contact) => contact.side === 'bottom')) {
          issues.push({
            severity: 'blocker',
            message: 'A decoupler needs a stage attached below it.'
          });
        }
      }

      if (placement.partId === 'side_booster' && !compatibleContacts.some((contact) => ['left', 'right'].includes(contact.side))) {
        issues.push({
          severity: 'blocker',
          message: 'Side boosters must attach to the flank of the core stack.'
        });
      }
    });

    if (capsulePlacements.length === 1) {
      const adjacency = getConnectedPlacementIds(placements);
      const visited = new Set();
      const queue = [capsulePlacements[0].id];

      while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) {
          continue;
        }

        visited.add(current);
        adjacency.get(current)?.forEach((neighborId) => {
          if (!visited.has(neighborId)) {
            queue.push(neighborId);
          }
        });
      }

      if (visited.size !== placements.length) {
        issues.push({
          severity: 'blocker',
          message: 'Every placed module must connect back to the capsule.'
        });
      }
    }

    if (stats.totalFuel <= 0) {
      issues.push({
        severity: 'blocker',
        message: 'The rocket needs fuel before it can launch.'
      });
    }

    if (stats.thrustToWeight < BUILD_LIMITS.minimumTwr) {
      issues.push({
        severity: 'blocker',
        message: 'Total thrust is too low for liftoff.'
      });
    }

    if (stats.stabilityScore < BUILD_LIMITS.targetStability) {
      issues.push({
        severity: 'warning',
        message: 'Stability is low. Expect a harder ascent.'
      });
    }

    return this.#buildResult(issues);
  }

  static #buildResult(issues) {
    const blockers = issues.filter((issue) => issue.severity === 'blocker');
    const warnings = issues.filter((issue) => issue.severity === 'warning');

    return {
      isValid: blockers.length === 0,
      issues,
      blockers,
      warnings
    };
  }
}
