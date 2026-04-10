import { BUILD_GRID } from '../../build/buildConstants.js';
import { getPartAssetKey, getPartDefinition } from '../../build/partsCatalog.js';
import { drawPanel } from '../panel.js';

export class BuildGridView {
  constructor(scene) {
    this.scene = scene;
    this.rect = null;
    this.metrics = null;
    this.placements = [];
    this.selectionId = null;
    this.ghost = null;
    this.suppressedPlacementId = null;
    this.attachmentOrigins = [];

    this.background = scene.add.graphics();
    this.grid = scene.add.graphics();
    this.placementSpriteLayer = scene.add.container(0, 0);
    this.placementsGraphics = scene.add.graphics();
    this.ghostGraphics = scene.add.graphics();
    this.attachmentGraphics = scene.add.graphics();
    this.placementSprites = new Map();
    this.headerText = scene.add.text(0, 0, 'Assembly Grid', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '24px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    this.headerText.setOrigin(0, 0);

    this.helperText = scene.add.text(0, 0, 'Green points show valid snap starts. Drag placed parts to reposition them.', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '15px',
      color: '#9ab7d5',
      wordWrap: { width: 360 }
    });
    this.helperText.setOrigin(0, 0);

    this.placementSpriteLayer.setDepth(1);
    this.placementsGraphics.setDepth(2);
    this.ghostGraphics.setDepth(3);
    this.attachmentGraphics.setDepth(4);
  }

  layout(rect, metrics) {
    this.rect = rect;
    this.metrics = metrics;

    const headerHeight = Math.round(66 * metrics.uiScale);
    const padding = Math.round(18 * metrics.uiScale);
    const footerHeight = Math.round(26 * metrics.uiScale);
    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2 - headerHeight - footerHeight;
    const cellSize = Math.max(
      18,
      Math.floor(Math.min(availableWidth / BUILD_GRID.cols, availableHeight / BUILD_GRID.rows))
    );

    const boardWidth = cellSize * BUILD_GRID.cols;
    const boardHeight = cellSize * BUILD_GRID.rows;
    const boardX = rect.x + (rect.width - boardWidth) * 0.5;
    const boardY = rect.y + headerHeight + padding + Math.max(0, (availableHeight - boardHeight) * 0.5);

    this.cellSize = cellSize;
    this.boardRect = { x: boardX, y: boardY, width: boardWidth, height: boardHeight };

    this.headerText.setPosition(rect.x + padding, rect.y + padding);
    this.headerText.setFontSize(Math.max(18, Math.round(24 * metrics.uiScale)));

    this.helperText.setPosition(rect.x + padding, this.headerText.y + this.headerText.height + 6);
    this.helperText.setFontSize(Math.max(12, Math.round(14 * metrics.uiScale)));
    this.helperText.setWordWrapWidth(rect.width - padding * 2);

    this.render();
  }

