import { FLIGHT_CONSTANTS } from './FlightConstants.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatVelocity(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)} m/s`;
}

function getPaletteColor(partId) {
  switch (partId) {
    case 'capsule':
      return { fill: 0x6ea0d7, accent: 0xcfe8ff };
    case 'fuel_tank':
      return { fill: 0x4e7b5d, accent: 0x9fe1ad };
    case 'engine':
      return { fill: 0x796070, accent: 0xffbc83 };
    case 'decoupler':
      return { fill: 0x87724d, accent: 0xffde99 };
    default:
      return { fill: 0x626ca7, accent: 0xc7d0ff };
  }
}

export class FlightRenderer {
  constructor(scene) {
    this.scene = scene;
    this.layout = null;
    this.metrics = null;
    this.snapshot = null;
    this.visiblePartSignature = '';
    this.partRects = [];
    this.exhaustPorts = [];
    this.cameraAltitude = 0;
    this.shakeTimer = 0;
    this.shakeStrength = 0;

    this.skyGraphics = scene.add.graphics();
    this.worldGraphics = scene.add.graphics();
    this.padGraphics = scene.add.graphics();
    this.debugWorldGraphics = scene.add.graphics();
    this.rocketContainer = scene.add.container(0, 0);
    this.rocketBody = scene.add.graphics();
    this.exhaustGraphics = scene.add.graphics();
    this.rocketContainer.add([this.exhaustGraphics, this.rocketBody]);

    this.hudPanel = scene.add.graphics();
    this.objectivePanel = scene.add.graphics();

    this.objectiveText = this.#createText(16, '#edf6ff', 700, 0.5, 0.5);
    this.statusText = this.#createText(16, '#edf6ff', 700, 0.5, 0.5);

    this.hudTexts = {
      stage: this.#createText(16, '#edf6ff'),
      altitude: this.#createText(16, '#edf6ff'),
      velocity: this.#createText(16, '#edf6ff'),
      fuel: this.#createText(16, '#edf6ff'),
      instruction: this.#createText(15, '#9ab7d5')
    };
  }

