import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { theme } from '../config/theme.js';
import { createResponsiveController } from '../layout/responsiveController.js';
import { computeFlightLayout } from '../layout/sceneLayouts.js';
import { createRect } from '../layout/viewport.js';
import { drawPanel } from '../ui/panel.js';
import { createTextButton } from '../ui/textButton.js';
import { gameState } from '../state/GameStateStore.js';
import { createFlightStateFromSnapshot } from '../flight/FlightState.js';
import { FlightSimulator } from '../flight/FlightSimulator.js';
import { FlightInputController } from '../flight/FlightInputController.js';
import { FlightRenderer } from '../flight/FlightRenderer.js';
import { FlightDebugOverlay } from '../flight/FlightDebugOverlay.js';
import { createFlightTelemetry, createMissionResult } from '../flight/FlightTelemetry.js';
import { HowToPlayOverlay } from '../ui/help/HowToPlayOverlay.js';
import { getTutorialHint } from '../ui/help/TutorialHints.js';
import { getMissionDefinition } from '../mission/MissionDefinitions.js';

function createCenteredOverlayRect(metrics, widthFactor = 0.62, heightFactor = 0.46) {
  const width = Math.min(metrics.contentRect.width, Math.round(metrics.width * widthFactor));
  const height = Math.min(metrics.contentRect.height, Math.round(metrics.height * heightFactor));

  return createRect(
    Math.round(metrics.centerX - width * 0.5),
    Math.round(metrics.centerY - height * 0.5),
    width,
    height
  );
}

