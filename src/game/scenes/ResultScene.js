import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { theme } from '../config/theme.js';
import { createResponsiveController } from '../layout/responsiveController.js';
import { computeResultLayout } from '../layout/sceneLayouts.js';
import { drawPanel } from '../ui/panel.js';
import { createTextButton } from '../ui/textButton.js';
import { drawWorkshopBackdrop } from '../ui/backdrops.js';
import { gameState } from '../state/GameStateStore.js';

function formatSignedScore(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

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

    this.missionText = this.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '16px',
      color: '#9ab7d5',
      fontStyle: '700'
    });
    this.missionText.setOrigin(0, 0);

    this.titleText = this.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '40px',
      fontStyle: '700',
      color: theme.colors.ink
    });
    this.titleText.setOrigin(0, 0);

    this.summaryText = this.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '18px',
      color: theme.colors.muted,
      wordWrap: { width: 420 },
      lineSpacing: 8
    });
    this.summaryText.setOrigin(0, 0);

    this.scoreText = this.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '22px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    this.scoreText.setOrigin(0, 0);

    this.metricsText = this.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '16px',
      color: '#edf6ff',
      wordWrap: { width: 420 },
      lineSpacing: 7
    });
    this.metricsText.setOrigin(0, 0);

    this.breakdownText = this.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '15px',
      color: '#dfefff',
      wordWrap: { width: 420 },
      lineSpacing: 6
    });
    this.breakdownText.setOrigin(0, 0);

    this.relaunchButton = createTextButton(this, {
      label: 'Retry Mission',
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

  buildFallbackResult() {
    return {
      success: false,
      missionTitle: 'Mission Brief Missing',
      missionOutcome: 'No Flight Data',
      title: 'No Flight Data',
      summary: 'Run a launch from the hangar to produce a mission result.',
      missionBrief: 'Assemble a rocket in the hangar, launch it, and reach the target altitude.',
      reason: 'No mission result available.',
      maxAltitude: 0,
      elapsedTime: 0,
      fuelRemaining: 0,
      targetAltitude: 0,
      stagesUsed: 0,
      stageCount: 0,
      score: 0,
      scoreBreakdown: [],
      finalVelocity: {
        magnitude: 0
      },
      finalAngle: {
        degrees: 0
      }
    };
  }

  applyLayout(layout, metrics) {
    drawWorkshopBackdrop(this.background, metrics);

    this.panel.clear();
    drawPanel(this.panel, layout.panel, {
      fillColor: theme.colors.panel,
      strokeColor: theme.colors.panelBorder,
      fillAlpha: 0.95
    });

    const result = this.result ?? this.buildFallbackResult();
    const padding = Math.round(22 * metrics.uiScale);
    const innerWidth = layout.inner.width;
    const buttonTop = layout.primaryButton.y - Math.round(18 * metrics.uiScale);

    this.missionText.setText(result.missionTitle || 'Mission Debrief');
    this.missionText.setPosition(layout.inner.x, layout.inner.y);
    this.missionText.setFontSize(Math.max(12, Math.round(15 * metrics.uiScale)));

    this.titleText.setColor(result.success ? theme.colors.success : theme.colors.danger);
    this.titleText.setText(result.missionOutcome || result.title);
    this.titleText.setPosition(layout.inner.x, this.missionText.y + this.missionText.height + Math.round(6 * metrics.uiScale));
    this.titleText.setFontSize(Math.max(24, Math.round(36 * metrics.uiScale)));

    this.summaryText.setText(`${result.summary}\n\nReason: ${result.reason}`);
    this.summaryText.setPosition(layout.inner.x, this.titleText.y + this.titleText.height + Math.round(10 * metrics.uiScale));
    this.summaryText.setFontSize(Math.max(14, Math.round(17 * metrics.uiScale)));
    this.summaryText.setWordWrapWidth(innerWidth);

    this.scoreText.setText(`Score ${Math.round(result.score ?? 0)}`);
    this.scoreText.setPosition(layout.inner.x, this.summaryText.y + this.summaryText.height + Math.round(14 * metrics.uiScale));
    this.scoreText.setFontSize(Math.max(16, Math.round(21 * metrics.uiScale)));

    const metricsLines = [
      `Peak altitude: ${Math.max(0, result.maxAltitude).toFixed(0)} m / ${result.targetAltitude.toFixed(0)} m`,
      `Mission time: ${result.elapsedTime.toFixed(1)} s`,
      `Remaining fuel: ${result.fuelRemaining.toFixed(0)} u`,
      `Stages used: ${result.stagesUsed}/${result.stageCount}`,
      `Final velocity: ${result.finalVelocity.magnitude.toFixed(1)} m/s`,
      `Final angle: ${result.finalAngle.degrees.toFixed(1)} deg`
    ];

    this.metricsText.setText(metricsLines.join('\n'));
    this.metricsText.setPosition(layout.inner.x, this.scoreText.y + this.scoreText.height + Math.round(10 * metrics.uiScale));
    this.metricsText.setFontSize(Math.max(12, Math.round(15 * metrics.uiScale)));
    this.metricsText.setWordWrapWidth(innerWidth);

    const breakdownLines = (result.scoreBreakdown?.length
      ? result.scoreBreakdown
      : [{ label: 'Mission completion', value: 0 }])
      .map((entry) => `${entry.label}: ${formatSignedScore(entry.value)}`);

    this.breakdownText.setText(`Score breakdown\n${breakdownLines.join('\n')}`);
    this.breakdownText.setPosition(
      layout.inner.x,
      Math.min(
        buttonTop - this.breakdownText.height - padding,
        this.metricsText.y + this.metricsText.height + Math.round(14 * metrics.uiScale)
      )
    );
    this.breakdownText.setFontSize(Math.max(11, Math.round(14 * metrics.uiScale)));
    this.breakdownText.setWordWrapWidth(innerWidth);

    this.relaunchButton.layout(layout.primaryButton);
    this.hangarButton.layout(layout.secondaryButton);
  }
}
