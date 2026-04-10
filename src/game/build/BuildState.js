import { evaluatePlacement } from './GridPlacementService.js';
import { getPartDefinition } from './partsCatalog.js';

function getInitialCounter(placements) {
  const ids = placements
    .map((placement) => Number.parseInt(String(placement.id).replace('part-', ''), 10))
    .filter((value) => Number.isFinite(value));

  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

export class BuildState {
  constructor(initialPlacements = []) {
    this.placements = structuredClone(initialPlacements);
    this.selectedPlacementId = null;
    this.nextPlacementIndex = getInitialCounter(this.placements);
  }

  getPlacedParts() {
    return this.placements.map((placement) => structuredClone(placement));
  }

  setPlacements(nextPlacements) {
    this.placements = structuredClone(nextPlacements);
    this.selectedPlacementId = null;
    this.nextPlacementIndex = getInitialCounter(this.placements);
  }

  getSelectedPlacementId() {
    return this.selectedPlacementId;
  }

  getSelectedPlacement() {
    return this.placements.find((placement) => placement.id === this.selectedPlacementId) ?? null;
  }

  getPlacementById(placementId) {
    return this.placements.find((placement) => placement.id === placementId) ?? null;
  }

  setSelectedPlacement(placementId) {
    this.selectedPlacementId = this.getPlacementById(placementId) ? placementId : null;
  }

  clearSelection() {
    this.selectedPlacementId = null;
  }

  canPlacePart(partId, origin, options = {}) {
    return evaluatePlacement(partId, origin, this.placements, options);
  }

  addPart(partId, origin) {
    const definition = getPartDefinition(partId);
    if (!definition) {
      return { success: false, reason: 'Unknown part.' };
    }

    const evaluation = this.canPlacePart(partId, origin);
    if (!evaluation.valid) {
      return { success: false, reason: evaluation.reason };
    }

    const placement = {
      id: `part-${this.nextPlacementIndex}`,
      partId,
      origin: structuredClone(origin)
    };

    this.nextPlacementIndex += 1;
    this.placements.push(placement);
    this.selectedPlacementId = placement.id;

    return {
      success: true,
      placement: structuredClone(placement)
    };
  }

  removePlacement(placementId) {
    const beforeCount = this.placements.length;
    this.placements = this.placements.filter((placement) => placement.id !== placementId);

    if (this.selectedPlacementId === placementId) {
      this.selectedPlacementId = null;
    }

    return beforeCount !== this.placements.length;
  }

  removeSelectedPlacement() {
    if (!this.selectedPlacementId) {
      return false;
    }

    return this.removePlacement(this.selectedPlacementId);
  }

  clear() {
    this.placements = [];
    this.selectedPlacementId = null;
  }

  movePlacement(placementId, origin) {
    const placement = this.getPlacementById(placementId);
    if (!placement) {
      return { success: false, reason: 'Unknown placement.' };
    }

    const evaluation = this.canPlacePart(placement.partId, origin, {
      ignorePlacementId: placementId
    });

    if (!evaluation.valid) {
      return { success: false, reason: evaluation.reason };
    }

    placement.origin = structuredClone(origin);
    this.selectedPlacementId = placementId;

    return {
      success: true,
      placement: structuredClone(placement)
    };
  }
}
