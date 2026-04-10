import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { theme } from '../config/theme.js';
import { createResponsiveController } from '../layout/responsiveController.js';
import { computeMenuLayout } from '../layout/sceneLayouts.js';
import { createTextButton } from '../ui/textButton.js';
import { drawWorkshopBackdrop } from '../ui/backdrops.js';
import { HowToPlayOverlay } from '../ui/help/HowToPlayOverlay.js';
import { getTutorialHint } from '../ui/help/TutorialHints.js';
import { getMissionDefinition } from '../mission/MissionDefinitions.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MENU);
    this.ambientParticles = [];
    this.hasAnimatedIn = false;
  }

  create() {
    this.mission = getMissionDefinition();
    const menuHint = getTutorialHint('menu');

    this.background = this.add.graphics();
    this.ambientGlow = this.add.graphics();
    this.ambientGrid = this.add.graphics();
    this.ambientParticlesLayer = this.add.graphics();
    this.heroGlow = this.add.graphics();
    this.heroPanel = this.add.graphics();
    this.heroAccent = this.add.graphics();
    this.heroMetrics = this.add.graphics();
    this.sideGlow = this.add.graphics();
    this.sidePanel = this.add.graphics();
    this.sideDecor = this.add.graphics();

    this.kickerText = this.add.text(0, 0, 'MISSION CONTROL // LAUNCH PROGRAM', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '16px',
      color: theme.colors.accentStrong,
      fontStyle: '700'
    });
    this.kickerText.setOrigin(0, 0);

    this.titleText = this.add.text(0, 0, 'Build the rocket.\nFly the mission.\nLearn by launching.', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '56px',
      color: theme.colors.inkStrong ?? theme.colors.ink,
      fontStyle: '700',
      lineSpacing: 8
    });
    this.titleText.setOrigin(0, 0);

    this.bodyText = this.add.text(
      0,
      0,
      'Assemble a modular launch stack in the hangar, validate mass and stability, then guide a staged ascent through a readable, tactile flight model.',
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '20px',
        color: theme.colors.mutedStrong ?? theme.colors.muted,
        lineSpacing: 8
      }
    );
    this.bodyText.setOrigin(0, 0);

    this.quickStartTitle = this.add.text(0, 0, 'Launch Loop', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '22px',
      color: theme.colors.ink,
      fontStyle: '700'
    });
    this.quickStartTitle.setOrigin(0, 0);

    this.quickStartText = this.add.text(0, 0, menuHint.lines.map((line) => `- ${line}`).join('\n'), {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '16px',
      color: theme.colors.ink,
      lineSpacing: 10
    });
    this.quickStartText.setOrigin(0, 0);

    this.metricLabelTexts = [
      this.#createMetricLabel('TARGET ALTITUDE'),
      this.#createMetricLabel('FLIGHT PROFILE'),
      this.#createMetricLabel('LEARNING LOOP')
    ];
    this.metricValueTexts = [
      this.#createMetricValue(`${this.mission.targetAltitude.toFixed(0)} M`),
      this.#createMetricValue('STAGED ASCENT'),
      this.#createMetricValue('BUILD / TEST / ITERATE')
    ];

    this.missionEyebrowText = this.add.text(0, 0, 'ACTIVE MISSION', {
      fontFamily: '"Consolas", "Lucida Console", monospace',
      fontSize: '14px',
      color: theme.colors.mutedStrong ?? theme.colors.muted,
      fontStyle: '700'
    });
    this.missionEyebrowText.setOrigin(0, 0);

    this.missionTitle = this.add.text(0, 0, this.mission.title, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '28px',
      color: theme.colors.ink,
      fontStyle: '700'
    });
    this.missionTitle.setOrigin(0, 0);

    this.missionText = this.add.text(
      0,
      0,
      `${this.mission.brief}\n\nSuccess condition: ${this.mission.successLabel}.`,
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '18px',
        color: theme.colors.mutedStrong ?? theme.colors.muted,
        lineSpacing: 8
      }
    );
    this.missionText.setOrigin(0, 0);

    this.commandNotesTitle = this.add.text(0, 0, 'Command Notes', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '20px',
      color: theme.colors.ink,
      fontStyle: '700'
    });
    this.commandNotesTitle.setOrigin(0, 0);

    this.commandNotesText = this.add.text(
      0,
      0,
      this.mission.hints.map((line) => `- ${line}`).join('\n'),
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '16px',
        color: theme.colors.ink,
        lineSpacing: 9
      }
    );
    this.commandNotesText.setOrigin(0, 0);

    this.shortcutText = this.add.text(0, 0, 'H  HOW TO PLAY    ESC  CLOSE PANELS', {
      fontFamily: '"Consolas", "Lucida Console", monospace',
      fontSize: '13px',
      color: theme.colors.mutedStrong ?? theme.colors.muted
    });
    this.shortcutText.setOrigin(0, 1);

    this.playButton = createTextButton(this, {
      label: 'Build Rocket',
      onClick: () => {
        this.scene.start(SCENE_KEYS.BUILD);
      }
    });
    this.helpButton = createTextButton(this, {
      label: 'How to Play',
      onClick: () => this.helpOverlay.toggle(0)
    });
    this.briefButton = createTextButton(this, {
      label: 'Mission Brief',
      onClick: () => this.helpOverlay.toggle(1)
    });

    this.helpOverlay = new HowToPlayOverlay(this, {
      pages: [
        {
          title: 'How to Play',
          body:
            '1. Build a rocket in the hangar.\n2. Validate mass, thrust, and stability.\n3. Launch with smooth throttle.\n4. Steer carefully and separate burnt-out stages.\n5. Reach target altitude without tumbling or crashing.'
        },
        {
          title: this.mission.title,
          body: `${this.mission.brief}\n\nChecklist:\n- Build a stable capsule-tank-engine stack.\n- Add a decoupler if you want staging.\n- Reach ${this.mission.targetAltitude} m altitude.`
        }
      ],
      onClose: () => {}
    });

    this.createAmbientParticles();
    this.createAmbientTweens();

    this.helpKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.events.on(Phaser.Scenes.Events.UPDATE, this.handleOverlayKeys, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, this.handleOverlayKeys, this);
      this.helpKey?.destroy();
      this.escapeKey?.destroy();
      this.playButton.destroy();
      this.helpButton.destroy();
      this.briefButton.destroy();
    });

    this.layoutController = createResponsiveController(
      this,
      computeMenuLayout,
      (layout, metrics) => this.applyLayout(layout, metrics)
    );
  }

  update() {
    if (!this.layout || !this.metrics) {
      return;
    }

    this.drawAmbientEffects(this.metrics);
  }

  #createMetricLabel(text) {
    const label = this.add.text(0, 0, text, {
      fontFamily: '"Consolas", "Lucida Console", monospace',
      fontSize: '12px',
      color: theme.colors.mutedStrong ?? theme.colors.muted,
      fontStyle: '700'
    });
    label.setOrigin(0, 0);
    return label;
  }

  #createMetricValue(text) {
    const value = this.add.text(0, 0, text, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '20px',
      color: theme.colors.inkStrong ?? theme.colors.ink,
      fontStyle: '700'
    });
    value.setOrigin(0, 0);
    return value;
  }

  createAmbientParticles() {
    const random = new Phaser.Math.RandomDataGenerator(['menu-scene-premium']);
    this.ambientParticles = Array.from({ length: 36 }, () => ({
      x: random.frac(),
      y: random.frac(),
      radius: random.realInRange(1.2, 3.1),
      alpha: random.realInRange(0.05, 0.2),
      drift: random.realInRange(0.004, 0.014),
      sway: random.realInRange(0.12, 0.4),
      phase: random.realInRange(0, Math.PI * 2),
      color: random.frac() > 0.28 ? theme.colors.accentCool : theme.colors.accentDarkFill
    }));
  }

  createAmbientTweens() {
    this.tweens.add({
      targets: this.heroGlow,
      alpha: { from: 0.88, to: 0.58 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.tweens.add({
      targets: this.sideGlow,
      alpha: { from: 0.82, to: 0.54 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.tweens.add({
      targets: this.heroAccent,
      alpha: { from: 0.94, to: 0.68 },
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  handleOverlayKeys() {
    if (this.helpKey && Phaser.Input.Keyboard.JustDown(this.helpKey)) {
      this.helpOverlay.toggle(0);
    }

    if (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.helpOverlay.hide();
    }
  }

  applyLayout(layout, metrics) {
    this.layout = layout;
    this.metrics = metrics;

    drawWorkshopBackdrop(this.background, metrics);
    this.drawAmbientEffects(metrics);
    this.drawPanels(layout, metrics);
    this.layoutTexts(layout, metrics);
    this.layoutButtons(layout, metrics);

    this.helpOverlay.layout(
      {
        x: metrics.centerX - Math.min(metrics.width * 0.76, 620) * 0.5,
        y: metrics.centerY - Math.min(metrics.height * 0.58, 420) * 0.5,
        width: Math.min(metrics.width * 0.76, 620),
        height: Math.min(metrics.height * 0.58, 420)
      },
      metrics
    );

    if (!this.hasAnimatedIn) {
      this.hasAnimatedIn = true;
      this.animateIntro(metrics);
    }
  }

  drawAmbientEffects(metrics) {
    const t = this.time.now * 0.001;

    this.ambientGlow.clear();
    this.ambientGlow.fillStyle(theme.colors.glow, 0.08);
    this.ambientGlow.fillCircle(
      metrics.width * 0.18 + Math.sin(t * 0.24) * metrics.shorterSide * 0.018,
      metrics.height * 0.22,
      metrics.shorterSide * 0.22
    );
    this.ambientGlow.fillStyle(0x8f62ff, 0.05);
    this.ambientGlow.fillCircle(
      metrics.width * 0.82,
      metrics.height * 0.16 + Math.cos(t * 0.31) * metrics.shorterSide * 0.014,
      metrics.shorterSide * 0.24
    );
    this.ambientGlow.fillStyle(theme.colors.accentDarkFill, 0.05);
    this.ambientGlow.fillCircle(
      metrics.width * 0.74,
      metrics.height * 0.72,
      metrics.shorterSide * 0.18
    );

    this.ambientGrid.clear();
    this.ambientGrid.lineStyle(1, 0xffffff, 0.028);
    const columnGap = Math.max(100, Math.round(metrics.width / 13));
    for (let x = 0; x <= metrics.width; x += columnGap) {
      this.ambientGrid.lineBetween(x, 0, x, metrics.height);
    }

    const rowGap = Math.max(58, Math.round(metrics.height / 13));
    for (let y = 0; y <= metrics.height; y += rowGap) {
      this.ambientGrid.lineBetween(0, y, metrics.width, y);
    }

    this.ambientParticlesLayer.clear();
    this.ambientParticles.forEach((particle, index) => {
      const y = ((particle.y + t * particle.drift) % 1) * metrics.height;
      const x =
        particle.x * metrics.width +
        Math.sin(t * particle.sway + particle.phase + index * 0.1) * 14;
      const alpha = particle.alpha + Math.sin(t * 0.9 + particle.phase) * 0.03;
      this.ambientParticlesLayer.fillStyle(particle.color, Math.max(0.035, alpha));
      this.ambientParticlesLayer.fillCircle(x, y, particle.radius * metrics.uiScale);
    });
  }

  drawPanels(layout, metrics) {
    this.drawGlassPanel(this.heroGlow, layout.heroRect, {
      expand: 18,
      color: theme.colors.accentCool,
      alpha: 0.08
    });
    this.drawGlassPanel(this.sideGlow, layout.sideRect, {
      expand: 14,
      color: theme.colors.accentDarkFill,
      alpha: 0.06
    });

    this.drawGlassShell(this.heroPanel, layout.heroRect, {
      fillColor: theme.colors.panelGlass ?? theme.colors.panel,
      fillAlpha: 0.8
    });
    this.drawGlassShell(this.sidePanel, layout.sideRect, {
      fillColor: theme.colors.panelAlt,
      fillAlpha: 0.86
    });

    this.heroAccent.clear();
    this.heroAccent.fillStyle(theme.colors.accentDarkFill, 1);
    this.heroAccent.fillRoundedRect(
      layout.heroRect.x + 18,
      layout.heroRect.y + 18,
      Math.max(140, layout.heroRect.width * 0.3),
      Math.max(8, Math.round(8 * metrics.uiScale)),
      4
    );
    this.heroAccent.fillStyle(theme.colors.accentCool, 0.85);
    this.heroAccent.fillRoundedRect(
      layout.heroRect.x + 18,
      layout.heroRect.y + 34,
      Math.max(90, layout.heroRect.width * 0.12),
      Math.max(4, Math.round(4 * metrics.uiScale)),
      3
    );

    this.heroMetrics.clear();
    this.sideDecor.clear();

    const heroMetricsTop = layout.heroRect.y + layout.heroRect.height - Math.round(112 * metrics.uiScale);
    const heroMetricGap = Math.round(12 * metrics.uiScale);
    const heroMetricWidth = layout.compact
      ? Math.round((layout.heroInner.width - heroMetricGap * 2) / 3)
      : Math.round((layout.heroInner.width - heroMetricGap * 2) / 3);
    const heroMetricHeight = Math.round(90 * metrics.uiScale);

    for (let index = 0; index < 3; index += 1) {
      const x = layout.heroInner.x + index * (heroMetricWidth + heroMetricGap);
      this.heroMetrics.fillStyle(0x0d1625, 0.5);
      this.heroMetrics.fillRoundedRect(
        x,
        heroMetricsTop,
        heroMetricWidth,
        heroMetricHeight,
        18
      );
      this.heroMetrics.lineStyle(1, 0xffffff, 0.08);
      this.heroMetrics.strokeRoundedRect(
        x,
        heroMetricsTop,
        heroMetricWidth,
        heroMetricHeight,
        18
      );
      this.heroMetrics.fillStyle(index === 0 ? theme.colors.accentDarkFill : theme.colors.accentCool, 0.14);
      this.heroMetrics.fillRoundedRect(
        x + 10,
        heroMetricsTop + 10,
        heroMetricWidth - 20,
        10,
        5
      );
    }

    const missionBandY = layout.sideInner.y + Math.round(182 * metrics.uiScale);
    this.sideDecor.fillStyle(theme.colors.accentCool, 0.08);
    this.sideDecor.fillRoundedRect(
      layout.sideInner.x,
      missionBandY,
      layout.statTextWidth,
      Math.round(72 * metrics.uiScale),
      20
    );
    this.sideDecor.lineStyle(1, 0xffffff, 0.08);
    this.sideDecor.strokeRoundedRect(
      layout.sideInner.x,
      missionBandY,
      layout.statTextWidth,
      Math.round(72 * metrics.uiScale),
      20
    );
    this.sideDecor.lineStyle(1, theme.colors.panelBorderSoft ?? 0xffffff, 0.08);
    this.sideDecor.lineBetween(
      layout.sideInner.x,
      missionBandY + Math.round(102 * metrics.uiScale),
      layout.sideInner.x + layout.statTextWidth,
      missionBandY + Math.round(102 * metrics.uiScale)
    );
  }

  drawGlassPanel(graphics, rect, { expand = 16, color = theme.colors.accentCool, alpha = 0.08 }) {
    graphics.clear();
    graphics.fillStyle(color, alpha);
    graphics.fillRoundedRect(
      rect.x - expand,
      rect.y - expand,
      rect.width + expand * 2,
      rect.height + expand * 2,
      30
    );
  }

  drawGlassShell(graphics, rect, { fillColor, fillAlpha }) {
    const radius = Math.max(22, Math.round(26 * this.metrics.uiScale));

    graphics.clear();
    graphics.fillStyle(0x02050a, 0.34);
    graphics.fillRoundedRect(rect.x + 10, rect.y + 14, rect.width, rect.height, radius + 2);
    graphics.fillStyle(fillColor, fillAlpha);
    graphics.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, radius);
    graphics.fillStyle(0x162338, 0.2);
    graphics.fillRoundedRect(rect.x + 2, rect.y + 2, rect.width - 4, Math.round(rect.height * 0.32), radius);
    graphics.lineStyle(1.5, theme.colors.panelBorderSoft ?? 0xffffff, 0.12);
    graphics.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, radius);
    graphics.lineStyle(1, theme.colors.panelBorderSoft ?? 0xffffff, 0.05);
    graphics.strokeRoundedRect(rect.x + 8, rect.y + 8, rect.width - 16, rect.height - 16, radius - 8);
    graphics.lineStyle(1, theme.colors.panelBorderSoft ?? 0xffffff, 0.08);
    graphics.lineBetween(rect.x + 24, rect.y + 18, rect.x + rect.width - 24, rect.y + 18);
  }

  layoutTexts(layout, metrics) {
    this.kickerText.setPosition(layout.heroInner.x, layout.heroInner.y);
    this.kickerText.setFontSize(Math.max(13, Math.round(15 * metrics.uiScale)));

    this.titleText.setPosition(layout.heroInner.x, layout.heroInner.y + Math.round(30 * metrics.uiScale));
    this.titleText.setFontSize(Math.max(30, Math.round(50 * metrics.uiScale)));
    this.titleText.setWordWrapWidth(layout.loopTextWidth);

    this.bodyText.setPosition(
      layout.heroInner.x,
      this.titleText.y + this.titleText.height + Math.round(18 * metrics.uiScale)
    );
    this.bodyText.setFontSize(Math.max(15, Math.round(18 * metrics.uiScale)));
    this.bodyText.setWordWrapWidth(layout.loopTextWidth);

    this.quickStartTitle.setPosition(
      layout.heroInner.x,
      this.bodyText.y + this.bodyText.height + Math.round(22 * metrics.uiScale)
    );
    this.quickStartTitle.setFontSize(Math.max(18, Math.round(22 * metrics.uiScale)));

    this.quickStartText.setPosition(
      layout.heroInner.x,
      this.quickStartTitle.y + this.quickStartTitle.height + Math.round(8 * metrics.uiScale)
    );
    this.quickStartText.setFontSize(Math.max(14, Math.round(16 * metrics.uiScale)));
    this.quickStartText.setWordWrapWidth(layout.loopTextWidth);

    const heroMetricsTop = layout.heroRect.y + layout.heroRect.height - Math.round(100 * metrics.uiScale);
    const heroMetricGap = Math.round(12 * metrics.uiScale);
    const heroMetricWidth = Math.round((layout.heroInner.width - heroMetricGap * 2) / 3);

    this.metricLabelTexts.forEach((text, index) => {
      const x = layout.heroInner.x + index * (heroMetricWidth + heroMetricGap) + 16;
      text.setPosition(x, heroMetricsTop + 14);
      text.setFontSize(Math.max(11, Math.round(12 * metrics.uiScale)));
    });

    this.metricValueTexts.forEach((text, index) => {
      const x = layout.heroInner.x + index * (heroMetricWidth + heroMetricGap) + 16;
      text.setPosition(x, heroMetricsTop + 36);
      text.setFontSize(Math.max(16, Math.round((index === 2 ? 17 : 20) * metrics.uiScale)));
    });

    this.missionEyebrowText.setPosition(layout.sideInner.x, layout.sideInner.y);
    this.missionEyebrowText.setFontSize(Math.max(11, Math.round(13 * metrics.uiScale)));

    this.missionTitle.setPosition(
      layout.sideInner.x,
      this.missionEyebrowText.y + this.missionEyebrowText.height + Math.round(8 * metrics.uiScale)
    );
    this.missionTitle.setFontSize(Math.max(21, Math.round(27 * metrics.uiScale)));

    this.missionText.setPosition(
      layout.sideInner.x,
      this.missionTitle.y + this.missionTitle.height + Math.round(12 * metrics.uiScale)
    );
    this.missionText.setFontSize(Math.max(14, Math.round(16 * metrics.uiScale)));
    this.missionText.setWordWrapWidth(layout.statTextWidth);

    const missionBandY = layout.sideInner.y + Math.round(198 * metrics.uiScale);
    this.commandNotesTitle.setPosition(layout.sideInner.x, missionBandY + Math.round(88 * metrics.uiScale));
    this.commandNotesTitle.setFontSize(Math.max(17, Math.round(20 * metrics.uiScale)));

    this.commandNotesText.setPosition(
      layout.sideInner.x,
      this.commandNotesTitle.y + this.commandNotesTitle.height + Math.round(10 * metrics.uiScale)
    );
    this.commandNotesText.setFontSize(Math.max(14, Math.round(15 * metrics.uiScale)));
    this.commandNotesText.setWordWrapWidth(layout.statTextWidth);

    this.shortcutText.setPosition(
      layout.sideInner.x,
      layout.sideRect.y + layout.sideRect.height - Math.round(22 * metrics.uiScale)
    );
    this.shortcutText.setFontSize(Math.max(11, Math.round(12 * metrics.uiScale)));
  }

  layoutButtons(layout, metrics) {
    const buttonWidth = layout.button.width;
    const buttonHeight = layout.button.height;
    const gap = Math.round(10 * metrics.uiScale);
    const baseY =
      layout.sideRect.y +
      layout.sideRect.height -
      buttonHeight * 3 -
      gap * 2 -
      Math.round(44 * metrics.uiScale);

    this.playButton.layout({
      x: layout.button.x,
      y: baseY,
      width: buttonWidth,
      height: buttonHeight
    });
    this.helpButton.layout({
      x: layout.button.x,
      y: baseY + buttonHeight + gap,
      width: buttonWidth,
      height: buttonHeight
    });
    this.briefButton.layout({
      x: layout.button.x,
      y: baseY + (buttonHeight + gap) * 2,
      width: buttonWidth,
      height: buttonHeight
    });
  }

  animateIntro(metrics) {
    const introTargets = [
      this.kickerText,
      this.titleText,
      this.bodyText,
      this.quickStartTitle,
      this.quickStartText,
      this.missionEyebrowText,
      this.missionTitle,
      this.missionText,
      this.commandNotesTitle,
      this.commandNotesText,
      this.shortcutText,
      ...this.metricLabelTexts,
      ...this.metricValueTexts,
      this.playButton.root,
      this.helpButton.root,
      this.briefButton.root
    ];

    introTargets.forEach((target) => {
      target.setAlpha(0);
      target.y += Math.round(10 * metrics.uiScale);
    });
    [this.heroPanel, this.sidePanel, this.heroMetrics, this.sideDecor].forEach((target) => {
      target.setAlpha(0);
    });

    this.tweens.add({
      targets: [this.heroPanel, this.sidePanel, this.heroMetrics, this.sideDecor],
      alpha: { from: 0, to: 1 },
      duration: 520,
      ease: 'Sine.Out'
    });

    this.tweens.add({
      targets: introTargets,
      alpha: { from: 0, to: 1 },
      y: `-=${Math.round(10 * metrics.uiScale)}`,
      duration: 740,
      delay: 120,
      ease: 'Sine.Out',
      stagger: 34
    });
  }
}
