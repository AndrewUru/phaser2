import Phaser from "phaser";
import { getPartAssetKey } from "../../build/partsCatalog.js";
import { drawPanel } from "../panel.js";

export class PartPalettePanel {
  constructor(scene, { partsCatalog, onPartPointerDown }) {
    this.scene = scene;
    this.partsCatalog = partsCatalog;
    this.onPartPointerDown = onPartPointerDown;
    this.activePartId = null;
    this.hoverPartId = null;

    this.background = scene.add.graphics();
    this.titleText = scene.add.text(0, 0, "Parts Palette", {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: "22px",
      color: "#edf6ff",
      fontStyle: "700",
    });
    this.titleText.setOrigin(0, 0);

    this.hintText = scene.add.text(
      0,
      0,
      "Drag modules into the grid or tap a starter rocket for quick testing.",
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: "14px",
        color: "#9ab7d5",
      },
    );
    this.hintText.setOrigin(0, 0);

    this.previewText = scene.add.text(0, 0, "", {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: "13px",
      color: "#d8e8f7",
      lineSpacing: 4,
      wordWrap: { width: 180 },
    });
    this.previewText.setOrigin(0, 0);

    this.itemViews = partsCatalog.map((part) => this.#createItemView(part));
  }

  #createItemView(part) {
    const container = this.scene.add.container(0, 0);
    const background = this.scene.add.graphics();

    const assetKey = getPartAssetKey(part.id);

    // Create graphics fallback (always present)
    const graphicsIcon = this.scene.add.graphics();

