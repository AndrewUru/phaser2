import Phaser from 'phaser';
import { FLIGHT_CONSTANTS, resetFlightTuningToDefaults } from './FlightConstants.js';

function radiansToDegrees(value) {
  return (value * 180) / Math.PI;
}

export class FlightDebugOverlay {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;

    this.worldGraphics = scene.add.graphics();
    this.panel = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', {
      fontFamily: '"Consolas", "Lucida Console", monospace',
      fontSize: '13px',
      color: '#dff6ff',
      lineSpacing: 5
    });
    this.text.setOrigin(0, 0);

    this.toggleKeys = {
      f1: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F1),
      backquote: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK),
      reset: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    };

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.handleToggle, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.handleToggle, this);
    });

    this.applyVisibility();
  }

  handleToggle() {
    if (
      (this.toggleKeys.f1 && Phaser.Input.Keyboard.JustDown(this.toggleKeys.f1)) ||
      (this.toggleKeys.backquote && Phaser.Input.Keyboard.JustDown(this.toggleKeys.backquote))
    ) {
      this.visible = !this.visible;
      this.applyVisibility();
    }

    if (this.visible && this.toggleKeys.reset && Phaser.Input.Keyboard.JustDown(this.toggleKeys.reset)) {
      resetFlightTuningToDefaults();
    }
  }

  applyVisibility() {
    this.panel.setVisible(this.visible);
    this.text.setVisible(this.visible);
    if (!this.visible) {
      this.panel.clear();
      this.worldGraphics.clear();
    }
  }

  layout(layout, metrics) {
    this.layoutRect = layout.debugRect;
    this.metrics = metrics;
    this.renderPanel();
  }

  renderPanel() {
    if (!this.visible || !this.layoutRect) {
      return;
    }

    this.panel.clear();
    this.panel.fillStyle(0x06101b, 0.86);
    this.panel.fillRoundedRect(
      this.layoutRect.x,
      this.layoutRect.y,
      this.layoutRect.width,
      this.layoutRect.height,
      18
    );
    this.panel.lineStyle(2, 0x7b9bc2, 0.85);
    this.panel.strokeRoundedRect(
      this.layoutRect.x,
      this.layoutRect.y,
      this.layoutRect.width,
      this.layoutRect.height,
      18
    );
  }

  update(state, debugSnapshot) {
    if (!this.visible || !this.layoutRect || !state) {
      return;
    }

    this.renderPanel();

    const padding = Math.round(14 * this.metrics.uiScale);
    this.text.setPosition(this.layoutRect.x + padding, this.layoutRect.y + padding);
    this.text.setFontSize(Math.max(11, Math.round(12 * this.metrics.uiScale)));
    this.text.setWordWrapWidth(this.layoutRect.width - padding * 2);
    this.text.setText(
      `DEBUG\nstage ${state.currentStageIndex + 1}/${state.stages.length} used ${state.stagesUsed}\n` +
        `mass ${state.currentMass.toFixed(2)}t  thrust ${state.activeStageThrust.toFixed(0)}kN\n` +
        `twr ${state.currentTwr.toFixed(2)}  fuel ${state.fuelRemaining.toFixed(1)}u\n` +
        `alt ${Math.max(0, state.position.y).toFixed(1)}m  vy ${state.velocity.y.toFixed(2)}m/s\n` +
        `angle ${radiansToDegrees(state.angle).toFixed(1)}deg  av ${state.angularVelocity.toFixed(2)}rad/s\n` +
        `stability ${(state.stabilityFactor * 100).toFixed(0)}  throttle ${(state.throttle * 100).toFixed(0)}%\n` +
        `g ${FLIGHT_CONSTANTS.gravity.toFixed(2)}  drag ${FLIGHT_CONSTANTS.dragQuadratic.toFixed(4)}\n` +
        `ramp ${FLIGHT_CONSTANTS.thrustRampUpRate.toFixed(2)}  recover ${FLIGHT_CONSTANTS.autoLevelStrength.toFixed(2)}\n` +
        `crash tilt ${FLIGHT_CONSTANTS.crashTiltDegrees.toFixed(0)}deg  R resets tuning`
    );

    this.worldGraphics.clear();
    if (!debugSnapshot) {
      return;
    }

    const { worldRect, targetAltitudeY, rocketCenter, planetCenter, targetRadius } = debugSnapshot;
    if (planetCenter && targetRadius) {
      this.worldGraphics.lineStyle(2, 0x8de0a2, 0.45);
      this.worldGraphics.strokeCircle(planetCenter.x, planetCenter.y, targetRadius);
    } else if (targetAltitudeY >= worldRect.y && targetAltitudeY <= worldRect.y + worldRect.height) {
      this.worldGraphics.lineStyle(2, 0x8de0a2, 0.65);
      this.worldGraphics.lineBetween(worldRect.x, targetAltitudeY, worldRect.x + worldRect.width, targetAltitudeY);
    }

    this.worldGraphics.lineStyle(2, 0xffd777, 0.85);
    this.worldGraphics.lineBetween(rocketCenter.x - 10, rocketCenter.y, rocketCenter.x + 10, rocketCenter.y);
    this.worldGraphics.lineBetween(rocketCenter.x, rocketCenter.y - 10, rocketCenter.x, rocketCenter.y + 10);
  }
}
