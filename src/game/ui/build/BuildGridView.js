import Phaser from 'phaser';
import { BUILD_GRID } from '../../build/buildConstants.js';
import { getPartDefinition } from '../../build/partsCatalog.js';
import { drawPanel } from '../panel.js';

export class BuildGridView {
  constructor(scene) {
    this.scene = scene;
    this.rect = null;
    this.metrics = null;
    this.placements = [];
    this.selectionId = null;
    this.ghost = null;

    this.background = scene.add.graphics();
    this.grid = scene.add.graphics();
    this.placementsGraphics = scene.add.graphics();
    this.ghostGraphics = scene.add.graphics();
    this.headerText = scene.add.text(0, 0, 'Assembly Grid', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '24px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    this.headerText.setOrigin(0, 0);

    this.helperText = scene.add.text(0, 0, 'Drag from the palette, snap to the grid, then launch when the stack is valid.', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '15px',
      color: '#9ab7d5'
    });
    this.helperText.setOrigin(0, 0);
  }

  layout(rect, metrics) {
    this.rect = rect;
    this.metrics = metrics;

    const headerHeight = Math.round(54 * metrics.uiScale);
    const padding = Math.round(18 * metrics.uiScale);
    const footerHeight = Math.round(28 * metrics.uiScale);
    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2 - headerHeight - footerHeight;
    const cellSize = Math.max(
      18,
      Math.floor(
        Math.min(availableWidth / BUILD_GRID.cols, availableHeight / BUILD_GRID.rows)
      )
    );

    const boardWidth = cellSize * BUILD_GRID.cols;
    const boardHeight = cellSize * BUILD_GRID.rows;
    const boardX = rect.x + (rect.width - boardWidth) * 0.5;
    const boardY = rect.y + headerHeight + padding + Math.max(0, (availableHeight - boardHeight) * 0.5);

    this.cellSize = cellSize;
    this.boardRect = {
      x: boardX,
      y: boardY,
      width: boardWidth,
      height: boardHeight
    };

    this.headerText.setPosition(rect.x + padding, rect.y + padding);
    this.headerText.setFontSize(Math.max(18, Math.round(24 * metrics.uiScale)));

    this.helperText.setPosition(rect.x + padding, this.headerText.y + this.headerText.height + Math.round(6 * metrics.uiScale));
    this.helperText.setFontSize(Math.max(12, Math.round(14 * metrics.uiScale)));
    this.helperText.setWordWrapWidth(rect.width - padding * 2);

    this.render();
  }

  setBuildState(placements, selectionId) {
    this.placements = placements;
    this.selectionId = selectionId;
    this.render();
  }

  setGhost(ghost) {
    this.ghost = ghost;
    this.render();
  }

  clearGhost() {
    this.ghost = null;
    this.render();
  }

  containsWorldPoint(worldX, worldY) {
    return (
      this.boardRect &&
      worldX >= this.boardRect.x &&
      worldX <= this.boardRect.x + this.boardRect.width &&
      worldY >= this.boardRect.y &&
      worldY <= this.boardRect.y + this.boardRect.height
    );
  }

  getGridOriginForWorldPoint(worldX, worldY, partId) {
    if (!this.containsWorldPoint(worldX, worldY)) {
      return null;
    }

    const definition = getPartDefinition(partId);
    if (!definition) {
      return null;
    }

    const localX = (worldX - this.boardRect.x) / this.cellSize;
    const localY = (worldY - this.boardRect.y) / this.cellSize;

    return {
      x: BUILD_GRID.minX + Math.floor(localX - (definition.size.width - 1) * 0.5),
      y: Math.floor(localY - (definition.size.height - 1) * 0.5)
    };
  }

  getPlacementIdAtWorldPoint(worldX, worldY) {
    if (!this.containsWorldPoint(worldX, worldY)) {
      return null;
    }

    const gridX = BUILD_GRID.minX + Math.floor((worldX - this.boardRect.x) / this.cellSize);
    const gridY = Math.floor((worldY - this.boardRect.y) / this.cellSize);

    const hit = [...this.placements]
      .reverse()
      .find((placement) => {
        const definition = getPartDefinition(placement.partId);
        return (
          gridX >= placement.origin.x &&
          gridX < placement.origin.x + definition.size.width &&
          gridY >= placement.origin.y &&
          gridY < placement.origin.y + definition.size.height
        );
      });

    return hit?.id ?? null;
  }

