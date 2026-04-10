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
  // Check if real images are loaded, if not create fallback placeholders
  const partsToEnsure = [
    { key: "part-capsule", fallback: createCapsuleFallback },
    { key: "part-fuel-tank", fallback: createFuelTankFallback },
    { key: "part-engine", fallback: createEngineFallback },
    { key: "part-decoupler", fallback: createDecouplerFallback },
  ];

  partsToEnsure.forEach(({ key, fallback }) => {
    if (!scene.textures.exists(key)) {
      generatePartTexture(scene, key, fallback);
    }
  });
}

// Fallback graphics if images don't load
function createCapsuleFallback(graphics) {
  graphics.fillStyle(0x23486f, 1);
  graphics.fillRoundedRect(12, 20, 72, 54, 16);
  graphics.fillStyle(0xcfe8ff, 1);
  graphics.fillCircle(48, 47, 10);
}

function createFuelTankFallback(graphics) {
  graphics.fillStyle(0x3f6a4a, 1);
  graphics.fillRoundedRect(24, 12, 48, 72, 14);
  graphics.fillStyle(0x9ee6a4, 1);
  graphics.fillRect(34, 24, 28, 12);
  graphics.fillRect(34, 44, 28, 28);
}

function createEngineFallback(graphics) {
  graphics.fillStyle(0x67566f, 1);
  graphics.fillRoundedRect(28, 18, 40, 44, 12);
  graphics.fillStyle(0xffb26f, 1);
  graphics.fillTriangle(48, 86, 24, 56, 72, 56);
}

function createDecouplerFallback(graphics) {
  graphics.fillStyle(0x46668f, 1);
  graphics.fillTriangle(14, 82, 48, 18, 48, 82);
  graphics.fillTriangle(82, 82, 48, 18, 48, 82);
}
