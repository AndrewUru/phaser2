export function drawLoadingBackdrop(graphics, metrics) {
  graphics.clear();

  graphics.fillStyle(0x08101c, 1);
  graphics.fillRect(0, 0, metrics.width, metrics.height);

  graphics.fillStyle(0x10233d, 1);
  graphics.fillRect(0, 0, metrics.width, metrics.height * 0.62);

  graphics.fillStyle(0x20486f, 0.22);
  graphics.fillCircle(metrics.width * 0.18, metrics.height * 0.2, metrics.shorterSide * 0.18);
  graphics.fillCircle(metrics.width * 0.84, metrics.height * 0.14, metrics.shorterSide * 0.14);

  graphics.fillStyle(0x0e1728, 1);
  graphics.fillRect(0, metrics.height * 0.62, metrics.width, metrics.height * 0.38);

  graphics.lineStyle(2, 0x315579, 0.3);
  const columnGap = Math.max(80, Math.round(metrics.width / 10));
  for (let x = 0; x <= metrics.width; x += columnGap) {
    graphics.lineBetween(x, metrics.height * 0.62, x, metrics.height);
  }

  const rowGap = Math.max(46, Math.round(metrics.height / 12));
  for (let y = metrics.height * 0.62; y <= metrics.height; y += rowGap) {
    graphics.lineBetween(0, y, metrics.width, y);
  }
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
