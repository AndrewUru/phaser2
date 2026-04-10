import { theme } from '../config/theme.js';

export function drawLoadingBackdrop(graphics, metrics) {
  graphics.clear();

  graphics.fillStyle(theme.colors.bgBottom, 1);
  graphics.fillRect(0, 0, metrics.width, metrics.height);

  graphics.fillStyle(theme.colors.bgTop, 1);
  graphics.fillRect(0, 0, metrics.width, metrics.height * 0.7);

  graphics.fillStyle(theme.colors.bgMid, 0.9);
  graphics.fillRect(0, metrics.height * 0.52, metrics.width, metrics.height * 0.24);

  graphics.fillStyle(theme.colors.glow, 0.08);
  graphics.fillCircle(
    metrics.width * 0.16,
    metrics.height * 0.24,
    metrics.shorterSide * 0.24
  );
  graphics.fillStyle(0x8f62ff, 0.06);
  graphics.fillCircle(
    metrics.width * 0.84,
    metrics.height * 0.14,
    metrics.shorterSide * 0.28
  );
  graphics.fillStyle(0xffa86a, 0.045);
  graphics.fillCircle(
    metrics.width * 0.72,
    metrics.height * 0.72,
    metrics.shorterSide * 0.2
  );

  graphics.lineStyle(1, 0xffffff, 0.03);
  const columnGap = Math.max(86, Math.round(metrics.width / 12));
  for (let x = 0; x <= metrics.width; x += columnGap) {
    graphics.lineBetween(x, 0, x, metrics.height);
  }

  const rowGap = Math.max(52, Math.round(metrics.height / 13));
  for (let y = 0; y <= metrics.height; y += rowGap) {
    graphics.lineBetween(0, y, metrics.width, y);
  }

  graphics.lineStyle(2, theme.colors.accentCool, 0.08);
  graphics.strokeRect(
    metrics.width * 0.08,
    metrics.height * 0.1,
    metrics.width * 0.84,
    metrics.height * 0.8
  );
}

export function drawWorkshopBackdrop(graphics, metrics) {
  graphics.clear();

  graphics.fillStyle(0x0a1019, 1);
  graphics.fillRect(0, 0, metrics.width, metrics.height);

  const skyHeight = metrics.height * 0.38;
  graphics.fillStyle(0x142945, 1);
  graphics.fillRect(0, 0, metrics.width, skyHeight);

  graphics.fillStyle(0x244b72, 0.25);
  graphics.fillCircle(metrics.width * 0.16, skyHeight * 0.28, metrics.shorterSide * 0.18);
  graphics.fillCircle(metrics.width * 0.82, skyHeight * 0.18, metrics.shorterSide * 0.12);

  graphics.fillStyle(0x0d1726, 1);
  graphics.fillRect(0, skyHeight, metrics.width, metrics.height - skyHeight);

  graphics.fillStyle(0x101f34, 1);
  graphics.fillRect(0, metrics.height * 0.68, metrics.width, metrics.height * 0.32);

  graphics.lineStyle(3, 0x3b638d, 0.34);
  const beamGap = Math.max(120, Math.round(metrics.width / 8));
  for (let x = 0; x <= metrics.width; x += beamGap) {
    graphics.lineBetween(x, skyHeight, x, metrics.height);
  }

  const floorGap = Math.max(60, Math.round(metrics.width / 14));
  const floorTop = metrics.height * 0.68;
  for (let x = -metrics.width; x <= metrics.width * 2; x += floorGap) {
    graphics.lineBetween(metrics.width * 0.5, floorTop, x, metrics.height);
  }

  const catwalkY = skyHeight + Math.max(30, metrics.height * 0.05);
  graphics.lineStyle(4, 0x6188b3, 0.28);
  graphics.lineBetween(0, catwalkY, metrics.width, catwalkY);
}
