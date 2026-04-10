function generatePartTexture(scene, key, drawFn) {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  drawFn(graphics);
  graphics.generateTexture(key, 96, 96);
  graphics.destroy();
}

export function ensurePlaceholderTextures(scene) {
  generatePartTexture(scene, 'part-command', (graphics) => {
    graphics.fillStyle(0x23486f, 1);
    graphics.fillRoundedRect(12, 20, 72, 54, 16);
    graphics.fillStyle(0xcfe8ff, 1);
    graphics.fillCircle(48, 47, 10);
  });

  generatePartTexture(scene, 'part-fuel', (graphics) => {
    graphics.fillStyle(0x3f6a4a, 1);
    graphics.fillRoundedRect(24, 12, 48, 72, 14);
    graphics.fillStyle(0x9ee6a4, 1);
    graphics.fillRect(34, 24, 28, 12);
    graphics.fillRect(34, 44, 28, 28);
  });

  generatePartTexture(scene, 'part-engine', (graphics) => {
    graphics.fillStyle(0x67566f, 1);
    graphics.fillRoundedRect(28, 18, 40, 44, 12);
    graphics.fillStyle(0xffb26f, 1);
    graphics.fillTriangle(48, 86, 24, 56, 72, 56);
  });

  generatePartTexture(scene, 'part-fin', (graphics) => {
    graphics.fillStyle(0x46668f, 1);
    graphics.fillTriangle(14, 82, 48, 18, 48, 82);
    graphics.fillTriangle(82, 82, 48, 18, 48, 82);
  });
}