  render() {
    if (!this.rect || !this.boardRect) {
      return;
    }

    this.background.clear();
    drawPanel(this.background, this.rect, {
      fillColor: 0x0f1d33,
      strokeColor: 0x6f8fb5,
      fillAlpha: 0.95
    });

    this.grid.clear();
    this.grid.fillStyle(0x08101c, 0.9);
    this.grid.fillRoundedRect(
      this.boardRect.x - 10,
      this.boardRect.y - 10,
      this.boardRect.width + 20,
      this.boardRect.height + 20,
      18
    );

    for (let column = 0; column < BUILD_GRID.cols; column += 1) {
      for (let row = 0; row < BUILD_GRID.rows; row += 1) {
        const cellX = this.boardRect.x + column * this.cellSize;
        const cellY = this.boardRect.y + row * this.cellSize;
        const isCenterColumn = BUILD_GRID.minX + column === 0;

        this.grid.fillStyle(isCenterColumn ? 0x132b46 : 0x0d1726, isCenterColumn ? 0.8 : 0.72);
        this.grid.fillRect(cellX + 1, cellY + 1, this.cellSize - 2, this.cellSize - 2);
      }
    }

    this.grid.lineStyle(1, 0x355679, 0.5);
    for (let column = 0; column <= BUILD_GRID.cols; column += 1) {
      const x = this.boardRect.x + column * this.cellSize;
      this.grid.lineBetween(x, this.boardRect.y, x, this.boardRect.y + this.boardRect.height);
    }

    for (let row = 0; row <= BUILD_GRID.rows; row += 1) {
      const y = this.boardRect.y + row * this.cellSize;
      this.grid.lineBetween(this.boardRect.x, y, this.boardRect.x + this.boardRect.width, y);
    }

    this.placementsGraphics.clear();
    this.placements.forEach((placement) => {
      const definition = getPartDefinition(placement.partId);
      const rect = this.#getPixelRectForPlacement(placement);
      const selected = placement.id === this.selectionId;

      this.placementsGraphics.fillStyle(definition.paletteColor, 1);
      this.placementsGraphics.fillRoundedRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, 14);
      this.placementsGraphics.fillStyle(definition.accentColor, 0.9);
      this.placementsGraphics.fillRect(rect.x + 10, rect.y + 10, rect.width - 20, Math.max(8, rect.height * 0.18));

      if (placement.partId === 'engine') {
        this.placementsGraphics.fillStyle(0xffb36f, 1);
        this.placementsGraphics.fillTriangle(
          rect.x + rect.width * 0.5,
          rect.y + rect.height - 8,
          rect.x + 10,
          rect.y + rect.height * 0.5,
          rect.x + rect.width - 10,
          rect.y + rect.height * 0.5
        );
      }

      if (placement.partId === 'side_booster') {
        this.placementsGraphics.fillStyle(0xd8e2ff, 0.85);
        this.placementsGraphics.fillRect(
          rect.x + rect.width * 0.28,
          rect.y + rect.height * 0.18,
          rect.width * 0.44,
          rect.height * 0.52
        );
      }

      this.placementsGraphics.lineStyle(selected ? 4 : 2, selected ? 0xffd98f : 0xe9f4ff, selected ? 1 : 0.55);
      this.placementsGraphics.strokeRoundedRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6, 14);
    });

    this.ghostGraphics.clear();
    if (this.ghost?.origin && this.ghost?.partId) {
      const definition = getPartDefinition(this.ghost.partId);
      const rect = this.#getPixelRectForPlacement({
        partId: this.ghost.partId,
        origin: this.ghost.origin
      });

      this.ghostGraphics.fillStyle(this.ghost.valid ? 0x78db86 : 0xff6f67, 0.28);
      this.ghostGraphics.fillRoundedRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10, 14);
      this.ghostGraphics.lineStyle(3, this.ghost.valid ? 0xa5ffb2 : 0xffb0aa, 1);
      this.ghostGraphics.strokeRoundedRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, 14);

      if (definition?.id === 'engine') {
        this.ghostGraphics.fillStyle(this.ghost.valid ? 0xa5ffb2 : 0xffb0aa, 0.7);
        this.ghostGraphics.fillTriangle(
          rect.x + rect.width * 0.5,
          rect.y + rect.height - 10,
          rect.x + 12,
          rect.y + rect.height * 0.55,
          rect.x + rect.width - 12,
          rect.y + rect.height * 0.55
        );
      }
    }
  }

  #getPixelRectForPlacement(placement) {
    const definition = getPartDefinition(placement.partId);
    const column = placement.origin.x - BUILD_GRID.minX;

    return {
      x: this.boardRect.x + column * this.cellSize,
      y: this.boardRect.y + placement.origin.y * this.cellSize,
      width: definition.size.width * this.cellSize,
      height: definition.size.height * this.cellSize
    };
  }
}