    const nameText = this.scene.add.text(0, 0, part.name, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: "18px",
      color: "#edf6ff",
      fontStyle: "700",
    });
    const descriptionText = this.scene.add.text(0, 0, part.description, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: "13px",
      color: "#9ab7d5",
      wordWrap: { width: 180 },
    });

    nameText.setOrigin(0, 0);
    descriptionText.setOrigin(0, 0);

    container.add([background, graphicsIcon, nameText, descriptionText]);

    const hitArea = new Phaser.Geom.Rectangle(0, 0, 100, 60);
    container.setSize(100, 60);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    container.on("pointerdown", (pointer) => {
      this.onPartPointerDown(part.id, pointer);
    });

    container.on("pointerover", () => {
      this.hoverPartId = part.id;
      this.scene.game.canvas.style.cursor = "pointer";
      this.render();
    });

    container.on("pointerout", () => {
      this.hoverPartId = null;
      this.scene.game.canvas.style.cursor = "default";
      this.render();
    });

    return {
      part,
      container,
      background,
      spriteIcon: null, // Will be created on demand
      graphicsIcon,
      assetKey,
      nameText,
      descriptionText,
    };
  }

  setActivePart(activePartId) {
    this.activePartId = activePartId;
    this.render();
  }

  layout(rect, metrics) {
    this.rect = rect;
    this.metrics = metrics;

    // Log available textures on first layout
    const textureKeys = this.scene.textures.getTextureKeys();
    const assetTextures = textureKeys.filter((k) => k.includes("part-"));
    console.log("Available part textures:", assetTextures);

    this.render();
  }

  render() {
    if (!this.rect || !this.metrics) {
      return;
    }

    const padding = Math.round(16 * this.metrics.uiScale);
    const itemGap = Math.round(8 * this.metrics.uiScale);
    const headerHeight = Math.round(84 * this.metrics.uiScale);
    const previewHeight = Math.round(72 * this.metrics.uiScale);
    const availableHeight =
      this.rect.height - headerHeight - previewHeight - padding * 2;
    const compactGrid = availableHeight < 250;
    const columns = compactGrid ? (this.rect.width < 420 ? 2 : 3) : 1;
    const rows = Math.ceil(this.itemViews.length / columns);
    const innerHeight = availableHeight - itemGap * Math.max(0, rows - 1);
    const itemHeight = Math.round(
      Math.max(
        compactGrid ? 42 : 54,
        Math.min(compactGrid ? 68 : 84, innerHeight / rows),
      ),
    );
    const itemWidth = compactGrid
      ? Math.round(
          (this.rect.width - padding * 2 - itemGap * Math.max(0, columns - 1)) /
            columns,
        )
      : this.rect.width - padding * 2;
    const iconSize = Math.round(
      Math.min(compactGrid ? 24 : 30, itemHeight * 0.36),
    );

    this.background.clear();
    drawPanel(this.background, this.rect, {
      fillColor: 0x13253f,
      strokeColor: 0x7b9bc2,
      fillAlpha: 0.96,
    });

    this.titleText.setPosition(this.rect.x + padding, this.rect.y + padding);
    this.titleText.setFontSize(
      Math.max(17, Math.round(22 * this.metrics.uiScale)),
    );

    this.hintText.setPosition(
      this.rect.x + padding,
      this.titleText.y +
        this.titleText.height +
        Math.round(4 * this.metrics.uiScale),
    );
    this.hintText.setFontSize(
      Math.max(11, Math.round(12 * this.metrics.uiScale)),
    );
    this.hintText.setWordWrapWidth(this.rect.width - padding * 2);

    const startY = this.rect.y + headerHeight;

    this.itemViews.forEach((view, index) => {
      const column = compactGrid ? index % columns : 0;
      const row = compactGrid ? Math.floor(index / columns) : index;
      const itemRect = {
        x: this.rect.x + padding + column * (itemWidth + itemGap),
        y: startY + row * (itemHeight + itemGap),
        width: itemWidth,
        height: itemHeight,
      };
      const highlighted =
        this.activePartId === view.part.id || this.hoverPartId === view.part.id;

      view.container.setPosition(itemRect.x, itemRect.y);
      view.container.setSize(itemRect.width, itemRect.height);
      view.container.input.hitArea.setTo(0, 0, itemRect.width, itemRect.height);

      view.background.clear();
      drawPanel(
        view.background,
        { x: 0, y: 0, width: itemRect.width, height: itemRect.height },
        {
          fillColor: highlighted ? 0x23486f : 0x102038,
          strokeColor: highlighted ? 0xffc58b : 0x5f7ea4,
          radius: 16,
          fillAlpha: 1,
        },
      );

      // Check if texture exists and create sprite on-demand
      const hasTexture =
        view.assetKey && this.scene.textures.exists(view.assetKey);

      if (hasTexture && !view.spriteIcon) {
        // Create sprite for the first time
        try {
          view.spriteIcon = this.scene.add.sprite(0, 0, view.assetKey);
          view.container.add(view.spriteIcon);
          console.log(`Created sprite for ${view.assetKey}`);
        } catch (e) {
          console.error(`Failed to create sprite for ${view.assetKey}:`, e);
        }
      }

      if (hasTexture && view.spriteIcon) {
        // Show sprite, hide graphics
        view.spriteIcon.setVisible(true);
        const textureFrame = view.spriteIcon.frame;
        const sourceWidth = textureFrame?.realWidth ?? textureFrame?.width ?? iconSize;
        const sourceHeight = textureFrame?.realHeight ?? textureFrame?.height ?? iconSize;
        const targetWidth = compactGrid ? iconSize + 8 : iconSize + 14;
        const targetHeight = compactGrid ? iconSize + 8 : iconSize + 18;
        const scale = Math.min(
          targetWidth / Math.max(1, sourceWidth),
          targetHeight / Math.max(1, sourceHeight),
        );
        view.spriteIcon.setOrigin(0.5, 0.5);
        view.spriteIcon.setPosition(
          14 + targetWidth * 0.5,
          Math.round(itemRect.height * 0.5),
        );
        view.spriteIcon.setScale(scale);
        view.spriteIcon.setDisplayOrigin(sourceWidth * 0.5, sourceHeight * 0.5);
        view.graphicsIcon.setVisible(false);
      } else {
        // Show graphics fallback, hide sprite
        if (view.spriteIcon) {
          view.spriteIcon.setVisible(false);
        }
        view.graphicsIcon.setVisible(true);
        view.graphicsIcon.clear();
        view.graphicsIcon.fillStyle(view.part.paletteColor, 1);
        view.graphicsIcon.fillRoundedRect(
          14,
          Math.round((itemRect.height - iconSize) * 0.5),
          iconSize,
          iconSize,
          8,
        );
        view.graphicsIcon.fillStyle(view.part.accentColor, 1);
        view.graphicsIcon.fillRect(
          18,
          Math.round((itemRect.height - iconSize) * 0.5) + 6,
          iconSize - 8,
          8,
        );
      }

      view.nameText.setPosition(iconSize + 26, compactGrid ? 10 : 12);
      view.nameText.setFontSize(
        Math.max(
          12,
          Math.round((compactGrid ? 14 : 17) * this.metrics.uiScale),
        ),
      );
      view.descriptionText.setVisible(!compactGrid);

      if (!compactGrid) {
        view.descriptionText.setPosition(
          iconSize + 26,
          view.nameText.y + view.nameText.height + 4,
        );
        view.descriptionText.setFontSize(
          Math.max(10, Math.round(12 * this.metrics.uiScale)),
        );
        view.descriptionText.setWordWrapWidth(itemRect.width - iconSize - 40);
      }
    });

    const previewPart =
      this.partsCatalog.find(
        (part) => part.id === (this.hoverPartId ?? this.activePartId),
      ) ?? this.partsCatalog[0];
    this.previewText.setPosition(
      this.rect.x + padding,
      this.rect.y + this.rect.height - previewHeight,
    );
    this.previewText.setFontSize(
      Math.max(11, Math.round(12 * this.metrics.uiScale)),
    );
    this.previewText.setWordWrapWidth(this.rect.width - padding * 2);
    this.previewText.setText(
      `${previewPart.name}\nMass ${previewPart.mass.toFixed(1)} t  Fuel ${Math.round(previewPart.fuel)} u  Thrust ${Math.round(previewPart.thrust)} kN\n${previewPart.description}`,
    );
  }
}
