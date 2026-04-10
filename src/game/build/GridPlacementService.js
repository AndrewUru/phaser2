import { BUILD_GRID, BUILD_LIMITS } from './buildConstants.js';
import { getPartDefinition } from './partsCatalog.js';

const OPPOSITE_SIDE = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left'
};

const SIDE_OFFSETS = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

export function createCellKey(x, y) {
  return `${x},${y}`;
}

export function getPlacementCells(partOrPlacement, maybeOrigin) {
  const definition = maybeOrigin ? partOrPlacement : getPartDefinition(partOrPlacement.partId);
  const origin = maybeOrigin ?? partOrPlacement.origin;

  if (!definition || !origin) {
    return [];
  }

  const cells = [];

  for (let y = 0; y < definition.size.height; y += 1) {
    for (let x = 0; x < definition.size.width; x += 1) {
      cells.push({
        x: origin.x + x,
        y: origin.y + y
      });
    }
  }

  return cells;
}

export function isPlacementWithinBounds(partOrPlacement, maybeOrigin) {
  return getPlacementCells(partOrPlacement, maybeOrigin).every(
    (cell) =>
      cell.x >= BUILD_GRID.minX &&
      cell.x <= BUILD_GRID.maxX &&
      cell.y >= BUILD_GRID.minY &&
      cell.y <= BUILD_GRID.maxY
  );
}

export function buildOccupancyMap(placements, options = {}) {
  const occupancy = new Map();
  const ignorePlacementId = options.ignorePlacementId ?? null;

  placements.forEach((placement) => {
    if (placement.id === ignorePlacementId) {
      return;
    }

    getPlacementCells(placement).forEach((cell) => {
      occupancy.set(createCellKey(cell.x, cell.y), placement);
    });
  });

  return occupancy;
}

export function getPlacementNeighborContacts(candidate, placements, options = {}) {
  const occupancy = buildOccupancyMap(placements, options);
  const contacts = [];
  const seen = new Set();

  getPlacementCells(candidate).forEach((cell) => {
    Object.entries(SIDE_OFFSETS).forEach(([side, offset]) => {
      const neighbor = occupancy.get(createCellKey(cell.x + offset.x, cell.y + offset.y));

      if (!neighbor) {
        return;
      }

      const key = `${cell.x},${cell.y}:${side}:${neighbor.id}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);

      contacts.push({
        cell,
        side,
        oppositeSide: OPPOSITE_SIDE[side],
        neighbor
      });
    });
  });

  return contacts;
}

export function areConnectorSidesCompatible(partDefinition, side, neighborDefinition) {
  const sideConnections = partDefinition.connectors?.[side] ?? [];
  const oppositeConnections = neighborDefinition.connectors?.[OPPOSITE_SIDE[side]] ?? [];

  return (
    sideConnections.includes(neighborDefinition.profile) &&
    oppositeConnections.includes(partDefinition.profile)
  );
}

export function evaluatePlacement(partId, origin, placements, options = {}) {
  const definition = getPartDefinition(partId);
  if (!definition) {
    return { valid: false, reason: 'Unknown part.', contacts: [] };
  }

  if (placements.length >= BUILD_LIMITS.maxParts) {
    return { valid: false, reason: 'Build limit reached.', contacts: [] };
  }

  if (!isPlacementWithinBounds(definition, origin)) {
    return { valid: false, reason: 'Placement is outside the hangar grid.', contacts: [] };
  }

  const placement = {
    id: options.ignorePlacementId ?? '__ghost__',
    partId,
    origin
  };

  const occupancy = buildOccupancyMap(placements, options);
  const overlap = getPlacementCells(placement).some((cell) =>
    occupancy.has(createCellKey(cell.x, cell.y))
  );

  if (overlap) {
    return { valid: false, reason: 'That slot is already occupied.', contacts: [] };
  }

  const capsuleCount = placements.filter((entry) => entry.partId === 'capsule').length;
  if (partId === 'capsule') {
    if (capsuleCount > 0 && options.ignorePlacementId == null) {
      return { valid: false, reason: 'Only one capsule can exist in the build.', contacts: [] };
    }

    if (placements.length > 0 && options.ignorePlacementId == null) {
      return { valid: false, reason: 'The capsule must start the vehicle.', contacts: [] };
    }
  }

  if (placements.length === 0 && partId !== 'capsule') {
    return { valid: false, reason: 'Start the rocket with a capsule.', contacts: [] };
  }

  const contacts = getPlacementNeighborContacts(placement, placements, options);
  const compatibleContacts = contacts.filter((contact) =>
    areConnectorSidesCompatible(definition, contact.side, getPartDefinition(contact.neighbor.partId))
  );
  const incompatibleContact = contacts.find(
    (contact) =>
      !areConnectorSidesCompatible(definition, contact.side, getPartDefinition(contact.neighbor.partId))
  );

  if (incompatibleContact) {
    return {
      valid: false,
      reason: 'Those modules cannot attach on that edge.',
      contacts
    };
  }

  if (placements.length > 0 && compatibleContacts.length === 0) {
    return {
      valid: false,
      reason: 'New modules must attach to the existing rocket.',
      contacts
    };
  }

  return {
    valid: true,
    reason: '',
    contacts: compatibleContacts
  };
}

export function getPlacementBounds(placement) {
  const definition = getPartDefinition(placement.partId);

  return {
    x: placement.origin.x,
    y: placement.origin.y,
    width: definition.size.width,
    height: definition.size.height
  };
}

export function getConnectedPlacementIds(placements) {
  const adjacency = new Map();

  placements.forEach((placement) => {
    adjacency.set(placement.id, new Set());
  });

  placements.forEach((placement) => {
    const definition = getPartDefinition(placement.partId);
    const contacts = getPlacementNeighborContacts(placement, placements, {
      ignorePlacementId: placement.id
    });

    contacts.forEach((contact) => {
      const neighborDefinition = getPartDefinition(contact.neighbor.partId);
      if (!areConnectorSidesCompatible(definition, contact.side, neighborDefinition)) {
        return;
      }

      adjacency.get(placement.id)?.add(contact.neighbor.id);
      adjacency.get(contact.neighbor.id)?.add(placement.id);
    });
  });

  return adjacency;
}
