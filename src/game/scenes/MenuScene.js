import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { theme } from '../config/theme.js';
import { createResponsiveController } from '../layout/responsiveController.js';
import { computeMenuLayout } from '../layout/sceneLayouts.js';
import { drawPanel } from '../ui/panel.js';
import { createTextButton } from '../ui/textButton.js';
import { drawWorkshopBackdrop } from '../ui/backdrops.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create() {
    this.background = this.add.graphics();
    this.heroPanel = this.add.graphics();
    this.sidePanel = this.add.graphics();
    this.heroAccent = this.add.graphics();

    this.kickerText = this.add.text(0, 0, 'ORBITAL VEHICLE WORKSHOP', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '16px',
      color: theme.colors.accentStrong,
      fontStyle: '700'
    });
    this.kickerText.setOrigin(0, 0);

    this.titleText = this.add.text(0, 0, 'Assemble. Validate. Launch.', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '56px',
      color: theme.colors.ink,
      fontStyle: '700',
      wordWrap: { width: 400 }
    });
    this.titleText.setOrigin(0, 0);

    this.bodyText = this.add.text(
      0,
      0,
      'Build a modular rocket in the hangar, certify its flight profile, then guide the ascent toward orbit. Every later system will plug into this scene flow without rewriting layout rules.',
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '20px',
        color: theme.colors.muted,
        wordWrap: { width: 400 },
        lineSpacing: 8
      }
    );
    this.bodyText.setOrigin(0, 0);

    this.loopText = this.add.text(
      0,
      0,
      'Gameplay loop\n1. Build in the hangar\n2. Validate mass, thrust, and stability\n3. Launch and manage ascent\n4. Reach orbit or fail\n5. Review results and retry',
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '18px',
        color: theme.colors.ink,
        wordWrap: { width: 360 },
        lineSpacing: 8
      }
    );
    this.loopText.setOrigin(0, 0);

    this.sideTitle = this.add.text(0, 0, 'Mission Readiness', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '24px',
      color: theme.colors.ink,
      fontStyle: '700'
    });
    this.sideTitle.setOrigin(0, 0);

    this.readinessItems = [
      this.createReadinessText('Responsive layout controller active', theme.colors.success),
      this.createReadinessText('Boot asset pipeline staged', theme.colors.success),
      this.createReadinessText('Hangar scene reserved for Phase 2', theme.colors.warning),
      this.createReadinessText('Flight and results scenes queued next', theme.colors.warning)
    ];

    this.enterHangarButton = createTextButton(this, {
      label: 'Enter Hangar',
      onClick: () => {
        this.scene.start(SCENE_KEYS.BUILD);
      }
    });

    this.layoutController = createResponsiveController(
      this,
      computeMenuLayout,
      (layout, metrics) => this.applyLayout(layout, metrics)
    );
  }

  createReadinessText(text, color) {
    return this.add.text(0, 0, text, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '18px',
      color,
      wordWrap: { width: 320 }
    });
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
    this.titleText.setFontSize(Math.max(30, Math.round(54 * metrics.uiScale)));
    this.titleText.setWordWrapWidth(layout.loopTextWidth);

    this.bodyText.setPosition(layout.heroInner.x, this.titleText.y + this.titleText.height + Math.round(18 * metrics.uiScale));
    this.bodyText.setFontSize(Math.max(16, Math.round(19 * metrics.uiScale)));
    this.bodyText.setWordWrapWidth(layout.loopTextWidth);

    this.loopText.setPosition(layout.heroInner.x, this.bodyText.y + this.bodyText.height + Math.round(24 * metrics.uiScale));
    this.loopText.setFontSize(Math.max(15, Math.round(17 * metrics.uiScale)));
    this.loopText.setWordWrapWidth(layout.loopTextWidth);

    this.sideTitle.setPosition(layout.sideInner.x, layout.sideInner.y);
    this.sideTitle.setFontSize(Math.max(20, Math.round(24 * metrics.uiScale)));

    let nextY = this.sideTitle.y + this.sideTitle.height + Math.round(22 * metrics.uiScale);
    this.readinessItems.forEach((item) => {
      item.setPosition(layout.sideInner.x, nextY);
      item.setFontSize(Math.max(15, Math.round(17 * metrics.uiScale)));
      item.setWordWrapWidth(layout.statTextWidth);
      nextY += item.height + Math.round(12 * metrics.uiScale);
    });

    this.enterHangarButton.layout(layout.button);
  }
}
