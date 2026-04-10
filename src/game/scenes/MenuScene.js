import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { theme } from '../config/theme.js';
import { createResponsiveController } from '../layout/responsiveController.js';
import { computeMenuLayout } from '../layout/sceneLayouts.js';
import { drawPanel } from '../ui/panel.js';
import { createTextButton } from '../ui/textButton.js';
import { drawWorkshopBackdrop } from '../ui/backdrops.js';
import { HowToPlayOverlay } from '../ui/help/HowToPlayOverlay.js';
import { getTutorialHint } from '../ui/help/TutorialHints.js';
import { getMissionDefinition } from '../mission/MissionDefinitions.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create() {
    this.mission = getMissionDefinition();
    const menuHint = getTutorialHint('menu');

    this.background = this.add.graphics();
    this.heroPanel = this.add.graphics();
    this.sidePanel = this.add.graphics();
    this.heroAccent = this.add.graphics();

    this.kickerText = this.add.text(0, 0, 'ROCKET HANGAR PROGRAM', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '16px',
      color: theme.colors.accentStrong,
      fontStyle: '700'
    });
    this.kickerText.setOrigin(0, 0);

    this.titleText = this.add.text(0, 0, 'Build the rocket. Fly the mission. Learn by launching.', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '56px',
      color: theme.colors.ink,
      fontStyle: '700',
      wordWrap: { width: 420 }
    });
    this.titleText.setOrigin(0, 0);

    this.bodyText = this.add.text(
      0,
      0,
      'Rocket Hangar is now a readable vertical slice: plan your stack in the hangar, validate it, then guide a staged launch toward the mission target altitude.',
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '20px',
        color: theme.colors.muted,
        wordWrap: { width: 420 },
        lineSpacing: 8
      }
    );
    this.bodyText.setOrigin(0, 0);

    this.quickStartTitle = this.add.text(0, 0, menuHint.title, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '22px',
      color: theme.colors.ink,
      fontStyle: '700'
    });
    this.quickStartTitle.setOrigin(0, 0);

    this.quickStartText = this.add.text(0, 0, menuHint.lines.map((line) => `• ${line}`).join('\n'), {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '17px',
      color: theme.colors.ink,
      wordWrap: { width: 380 },
      lineSpacing: 8
    });
    this.quickStartText.setOrigin(0, 0);

    this.missionTitle = this.add.text(0, 0, this.mission.title, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '24px',
      color: theme.colors.ink,
      fontStyle: '700'
    });
    this.missionTitle.setOrigin(0, 0);

    this.missionText = this.add.text(
      0,
      0,
      `${this.mission.brief}\n\nTarget: ${this.mission.targetAltitude} m`,
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '18px',
        color: theme.colors.muted,
        wordWrap: { width: 320 },
        lineSpacing: 8
      }
    );
    this.missionText.setOrigin(0, 0);

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

    this.helpKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.events.on(Phaser.Scenes.Events.UPDATE, this.handleOverlayKeys, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, this.handleOverlayKeys, this);
      this.helpKey?.destroy();
      this.escapeKey?.destroy();
    });

    this.layoutController = createResponsiveController(
      this,
      computeMenuLayout,
      (layout, metrics) => this.applyLayout(layout, metrics)
    );
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
    drawWorkshopBackdrop(this.background, metrics);

    this.heroPanel.clear();
    drawPanel(this.heroPanel, layout.heroRect, {
      fillColor: theme.colors.panel,
      strokeColor: theme.colors.panelBorder,
      fillAlpha: 0.9
    });

    this.sidePanel.clear();
    drawPanel(this.sidePanel, layout.sideRect, {
      fillColor: theme.colors.panelAlt,
      strokeColor: 0x8eb0d9,
      fillAlpha: 0.94
    });

    this.heroAccent.clear();
    this.heroAccent.fillStyle(0xff9a57, 1);
    this.heroAccent.fillRoundedRect(
      layout.heroRect.x + 18,
      layout.heroRect.y + 18,
      Math.max(120, layout.heroRect.width * 0.28),
      8,
      4
    );

    this.kickerText.setPosition(layout.heroInner.x, layout.heroInner.y);
    this.kickerText.setFontSize(Math.max(13, Math.round(15 * metrics.uiScale)));

    this.titleText.setPosition(layout.heroInner.x, layout.heroInner.y + Math.round(32 * metrics.uiScale));
    this.titleText.setFontSize(Math.max(28, Math.round(48 * metrics.uiScale)));
    this.titleText.setWordWrapWidth(layout.loopTextWidth);

    this.bodyText.setPosition(layout.heroInner.x, this.titleText.y + this.titleText.height + Math.round(18 * metrics.uiScale));
    this.bodyText.setFontSize(Math.max(15, Math.round(18 * metrics.uiScale)));
    this.bodyText.setWordWrapWidth(layout.loopTextWidth);

    this.quickStartTitle.setPosition(layout.heroInner.x, this.bodyText.y + this.bodyText.height + Math.round(22 * metrics.uiScale));
    this.quickStartTitle.setFontSize(Math.max(18, Math.round(22 * metrics.uiScale)));

    this.quickStartText.setPosition(layout.heroInner.x, this.quickStartTitle.y + this.quickStartTitle.height + 8);
    this.quickStartText.setFontSize(Math.max(14, Math.round(16 * metrics.uiScale)));
    this.quickStartText.setWordWrapWidth(layout.loopTextWidth);

    this.missionTitle.setPosition(layout.sideInner.x, layout.sideInner.y);
    this.missionTitle.setFontSize(Math.max(20, Math.round(24 * metrics.uiScale)));

    this.missionText.setPosition(layout.sideInner.x, this.missionTitle.y + this.missionTitle.height + 10);
    this.missionText.setFontSize(Math.max(14, Math.round(16 * metrics.uiScale)));
    this.missionText.setWordWrapWidth(layout.statTextWidth);

    const buttonWidth = layout.button.width;
    const buttonHeight = layout.button.height;
    const gap = Math.round(10 * metrics.uiScale);
    const baseY = layout.sideRect.y + layout.sideRect.height - buttonHeight * 3 - gap * 2 - Math.round(20 * metrics.uiScale);

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

    this.helpOverlay.layout(
      {
        x: metrics.centerX - Math.min(metrics.width * 0.76, 620) * 0.5,
        y: metrics.centerY - Math.min(metrics.height * 0.58, 420) * 0.5,
        width: Math.min(metrics.width * 0.76, 620),
        height: Math.min(metrics.height * 0.58, 420)
      },
      metrics
    );
  }
}
