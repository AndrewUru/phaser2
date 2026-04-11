import { FLIGHT_CONSTANTS } from "./FlightConstants.js";
import { getPartAssetKey } from "../build/partsCatalog.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothstep(min, max, value) {
  if (min === max) {
    return value >= max ? 1 : 0;
  }

  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

function formatVelocity(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} m/s`;
}

function getPaletteColor(partId) {
  switch (partId) {
    case "capsule":
      return { fill: 0x6ea0d7, accent: 0xcfe8ff };
    case "fuel_tank":
      return { fill: 0x4e7b5d, accent: 0x9fe1ad };
    case "engine":
      return { fill: 0x796070, accent: 0xffbc83 };
    case "decoupler":
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
    this.visiblePartSignature = "";
    this.partRects = [];
    this.exhaustPorts = [];
    this.autoCameraAltitude = 0;
    this.autoCameraOffsetX = 0;
    this.autoCameraZoom = 1;
    this.cameraAltitude = 0;
    this.cameraOffsetX = 0;
    this.cameraZoom = 1;
    this.viewBlend = 0;
    this.manualCameraAltitude = 0;
    this.manualCameraOffsetX = 0;
    this.manualZoomMultiplier = 1;
    this.trajectoryPoints = [];
    this.shakeTimer = 0;
    this.shakeStrength = 0;
    this.textureVisualBounds = new Map();

    this.skyGraphics = scene.add.graphics();
    this.worldGraphics = scene.add.graphics();
    this.padGraphics = scene.add.graphics();
    this.debugWorldGraphics = scene.add.graphics();
    this.rocketContainer = scene.add.container(0, 0);
    this.rocketSpriteLayer = scene.add.container(0, 0);
    this.rocketBody = scene.add.graphics();
    this.exhaustGraphics = scene.add.graphics();
    this.rocketContainer.add([this.exhaustGraphics, this.rocketSpriteLayer, this.rocketBody]);
    this.partSprites = new Map();

    this.hudPanel = scene.add.graphics();
    this.objectivePanel = scene.add.graphics();

    this.hudHeaderText = this.#createText(11, "#9ab7d5", 700);
    this.objectiveLabelText = this.#createText(11, "#9ab7d5", 700, 0.5, 0.5);
    this.objectiveText = this.#createText(16, "#edf6ff", 700, 0.5, 0.5);
    this.statusText = this.#createText(16, "#edf6ff", 700, 0.5, 0.5);
    this.statusHintText = this.#createText(12, "#9ab7d5", 600, 0.5, 0.5);

    this.hudTexts = {
      stage: this.#createText(16, "#edf6ff"),
      altitude: this.#createText(16, "#edf6ff"),
      velocity: this.#createText(16, "#edf6ff"),
      fuel: this.#createText(16, "#edf6ff"),
      instruction: this.#createText(15, "#9ab7d5"),
    };
  }

  #createText(size, color, weight = 700, originX = 0, originY = 0) {
    const text = this.scene.add.text(0, 0, "", {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: `${weight}`,
    });
    text.setOrigin(originX, originY);
    return text;
  }

  setMission(snapshot) {
    this.snapshot = snapshot;
    this.visiblePartSignature = "";
    this.autoCameraAltitude = 0;
    this.autoCameraOffsetX = 0;
    this.autoCameraZoom = 1;
    this.cameraAltitude = 0;
    this.cameraOffsetX = 0;
    this.cameraZoom = 1;
    this.viewBlend = 0;
    this.manualCameraAltitude = 0;
    this.manualCameraOffsetX = 0;
    this.manualZoomMultiplier = 1;
    this.trajectoryPoints = [{ x: 0, y: 0 }];
    this.partSprites.forEach((sprite) => sprite.destroy());
    this.partSprites.clear();
  }

  layoutScene(layout, metrics) {
    this.layout = layout;
    this.metrics = metrics;

    this.hudPanel.clear();
    this.hudPanel.fillStyle(0x09111d, 0.28);
    this.hudPanel.fillRoundedRect(
      layout.hudRect.x + 10,
      layout.hudRect.y + 14,
      layout.hudRect.width,
      layout.hudRect.height,
      22,
    );
    this.hudPanel.fillStyle(0x0f1c2f, 0.82);
    this.hudPanel.fillRoundedRect(
      layout.hudRect.x,
      layout.hudRect.y,
      layout.hudRect.width,
      layout.hudRect.height,
      22,
    );
    this.hudPanel.fillStyle(0x183454, 0.2);
    this.hudPanel.fillRoundedRect(
      layout.hudRect.x + 2,
      layout.hudRect.y + 2,
      layout.hudRect.width - 4,
      Math.round(layout.hudRect.height * 0.34),
      22,
    );
    this.hudPanel.lineStyle(1.5, 0xffffff, 0.12);
    this.hudPanel.strokeRoundedRect(
      layout.hudRect.x,
      layout.hudRect.y,
      layout.hudRect.width,
      layout.hudRect.height,
      22,
    );
    this.hudPanel.lineStyle(1, 0xffffff, 0.05);
    this.hudPanel.strokeRoundedRect(
      layout.hudRect.x + 8,
      layout.hudRect.y + 8,
      layout.hudRect.width - 16,
      layout.hudRect.height - 16,
      16,
    );
    this.hudPanel.lineStyle(1, 0xffffff, 0.08);
    this.hudPanel.lineBetween(
      layout.hudRect.x + 18,
      layout.hudRect.y + 18,
      layout.hudRect.x + layout.hudRect.width - 18,
      layout.hudRect.y + 18,
    );

    this.objectivePanel.clear();
    this.objectivePanel.fillStyle(0x0a1220, 0.26);
    this.objectivePanel.fillRoundedRect(
      layout.statusRect.x + 8,
      layout.statusRect.y + 12,
      layout.statusRect.width,
      layout.statusRect.height,
      24,
    );
    this.objectivePanel.fillStyle(0x0f1b2e, 0.76);
    this.objectivePanel.fillRoundedRect(
      layout.statusRect.x,
      layout.statusRect.y,
      layout.statusRect.width,
      layout.statusRect.height,
      24,
    );
    this.objectivePanel.fillStyle(0x173554, 0.24);
    this.objectivePanel.fillRoundedRect(
      layout.statusRect.x + 2,
      layout.statusRect.y + 2,
      layout.statusRect.width - 4,
      Math.round(layout.statusRect.height * 0.42),
      24,
    );
    this.objectivePanel.lineStyle(1.5, 0xffffff, 0.12);
    this.objectivePanel.strokeRoundedRect(
      layout.statusRect.x,
      layout.statusRect.y,
      layout.statusRect.width,
      layout.statusRect.height,
      24,
    );
    this.objectivePanel.lineStyle(1, 0x89d1ff, 0.22);
    this.objectivePanel.fillStyle(0x73c08b, 0.18);
    this.objectivePanel.fillRoundedRect(
      layout.statusRect.x + 18,
      layout.statusRect.y + 16,
      Math.max(84, layout.statusRect.width * 0.16),
      8,
      4,
    );

    this.hudHeaderText.setPosition(
      layout.hudRect.x + Math.round(18 * metrics.uiScale),
      layout.hudRect.y + Math.round(12 * metrics.uiScale),
    );
    this.hudHeaderText.setFontSize(Math.max(10, Math.round(11 * metrics.uiScale)));

    this.objectiveLabelText.setPosition(
      layout.statusRect.x + layout.statusRect.width * 0.5,
      layout.statusRect.y + Math.round(layout.statusRect.height * 0.2),
    );
    this.objectiveText.setPosition(
      layout.statusRect.x + layout.statusRect.width * 0.5,
      layout.statusRect.y + Math.round(layout.statusRect.height * 0.5),
    );
    this.statusText.setPosition(
      layout.statusRect.x + layout.statusRect.width * 0.5,
      layout.statusRect.y + Math.round(layout.statusRect.height * 0.74),
    );
    this.statusHintText.setPosition(
      layout.statusRect.x + layout.statusRect.width * 0.5,
      layout.statusRect.y + Math.round(layout.statusRect.height * 0.88),
    );
    this.objectiveText.setFontSize(
      Math.max(18, Math.round(24 * metrics.uiScale)),
    );
    this.objectiveLabelText.setFontSize(Math.max(10, Math.round(11 * metrics.uiScale)));
    this.statusText.setFontSize(Math.max(11, Math.round(13 * metrics.uiScale)));
    this.statusHintText.setFontSize(Math.max(10, Math.round(11 * metrics.uiScale)));

    this.#drawStaticBackdrop();
  }

  update(state, dt) {
    if (!this.layout || !this.metrics || !state) {
      return;
    }

    const partSignature = (state.activePartIds ?? []).join("|");
    if (partSignature !== this.visiblePartSignature) {
      this.visiblePartSignature = partSignature;
      this.#rebuildRocketGeometry(state.activePartIds ?? []);
    }

    const altitude = Math.max(0, state.position.y);
    const zoomTargetAltitude = Math.max(
      FLIGHT_CONSTANTS.cameraZoomTargetAltitude,
      state.targetAltitude,
    );
    const alpha =
      1 - Math.exp(-FLIGHT_CONSTANTS.cameraFollowSpeed * Math.max(dt, 0));
    const viewBlend = smoothstep(
      FLIGHT_CONSTANTS.cameraFollowStartAltitude,
      zoomTargetAltitude,
      altitude,
    );
    const lookahead =
      FLIGHT_CONSTANTS.cameraFollowLookahead +
      Math.max(0, state.velocity.y) * FLIGHT_CONSTANTS.cameraVelocityLookahead;
    const closeCameraAltitude =
      altitude > FLIGHT_CONSTANTS.cameraFollowStartAltitude
        ? Math.max(0, altitude - lookahead)
        : 0;
    const farCameraAltitude = altitude * FLIGHT_CONSTANTS.cameraFarFollowFactor;
    const targetCameraAltitude = lerp(
      closeCameraAltitude,
      farCameraAltitude,
      viewBlend,
    );
    const targetZoom = lerp(
      FLIGHT_CONSTANTS.cameraLaunchZoom,
      FLIGHT_CONSTANTS.cameraMinZoom,
      viewBlend,
    );
    const targetCameraOffsetX =
      state.position.x *
      FLIGHT_CONSTANTS.cameraHorizontalFollowFactor *
      viewBlend;

    if (state.launchHold) {
      this.autoCameraAltitude = 0;
      this.autoCameraOffsetX = 0;
      this.autoCameraZoom = FLIGHT_CONSTANTS.cameraLaunchZoom;
      this.viewBlend = 0;
      state.cameraAltitude = 0;
    } else {
      this.autoCameraAltitude +=
        (targetCameraAltitude - this.autoCameraAltitude) * alpha;
      this.autoCameraOffsetX +=
        (targetCameraOffsetX - this.autoCameraOffsetX) * alpha;
      this.autoCameraZoom += (targetZoom - this.autoCameraZoom) * alpha;
      this.viewBlend += (viewBlend - this.viewBlend) * alpha;
      state.cameraAltitude = this.autoCameraAltitude;
    }

    this.cameraAltitude = this.autoCameraAltitude + this.manualCameraAltitude;
    this.cameraOffsetX = this.autoCameraOffsetX + this.manualCameraOffsetX;
    this.cameraZoom = clamp(
      this.autoCameraZoom * this.manualZoomMultiplier,
      FLIGHT_CONSTANTS.cameraMinZoom * 0.7,
      3.8,
    );

    this.#recordTrajectoryPoint(state);
    this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    this.#drawDynamicWorld(state);
    this.#updateRocket(state);
    this.#updateHud(state);
  }

  triggerShake(strength = 10, duration = 0.22) {
    this.shakeStrength = strength;
    this.shakeTimer = duration;
  }

  panCameraByPixels(deltaX, deltaY) {
    if (!this.worldScale) {
      return;
    }

    this.manualCameraOffsetX -= deltaX / this.worldScale;
    this.manualCameraAltitude += deltaY / this.worldScale;
    this.manualCameraAltitude = clamp(this.manualCameraAltitude, -320, 16000);
    this.manualCameraOffsetX = clamp(this.manualCameraOffsetX, -6000, 6000);
  }

  zoomCameraByWheel(deltaY) {
    const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
    this.manualZoomMultiplier = clamp(
      this.manualZoomMultiplier * zoomFactor,
      0.7,
      6,
    );
  }

  resetManualCamera() {
    this.manualCameraAltitude = 0;
    this.manualCameraOffsetX = 0;
    this.manualZoomMultiplier = 1;
  }

  getDebugSnapshot(state) {
    if (!this.layout || !this.metrics) {
      return null;
    }

    return {
      worldRect: this.layout.worldRect,
      rocketCenter: {
        x: this.rocketContainer.x,
        y: this.rocketContainer.y,
      },
      targetAltitudeY: this.#worldToScreen(0, state.targetAltitude).y,
      worldScale: this.worldScale,
      groundScreenY: this.groundScreenY,
      padCenterX: this.padCenterX,
      planetCenter: this.planetCenter,
      targetRadius: (FLIGHT_CONSTANTS.planetRadius + state.targetAltitude) * this.worldScale,
    };
  }

  #recordTrajectoryPoint(state) {
    const nextPoint = {
      x: state.position.x,
      y: Math.max(0, state.position.y),
    };

    if (this.trajectoryPoints.length === 0) {
      this.trajectoryPoints.push(nextPoint);
      return;
    }

    const previousPoint = this.trajectoryPoints[this.trajectoryPoints.length - 1];
    const dx = nextPoint.x - previousPoint.x;
    const dy = nextPoint.y - previousPoint.y;
    const minimumDistance = FLIGHT_CONSTANTS.trajectorySampleDistance;

    if (
      dx * dx + dy * dy <
        minimumDistance * minimumDistance &&
      state.status === "flying"
    ) {
      return;
    }

    this.trajectoryPoints.push(nextPoint);
    if (this.trajectoryPoints.length > FLIGHT_CONSTANTS.maxTrajectoryPoints) {
      this.trajectoryPoints.shift();
    }
  }

  #worldToScreen(worldX, worldY) {
    return {
      x: this.viewAnchorX + (worldX - this.cameraOffsetX) * this.worldScale,
      y: this.viewAnchorY - (worldY - this.cameraAltitude) * this.worldScale,
    };
  }

  #rebuildRocketGeometry(activePartIds) {
    if (!this.snapshot || !this.layout || !this.metrics) {
      return;
    }

    const idSet = new Set(activePartIds);
    const parts = (this.snapshot.parts ?? []).filter((part) =>
      idSet.has(part.id),
    );
    if (parts.length === 0) {
      this.partRects = [];
      this.exhaustPorts = [];
      this.rocketBody.clear();
      this.partSprites.forEach((sprite) => sprite.destroy());
      this.partSprites.clear();
      return;
    }

    const minX = Math.min(...parts.map((part) => part.origin.x));
    const maxX = Math.max(
      ...parts.map((part) => part.origin.x + part.size.width - 1),
    );
    const minY = Math.min(...parts.map((part) => part.origin.y));
    const maxY = Math.max(
      ...parts.map((part) => part.origin.y + part.size.height - 1),
    );
    const widthCells = maxX - minX + 1;
    const heightCells = maxY - minY + 1;

    this.rocketCellPixels = clamp(
      Math.min(
        24 * this.metrics.uiScale,
        this.layout.worldRect.width / (widthCells + 16),
        this.layout.worldRect.height / (heightCells + 22),
      ),
      12,
      26,
    );

    this.partRects = parts.map((part) => ({
      part,
      x: (part.origin.x - minX - widthCells * 0.5) * this.rocketCellPixels,
      y: (part.origin.y - maxY - 1) * this.rocketCellPixels,
      width: part.size.width * this.rocketCellPixels,
      height: part.size.height * this.rocketCellPixels,
    }));

    this.exhaustPorts = this.partRects
      .filter((rect) => rect.part.stats.thrust > 0)
      .map((rect) => this.#getExhaustPort(rect));

    this.rocketBody.clear();
    const visiblePartIds = new Set();
    this.partRects.forEach((rect) => {
      const assetKey = getPartAssetKey(rect.part.partId);
      const hasTexture = assetKey && this.scene.textures.exists(assetKey);
      visiblePartIds.add(rect.part.id);

      if (hasTexture) {
        this.#renderPartSprite(rect.part.id, assetKey, rect);
        return;
      }

      this.#hidePartSprite(rect.part.id);
      const palette = getPaletteColor(rect.part.partId);
      this.rocketBody.fillStyle(palette.fill, 1);
      this.rocketBody.fillRoundedRect(
        rect.x + 2,
        rect.y + 2,
        rect.width - 4,
        rect.height - 4,
        9,
      );
      this.rocketBody.fillStyle(palette.accent, 0.95);
      this.rocketBody.fillRect(
        rect.x + 6,
        rect.y + 6,
        rect.width - 12,
        Math.max(6, rect.height * 0.16),
      );
      this.rocketBody.lineStyle(2, 0xf2f7ff, 0.45);
      this.rocketBody.strokeRoundedRect(
        rect.x + 1.5,
        rect.y + 1.5,
        rect.width - 3,
        rect.height - 3,
        9,
      );
    });

    [...this.partSprites.keys()].forEach((partId) => {
      if (!visiblePartIds.has(partId)) {
        const sprite = this.partSprites.get(partId);
        sprite?.destroy();
        this.partSprites.delete(partId);
      }
    });
  }

  #drawStaticBackdrop() {
    const { worldRect } = this.layout;

    this.skyGraphics.clear();
    this.skyGraphics.fillStyle(0x8fc9ff, 1);
    this.skyGraphics.fillRect(
      worldRect.x,
      worldRect.y,
      worldRect.width,
      worldRect.height,
    );
    this.skyGraphics.fillStyle(0x5b9cf1, 0.98);
    this.skyGraphics.fillRect(
      worldRect.x,
      worldRect.y,
      worldRect.width,
      worldRect.height * 0.48,
    );
    this.skyGraphics.fillStyle(0x73b4f8, 0.94);
    this.skyGraphics.fillRect(
      worldRect.x,
      worldRect.y + worldRect.height * 0.48,
      worldRect.width,
      worldRect.height * 0.24,
    );
    this.skyGraphics.fillStyle(0x9fd6ff, 0.92);
    this.skyGraphics.fillRect(
      worldRect.x,
      worldRect.y + worldRect.height * 0.72,
      worldRect.width,
      worldRect.height * 0.28,
    );
  }

  #drawDynamicWorld(state) {
    const { worldRect } = this.layout;
    const time = this.scene.time.now * 0.001;
    const altitude = Math.max(0, state.position.y);
    const baseWorldScale =
      (FLIGHT_CONSTANTS.worldPixelsPerUnit * this.metrics.shorterSide) / 720;
    const worldScale = baseWorldScale * this.cameraZoom;
    const viewAnchorX = worldRect.x + worldRect.width * 0.5;
    const viewAnchorY =
      worldRect.y +
      worldRect.height * lerp(0.78, 0.58, this.viewBlend);
    const standbyBob = state.launchHold ? Math.sin(time * 1.4) * 2.4 : 0;
    const shakeOffsetY =
      this.shakeTimer > 0 ? (Math.random() * 2 - 1) * this.shakeStrength : 0;
    const shakeOffsetX =
      this.shakeTimer > 0
        ? (Math.random() * 2 - 1) * this.shakeStrength * 0.5
        : 0;

    this.worldGraphics.clear();
    this.padGraphics.clear();
    this.debugWorldGraphics.clear();

    this.worldScale = worldScale;
    this.viewAnchorX = viewAnchorX + shakeOffsetX;
    this.viewAnchorY = viewAnchorY + shakeOffsetY + standbyBob;

    const planetCenter = this.#worldToScreen(0, -FLIGHT_CONSTANTS.planetRadius);
    const planetRadius = FLIGHT_CONSTANTS.planetRadius * worldScale;
    const surfacePoint = this.#worldToScreen(0, 0);
    const targetRadius =
      (FLIGHT_CONSTANTS.planetRadius + state.targetAltitude) * worldScale;
    const surfaceBlend = 1 - smoothstep(180, 2200, altitude);
    const orbitalBlend = smoothstep(320, 3200, altitude) * this.viewBlend;
    const spaceDarkness = smoothstep(900, 5400, altitude);
    const nearSpaceBlend = smoothstep(2200, 5200, altitude);

    if (orbitalBlend > 0.001) {
      this.worldGraphics.fillStyle(0x8bd7ff, 0.04 + orbitalBlend * 0.08);
      this.worldGraphics.fillCircle(
        planetCenter.x,
        planetCenter.y - planetRadius * 0.14,
        planetRadius * 1.2,
      );
      this.worldGraphics.fillStyle(0x63bfff, 0.05 + orbitalBlend * 0.1);
      this.worldGraphics.fillCircle(
        planetCenter.x,
        planetCenter.y,
        planetRadius * 1.045,
      );
      this.worldGraphics.fillStyle(0x2f8ddb, 0.06 + orbitalBlend * 0.12);
      this.worldGraphics.fillCircle(
        planetCenter.x,
        planetCenter.y,
        planetRadius * 1.012,
      );
      this.worldGraphics.fillStyle(0x173b67, 0.82 + orbitalBlend * 0.16);
      this.worldGraphics.fillCircle(
        planetCenter.x,
        planetCenter.y,
        planetRadius,
      );
      this.worldGraphics.lineStyle(
        Math.max(2, 2 + orbitalBlend * 2),
        0x8edbff,
        0.16 + orbitalBlend * 0.28,
      );
      this.worldGraphics.strokeCircle(
        planetCenter.x,
        planetCenter.y,
        planetRadius * 1.005,
      );
      this.worldGraphics.lineStyle(
        Math.max(1, 1.2 + orbitalBlend * 1.4),
        0xd9f2ff,
        0.1 + orbitalBlend * 0.18,
      );
      this.worldGraphics.strokeCircle(
        planetCenter.x,
        planetCenter.y,
        planetRadius * 1.018,
      );
    }

    this.worldGraphics.lineStyle(2, 0x9de2ae, 0.08 + orbitalBlend * 0.34);
    this.worldGraphics.strokeCircle(planetCenter.x, planetCenter.y, targetRadius);

    const hazeY = surfacePoint.y - worldRect.height * 0.02;
    this.worldGraphics.fillStyle(
      0xffffff,
      Math.max(0, 0.02 + surfaceBlend * 0.07 - nearSpaceBlend * 0.08),
    );
    this.worldGraphics.fillEllipse(
      worldRect.x + worldRect.width * 0.5,
      hazeY,
      worldRect.width * lerp(1.18, 0.96, nearSpaceBlend),
      worldRect.height * lerp(0.11, 0.018, nearSpaceBlend),
    );

    if (spaceDarkness > 0.001) {
      this.worldGraphics.fillStyle(0x07111d, 0.1 + spaceDarkness * 0.82);
      this.worldGraphics.fillRect(
        worldRect.x,
        worldRect.y,
        worldRect.width,
        worldRect.height,
      );
      this.worldGraphics.fillStyle(0x02050c, 0.08 + spaceDarkness * 0.18);
      this.worldGraphics.fillRect(
        worldRect.x,
        worldRect.y,
        worldRect.width,
        surfacePoint.y - worldRect.y,
      );
    }

    if (spaceDarkness > 0.25) {
      const starAlpha = (spaceDarkness - 0.25) / 0.75;
      const starColumns = 9;
      const starRows = 6;
      const xGap = worldRect.width / starColumns;
      const yGap = worldRect.height / Math.max(1, starRows);

      this.worldGraphics.fillStyle(0xeaf4ff, 0.12 + starAlpha * 0.34);
      for (let column = 0; column < starColumns; column += 1) {
        for (let row = 0; row < starRows; row += 1) {
          const starX =
            worldRect.x +
            xGap * (column + 0.5) +
            ((row * 17 + column * 23) % 19) -
            9;
          const starY =
            worldRect.y +
            yGap * (row + 0.35) +
            ((column * 11 + row * 7) % 15) -
            7;
          const radius = ((column + row) % 3 === 0 ? 1.6 : 1.1) + starAlpha * 0.3;
          this.worldGraphics.fillCircle(starX, starY, radius);
        }
      }
    }

    if (this.trajectoryPoints.length > 1) {
      this.worldGraphics.lineStyle(
        clamp(1.4 + this.cameraZoom * 2.2, 1.2, 3.4),
        0xffd777,
        0.36 + orbitalBlend * 0.42,
      );
      this.worldGraphics.beginPath();

      this.trajectoryPoints.forEach((point, index) => {
        const projected = this.#worldToScreen(point.x, point.y);
        if (index === 0) {
          this.worldGraphics.moveTo(projected.x, projected.y);
        } else {
          this.worldGraphics.lineTo(projected.x, projected.y);
        }
      });

      this.worldGraphics.strokePath();
    }
    this.worldGraphics.fillStyle(0x5ea259, 0.95 * surfaceBlend);
    this.worldGraphics.fillRect(
      worldRect.x,
      surfacePoint.y,
      worldRect.width,
      worldRect.y + worldRect.height - surfacePoint.y,
    );
    this.worldGraphics.fillStyle(0x4d8a45, 0.72 * surfaceBlend);
    this.worldGraphics.fillRect(
      worldRect.x,
      surfacePoint.y + worldRect.height * 0.07,
      worldRect.width,
      worldRect.height * 0.3,
    );
    this.worldGraphics.fillStyle(0x7d7e82, 0.98 * surfaceBlend);
    this.worldGraphics.fillRect(
      surfacePoint.x - 170 * surfaceBlend,
      surfacePoint.y - 2,
      340 * surfaceBlend,
      18,
    );
    this.worldGraphics.fillStyle(0x66686c, 0.88 * surfaceBlend);
    this.worldGraphics.fillTriangle(
      surfacePoint.x - 170 * surfaceBlend,
      surfacePoint.y,
      surfacePoint.x - 250 * surfaceBlend,
      surfacePoint.y + 18,
      surfacePoint.x - 170 * surfaceBlend,
      surfacePoint.y + 18,
    );
    this.worldGraphics.fillTriangle(
      surfacePoint.x + 170 * surfaceBlend,
      surfacePoint.y,
      surfacePoint.x + 170 * surfaceBlend,
      surfacePoint.y + 18,
      surfacePoint.x + 250 * surfaceBlend,
      surfacePoint.y + 18,
    );

    if (spaceDarkness > 0.32) {
      const lowerVoidAlpha = (spaceDarkness - 0.32) / 0.68;
      this.worldGraphics.fillStyle(0x02050c, 0.24 + lowerVoidAlpha * 0.7);
      this.worldGraphics.fillRect(
        worldRect.x,
        surfacePoint.y,
        worldRect.width,
        worldRect.y + worldRect.height - surfacePoint.y,
      );
    }

    const padScale = clamp(Math.pow(this.cameraZoom, 0.6), 0.18, 1);
    const padPulse = 0.5 + 0.5 * Math.sin(time * 3.4);
    const engineGlow = state.thrustActive
      ? 0.16 + state.throttle * 0.22
      : state.launchHold
        ? 0.05 + padPulse * 0.03
        : 0.03;
    const surfacePadAlpha = clamp(surfaceBlend * 1.15, 0, 1);
    const orbitalPadAlpha = clamp(orbitalBlend + (1 - surfaceBlend) * 0.3, 0, 1);

    this.padGraphics.fillStyle(0x09111c, 0.16 * surfacePadAlpha);
    this.padGraphics.fillEllipse(
      surfacePoint.x,
      surfacePoint.y + 18 * padScale,
      360 * padScale,
      54 * padScale,
    );
    this.padGraphics.fillStyle(0xffa86a, engineGlow * (0.4 + orbitalPadAlpha * 0.6));
    this.padGraphics.fillEllipse(
      surfacePoint.x,
      surfacePoint.y + 10 * padScale,
      130 * padScale,
      26 * padScale,
    );

    this.padGraphics.fillStyle(0x707176, 0.98 * surfacePadAlpha);
    this.padGraphics.fillRect(
      surfacePoint.x - 166 * padScale,
      surfacePoint.y - 16 * padScale,
      332 * padScale,
      16 * padScale,
    );
    this.padGraphics.fillStyle(0x8c8e94, 0.96 * surfacePadAlpha);
    this.padGraphics.fillRect(
      surfacePoint.x - 118 * padScale,
      surfacePoint.y - 12 * padScale,
      236 * padScale,
      10 * padScale,
    );
    this.padGraphics.fillStyle(0xc9d1dc, 0.98 * surfacePadAlpha);
    this.padGraphics.fillRect(
      surfacePoint.x - 28 * padScale,
      surfacePoint.y - 214 * padScale,
      5 * padScale,
      214 * padScale,
    );
    this.padGraphics.fillRect(
      surfacePoint.x - 6 * padScale,
      surfacePoint.y - 192 * padScale,
      4 * padScale,
      192 * padScale,
    );
    this.padGraphics.fillRect(
      surfacePoint.x + 20 * padScale,
      surfacePoint.y - 168 * padScale,
      4 * padScale,
      156 * padScale,
    );
    this.padGraphics.lineStyle(Math.max(1, 1.2 * padScale), 0xe9f1f8, 0.82 * surfacePadAlpha);
    this.padGraphics.lineBetween(
      surfacePoint.x - 28 * padScale,
      surfacePoint.y - 178 * padScale,
      surfacePoint.x + 18 * padScale,
      surfacePoint.y - 178 * padScale,
    );
    this.padGraphics.lineBetween(
      surfacePoint.x - 28 * padScale,
      surfacePoint.y - 140 * padScale,
      surfacePoint.x + 20 * padScale,
      surfacePoint.y - 140 * padScale,
    );
    this.padGraphics.lineBetween(
      surfacePoint.x - 28 * padScale,
      surfacePoint.y - 104 * padScale,
      surfacePoint.x + 16 * padScale,
      surfacePoint.y - 104 * padScale,
    );
    this.padGraphics.lineBetween(
      surfacePoint.x - 28 * padScale,
      surfacePoint.y - 72 * padScale,
      surfacePoint.x + 12 * padScale,
      surfacePoint.y - 72 * padScale,
    );
    this.padGraphics.fillStyle(0xcfd6de, 0.92 * surfacePadAlpha);
    this.padGraphics.fillRect(
      surfacePoint.x - 84 * padScale,
      surfacePoint.y - 12 * padScale,
      62 * padScale,
      3 * padScale,
    );
    this.padGraphics.lineStyle(Math.max(1, padScale), 0xbfc7d0, 0.8 * surfacePadAlpha);
    this.padGraphics.lineBetween(
      surfacePoint.x - 84 * padScale,
      surfacePoint.y - 10 * padScale,
      surfacePoint.x - 126 * padScale,
      surfacePoint.y - 92 * padScale,
    );
    this.padGraphics.lineBetween(
      surfacePoint.x - 126 * padScale,
      surfacePoint.y - 92 * padScale,
      surfacePoint.x - 124 * padScale,
      surfacePoint.y,
    );
    this.padGraphics.fillStyle(0x0d1623, 0.96 * orbitalPadAlpha);
    this.padGraphics.fillRect(
      surfacePoint.x - 170 * padScale,
      surfacePoint.y - 22 * padScale,
      340 * padScale,
      24 * padScale,
    );
    this.padGraphics.fillStyle(0x18263c, 0.98);
    this.padGraphics.fillRect(
      surfacePoint.x - 132 * padScale,
      surfacePoint.y - 18 * padScale,
      264 * padScale,
      18 * padScale,
    );
    this.padGraphics.fillStyle(0x203349, 1);
    this.padGraphics.fillRect(
      surfacePoint.x - 122 * padScale,
      surfacePoint.y - 44 * padScale,
      244 * padScale,
      16 * padScale,
    );
    this.padGraphics.fillStyle(0x22344f, 0.92);
    this.padGraphics.fillRect(
      surfacePoint.x - 34 * padScale,
      surfacePoint.y - 214 * padScale,
      30 * padScale,
      214 * padScale,
    );
    this.padGraphics.fillStyle(0x2b4564, 0.96);
    this.padGraphics.fillRect(
      surfacePoint.x + 30 * padScale,
      surfacePoint.y - 192 * padScale,
      18 * padScale,
      168 * padScale,
    );
    this.padGraphics.fillStyle(0x395879, 0.7);
    this.padGraphics.fillRect(
      surfacePoint.x - 4 * padScale,
      surfacePoint.y - 150 * padScale,
      58 * padScale,
      8 * padScale,
    );
    this.padGraphics.fillRect(
      surfacePoint.x - 12 * padScale,
      surfacePoint.y - 96 * padScale,
      42 * padScale,
      7 * padScale,
    );
    this.padGraphics.fillStyle(0x3d608a, 0.35);
    this.padGraphics.fillRect(
      surfacePoint.x + 24 * padScale,
      surfacePoint.y - 130 * padScale,
      10 * padScale,
      100 * padScale,
    );
    this.padGraphics.fillStyle(0x172534, 0.76);
    this.padGraphics.fillRect(
      surfacePoint.x - 250 * padScale,
      surfacePoint.y - 14 * padScale,
      48 * padScale,
      14 * padScale,
    );
    this.padGraphics.fillRect(
      surfacePoint.x + 202 * padScale,
      surfacePoint.y - 14 * padScale,
      48 * padScale,
      14 * padScale,
    );
    this.padGraphics.fillStyle(0xa6dcff, (0.24 + padPulse * 0.18) * orbitalPadAlpha);
    this.padGraphics.fillCircle(surfacePoint.x - 96 * padScale, surfacePoint.y - 24 * padScale, 4 * padScale);
    this.padGraphics.fillCircle(surfacePoint.x + 96 * padScale, surfacePoint.y - 24 * padScale, 4 * padScale);
    this.padGraphics.fillStyle(0xffb36f, (0.22 + padPulse * 0.22) * orbitalPadAlpha);
    this.padGraphics.fillCircle(surfacePoint.x - 150 * padScale, surfacePoint.y - 8 * padScale, 3 * padScale);
    this.padGraphics.fillCircle(surfacePoint.x + 150 * padScale, surfacePoint.y - 8 * padScale, 3 * padScale);
    this.padGraphics.lineStyle(clamp(1.2 * padScale, 0.7, 2), 0x89b3e0, 0.08 + orbitalPadAlpha * 0.17);
    this.padGraphics.lineBetween(
      worldRect.x,
      surfacePoint.y,
      worldRect.x + worldRect.width,
      surfacePoint.y,
    );
    if (state.launchHold || state.thrustActive) {
      const hazeAlpha =
        (state.thrustActive ? 0.12 + state.throttle * 0.18 : 0.06) *
        (0.55 + surfacePadAlpha * 0.45);
      this.padGraphics.fillStyle(0xe8f1ff, hazeAlpha);
      this.padGraphics.fillEllipse(
        surfacePoint.x,
        surfacePoint.y - 6 * padScale,
        140 * padScale,
        22 * padScale,
      );
      this.padGraphics.fillStyle(0xd7ecff, hazeAlpha * 0.7);
      this.padGraphics.fillEllipse(
        surfacePoint.x,
        surfacePoint.y + 8 * padScale,
        180 * padScale,
        28 * padScale,
      );
    }

    this.worldScale = worldScale;
    this.padCenterX = surfacePoint.x;
    this.groundScreenY = surfacePoint.y;
    this.planetCenter = planetCenter;
  }

  #updateRocket(state) {
    if (!this.partRects.length) {
      return;
    }

    const rocketPosition = this.#worldToScreen(state.position.x, state.position.y);

    this.rocketContainer.setPosition(rocketPosition.x, rocketPosition.y);
    this.rocketContainer.setRotation(state.angle);
    this.rocketContainer.setScale(this.cameraZoom);

    this.exhaustGraphics.clear();
    if (state.thrustActive && state.activeStageFuelRemaining > 0) {
      const flameLength =
        this.rocketCellPixels *
        (1.1 + state.throttle * 1.4 + Math.random() * 0.35);
      this.exhaustPorts.forEach((port, index) => {
        const spread = port.width * 0.65;
        const jitter = (index % 2 === 0 ? -1 : 1) * Math.random() * 2;
        this.exhaustGraphics.fillStyle(
          index % 2 === 0 ? 0xffd36e : 0xff8a57,
          0.88,
        );
        this.exhaustGraphics.fillTriangle(
          port.x,
          port.y + 4,
          port.x - spread * 0.5,
          port.y + flameLength + jitter,
          port.x + spread * 0.5,
          port.y + flameLength - jitter,
        );
      });
    }
  }

  #getExhaustPort(rect) {
    const assetKey = getPartAssetKey(rect.part.partId);
    if (assetKey && this.scene.textures.exists(assetKey)) {
      const placement = this.#getPartSpritePlacement(rect, assetKey);
      return {
        x: placement.topLeftX + placement.visibleBounds.centerX * placement.scale,
        y: placement.topLeftY + placement.visibleBounds.bottom * placement.scale,
        width: Math.max(10, rect.width * 0.6),
      };
    }

    return {
      x: rect.x + rect.width * 0.5,
      y: rect.y + rect.height,
      width: Math.max(10, rect.width * 0.6),
    };
  }

  #getPartSpritePlacement(rect, assetKey) {
    const visibleBounds = this.#getTextureVisualBounds(assetKey);
    const sourceWidth = visibleBounds.sourceWidth;
    const sourceHeight = visibleBounds.sourceHeight;
    const targetWidth = Math.max(8, rect.width - 6);
    const targetHeight = Math.max(8, rect.height - 6);
    const scale = Math.min(
      targetWidth / Math.max(1, sourceWidth),
      targetHeight / Math.max(1, sourceHeight),
    );
    const centerX = rect.x + rect.width * 0.5;
    const centerY = rect.y + rect.height * 0.5;

    return {
      centerX,
      centerY,
      scale,
      topLeftX: centerX - sourceWidth * scale * 0.5,
      topLeftY: centerY - sourceHeight * scale * 0.5,
      visibleBounds,
    };
  }

  #getTextureVisualBounds(assetKey) {
    const cached = this.textureVisualBounds.get(assetKey);
    if (cached) {
      return cached;
    }

    const texture = this.scene.textures.get(assetKey);
    const frame = texture?.get();
    const sourceWidth = frame?.realWidth ?? frame?.width ?? 1;
    const sourceHeight = frame?.realHeight ?? frame?.height ?? 1;
    const fallback = {
      sourceWidth,
      sourceHeight,
      left: 0,
      top: 0,
      right: sourceWidth,
      bottom: sourceHeight,
      centerX: sourceWidth * 0.5,
      centerY: sourceHeight * 0.5,
    };

    if (!frame || typeof document === "undefined") {
      this.textureVisualBounds.set(assetKey, fallback);
      return fallback;
    }

    const sourceImage = frame.source?.image ?? texture.getSourceImage?.();
    if (!sourceImage) {
      this.textureVisualBounds.set(assetKey, fallback);
      return fallback;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        this.textureVisualBounds.set(assetKey, fallback);
        return fallback;
      }

      context.clearRect(0, 0, sourceWidth, sourceHeight);
      context.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight);

      const pixels = context.getImageData(0, 0, sourceWidth, sourceHeight).data;
      let minX = sourceWidth;
      let minY = sourceHeight;
      let maxX = -1;
      let maxY = -1;

      for (let pixelIndex = 0; pixelIndex < sourceWidth * sourceHeight; pixelIndex += 1) {
        if (pixels[pixelIndex * 4 + 3] === 0) {
          continue;
        }

        const x = pixelIndex % sourceWidth;
        const y = Math.floor(pixelIndex / sourceWidth);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      const bounds =
        maxX >= 0 && maxY >= 0
          ? {
              sourceWidth,
              sourceHeight,
              left: minX,
              top: minY,
              right: maxX + 1,
              bottom: maxY + 1,
              centerX: (minX + maxX + 1) * 0.5,
              centerY: (minY + maxY + 1) * 0.5,
            }
          : fallback;

      this.textureVisualBounds.set(assetKey, bounds);
      return bounds;
    } catch {
      this.textureVisualBounds.set(assetKey, fallback);
      return fallback;
    }
  }

  #renderPartSprite(partId, assetKey, rect) {
    let sprite = this.partSprites.get(partId);
    if (!sprite) {
      sprite = this.scene.add.image(0, 0, assetKey);
      sprite.setOrigin(0.5, 0.5);
      this.rocketSpriteLayer.add(sprite);
      this.partSprites.set(partId, sprite);
    } else if (sprite.texture?.key !== assetKey) {
      sprite.setTexture(assetKey);
    }

    const placement = this.#getPartSpritePlacement(rect, assetKey);

    sprite.setVisible(true);
    sprite.setPosition(placement.centerX, placement.centerY);
    sprite.setScale(placement.scale);
  }

  #hidePartSprite(partId) {
    const sprite = this.partSprites.get(partId);
    if (sprite) {
      sprite.setVisible(false);
    }
  }

  #updateHud(state) {
    const padding = Math.round(18 * this.metrics.uiScale);
    const startX = this.layout.hudRect.x + padding;
    let nextY = this.layout.hudRect.y + padding + Math.round(20 * this.metrics.uiScale);

    this.hudHeaderText.setText("FLIGHT DATA");
    this.objectiveLabelText.setText("TARGET ALTITUDE");

    this.hudTexts.stage.setText(
      `STAGE  ${state.currentStageIndex + 1}/${state.stages.length}`,
    );
    this.hudTexts.altitude.setText(
      `ALTITUDE  ${Math.max(0, state.position.y).toFixed(0)} M`,
    );
    this.hudTexts.velocity.setText(
      `V-SPEED  ${formatVelocity(state.velocity.y)}\nH-SPEED  ${formatVelocity(state.horizontalVelocity)}`,
    );
    this.hudTexts.fuel.setText(`FUEL  ${state.fuelRemaining.toFixed(0)} U`);

    let instructionText = "A/D OR ARROWS TO STEER  //  SPACE TO THRUST";
    if (state.position.y >= state.targetAltitude * 0.8) {
      const orbitalPercentage = Math.round(
        (state.horizontalVelocity / state.orbitalVelocityRequired) * 100,
      );
      instructionText = `ORBITAL WINDOW  ${state.horizontalVelocity.toFixed(1)}/${state.orbitalVelocityRequired.toFixed(1)} M/S  (${orbitalPercentage}%)`;
    }
    this.hudTexts.instruction.setText(instructionText);

    Object.values(this.hudTexts).forEach((text, index) => {
      text.setPosition(startX, nextY);
      text.setFontSize(
        Math.max(
          12,
          Math.round((index === 4 ? 12 : index === 2 ? 13 : 14) * this.metrics.uiScale),
        ),
      );
      text.setWordWrapWidth(this.layout.hudRect.width - padding * 2);
      nextY += text.height + Math.round((index === 2 ? 8 : 5) * this.metrics.uiScale);
    });

    this.objectiveText.setText(`${state.targetAltitude.toFixed(0)} M`);
    this.statusHintText.setText("PRIMARY  THRUST  //  SECONDARY  STAGE");

    if (state.status === "success") {
      this.statusText.setColor("#8de0a2");
      this.statusText.setText(state.resultLabel);
    } else if (state.status === "failed") {
      this.statusText.setColor("#ff9d96");
      this.statusText.setText(state.resultLabel);
    } else if (state.launchHold) {
      this.statusText.setColor("#8de0a2");
      this.statusText.setText("READY FOR LAUNCH");
    } else if (state.eventTimer > 0) {
      this.statusText.setColor("#ffd777");
      this.statusText.setText(state.eventMessage.toUpperCase());
    } else if (state.orbitalStable) {
      const remaining = Math.max(
        0,
        FLIGHT_CONSTANTS.minTimeInOrbit - state.timeInStableOrbit,
      );
      const percentage = Math.round(
        (state.timeInStableOrbit / FLIGHT_CONSTANTS.minTimeInOrbit) * 100,
      );
      this.statusText.setColor("#8de0a2");
      this.statusText.setText(
        `STABLE ORBIT  ${remaining.toFixed(1)}S REMAINING  (${percentage}%)`,
      );
    } else if (state.stageReady) {
      this.statusText.setColor("#ffd777");
      this.statusText.setText("STAGE SEPARATION READY");
    } else if (
      state.fuelRemaining <= Math.max(10, state.totalFuelCapacity * 0.18)
    ) {
      this.statusText.setColor("#ffd777");
      this.statusText.setText("LOW FUEL");
    } else if (
      Math.abs(state.angle) * (180 / Math.PI) >=
      FLIGHT_CONSTANTS.tiltWarningDegrees
    ) {
      this.statusText.setColor("#ffb38f");
      this.statusText.setText("HIGH TILT DANGER");
    } else if (state.maxAltitude >= state.targetAltitude * 0.82) {
      this.statusText.setColor("#8de0a2");
      this.statusText.setText("TARGET ALTITUDE CLOSE");
    } else if (state.thrustActive) {
      this.statusText.setColor("#9ab7d5");
      this.statusText.setText(`THROTTLE  ${Math.round(state.throttle * 100)}%`);
    } else {
      this.statusText.setColor("#9ab7d5");
      this.statusText.setText("AWAITING THRUST INPUT");
    }
  }
}
