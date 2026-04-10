import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { theme } from '../config/theme.js';
import { preloadAssetManifest } from '../config/assetManifest.js';
import { createResponsiveController } from '../layout/responsiveController.js';
import { computeBootLayout } from '../layout/sceneLayouts.js';
import { drawLoadingBackdrop } from '../ui/backdrops.js';
import { ensurePlaceholderTextures } from '../systems/placeholderTextureFactory.js';
import { gameState } from '../state/GameStateStore.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
    this.loadProgress = 0;
    this.displayProgress = 0;
    this.hasAnimatedIn = false;
    this.completionPulsePlayed = false;
    this.ambientParticles = [];
  }

  preload() {
    this.background = this.add.graphics();
    this.fxLayer = this.add.graphics();
    this.gridLayer = this.add.graphics();
    this.particleLayer = this.add.graphics();
    this.cardShadow = this.add.graphics();
    this.cardGlow = this.add.graphics();
    this.card = this.add.graphics();
    this.cardHighlight = this.add.graphics();
    this.progressGlow = this.add.graphics();
    this.progressTrack = this.add.graphics();
    this.progressFill = this.add.graphics();
    this.progressShine = this.add.graphics();

    this.eyebrowText = this.add.text(0, 0, 'SYSTEM CALIBRATION', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '14px',
      fontStyle: '700',
      color: theme.colors.mutedStrong
    });
    this.eyebrowText.setOrigin(0, 0);

    this.titleText = this.add.text(0, 0, 'ROCKET HANGAR', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '46px',
      fontStyle: '700',
      color: theme.colors.inkStrong
    });
    this.titleText.setOrigin(0, 0);

    this.subtitleText = this.add.text(0, 0, 'Calibrating vehicle systems, modular launch architecture, and flight telemetry.', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '18px',
      color: theme.colors.mutedStrong,
      lineSpacing: 6
    });
    this.subtitleText.setOrigin(0, 0);

    this.statusText = this.add.text(0, 0, 'INITIALIZING ASSET PIPELINE', {
      fontFamily: '"Consolas", "Lucida Console", monospace',
      fontSize: '15px',
      color: theme.colors.mutedStrong
    });
    this.statusText.setOrigin(0, 0.5);

    this.percentText = this.add.text(0, 0, '0%', {
      fontFamily: '"Consolas", "Lucida Console", monospace',
      fontSize: '30px',
      fontStyle: '700',
      color: theme.colors.inkStrong
    });
    this.percentText.setOrigin(1, 0.5);

    this.createAmbientParticles();

    this.layoutController = createResponsiveController(
      this,
      computeBootLayout,
      (layout, metrics) => this.applyLayout(layout, metrics)
    );

    this.load.on('fileprogress', (file) => {
      this.statusText.setText(this.describeFileProgress(file?.key));
    });

    this.load.on('progress', (value) => {
      this.loadProgress = value;
      this.statusText.setText(this.describeProgress(value));
      this.redrawProgress(true);
    });

    this.load.on('complete', () => {
      this.loadProgress = 1;
      this.statusText.setText('MISSION LINK ESTABLISHED');
      this.redrawProgress(true);
    });

    this.tweens.add({
      targets: this.cardGlow,
      alpha: { from: 0.95, to: 0.62 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
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

  update(_time, delta) {
    if (!this.metrics) {
      return;
    }

    const blend = 1 - Math.exp(-Math.max(16, delta) / 110);
    this.displayProgress = Phaser.Math.Linear(this.displayProgress, this.loadProgress, blend);
    if (Math.abs(this.loadProgress - this.displayProgress) < 0.001) {
      this.displayProgress = this.loadProgress;
    }

    this.drawAmbientEffects();
    this.redrawProgress();

    if (this.loadProgress >= 1 && !this.completionPulsePlayed) {
      this.completionPulsePlayed = true;
      this.tweens.add({
        targets: [this.percentText, this.statusText],
        scale: { from: 1, to: 1.04 },
        alpha: { from: 0.92, to: 1 },
        duration: 260,
        yoyo: true,
        ease: 'Sine.Out'
      });
    }
  }

  createAmbientParticles() {
    const random = new Phaser.Math.RandomDataGenerator(['boot-scene-premium']);
    this.ambientParticles = Array.from({ length: 26 }, () => ({
      x: random.frac(),
      y: random.frac(),
      radius: random.realInRange(1.1, 2.6),
      alpha: random.realInRange(0.08, 0.24),
      drift: random.realInRange(0.006, 0.02),
      phase: random.realInRange(0, Math.PI * 2)
    }));
  }

  describeProgress(value) {
    if (value < 0.2) {
      return 'INITIALIZING ASSET PIPELINE';
    }

    if (value < 0.45) {
      return 'VERIFYING FLIGHT COMPONENTS';
    }

    if (value < 0.75) {
      return 'SYNCHRONIZING MISSION CONTROL';
    }

    return 'CALIBRATING TELEMETRY SYSTEMS';
  }

  describeFileProgress(key) {
    if (!key) {
      return this.describeProgress(this.loadProgress);
    }

    if (key.includes('part-')) {
      return 'VERIFYING FLIGHT COMPONENTS';
    }

    return 'LOADING MISSION CONTROL';
  }

  applyLayout(layout, metrics) {
    this.layout = layout;
    this.metrics = metrics;
    drawLoadingBackdrop(this.background, metrics);
    this.drawAmbientEffects();

    this.drawCardShell();

    this.eyebrowText.setPosition(layout.eyebrowPosition.x, layout.eyebrowPosition.y);
    this.eyebrowText.setFontSize(Math.max(11, Math.round(13 * metrics.uiScale)));

    this.titleText.setPosition(layout.titlePosition.x, layout.titlePosition.y);
    this.titleText.setFontSize(Math.max(30, Math.round(44 * metrics.uiScale)));

    this.subtitleText.setPosition(layout.subtitlePosition.x, layout.subtitlePosition.y);
    this.subtitleText.setFontSize(Math.max(16, Math.round(18 * metrics.uiScale)));
    this.subtitleText.setWordWrapWidth(layout.subtitleWidth);

    this.statusText.setPosition(layout.statusPosition.x, layout.statusPosition.y);
    this.statusText.setFontSize(Math.max(13, Math.round(15 * metrics.uiScale)));
    this.statusText.setWordWrapWidth(layout.statusWidth);

    this.percentText.setPosition(layout.percentPosition.x, layout.percentPosition.y);
    this.percentText.setFontSize(Math.max(24, Math.round(30 * metrics.uiScale)));

    this.progressBounds = layout.track;
    this.redrawProgress();

    if (!this.hasAnimatedIn) {
      this.hasAnimatedIn = true;
      const introTargets = [
        this.eyebrowText,
        this.titleText,
        this.subtitleText,
        this.statusText,
        this.percentText
      ];

      introTargets.forEach((target) => {
        target.setAlpha(0);
        target.y += Math.round(8 * metrics.uiScale);
      });
      this.card.setAlpha(0);
      this.cardShadow.setAlpha(0);
      this.cardHighlight.setAlpha(0);

      this.tweens.add({
        targets: [this.card, this.cardShadow, this.cardHighlight],
        alpha: { from: 0, to: 1 },
        duration: 520,
        ease: 'Sine.Out'
      });
      this.tweens.add({
        targets: introTargets,
        alpha: { from: 0, to: 1 },
        y: `-=${Math.round(8 * metrics.uiScale)}`,
        duration: 720,
        delay: 110,
        ease: 'Sine.Out',
        stagger: 45
      });
    }
  }

  drawAmbientEffects() {
    if (!this.layout || !this.metrics) {
      return;
    }

    const { width, height, shorterSide } = this.metrics;
    const t = this.time.now * 0.001;

    this.fxLayer.clear();
    this.fxLayer.fillStyle(theme.colors.glow, 0.08);
    this.fxLayer.fillCircle(
      width * 0.22 + Math.sin(t * 0.25) * shorterSide * 0.02,
      height * 0.32,
      shorterSide * 0.22
    );
    this.fxLayer.fillStyle(0xffa86a, 0.05);
    this.fxLayer.fillCircle(
      width * 0.76,
      height * 0.22 + Math.cos(t * 0.32) * shorterSide * 0.018,
      shorterSide * 0.18
    );

    this.gridLayer.clear();
    this.gridLayer.lineStyle(1, 0xffffff, 0.025);
    const gridGap = Math.max(88, Math.round(width / 14));
    for (let x = 0; x <= width; x += gridGap) {
      this.gridLayer.lineBetween(x, 0, x, height);
    }
    const rowGap = Math.max(54, Math.round(height / 14));
    for (let y = 0; y <= height; y += rowGap) {
      this.gridLayer.lineBetween(0, y, width, y);
    }

    this.particleLayer.clear();
    this.ambientParticles.forEach((particle, index) => {
      const driftY = ((t * particle.drift + particle.phase) % 1) * height;
      const driftX = particle.x * width + Math.sin(t * 0.7 + index) * 10;
      const alpha = particle.alpha + Math.sin(t * 0.8 + particle.phase) * 0.03;
      this.particleLayer.fillStyle(theme.colors.accentCool, Math.max(0.04, alpha));
      this.particleLayer.fillCircle(
        driftX,
        driftY,
        particle.radius * this.metrics.uiScale
      );
    });

    const { card } = this.layout;
    this.cardGlow.clear();
    this.cardGlow.fillStyle(theme.colors.accentCool, 0.08);
    this.cardGlow.fillRoundedRect(
      card.x - 18,
      card.y - 18,
      card.width + 36,
      card.height + 36,
      30
    );
    this.cardGlow.fillStyle(theme.colors.accentDarkFill, 0.05);
    this.cardGlow.fillRoundedRect(
      card.x + 28,
      card.y + 24,
      card.width - 56,
      card.height - 48,
      24
    );
  }

  drawCardShell() {
    if (!this.layout) {
      return;
    }

    const { card } = this.layout;
    const radius = Math.max(22, Math.round(24 * this.metrics.uiScale));

    this.cardShadow.clear();
    this.cardShadow.fillStyle(0x02050a, 0.42);
    this.cardShadow.fillRoundedRect(
      card.x + 12,
      card.y + 16,
      card.width,
      card.height,
      radius + 4
    );

    this.card.clear();
    this.card.fillStyle(theme.colors.panelGlass, 0.78);
    this.card.fillRoundedRect(card.x, card.y, card.width, card.height, radius);
    this.card.fillStyle(0x162338, 0.22);
    this.card.fillRoundedRect(
      card.x + 1,
      card.y + 1,
      card.width - 2,
      Math.round(card.height * 0.42),
      radius
    );
    this.card.lineStyle(1.5, theme.colors.panelBorderSoft, 0.14);
    this.card.strokeRoundedRect(card.x, card.y, card.width, card.height, radius);
    this.card.lineStyle(1, theme.colors.panelBorderSoft, 0.06);
    this.card.strokeRoundedRect(card.x + 8, card.y + 8, card.width - 16, card.height - 16, radius - 8);

    this.cardHighlight.clear();
    this.cardHighlight.lineStyle(1, theme.colors.panelBorderSoft, 0.1);
    this.cardHighlight.lineBetween(
      card.x + 22,
      card.y + 18,
      card.x + card.width - 22,
      card.y + 18
    );
  }

  redrawProgress(force = false) {
    if (!this.progressBounds) {
      return;
    }

    const track = this.progressBounds;
    const progress = force ? this.loadProgress : this.displayProgress;
    const fillWidth = Math.max(0, (track.width - 8) * progress);

    this.progressTrack.clear();
    this.progressTrack.fillStyle(0x08101c, 0.72);
    this.progressTrack.fillRoundedRect(track.x, track.y, track.width, track.height, 16);
    this.progressTrack.lineStyle(1.25, theme.colors.panelBorderSoft, 0.12);
    this.progressTrack.strokeRoundedRect(track.x, track.y, track.width, track.height, 16);

    this.progressGlow.clear();
    this.progressFill.clear();
    this.progressShine.clear();

    if (fillWidth > 0) {
      this.progressGlow.fillStyle(theme.colors.accentDarkFill, 0.12);
      this.progressGlow.fillRoundedRect(
        track.x + 2,
        track.y + 2,
        fillWidth + 4,
        track.height - 4,
        14
      );

      this.progressFill.fillStyle(0xff8f5a, 0.96);
      this.progressFill.fillRoundedRect(
        track.x + 4,
        track.y + 4,
        fillWidth,
        Math.max(0, track.height - 8),
        12
      );
      this.progressFill.fillStyle(0xffffff, 0.15);
      this.progressFill.fillRoundedRect(
        track.x + 8,
        track.y + 6,
        Math.max(0, fillWidth - 8),
        Math.max(2, (track.height - 8) * 0.36),
        10
      );

      const shimmerTravel = Math.max(24, fillWidth);
      const shimmerX =
        track.x + 4 + ((this.time.now * 0.18) % shimmerTravel);
      this.progressShine.fillStyle(0xffffff, 0.08);
      this.progressShine.fillRoundedRect(
        shimmerX,
        track.y + 4,
        Math.min(28, fillWidth),
        track.height - 8,
        12
      );
    }

    this.percentText.setText(`${Math.round(progress * 100)}%`);
  }
}