  #createText(size, color, weight = 700, originX = 0, originY = 0) {
    const text = this.scene.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: `${weight}`
    });
    text.setOrigin(originX, originY);
    return text;
  }

  setMission(snapshot) {
    this.snapshot = snapshot;
    this.visiblePartSignature = '';
  }

  layoutScene(layout, metrics) {
    this.layout = layout;
    this.metrics = metrics;

    this.hudPanel.clear();
    this.hudPanel.fillStyle(0x102038, 0.82);
    this.hudPanel.fillRoundedRect(layout.hudRect.x, layout.hudRect.y, layout.hudRect.width, layout.hudRect.height, 18);
    this.hudPanel.lineStyle(2, 0x7b9bc2, 0.9);
    this.hudPanel.strokeRoundedRect(layout.hudRect.x, layout.hudRect.y, layout.hudRect.width, layout.hudRect.height, 18);

    this.objectivePanel.clear();
    this.objectivePanel.fillStyle(0x102038, 0.72);
    this.objectivePanel.fillRoundedRect(layout.statusRect.x, layout.statusRect.y, layout.statusRect.width, layout.statusRect.height, 18);
    this.objectivePanel.lineStyle(2, 0x6f8fb5, 0.65);
    this.objectivePanel.strokeRoundedRect(layout.statusRect.x, layout.statusRect.y, layout.statusRect.width, layout.statusRect.height, 18);

    this.objectiveText.setPosition(
      layout.statusRect.x + layout.statusRect.width * 0.5,
      layout.statusRect.y + Math.round(layout.statusRect.height * 0.35)
    );
    this.statusText.setPosition(
      layout.statusRect.x + layout.statusRect.width * 0.5,
      layout.statusRect.y + Math.round(layout.statusRect.height * 0.72)
    );
    this.objectiveText.setFontSize(Math.max(12, Math.round(16 * metrics.uiScale)));
    this.statusText.setFontSize(Math.max(12, Math.round(14 * metrics.uiScale)));

    this.#drawStaticBackdrop();
  }

  update(state, dt) {
    if (!this.layout || !this.metrics || !state) {
      return;
    }

    const partSignature = (state.activePartIds ?? []).join('|');
    if (partSignature !== this.visiblePartSignature) {
      this.visiblePartSignature = partSignature;
      this.#rebuildRocketGeometry(state.activePartIds ?? []);
    }

    const alpha = 1 - Math.exp(-FLIGHT_CONSTANTS.cameraFollowSpeed * Math.max(dt, 0));
    const lookahead =
      FLIGHT_CONSTANTS.cameraFollowLookahead +
      Math.max(0, state.velocity.y) * FLIGHT_CONSTANTS.cameraVelocityLookahead;
    const targetCameraAltitude =
      state.position.y > FLIGHT_CONSTANTS.cameraFollowStartAltitude
        ? Math.max(0, state.position.y - lookahead)
        : 0;

    this.cameraAltitude += (targetCameraAltitude - this.cameraAltitude) * alpha;
    state.cameraAltitude = this.cameraAltitude;
    this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    this.#drawDynamicWorld(state);
    this.#updateRocket(state);
    this.#updateHud(state);
  }

  triggerShake(strength = 10, duration = 0.22) {
    this.shakeStrength = strength;
    this.shakeTimer = duration;
  }

  getDebugSnapshot(state) {
    if (!this.layout || !this.metrics) {
      return null;
    }

    return {
      worldRect: this.layout.worldRect,
      rocketCenter: {
        x: this.rocketContainer.x,
        y: this.rocketContainer.y
      },
      targetAltitudeY: this.groundScreenY - state.targetAltitude * this.worldScale,
      worldScale: this.worldScale,
      groundScreenY: this.groundScreenY,
      padCenterX: this.padCenterX
    };
  }

  #rebuildRocketGeometry(activePartIds) {
    if (!this.snapshot || !this.layout || !this.metrics) {
      return;
    }

    const idSet = new Set(activePartIds);
    const parts = (this.snapshot.parts ?? []).filter((part) => idSet.has(part.id));
    if (parts.length === 0) {
      this.partRects = [];
      this.exhaustPorts = [];
      this.rocketBody.clear();
      return;
    }

    const minX = Math.min(...parts.map((part) => part.origin.x));
    const maxX = Math.max(...parts.map((part) => part.origin.x + part.size.width - 1));
    const minY = Math.min(...parts.map((part) => part.origin.y));
    const maxY = Math.max(...parts.map((part) => part.origin.y + part.size.height - 1));
    const widthCells = maxX - minX + 1;
    const heightCells = maxY - minY + 1;

    this.rocketCellPixels = clamp(
      Math.min(
        24 * this.metrics.uiScale,
        this.layout.worldRect.width / (widthCells + 16),
        this.layout.worldRect.height / (heightCells + 22)
      ),
      12,
      26
    );

    this.partRects = parts.map((part) => ({
      part,
      x: (part.origin.x - minX - widthCells * 0.5) * this.rocketCellPixels,
      y: -((part.origin.y - minY) + part.size.height) * this.rocketCellPixels,
      width: part.size.width * this.rocketCellPixels,
      height: part.size.height * this.rocketCellPixels
    }));

    this.exhaustPorts = this.partRects
      .filter((rect) => rect.part.stats.thrust > 0)
      .map((rect) => ({
        x: rect.x + rect.width * 0.5,
        y: rect.y + rect.height,
        width: Math.max(10, rect.width * 0.6)
      }));

    this.rocketBody.clear();
    this.partRects.forEach((rect) => {
      const palette = getPaletteColor(rect.part.partId);
      this.rocketBody.fillStyle(palette.fill, 1);
      this.rocketBody.fillRoundedRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4, 9);
      this.rocketBody.fillStyle(palette.accent, 0.95);
      this.rocketBody.fillRect(rect.x + 6, rect.y + 6, rect.width - 12, Math.max(6, rect.height * 0.16));
      this.rocketBody.lineStyle(2, 0xf2f7ff, 0.45);
      this.rocketBody.strokeRoundedRect(rect.x + 1.5, rect.y + 1.5, rect.width - 3, rect.height - 3, 9);
    });
  }

  #drawStaticBackdrop() {
    const { worldRect } = this.layout;

    this.skyGraphics.clear();
    this.skyGraphics.fillStyle(0x07111d, 1);
    this.skyGraphics.fillRect(worldRect.x, worldRect.y, worldRect.width, worldRect.height);
    this.skyGraphics.fillStyle(0x122744, 1);
    this.skyGraphics.fillRect(worldRect.x, worldRect.y, worldRect.width, worldRect.height * 0.72);
    this.skyGraphics.fillStyle(0x2f5d8f, 0.16);
    this.skyGraphics.fillCircle(worldRect.x + worldRect.width * 0.18, worldRect.y + worldRect.height * 0.22, worldRect.width * 0.12);
    this.skyGraphics.fillCircle(worldRect.x + worldRect.width * 0.82, worldRect.y + worldRect.height * 0.16, worldRect.width * 0.09);
  }

  #drawDynamicWorld(state) {
    const { worldRect } = this.layout;
    const worldScale = FLIGHT_CONSTANTS.worldPixelsPerUnit * this.metrics.shorterSide / 720;
    const padCenterX = worldRect.x + worldRect.width * 0.5;
    const groundScreenY = worldRect.y + worldRect.height * 0.84 + this.cameraAltitude * worldScale;
    const shakeOffsetY = this.shakeTimer > 0 ? (Math.random() * 2 - 1) * this.shakeStrength : 0;
    const shakeOffsetX = this.shakeTimer > 0 ? (Math.random() * 2 - 1) * this.shakeStrength * 0.5 : 0;

    this.worldGraphics.clear();
    this.padGraphics.clear();
    this.debugWorldGraphics.clear();

    this.worldGraphics.fillStyle(0x203a5e, 0.28);
    const cloudOffset = (this.cameraAltitude * worldScale * 0.18) % (worldRect.height * 0.6);
    this.worldGraphics.fillEllipse(
      worldRect.x + worldRect.width * 0.22,
      worldRect.y + worldRect.height * 0.18 + cloudOffset,
      worldRect.width * 0.22,
      worldRect.height * 0.08
    );
    this.worldGraphics.fillEllipse(
      worldRect.x + worldRect.width * 0.72,
      worldRect.y + worldRect.height * 0.32 + cloudOffset * 0.7,
      worldRect.width * 0.26,
      worldRect.height * 0.1
    );

    this.padGraphics.fillStyle(0x0f1a2b, 1);
    this.padGraphics.fillRect(worldRect.x, groundScreenY, worldRect.width, worldRect.height);
    this.padGraphics.fillStyle(0x18263c, 1);
    this.padGraphics.fillRect(padCenterX - 110, groundScreenY - 18, 220, 18);
    this.padGraphics.fillStyle(0x22344f, 1);
    this.padGraphics.fillRect(padCenterX - 22, groundScreenY - 170, 44, 170);
    this.padGraphics.fillStyle(0x3d608a, 0.35);
    this.padGraphics.fillRect(padCenterX + 24, groundScreenY - 130, 10, 100);
    this.padGraphics.lineStyle(2, 0x89b3e0, 0.25);
    this.padGraphics.lineBetween(worldRect.x, groundScreenY, worldRect.x + worldRect.width, groundScreenY);

    const targetY = groundScreenY - state.targetAltitude * worldScale;
    if (targetY >= worldRect.y && targetY <= worldRect.y + worldRect.height) {
      this.worldGraphics.lineStyle(3, 0x9de2ae, 0.55);
      this.worldGraphics.lineBetween(worldRect.x + 20, targetY, worldRect.x + worldRect.width - 20, targetY);
      this.worldGraphics.fillStyle(0x9de2ae, 0.92);
      this.worldGraphics.fillCircle(worldRect.x + 20, targetY, 5);
    }

    this.worldScale = worldScale;
    this.padCenterX = padCenterX + shakeOffsetX;
    this.groundScreenY = groundScreenY + shakeOffsetY;
  }

  #updateRocket(state) {
    if (!this.partRects.length) {
      return;
    }

    const rocketX = this.padCenterX + state.position.x * this.worldScale;
    const rocketY = this.groundScreenY - state.position.y * this.worldScale;

    this.rocketContainer.setPosition(rocketX, rocketY);
    this.rocketContainer.setRotation(state.angle);

    this.exhaustGraphics.clear();
    if (state.thrustActive && state.activeStageFuelRemaining > 0) {
      const flameLength = this.rocketCellPixels * (1.1 + state.throttle * 1.4 + Math.random() * 0.35);
      this.exhaustPorts.forEach((port, index) => {
        const spread = port.width * 0.65;
        const jitter = (index % 2 === 0 ? -1 : 1) * Math.random() * 2;
        this.exhaustGraphics.fillStyle(index % 2 === 0 ? 0xffd36e : 0xff8a57, 0.88);
        this.exhaustGraphics.fillTriangle(
          port.x,
          port.y + 4,
          port.x - spread * 0.5,
          port.y + flameLength + jitter,
          port.x + spread * 0.5,
          port.y + flameLength - jitter
        );
      });
    }
  }

  #updateHud(state) {
    const padding = Math.round(16 * this.metrics.uiScale);
    const startX = this.layout.hudRect.x + padding;
    let nextY = this.layout.hudRect.y + padding;

    this.hudTexts.stage.setText(`Stage: ${state.currentStageIndex + 1}/${state.stages.length}`);
    this.hudTexts.altitude.setText(`Altitude: ${Math.max(0, state.position.y).toFixed(0)} m`);
    this.hudTexts.velocity.setText(`Vertical speed: ${formatVelocity(state.velocity.y)}`);
    this.hudTexts.fuel.setText(`Fuel: ${state.fuelRemaining.toFixed(0)} u`);
    this.hudTexts.instruction.setText('A/D steer. Space thrust. Shift/Enter or STG separates.');

    Object.values(this.hudTexts).forEach((text, index) => {
      text.setPosition(startX, nextY);
      text.setFontSize(Math.max(12, Math.round((index === 4 ? 13 : 14) * this.metrics.uiScale)));
      text.setWordWrapWidth(this.layout.hudRect.width - padding * 2);
      nextY += text.height + Math.round(4 * this.metrics.uiScale);
    });

    this.objectiveText.setText(`Target altitude: ${state.targetAltitude.toFixed(0)} m`);

    if (state.status === 'success') {
      this.statusText.setColor('#8de0a2');
      this.statusText.setText(state.resultLabel);
    } else if (state.status === 'failed') {
      this.statusText.setColor('#ff9d96');
      this.statusText.setText(state.resultLabel);
    } else if (state.eventTimer > 0) {
      this.statusText.setColor('#ffd777');
      this.statusText.setText(state.eventMessage);
    } else if (state.stageReady) {
      this.statusText.setColor('#ffd777');
      this.statusText.setText('Stage separation ready');
    } else if (state.fuelRemaining <= Math.max(10, state.totalFuelCapacity * 0.18)) {
      this.statusText.setColor('#ffd777');
      this.statusText.setText('Low fuel');
    } else if (Math.abs(state.angle) * (180 / Math.PI) >= FLIGHT_CONSTANTS.tiltWarningDegrees) {
      this.statusText.setColor('#ffb38f');
      this.statusText.setText('High tilt danger');
    } else if (state.maxAltitude >= state.targetAltitude * 0.82) {
      this.statusText.setColor('#8de0a2');
      this.statusText.setText('Target altitude close');
    } else if (state.thrustActive) {
      this.statusText.setColor('#9ab7d5');
      this.statusText.setText(`Throttle ${Math.round(state.throttle * 100)}%`);
    } else {
      this.statusText.setColor('#9ab7d5');
      this.statusText.setText('Awaiting thrust input');
    }
  }
}
