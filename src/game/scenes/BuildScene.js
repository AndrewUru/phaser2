import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { theme } from '../config/theme.js';
import { BUILD_GRID } from '../build/buildConstants.js';
import { createResponsiveController } from '../layout/responsiveController.js';
import { computeBuildLayout } from '../layout/sceneLayouts.js';
import { createRect } from '../layout/viewport.js';
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
import { BuildHintOverlay } from '../ui/build/BuildHintOverlay.js';
import { StarterRocketAction } from '../ui/build/StarterRocketAction.js';
import { HowToPlayOverlay } from '../ui/help/HowToPlayOverlay.js';
import { getTutorialHint } from '../ui/help/TutorialHints.js';
import { getFlightTestRocket, getFlightTestRocketList } from '../flight/FlightTestRockets.js';

const DRAG_THRESHOLD_PX = 10;

function createHelpPages() {
  const tutorial = getTutorialHint('build');

  return [
    {
      title: tutorial.title,
      body: `${tutorial.lines.join('\n')}\n\nGreen ghost = valid placement. Red ghost = blocked attachment, overlap, or out-of-bounds.`
    },
    {
      title: 'Hangar Workflow',
      body:
        '1. Start with one capsule.\n2. Stack tanks and engines below it.\n3. Add a decoupler if you want a second stage.\n4. Launch only when validation is clear.'
    }
  ];
}

function createCenteredOverlayRect(metrics, widthFactor = 0.7, heightFactor = 0.6) {
  const width = Math.min(metrics.contentRect.width, Math.round(metrics.width * widthFactor));
  const height = Math.min(metrics.contentRect.height, Math.round(metrics.height * heightFactor));

  return createRect(
    Math.round(metrics.centerX - width * 0.5),
    Math.round(metrics.centerY - height * 0.5),
    width,
    height
  );
}

function clonePlacements(placements) {
  return placements.map((placement) => ({
    ...placement,
    origin: { ...placement.origin }
  }));
}