export class FlightScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.FLIGHT);
    this.resultTransitionPending = false;
    this.previousStageSeparationCount = 0;
    this.previousStatus = 'flying';
  }

  create() {
    const snapshot = gameState.getSnapshot();
    this.launchSnapshot = snapshot.flight.launchSnapshot;
    this.flightState = createFlightStateFromSnapshot(this.launchSnapshot);

    if (this.flightState) {
      const mission = getMissionDefinition();
      const tutorial = getTutorialHint('flight');

      this.renderer = new FlightRenderer(this);
      this.renderer.setMission(this.launchSnapshot);
      this.inputController = new FlightInputController(this);
      this.debugOverlay = new FlightDebugOverlay(this);
      this.helpOverlay = new HowToPlayOverlay(this, {
        pages: [
          {
            title: tutorial.title,
            body: `${tutorial.lines.join('\n')}\n\nGoal: reach ${mission.targetAltitude} meters without crashing or tumbling.`
          },
          {
            title: 'Flight Controls',
            body:
              'Space or THRUST ramps thrust.\nA/D or arrows steer.\nShift, Enter, or STAGE separates the next stage after burnout.\nPress F1 or ` for debug telemetry.'
          }
        ]
      });

      this.helpKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H);
      this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.helpKey?.on('down', () => this.helpOverlay.toggle(0));
      this.escapeKey?.on('down', () => {
        if (this.helpOverlay.visible) {
          this.helpOverlay.hide();
        }
      });

      this.previousStageSeparationCount = this.flightState.stageSeparationCount;
      this.previousStatus = this.flightState.status;

      if (!snapshot.flight.lastTelemetry) {
        this.helpOverlay.show(0);
      }
    } else {
      this.createFallbackView();
    }

    this.layoutController = createResponsiveController(
      this,
      computeFlightLayout,
      (layout, metrics) => this.applyLayout(layout, metrics)
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.helpKey?.destroy();
      this.escapeKey?.destroy();
    });
  }

  createFallbackView() {
    this.fallbackBackground = this.add.graphics();
    this.fallbackPanel = this.add.graphics();
    this.fallbackTitle = this.add.text(0, 0, 'No Launch Payload', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '38px',
      fontStyle: '700',
      color: theme.colors.ink
    });
    this.fallbackTitle.setOrigin(0, 0);

    this.fallbackBody = this.add.text(
      0,
      0,
      'Return to the hangar, validate a build, and launch from there to begin a simulated ascent.',
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '18px',
        color: theme.colors.muted,
        wordWrap: { width: 420 },
        lineSpacing: 8
      }
    );
    this.fallbackBody.setOrigin(0, 0);

    this.backButton = createTextButton(this, {
      label: 'Return to Hangar',
      onClick: () => {
        this.scene.start(SCENE_KEYS.BUILD);
      }
    });
  }

  applyLayout(layout, metrics) {
    if (this.flightState) {
      this.renderer.layoutScene(layout, metrics);
      this.inputController.layout(layout, metrics);
      this.debugOverlay.layout(layout, metrics);
      this.helpOverlay.layout(createCenteredOverlayRect(metrics), metrics);
      this.renderer.update(this.flightState, 0);
      this.debugOverlay.update(this.flightState, this.renderer.getDebugSnapshot(this.flightState));
      return;
    }

    this.fallbackBackground.clear();
    this.fallbackBackground.fillStyle(0x08101c, 1);
    this.fallbackBackground.fillRect(0, 0, metrics.width, metrics.height);

    this.fallbackPanel.clear();
    drawPanel(this.fallbackPanel, layout.fallbackPanel, {
      fillColor: theme.colors.panel,
      strokeColor: theme.colors.panelBorder,
      fillAlpha: 0.95
    });

    const padding = Math.round(24 * metrics.uiScale);
    this.fallbackTitle.setPosition(layout.fallbackPanel.x + padding, layout.fallbackPanel.y + padding);
    this.fallbackTitle.setFontSize(Math.max(24, Math.round(34 * metrics.uiScale)));

    this.fallbackBody.setPosition(
      layout.fallbackPanel.x + padding,
      this.fallbackTitle.y + this.fallbackTitle.height + Math.round(14 * metrics.uiScale)
    );
    this.fallbackBody.setFontSize(Math.max(14, Math.round(17 * metrics.uiScale)));
    this.fallbackBody.setWordWrapWidth(layout.fallbackPanel.width - padding * 2);

    this.backButton.layout({
      x: layout.fallbackPanel.x + padding,
      y: layout.fallbackPanel.y + layout.fallbackPanel.height - Math.round(72 * metrics.uiScale),
      width: Math.min(layout.fallbackPanel.width - padding * 2, 240),
      height: Math.round(52 * metrics.uiScale)
    });
  }

  update(_time, delta) {
    if (!this.flightState) {
      return;
    }

    if (this.helpOverlay.visible) {
      this.renderer.update(this.flightState, 0);
      this.debugOverlay.update(this.flightState, this.renderer.getDebugSnapshot(this.flightState));
      return;
    }

    const dt = Math.min(delta / 1000, 1 / 20);
    const input = this.inputController.getInputState();

    FlightSimulator.update(this.flightState, input, dt);

    if (this.flightState.stageSeparationCount > this.previousStageSeparationCount) {
      this.renderer.triggerShake(7, 0.2);
      this.previousStageSeparationCount = this.flightState.stageSeparationCount;
    }

    if (
      this.previousStatus === 'flying' &&
      this.flightState.status === 'failed' &&
      this.flightState.resultCode === 'impact'
    ) {
      this.renderer.triggerShake(12, 0.35);
    }
    this.previousStatus = this.flightState.status;

    this.renderer.update(this.flightState, dt);

    const telemetry = createFlightTelemetry(this.flightState);
    this.debugOverlay.update(this.flightState, this.renderer.getDebugSnapshot(this.flightState));
    gameState.setFlightTelemetry(telemetry);

    if (this.flightState.status !== 'flying' && !this.resultTransitionPending) {
      this.resultTransitionPending = true;
      this.persistResult(telemetry);
      this.time.delayedCall(950, () => {
        this.scene.start(SCENE_KEYS.RESULT);
      });
    }
  }

  persistResult(telemetry) {
    gameState.setResult(createMissionResult(this.flightState, telemetry));
  }
}
