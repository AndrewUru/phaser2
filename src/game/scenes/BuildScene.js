import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { theme } from '../config/theme.js';
import { createResponsiveController } from '../layout/responsiveController.js';
import { computeBuildLayout } from '../layout/sceneLayouts.js';
import { drawPanel } from '../ui/panel.js';
import { drawWorkshopBackdrop } from '../ui/backdrops.js';
import { gameState } from '../state/GameStateStore.js';
import { BuildState } from '../build/BuildState.js';
import { PARTS_CATALOG } from '../build/partsCatalog.js';
import { ShipStatsCalculator } from '../build/ShipStatsCalculator.js';
import { BuildValidator } from '../build/BuildValidator.js';
import { serializeBuildForLaunch } from '../build/serializeBuild.js';
import { BuildGridView } from '../ui/build/BuildGridView.js';
import { PartPalettePanel } from '../ui/build/PartPalettePanel.js';
import { BuildSidebar } from '../ui/build/BuildSidebar.js';
import { BuildStatsPanel } from '../ui/build/BuildStatsPanel.js';
import { BuildControlsPanel } from '../ui/build/BuildControlsPanel.js';

export class BuildScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BUILD);
    this.dragState = null;
    this.currentGhost = null;
  }

  create() {
    const persistedBuild = gameState.getBuildState().placedParts ?? [];
    this.buildState = new BuildState(persistedBuild);

    this.background = this.add.graphics();
    this.headerPanel = this.add.graphics();

    this.titleText = this.add.text(0, 0, 'Rocket Assembly Hangar', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '42px',
      fontStyle: '700',
      color: theme.colors.ink
    });
    this.titleText.setOrigin(0, 0);

    this.subtitleText = this.add.text(
      0,
      0,
      'Build in logical grid space, validate the stack, and serialize a clean launch payload for the next scene.',
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '18px',
        color: theme.colors.muted,
        wordWrap: { width: 480 }
      }
    );
    this.subtitleText.setOrigin(0, 0);

    this.gridView = new BuildGridView(this);
    this.palettePanel = new PartPalettePanel(this, {
      partsCatalog: PARTS_CATALOG,
      onPartPointerDown: (partId, pointer) => this.beginPaletteDrag(partId, pointer)
    });
    this.sidebar = new BuildSidebar(this);
    this.statsPanel = new BuildStatsPanel(this);
    this.controlsPanel = new BuildControlsPanel(this, {
      onLaunch: () => this.launchBuild(),
      onDelete: () => this.deleteSelectedPlacement(),
      onClear: () => this.clearBuild(),
      onMenu: () => this.scene.start(SCENE_KEYS.MENU)
    });

    this.bindInput();

    this.layoutController = createResponsiveController(
      this,
      computeBuildLayout,
      (layout, metrics) => this.applyLayout(layout, metrics)
    );

    this.refreshBuildOutputs();
  }

  bindInput() {
    this.handlePointerMove = (pointer) => {
      if (!this.dragState) {
        return;
      }

      this.updateGhostFromPointer(pointer);
    };

    this.handlePointerUp = (pointer) => {
      if (!this.dragState) {
        return;
      }

      if (this.currentGhost?.valid) {
        const result = this.buildState.addPart(this.dragState.partId, this.currentGhost.origin);
        if (result.success) {
          gameState.setLaunchSnapshot(null);
          this.refreshBuildOutputs();
        }
      }

      this.endPaletteDrag();
    };

    this.handlePointerDown = (pointer) => {
      if (this.dragState || !this.gridView.containsWorldPoint(pointer.worldX, pointer.worldY)) {
        return;
      }

      const hitPlacementId = this.gridView.getPlacementIdAtWorldPoint(pointer.worldX, pointer.worldY);
      if (hitPlacementId) {
        this.buildState.setSelectedPlacement(hitPlacementId);
      } else {
        this.buildState.clearSelection();
      }

      this.refreshBuildOutputs();
    };

    this.input.on('pointermove', this.handlePointerMove);
    this.input.on('pointerup', this.handlePointerUp);
    this.input.on('pointerdown', this.handlePointerDown);

    this.deleteKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE);
    this.backspaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.deleteKey?.on('down', () => this.deleteSelectedPlacement());
    this.backspaceKey?.on('down', () => this.deleteSelectedPlacement());
    this.escapeKey?.on('down', () => {
      if (this.dragState) {
        this.endPaletteDrag();
        return;
      }

      this.buildState.clearSelection();
      this.refreshBuildOutputs();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointermove', this.handlePointerMove);
      this.input.off('pointerup', this.handlePointerUp);
      this.input.off('pointerdown', this.handlePointerDown);
      this.deleteKey?.destroy();
      this.backspaceKey?.destroy();
      this.escapeKey?.destroy();
      this.game.canvas.style.cursor = 'default';
    });
  }

  beginPaletteDrag(partId, pointer) {
    this.dragState = { partId };
    this.palettePanel.setActivePart(partId);
    this.updateGhostFromPointer(pointer);
  }

  endPaletteDrag() {
    this.dragState = null;
    this.currentGhost = null;
    this.palettePanel.setActivePart(null);
    this.gridView.clearGhost();
  }

  updateGhostFromPointer(pointer) {
    if (!this.dragState) {
      return;
    }

    const origin = this.gridView.getGridOriginForWorldPoint(
      pointer.worldX,
      pointer.worldY,
      this.dragState.partId
    );

    if (!origin) {
      this.currentGhost = null;
      this.gridView.clearGhost();
      return;
    }

    const evaluation = this.buildState.canPlacePart(this.dragState.partId, origin);
    this.currentGhost = {
      partId: this.dragState.partId,
      origin,
      valid: evaluation.valid,
      reason: evaluation.reason
    };

    this.gridView.setGhost(this.currentGhost);
  }

  refreshBuildOutputs() {
    const placements = this.buildState.getPlacedParts();
    const selectedPlacement = this.buildState.getSelectedPlacement();

    this.stats = ShipStatsCalculator.calculate(placements);
    this.validation = BuildValidator.validate(placements, this.stats);

    gameState.setBuildState({
      placedParts: placements,
      derivedStats: this.stats,
      validation: this.validation
    });

    this.gridView.setBuildState(placements, this.buildState.getSelectedPlacementId());
    this.sidebar.update({
      selectedPlacement,
      validation: this.validation
    });
    this.statsPanel.update(this.stats);
    this.controlsPanel.setState({
      canLaunch: this.validation.isValid,
      hasSelection: Boolean(selectedPlacement)
    });

    if (this.dragState && this.currentGhost) {
      this.gridView.setGhost(this.currentGhost);
    }
  }

  deleteSelectedPlacement() {
    if (!this.buildState.removeSelectedPlacement()) {
      return;
    }

    gameState.setLaunchSnapshot(null);
    this.refreshBuildOutputs();
  }

  clearBuild() {
    this.buildState.clear();
    gameState.setLaunchSnapshot(null);
    this.refreshBuildOutputs();
  }

  launchBuild() {
    if (!this.validation?.isValid) {
      return;
    }

    const placements = this.buildState.getPlacedParts();
    const payload = serializeBuildForLaunch(placements, this.stats, this.validation);
    gameState.setBuildState({
      placedParts: placements,
      derivedStats: this.stats,
      validation: this.validation
    });
    gameState.setLaunchSnapshot(payload);

    this.scene.start(SCENE_KEYS.FLIGHT);
  }

  applyLayout(layout, metrics) {
    drawWorkshopBackdrop(this.background, metrics);

    this.headerPanel.clear();
    drawPanel(this.headerPanel, layout.headerRect, {
      fillColor: theme.colors.panel,
      strokeColor: theme.colors.panelBorder,
      fillAlpha: 0.92
    });

    const headerPadding = Math.round(20 * metrics.uiScale);
    this.titleText.setPosition(layout.headerRect.x + headerPadding, layout.headerRect.y + headerPadding);
    this.titleText.setFontSize(Math.max(24, Math.round(36 * metrics.uiScale)));

    this.subtitleText.setPosition(
      layout.headerRect.x + headerPadding,
      this.titleText.y + this.titleText.height + Math.round(6 * metrics.uiScale)
    );
    this.subtitleText.setFontSize(Math.max(13, Math.round(16 * metrics.uiScale)));
    this.subtitleText.setWordWrapWidth(layout.headerRect.width - headerPadding * 2);

    this.gridView.layout(layout.gridRect, metrics);
    this.palettePanel.layout(layout.paletteRect, metrics);
    this.sidebar.layout(layout.sidebarRect, metrics);
    this.statsPanel.layout(layout.statsRect, metrics);
    this.controlsPanel.layout(layout.controlsRect, metrics);

    this.refreshBuildOutputs();
  }
}
