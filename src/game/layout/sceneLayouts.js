import Phaser from 'phaser';
import { createRect, insetRect } from './viewport.js';

function clampRange(value, min, max) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Phaser.Math.Clamp(value, low, high);
}

export function computeBootLayout(metrics) {
  const cardWidth = Math.min(
    metrics.contentRect.width,
    Phaser.Math.Clamp(metrics.width * 0.56, 360, 680)
  );
  const cardHeight = Phaser.Math.Clamp(metrics.height * 0.34, 220, 320);
  const card = createRect(
    metrics.centerX - cardWidth * 0.5,
    metrics.centerY - cardHeight * 0.5,
    cardWidth,
    cardHeight
  );
  const inner = insetRect(card, Math.round(24 * metrics.uiScale));
  const trackHeight = Math.round(22 * metrics.uiScale);
  const track = createRect(
    inner.x,
    inner.y + inner.height - trackHeight - Math.round(18 * metrics.uiScale),
    inner.width,
    trackHeight
  );

  return {
    card,
    inner,
    eyebrowPosition: {
      x: inner.x,
      y: inner.y + Math.round(10 * metrics.uiScale)
    },
    titlePosition: {
      x: inner.x,
      y: inner.y + Math.round(32 * metrics.uiScale)
    },
    subtitlePosition: {
      x: inner.x,
      y: inner.y + Math.round(94 * metrics.uiScale)
    },
    statusPosition: {
      x: inner.x,
      y: track.y - Math.round(34 * metrics.uiScale)
    },
    percentPosition: {
      x: inner.x + inner.width,
      y: track.y - Math.round(36 * metrics.uiScale)
    },
    track,
    subtitleWidth: inner.width,
    statusWidth: Math.max(160, Math.round(inner.width * 0.68))
  };
}

export function computeMenuLayout(metrics) {
  const frame = metrics.contentRect;
  const compact = metrics.width < 980 || metrics.height < 720;
  const gap = metrics.panelGap;

  let heroRect;
  let sideRect;

  if (compact) {
    const heroHeight = Phaser.Math.Clamp(frame.height * 0.48, 240, 340);
    heroRect = createRect(frame.x, frame.y, frame.width, heroHeight);
    sideRect = createRect(frame.x, heroRect.y + heroRect.height + gap, frame.width, frame.height - heroRect.height - gap);
  } else {
    const heroWidth = Math.round(frame.width * 0.58);
    heroRect = createRect(frame.x, frame.y, heroWidth - gap * 0.5, frame.height);
    sideRect = createRect(heroRect.x + heroRect.width + gap, frame.y, frame.width - heroRect.width - gap, frame.height);
  }

  const heroInner = insetRect(heroRect, Math.round(26 * metrics.uiScale));
  const sideInner = insetRect(sideRect, Math.round(24 * metrics.uiScale));
  const buttonHeight = Math.round(58 * metrics.uiScale);
  const buttonWidth = Math.min(sideInner.width, Phaser.Math.Clamp(metrics.width * 0.22, 220, 320));
  const button = createRect(sideInner.x, sideInner.y + sideInner.height - buttonHeight, buttonWidth, buttonHeight);

  return {
    compact,
    heroRect,
    sideRect,
    heroInner,
    sideInner,
    button,
    loopTextWidth: heroInner.width,
    statTextWidth: sideInner.width
  };
}

export function computeShellLayout(metrics) {
  const panelWidth = Math.min(metrics.contentRect.width, Phaser.Math.Clamp(metrics.width * 0.56, 340, 760));
  const panelHeight = Math.min(metrics.contentRect.height, Phaser.Math.Clamp(metrics.height * 0.5, 240, 420));
  const panel = createRect(
    metrics.centerX - panelWidth * 0.5,
    metrics.centerY - panelHeight * 0.5,
    panelWidth,
    panelHeight
  );
  const inner = insetRect(panel, Math.round(26 * metrics.uiScale));
  const buttonWidth = Math.min(inner.width, 240);
  const buttonHeight = Math.round(54 * metrics.uiScale);

  return {
    panel,
    inner,
    button: createRect(
      inner.x,
      inner.y + inner.height - buttonHeight,
      buttonWidth,
      buttonHeight
    )
  };
}