export class BuildScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BUILD);
    this.dragState = null;
    this.pressState = null;
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
      'Snap modules to the shared build grid, validate the stack, and send a clean staged payload into flight.',
      {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '18px',
        color: theme.colors.muted,
        wordWrap: { width: 540 }
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
    this.hintOverlay = new BuildHintOverlay(this);
    this.starterRockets = getFlightTestRocketList();
    this.starterActions = new StarterRocketAction(this, {
      rockets: this.starterRockets,
      onSelect: (rocketId) => this.loadStarterRocket(rocketId)
    });
    this.helpOverlay = new HowToPlayOverlay(this, {
      pages: createHelpPages()
    });

    this.bindInput();

    this.layoutController = createResponsiveController(
      this,
      computeBuildLayout,
      (layout, metrics) => this.applyLayout(layout, metrics)
    );

    this.refreshBuildOutputs();

    if (persistedBuild.length === 0) {
      this.helpOverlay.show(0);
    }
  }

  bindInput() {
    this.handlePointerMove = (pointer) => {
      if (this.dragState) {
        this.updateGhostFromPointer(pointer);
        return;
      }

      if (this.pressState?.placementId) {
        const distance = Phaser.Math.Distance.Between(
          this.pressState.startX,
          this.pressState.startY,
          pointer.worldX,
          pointer.worldY
        );

        if (distance >= DRAG_THRESHOLD_PX) {
          this.beginPlacementDrag(this.pressState.placementId, pointer);
        }
      }
    };

    this.handlePointerUp = (pointer) => {
      if (this.dragState) {
        this.commitDrag(pointer);
        return;
      }

      if (this.pressState?.placementId) {
        this.buildState.setSelectedPlacement(this.pressState.placementId);
      } else if (this.pressState) {
        this.buildState.clearSelection();
      }

      this.pressState = null;
      this.refreshBuildOutputs();
    };

    this.handlePointerDown = (pointer) => {
      if (this.dragState) {
        return;
      }

      if (this.helpOverlay.visible) {
        return;
      }

      if (!this.gridView.containsWorldPoint(pointer.worldX, pointer.worldY)) {
        this.pressState = null;
        return;
      }

      const hitPlacementId = this.gridView.getPlacementIdAtWorldPoint(pointer.worldX, pointer.worldY);
      this.pressState = {
        placementId: hitPlacementId ?? null,
        startX: pointer.worldX,
        startY: pointer.worldY
      };

      if (!hitPlacementId) {
        this.buildState.clearSelection();
        this.refreshBuildOutputs();
      }
    };

    this.input.on('pointermove', this.handlePointerMove);
    this.input.on('pointerup', this.handlePointerUp);
    this.input.on('pointerdown', this.handlePointerDown);

    this.deleteKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE);
    this.backspaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.helpKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    this.deleteKey?.on('down', () => this.deleteSelectedPlacement());
    this.backspaceKey?.on('down', () => this.deleteSelectedPlacement());
    this.helpKey?.on('down', () => this.helpOverlay.toggle(0));
    this.escapeKey?.on('down', () => {
      if (this.helpOverlay.visible) {
        this.helpOverlay.hide();
        return;
      }

      if (this.dragState) {
        this.cancelDrag();
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
      this.helpKey?.destroy();
      this.game.canvas.style.cursor = 'default';
    });
  }

  beginPaletteDrag(partId, pointer) {
    this.dragState = {
      source: 'palette',
      partId,
      placementId: null,
      originalOrigin: null
    };
    this.pressState = null;
    this.palettePanel.setActivePart(partId);
    this.buildState.clearSelection();
    this.updateGhostFromPointer(pointer);
    this.refreshBuildOutputs();
  }

  beginPlacementDrag(placementId, pointer) {
    const placement = this.buildState.getPlacementById(placementId);
    if (!placement) {
      this.pressState = null;
      return;
    }

    this.dragState = {
      source: 'placement',
      placementId,
      partId: placement.partId,
      originalOrigin: { ...placement.origin }
    };
    this.pressState = null;
    this.buildState.setSelectedPlacement(placementId);
    this.palettePanel.setActivePart(placement.partId);
    this.updateGhostFromPointer(pointer);
    this.refreshBuildOutputs();
  }

  cancelDrag() {
    this.dragState = null;
    this.currentGhost = null;
    this.pressState = null;
    this.palettePanel.setActivePart(null);
    this.gridView.clearGhost();
    this.refreshBuildOutputs();
  }

  commitDrag(pointer) {
    if (!this.dragState) {
      return;
    }

    this.updateGhostFromPointer(pointer);

    if (this.currentGhost?.valid) {
      let result;
      if (this.dragState.source === 'placement' && this.dragState.placementId) {
        result = this.buildState.movePlacement(this.dragState.placementId, this.currentGhost.origin);
      } else {
        result = this.buildState.addPart(this.dragState.partId, this.currentGhost.origin);
      }

      if (result?.success) {
        gameState.setLaunchSnapshot(null);
      }
    }

    this.dragState = null;
    this.currentGhost = null;
    this.pressState = null;
    this.palettePanel.setActivePart(null);
    this.gridView.clearGhost();
    this.refreshBuildOutputs();
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

    const evaluation = this.buildState.canPlacePart(this.dragState.partId, origin, {
      ignorePlacementId: this.dragState.placementId
    });
    this.currentGhost = {
      partId: this.dragState.partId,
      origin,
      valid: evaluation.valid,
      reason: evaluation.reason
    };

    this.gridView.setGhost(this.currentGhost);
  }

  computeAttachmentOrigins(partId, ignorePlacementId = null) {
    if (!partId) {
      return [];
    }

    const origins = [];
    for (let gridY = BUILD_GRID.minY; gridY <= BUILD_GRID.maxY; gridY += 1) {
      for (let gridX = BUILD_GRID.minX; gridX <= BUILD_GRID.maxX; gridX += 1) {
        const evaluation = this.buildState.canPlacePart(partId, { x: gridX, y: gridY }, {
          ignorePlacementId
        });

        if (evaluation.valid) {
          origins.push({ x: gridX, y: gridY });
        }
      }
    }

    return origins;
  }

  getHintMessage(selectedPlacement) {
    const tutorial = getTutorialHint('build');
    const dragPartId = this.dragState?.partId ?? this.palettePanel.activePartId;

    if (this.dragState && this.currentGhost) {
      return this.currentGhost.valid
        ? 'Release to place the part on the highlighted snap point.'
        : this.currentGhost.reason || 'This placement is blocked.';
    }

    if (selectedPlacement) {
      return 'Selected modules can be dragged to reposition, deleted with Delete, or kept for launch.';
    }

    if (this.validation?.blockers?.length) {
      return this.validation.blockers[0].message;
    }

    if (dragPartId) {
      return 'Green circles mark valid start cells for the active module.';
    }

    return `${tutorial.lines[0]} ${tutorial.lines[1]}`;
  }

  refreshBuildOutputs() {
    const placements = this.buildState.getPlacedParts();
    const selectedPlacement = this.buildState.getSelectedPlacement();
    const activePartId = this.dragState?.partId ?? this.palettePanel.activePartId ?? selectedPlacement?.partId ?? null;
    const suppressedPlacementId = this.dragState?.source === 'placement' ? this.dragState.placementId : null;

    this.stats = ShipStatsCalculator.calculate(placements);
    this.validation = BuildValidator.validate(placements, this.stats);

    gameState.setBuildState({
      placedParts: placements,
      derivedStats: this.stats,
      validation: this.validation
    });

    this.gridView.setBuildState(placements, this.buildState.getSelectedPlacementId(), {
      suppressedPlacementId,
      attachmentOrigins: this.computeAttachmentOrigins(activePartId, suppressedPlacementId)
    });
    this.sidebar.update({
      selectedPlacement,
      validation: this.validation
    });
    this.statsPanel.update(this.stats);
    this.controlsPanel.setState({
      canLaunch: this.validation.isValid,
      hasSelection: Boolean(selectedPlacement)
    });
    this.hintOverlay.update(this.getHintMessage(selectedPlacement));

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

  loadStarterRocket(rocketId) {
    const starter = getFlightTestRocket(rocketId);
    this.buildState.setPlacements(clonePlacements(starter.placements));
    this.dragState = null;
    this.currentGhost = null;
    this.pressState = null;
    this.palettePanel.setActivePart(null);
    this.helpOverlay.hide();
    gameState.setLaunchSnapshot(null);
    this.refreshBuildOutputs();
  }

  launchBuild() {
    if (!this.validation?.isValid) {
      this.hintOverlay.update(this.validation?.blockers?.[0]?.message ?? 'Resolve blockers before launch.');
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
    const titleWrapWidth = Math.min(layout.headerRect.width * 0.58, layout.headerRect.width - headerPadding * 2);

    this.titleText.setPosition(layout.headerRect.x + headerPadding, layout.headerRect.y + headerPadding);
    this.titleText.setFontSize(Math.max(24, Math.round(36 * metrics.uiScale)));

    this.subtitleText.setPosition(
      layout.headerRect.x + headerPadding,
      this.titleText.y + this.titleText.height + Math.round(6 * metrics.uiScale)
    );
    this.subtitleText.setFontSize(Math.max(13, Math.round(16 * metrics.uiScale)));
    this.subtitleText.setWordWrapWidth(titleWrapWidth);

    const starterHeight = Math.max(72, Math.round((layout.compact ? 82 : 88) * metrics.uiScale));
    let starterRect;
    let adjustedSidebarRect = layout.sidebarRect;
    let adjustedControlsRect = layout.controlsRect;

    if (!layout.compact || layout.sidebarRect.height >= 170) {
      starterRect = createRect(
        layout.sidebarRect.x,
        layout.sidebarRect.y,
        layout.sidebarRect.width,
        Math.min(starterHeight, layout.sidebarRect.height)
      );
      adjustedSidebarRect = createRect(
        layout.sidebarRect.x,
        starterRect.y + starterRect.height + metrics.panelGap,
        layout.sidebarRect.width,
        Math.max(0, layout.sidebarRect.height - starterRect.height - metrics.panelGap)
      );
    } else {
      starterRect = createRect(
        layout.controlsRect.x,
        layout.controlsRect.y,
        layout.controlsRect.width,
        Math.min(starterHeight, layout.controlsRect.height)
      );
      adjustedControlsRect = createRect(
        layout.controlsRect.x,
        starterRect.y + starterRect.height + metrics.panelGap,
        layout.controlsRect.width,
        Math.max(0, layout.controlsRect.height - starterRect.height - metrics.panelGap)
      );
    }
    const hintWidth = Math.min(layout.gridRect.width * (layout.compact ? 0.78 : 0.42), 360);
    const hintRect = createRect(
      layout.gridRect.x + layout.gridRect.width - hintWidth - Math.round(16 * metrics.uiScale),
      layout.gridRect.y + Math.round(16 * metrics.uiScale),
      hintWidth,
      Math.max(72, Math.round(84 * metrics.uiScale))
    );

    this.gridView.layout(layout.gridRect, metrics);
    this.palettePanel.layout(layout.paletteRect, metrics);
    this.starterActions.layout(starterRect, metrics);
    this.sidebar.layout(adjustedSidebarRect, metrics);
    this.statsPanel.layout(layout.statsRect, metrics);
    this.controlsPanel.layout(adjustedControlsRect, metrics);
    this.hintOverlay.layout(hintRect, metrics);
    this.helpOverlay.layout(createCenteredOverlayRect(metrics), metrics);

    this.refreshBuildOutputs();
  }
}
