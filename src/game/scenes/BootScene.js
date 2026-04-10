import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { theme } from '../config/theme.js';
import { preloadAssetManifest } from '../config/assetManifest.js';
import { createResponsiveController } from '../layout/responsiveController.js';
import { computeBootLayout } from '../layout/sceneLayouts.js';
import { drawPanel } from '../ui/panel.js';
import { drawLoadingBackdrop } from '../ui/backdrops.js';
import { ensurePlaceholderTextures } from '../systems/placeholderTextureFactory.js';
import { gameState } from '../state/GameStateStore.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
    this.loadProgress = 0;
  }

  preload() {
    this.background = this.add.graphics();
    this.card = this.add.graphics();
    this.progressTrack = this.add.graphics();
    this.progressFill = this.add.graphics();

    this.titleText = this.add.text(0, 0, 'Rocket Hangar', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '42px',
      fontStyle: '700',
      color: theme.colors.ink
    });
    this.titleText.setOrigin(0.5, 0);

    this.subtitleText = this.add.text(0, 0, 'Calibrating build systems and launch telemetry', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '18px',
      color: theme.colors.muted
    });
    this.subtitleText.setOrigin(0.5, 0);

    this.statusText = this.add.text(0, 0, 'Preparing placeholder asset pipeline', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '16px',
      color: theme.colors.muted
    });
    this.statusText.setOrigin(0, 0.5);

    this.layoutController = createResponsiveController(
      this,
      computeBootLayout,
      (layout, metrics) => this.applyLayout(layout, metrics)
    );

    this.load.on('progress', (value) => {
      this.loadProgress = value;
      this.redrawProgress();
    });

    this.load.on('complete', () => {
      this.loadProgress = 1;
      this.statusText.setText('Boot complete. Opening mission control...');
      this.redrawProgress();
    });

    preloadAssetManifest(this);
  }

  create() {
    gameState.reset();
    ensurePlaceholderTextures(this);
    this.redrawProgress();

    this.time.delayedCall(500, () => {
      this.scene.start(SCENE_KEYS.MENU);
    });
  }

  applyLayout(layout, metrics) {
    drawLoadingBackdrop(this.background, metrics);

    this.card.clear();
    drawPanel(this.card, layout.card, {
      fillColor: theme.colors.panel,
      strokeColor: theme.colors.panelBorder,
      fillAlpha: 0.94
    });

    this.titleText.setPosition(layout.titlePosition.x, layout.titlePosition.y);
    this.titleText.setFontSize(Math.max(28, Math.round(42 * metrics.uiScale)));

    this.subtitleText.setPosition(layout.subtitlePosition.x, layout.subtitlePosition.y);
    this.subtitleText.setFontSize(Math.max(16, Math.round(18 * metrics.uiScale)));

    this.statusText.setPosition(layout.statusPosition.x, layout.statusPosition.y);
    this.statusText.setFontSize(Math.max(14, Math.round(16 * metrics.uiScale)));

    this.progressBounds = layout.track;
    this.redrawProgress();
  }

  redrawProgress() {
    if (!this.progressBounds) {
      return;
    }

    const track = this.progressBounds;

    this.progressTrack.clear();
    this.progressTrack.fillStyle(0x08101c, 0.95);
    this.progressTrack.fillRoundedRect(track.x, track.y, track.width, track.height, 12);
    this.progressTrack.lineStyle(2, 0x4e6a8f, 0.7);
    this.progressTrack.strokeRoundedRect(track.x, track.y, track.width, track.height, 12);

    this.progressFill.clear();
    if (this.loadProgress > 0) {
      this.progressFill.fillStyle(0xff9a57, 1);
      this.progressFill.fillRoundedRect(
        track.x + 4,
        track.y + 4,
        Math.max(0, (track.width - 8) * this.loadProgress),
        Math.max(0, track.height - 8),
        10
      );
    }
  }
}