export function computeBuildLayout(metrics) {
  const frame = metrics.contentRect;
  const gap = metrics.panelGap;
  const headerHeight = Math.round(clampRange(metrics.height * 0.1, 64, 102));
  const headerRect = createRect(frame.x, frame.y, frame.width, headerHeight);
  const bodyY = headerRect.y + headerRect.height + gap;
  const bodyHeight = frame.height - headerRect.height - gap;
  const compact = metrics.isPortrait || metrics.width < 1120;

  let gridRect;
  let paletteRect;
  let sidebarRect;
  let statsRect;
  let controlsRect;

  if (compact && frame.width < 760) {
    const gridHeight = Math.round(clampRange(bodyHeight * 0.46, bodyHeight * 0.36, bodyHeight * 0.56));
    const remainingHeight = Math.max(140, bodyHeight - gridHeight - gap);
    const paletteHeight = Math.round(clampRange(remainingHeight * 0.28, 110, remainingHeight * 0.36));
    const statsHeight = Math.round(clampRange(remainingHeight * 0.16, 84, 124));
    const controlsHeight = Math.round(clampRange(remainingHeight * 0.2, 92, 138));
    const sidebarHeight = Math.max(
      96,
      remainingHeight - paletteHeight - statsHeight - controlsHeight - gap * 3
    );

    gridRect = createRect(frame.x, bodyY, frame.width, gridHeight);
    paletteRect = createRect(frame.x, gridRect.y + gridRect.height + gap, frame.width, paletteHeight);
    sidebarRect = createRect(
      frame.x,
      paletteRect.y + paletteRect.height + gap,
      frame.width,
      sidebarHeight
    );
    statsRect = createRect(
      frame.x,
      sidebarRect.y + sidebarRect.height + gap,
      frame.width,
      statsHeight
    );
    controlsRect = createRect(
      frame.x,
      statsRect.y + statsRect.height + gap,
      frame.width,
      controlsHeight
    );
  } else if (compact) {
    const gridHeight = Math.round(clampRange(bodyHeight * 0.54, bodyHeight * 0.42, bodyHeight * 0.64));
    const bottomHeight = Math.max(170, bodyHeight - gridHeight - gap);
    const paletteWidth = Math.round(clampRange(frame.width * 0.28, 180, frame.width * 0.38));

    gridRect = createRect(frame.x, bodyY, frame.width, gridHeight);
    paletteRect = createRect(frame.x, gridRect.y + gridRect.height + gap, paletteWidth, bottomHeight);

    const rightColumn = createRect(
      paletteRect.x + paletteRect.width + gap,
      paletteRect.y,
      frame.width - paletteRect.width - gap,
      bottomHeight
    );

    const sidebarHeight = Math.round(clampRange(rightColumn.height * 0.42, 120, rightColumn.height * 0.5));
    const statsHeight = Math.round(clampRange(rightColumn.height * 0.22, 90, rightColumn.height * 0.28));
    const controlsHeight = Math.max(88, rightColumn.height - sidebarHeight - statsHeight - gap * 2);

    sidebarRect = createRect(rightColumn.x, rightColumn.y, rightColumn.width, sidebarHeight);
    statsRect = createRect(
      rightColumn.x,
      sidebarRect.y + sidebarRect.height + gap,
      rightColumn.width,
      statsHeight
    );
    controlsRect = createRect(
      rightColumn.x,
      statsRect.y + statsRect.height + gap,
      rightColumn.width,
      controlsHeight
    );
  } else {
    const gridWidth = Math.round(frame.width * 0.62);
    const rightWidth = frame.width - gridWidth - gap;
    const rightRect = createRect(frame.x + gridWidth + gap, bodyY, rightWidth, bodyHeight);
    const paletteHeight = Math.round(clampRange(rightRect.height * 0.31, 180, 250));
    const remainingHeight = rightRect.height - paletteHeight - gap;
    const sidebarHeight = Math.round(clampRange(remainingHeight * 0.42, 150, 240));
    const statsHeight = Math.round(clampRange(remainingHeight * 0.25, 105, 170));
    const controlsHeight = Math.max(100, remainingHeight - sidebarHeight - statsHeight - gap * 2);

    gridRect = createRect(frame.x, bodyY, gridWidth, bodyHeight);
    paletteRect = createRect(rightRect.x, rightRect.y, rightRect.width, paletteHeight);
    sidebarRect = createRect(
      rightRect.x,
      paletteRect.y + paletteRect.height + gap,
      rightRect.width,
      sidebarHeight
    );
    statsRect = createRect(
      rightRect.x,
      sidebarRect.y + sidebarRect.height + gap,
      rightRect.width,
      statsHeight
    );
    controlsRect = createRect(
      rightRect.x,
      statsRect.y + statsRect.height + gap,
      rightRect.width,
      controlsHeight
    );
  }

  return {
    compact,
    headerRect,
    gridRect,
    paletteRect,
    sidebarRect,
    statsRect,
    controlsRect
  };
}

