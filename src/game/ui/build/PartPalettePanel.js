import Phaser from 'phaser';
import { drawPanel } from '../panel.js';

export class PartPalettePanel {
  constructor(scene, { partsCatalog, onPartPointerDown }) {
    this.scene = scene;
    this.partsCatalog = partsCatalog;
    this.onPartPointerDown = onPartPointerDown;
    this.activePartId = null;

    this.background = scene.add.graphics();
    this.titleText = scene.add.text(0, 0, 'Parts Palette', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '22px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    this.titleText.setOrigin(0, 0);

    this.hintText = scene.add.text(0, 0, 'Press and drag a module into the grid.', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '14px',
      color: '#9ab7d5'
    });
    this.hintText.setOrigin(0, 0);

    this.itemViews = partsCatalog.map((part) => this.#createItemView(part));
  }

  #createItemView(part) {
    const container = this.scene.add.container(0, 0);
    const background = this.scene.add.graphics();
    const icon = this.scene.add.graphics();
    const nameText = this.scene.add.text(0, 0, part.name, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '18px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    const descriptionText = this.scene.add.text(0, 0, part.description, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '13px',
      color: '#9ab7d5',
      wordWrap: { width: 180 }
    });

    nameText.setOrigin(0, 0);
    descriptionText.setOrigin(0, 0);
    container.add([background, icon, nameText, descriptionText]);

    const hitArea = new Phaser.Geom.Rectangle(0, 0, 100, 60);
    container.setSize(100, 60);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    container.on('pointerdown', (pointer) => {
      this.onPartPointerDown(part.id, pointer);
    });

    container.on('pointerover', () => {
      this.scene.game.canvas.style.cursor = 'pointer';
    });

    container.on('pointerout', () => {
      this.scene.game.canvas.style.cursor = 'default';
    });

    return {
      part,
      container,
      background,
      icon,
      nameText,
      descriptionText
    };
  }

  setActivePart(activePartId) {
    this.activePartId = activePartId;
    this.render();
  }

  layout(rect, metrics) {
    this.rect = rect;
    this.metrics = metrics;
    this.render();
  }

  render() {
    if (!this.rect || !this.metrics) {
      return;
    }

    const padding = Math.round(16 * this.metrics.uiScale);
    const itemGap = Math.round(10 * this.metrics.uiScale);
    const headerHeight = Math.round(56 * this.metrics.uiScale);
    const compactGrid = this.rect.height < 220;
    const columns = compactGrid ? (this.rect.width < 420 ? 2 : 3) : 1;
    const rows = Math.ceil(this.itemViews.length / columns);
    const innerHeight = this.rect.height - headerHeight - padding * 2 - itemGap * Math.max(0, rows - 1);
    const itemHeight = Math.round(
      Math.max(compactGrid ? 42 : 56, Math.min(compactGrid ? 68 : 88, innerHeight / rows))
    );
    const itemWidth = compactGrid
      ? Math.round((this.rect.width - padding * 2 - itemGap * Math.max(0, columns - 1)) / columns)
      : this.rect.width - padding * 2;
    const iconSize = Math.round(Math.min(compactGrid ? 24 : 30, itemHeight * 0.36));

    this.background.clear();
    drawPanel(this.background, this.rect, {
      fillColor: 0x13253f,
      strokeColor: 0x7b9bc2,
      fillAlpha: 0.96
    });

    this.titleText.setPosition(this.rect.x + padding, this.rect.y + padding);
    this.titleText.setFontSize(Math.max(17, Math.round(22 * this.metrics.uiScale)));

    this.hintText.setPosition(this.rect.x + padding, this.titleText.y + this.titleText.height + Math.round(4 * this.metrics.uiScale));
    this.hintText.setFontSize(Math.max(12, Math.round(13 * this.metrics.uiScale)));
    this.hintText.setWordWrapWidth(this.rect.width - padding * 2);

    const startY = this.rect.y + headerHeight + padding;

    this.itemViews.forEach((view, index) => {
      const column = compactGrid ? index % columns : 0;
      const row = compactGrid ? Math.floor(index / columns) : index;
      const itemRect = {
        x: this.rect.x + padding + column * (itemWidth + itemGap),
        y: startY + row * (itemHeight + itemGap),
        width: itemWidth,
        height: itemHeight
      };

      view.container.setPosition(itemRect.x, itemRect.y);
      view.container.setSize(itemRect.width, itemRect.height);
      view.container.input.hitArea.setTo(0, 0, itemRect.width, itemRect.height);

      view.background.clear();
      drawPanel(
        view.background,
        { x: 0, y: 0, width: itemRect.width, height: itemRect.height },
        {
          fillColor: this.activePartId === view.part.id ? 0x23486f : 0x102038,
          strokeColor: this.activePartId === view.part.id ? 0xffc58b : 0x5f7ea4,
          radius: 16,
          fillAlpha: 1
        }
      );

      view.icon.clear();
      view.icon.fillStyle(view.part.paletteColor, 1);
      view.icon.fillRoundedRect(14, Math.round((itemRect.height - iconSize) * 0.5), iconSize, iconSize, 8);
      view.icon.fillStyle(view.part.accentColor, 1);
      view.icon.fillRect(18, Math.round((itemRect.height - iconSize) * 0.5) + 6, iconSize - 8, 8);

      view.nameText.setPosition(iconSize + 26, compactGrid ? 10 : 12);
      view.nameText.setFontSize(Math.max(12, Math.round((compactGrid ? 14 : 17) * this.metrics.uiScale)));

      view.descriptionText.setVisible(!compactGrid);
      if (!compactGrid) {
        view.descriptionText.setPosition(iconSize + 26, view.nameText.y + view.nameText.height + 4);
        view.descriptionText.setFontSize(Math.max(11, Math.round(12 * this.metrics.uiScale)));
        view.descriptionText.setWordWrapWidth(itemRect.width - iconSize - 40);
      }
    });
  }
}
