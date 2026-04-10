import Phaser from 'phaser';

export function createRect(x, y, width, height) {
  return { x, y, width, height };
}

export function insetRect(rect, inset) {
  return createRect(
    rect.x + inset,
    rect.y + inset,
    Math.max(0, rect.width - inset * 2),
    Math.max(0, rect.height - inset * 2)
  );
}

export function getViewportMetrics(scaleManager) {
  const width = Math.max(320, Math.round(scaleManager.gameSize?.width ?? scaleManager.width ?? 320));
  const height = Math.max(320, Math.round(scaleManager.gameSize?.height ?? scaleManager.height ?? 320));
  const shorterSide = Math.min(width, height);
  const longerSide = Math.max(width, height);
  const isPortrait = height > width;
  const gutter = Math.round(Phaser.Math.Clamp(shorterSide * 0.05, 16, 42));
  const panelGap = Math.round(Phaser.Math.Clamp(shorterSide * 0.025, 12, 28));
  const uiScale = Phaser.Math.Clamp(shorterSide / 960, 0.75, 1.2);

  return {
    width,
    height,
    centerX: width * 0.5,
    centerY: height * 0.5,
    shorterSide,
    longerSide,
    isPortrait,
    aspect: width / height,
    gutter,
    panelGap,
    uiScale,
    contentRect: createRect(gutter, gutter, width - gutter * 2, height - gutter * 2)
  };
}