  setBuildState(placements, selectionId, options = {}) {
    this.placements = placements;
    this.selectionId = selectionId;
    this.suppressedPlacementId = options.suppressedPlacementId ?? null;
    this.attachmentOrigins = options.attachmentOrigins ?? [];
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
        if (placement.id === this.suppressedPlacementId) {
          return false;
        }

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
    this.grid.fillStyle(0x08101c, 0.92);
    this.grid.fillRoundedRect(this.boardRect.x - 10, this.boardRect.y - 10, this.boardRect.width + 20, this.boardRect.height + 20, 18);

    for (let column = 0; column < BUILD_GRID.cols; column += 1) {
      for (let row = 0; row < BUILD_GRID.rows; row += 1) {
        const cellX = this.boardRect.x + column * this.cellSize;
        const cellY = this.boardRect.y + row * this.cellSize;
        const gridX = BUILD_GRID.minX + column;
        const isCenterColumn = gridX === 0;

        this.grid.fillStyle(isCenterColumn ? 0x173555 : 0x0d1726, isCenterColumn ? 0.92 : 0.74);
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

    const anchorX = this.boardRect.x + (0 - BUILD_GRID.minX + 0.5) * this.cellSize;
    this.grid.lineStyle(4, 0x74c2ff, 0.38);
    this.grid.lineBetween(anchorX, this.boardRect.y, anchorX, this.boardRect.y + this.boardRect.height);

    this.attachmentGraphics.clear();
    this.attachmentOrigins.forEach((origin) => {
      const x = this.boardRect.x + (origin.x - BUILD_GRID.minX + 0.5) * this.cellSize;
      const y = this.boardRect.y + (origin.y + 0.5) * this.cellSize;
      this.attachmentGraphics.fillStyle(0x7fe590, 0.28);
      this.attachmentGraphics.fillCircle(x, y, Math.max(4, this.cellSize * 0.18));
      this.attachmentGraphics.lineStyle(2, 0xaef9b9, 0.75);
      this.attachmentGraphics.strokeCircle(x, y, Math.max(4, this.cellSize * 0.18));
    });

    this.placementsGraphics.clear();
    const visiblePlacementIds = new Set();
    this.placements.forEach((placement) => {
      if (placement.id === this.suppressedPlacementId) {
        this.#hidePlacementSprite(placement.id);
        return;
      }

      const definition = getPartDefinition(placement.partId);
      const rect = this.#getPixelRectForPlacement(placement);
      const selected = placement.id === this.selectionId;
      const assetKey = getPartAssetKey(placement.partId);
      const hasTexture = assetKey && this.scene.textures.exists(assetKey);

      visiblePlacementIds.add(placement.id);

      if (hasTexture) {
        this.#renderPlacementSprite(placement.id, assetKey, rect);
      } else {
        this.#hidePlacementSprite(placement.id);
      }

      if (!hasTexture) {
        this.placementsGraphics.fillStyle(definition.paletteColor, 1);
        this.placementsGraphics.fillRoundedRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, 14);
        this.placementsGraphics.fillStyle(definition.accentColor, 0.9);
        this.placementsGraphics.fillRect(rect.x + 10, rect.y + 10, rect.width - 20, Math.max(8, rect.height * 0.18));
      } else {
        this.placementsGraphics.fillStyle(0x08101c, selected ? 0.22 : 0.12);
        this.placementsGraphics.fillRoundedRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6, 14);
      }

      this.placementsGraphics.lineStyle(selected ? 4 : 2, selected ? 0xffd98f : 0xe9f4ff, selected ? 1 : 0.55);
      this.placementsGraphics.strokeRoundedRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6, 14);
    });

    [...this.placementSprites.keys()].forEach((placementId) => {
      if (!visiblePlacementIds.has(placementId)) {
        this.#destroyPlacementSprite(placementId);
      }
    });

    this.ghostGraphics.clear();
    if (this.ghost?.origin && this.ghost?.partId) {
      const rect = this.#getPixelRectForPlacement({ partId: this.ghost.partId, origin: this.ghost.origin });
      const valid = this.ghost.valid;
      this.ghostGraphics.fillStyle(valid ? 0x78db86 : 0xff6f67, 0.32);
      this.ghostGraphics.fillRoundedRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10, 14);
      this.ghostGraphics.lineStyle(3, valid ? 0xa5ffb2 : 0xffb0aa, 1);
      this.ghostGraphics.strokeRoundedRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, 14);
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

  #renderPlacementSprite(placementId, assetKey, rect) {
    let sprite = this.placementSprites.get(placementId);
    if (!sprite) {
      sprite = this.scene.add.image(0, 0, assetKey);
      sprite.setOrigin(0.5, 0.5);
      this.placementSpriteLayer.add(sprite);
      this.placementSprites.set(placementId, sprite);
    } else if (sprite.texture?.key !== assetKey) {
      sprite.setTexture(assetKey);
    }

    const frame = sprite.frame;
    const sourceWidth = frame?.realWidth ?? frame?.width ?? rect.width;
    const sourceHeight = frame?.realHeight ?? frame?.height ?? rect.height;
    const targetWidth = Math.max(8, rect.width - 10);
    const targetHeight = Math.max(8, rect.height - 10);
    const scale = Math.min(
      targetWidth / Math.max(1, sourceWidth),
      targetHeight / Math.max(1, sourceHeight)
    );

    sprite.setVisible(true);
    sprite.setPosition(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5);
    sprite.setScale(scale);
  }

  #hidePlacementSprite(placementId) {
    const sprite = this.placementSprites.get(placementId);
    if (sprite) {
      sprite.setVisible(false);
    }
  }

  #destroyPlacementSprite(placementId) {
    const sprite = this.placementSprites.get(placementId);
    if (sprite) {
      sprite.destroy();
      this.placementSprites.delete(placementId);
    }
  }
}
