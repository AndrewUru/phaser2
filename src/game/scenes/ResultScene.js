import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { theme } from '../config/theme.js';
import { createResponsiveController } from '../layout/responsiveController.js';
import { computeResultLayout } from '../layout/sceneLayouts.js';
import { drawPanel } from '../ui/panel.js';
import { createTextButton } from '../ui/textButton.js';
import { drawWorkshopBackdrop } from '../ui/backdrops.js';
import { gameState } from '../state/GameStateStore.js';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.RESULT);
  }

  create() {
    const snapshot = gameState.getSnapshot();
    this.result = snapshot.results.lastResult;
    this.hasLaunchSnapshot = Boolean(snapshot.flight.launchSnapshot);

    this.background = this.add.graphics();
    this.panel = this.add.graphics();

    this.titleText = this.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '40px',
      fontStyle: '700',
      color: theme.colors.ink
    });
    this.titleText.setOrigin(0, 0);

    this.summaryText = this.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '19px',
      color: theme.colors.muted,
      wordWrap: { width: 420 },
      lineSpacing: 8
    });
    this.summaryText.setOrigin(0, 0);

    this.metricsText = this.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '17px',
      color: theme.colors.ink,
      wordWrap: { width: 420 },
      lineSpacing: 8
    });
    this.metricsText.setOrigin(0, 0);

    this.relaunchButton = createTextButton(this, {
      label: 'Relaunch',
      onClick: () => {
        this.scene.start(this.hasLaunchSnapshot ? SCENE_KEYS.FLIGHT : SCENE_KEYS.BUILD);
      }
    });

    this.hangarButton = createTextButton(this, {
      label: 'Return to Hangar',
      onClick: () => {
        this.scene.start(SCENE_KEYS.BUILD);
      }
    });

    this.layoutController = createResponsiveController(
      this,
      computeResultLayout,
      (layout, metrics) => this.applyLayout(layout, metrics)
    );
  }

  applyLayout(layout, metrics) {
    drawWorkshopBackdrop(this.background, metrics);

    this.panel.clear();
    drawPanel(this.panel, layout.panel, {
      fillColor: theme.colors.panel,
      strokeColor: theme.colors.panelBorder,
      fillAlpha: 0.95
    });

    const result = this.result ?? {
      success: false,
      title: 'No Flight Data',
      summary: 'Run a launch from the hangar to produce a mission result.',
      reason: 'No mission result available.',
      maxAltitude: 0,
      maxSpeed: 0,
      elapsedTime: 0,
      fuelRemaining: 0,
      targetAltitude: 0,
      stagesUsed: 0,
      stageCount: 0,
      finalVelocity: {
        y: 0,
        magnitude: 0
      },
      finalAngle: {
        degrees: 0
      }
    };

    this.titleText.setColor(result.success ? theme.colors.success : theme.colors.danger);
    this.titleText.setText(result.title);
    this.titleText.setPosition(layout.inner.x, layout.inner.y);
    this.titleText.setFontSize(Math.max(28, Math.round(38 * metrics.uiScale)));

    this.summaryText.setText(`${result.summary}\n\nReason: ${result.reason}`);
    this.summaryText.setPosition(layout.inner.x, this.titleText.y + this.titleText.height + Math.round(14 * metrics.uiScale));
    this.summaryText.setFontSize(Math.max(15, Math.round(18 * metrics.uiScale)));
    this.summaryText.setWordWrapWidth(layout.inner.width);

    this.metricsText.setText(
      `Peak altitude: ${Math.max(0, result.maxAltitude).toFixed(0)} m\nMission time: ${result.elapsedTime.toFixed(1)} s\nRemaining fuel: ${result.fuelRemaining.toFixed(0)} u\nStages used: ${result.stagesUsed}/${result.stageCount}\nFinal velocity: ${result.finalVelocity.magnitude.toFixed(1)} m/s\nFinal angle: ${result.finalAngle.degrees.toFixed(1)} deg\nTarget altitude: ${result.targetAltitude.toFixed(0)} m`
    );
    this.metricsText.setPosition(
      layout.inner.x,
      this.summaryText.y + this.summaryText.height + Math.round(18 * metrics.uiScale)
    );
    this.metricsText.setFontSize(Math.max(13, Math.round(16 * metrics.uiScale)));
    this.metricsText.setWordWrapWidth(layout.inner.width);

    this.relaunchButton.layout(layout.primaryButton);
    this.hangarButton.layout(layout.secondaryButton);
  }
}