export function computeFlightLayout(metrics) {
  const frame = metrics.contentRect;
  const compact = metrics.width < 880 || metrics.isPortrait;
  const inset = Math.round(metrics.gutter * 0.45);
  const hudWidth = compact ? Math.min(frame.width - inset * 2, 336) : clampRange(frame.width * 0.27, 270, 340);
  const hudHeight = compact ? clampRange(frame.height * 0.23, 124, 170) : clampRange(frame.height * 0.26, 150, 182);
  const statusWidth = compact ? Math.min(frame.width - inset * 2, 390) : clampRange(frame.width * 0.36, 340, 460);
  const statusHeight = compact ? 92 : 98;
  const debugWidth = compact ? Math.min(frame.width - inset * 2, 320) : clampRange(frame.width * 0.25, 250, 320);
  const debugHeight = compact ? 148 : 186;
  const debugY = compact
    ? frame.y + inset + statusHeight + Math.round(metrics.panelGap * 0.7)
    : frame.y + inset;

  return {
    compact,
    worldRect: frame,
    hudRect: createRect(frame.x + inset, frame.y + inset, hudWidth, hudHeight),
    statusRect: createRect(
      frame.x + frame.width * 0.5 - statusWidth * 0.5,
      frame.y + inset,
      statusWidth,
      statusHeight
    ),
    debugRect: createRect(
      compact ? frame.x + inset : frame.x + frame.width - debugWidth - inset,
      debugY,
      debugWidth,
      debugHeight
    ),
    touchControls: {
      left: {
        x: frame.x + inset + 70,
        y: frame.y + frame.height - inset - 72
      },
      right: {
        x: frame.x + inset + 176,
        y: frame.y + frame.height - inset - 72
      },
      thrust: {
        x: frame.x + frame.width - inset - 76,
        y: frame.y + frame.height - inset - 86
      },
      stage: {
        x: frame.x + frame.width - inset - 76,
        y: frame.y + frame.height - inset - 176
      }
    },
    fallbackPanel: createRect(
      frame.x + frame.width * 0.5 - Math.min(frame.width * 0.72, 560) * 0.5,
      frame.y + frame.height * 0.5 - Math.min(frame.height * 0.42, 300) * 0.5,
      Math.min(frame.width * 0.72, 560),
      Math.min(frame.height * 0.42, 300)
    )
  };
}

export function computeResultLayout(metrics) {
  const panelWidth = Math.min(metrics.contentRect.width, clampRange(metrics.width * 0.56, 340, 760));
  const panelHeight = Math.min(metrics.contentRect.height, clampRange(metrics.height * 0.56, 280, 470));
  const panel = createRect(
    metrics.centerX - panelWidth * 0.5,
    metrics.centerY - panelHeight * 0.5,
    panelWidth,
    panelHeight
  );
  const inner = insetRect(panel, Math.round(24 * metrics.uiScale));
  const compact = metrics.width < 760;
  const buttonHeight = Math.round(52 * metrics.uiScale);
  const gap = Math.round(12 * metrics.uiScale);

  return {
    compact,
    panel,
    inner,
    primaryButton: compact
      ? createRect(inner.x, inner.y + inner.height - buttonHeight * 2 - gap, inner.width, buttonHeight)
      : createRect(inner.x, inner.y + inner.height - buttonHeight, (inner.width - gap) * 0.5, buttonHeight),
    secondaryButton: compact
      ? createRect(inner.x, inner.y + inner.height - buttonHeight, inner.width, buttonHeight)
      : createRect(
          inner.x + (inner.width + gap) * 0.5,
          inner.y + inner.height - buttonHeight,
          (inner.width - gap) * 0.5,
          buttonHeight
        )
  };
}
