export const assetManifest = {
  images: [
    { key: "part-capsule", url: "/assets/CAPSULA224.png" },
    { key: "part-fuel-tank", url: "/assets/TANQUEGRANDE224.png" },
    { key: "part-engine", url: "/assets/MOTOR224.png" },
  ],
  spritesheets: [],
  audio: [],
};

export function preloadAssetManifest(scene) {
  assetManifest.images.forEach((entry) => {
    console.log(`Loading image: ${entry.key} from ${entry.url}`);
    scene.load.image(entry.key, entry.url);
  });

  assetManifest.spritesheets.forEach((entry) => {
    console.log(`Loading spritesheet: ${entry.key} from ${entry.url}`);
    scene.load.spritesheet(entry.key, entry.url, entry.config);
  });

  assetManifest.audio.forEach((entry) => {
    console.log(`Loading audio: ${entry.key}`);
    scene.load.audio(entry.key, entry.urls);
  });

  scene.load.on("complete", () => {
    console.log(
      "All assets loaded. Available textures:",
      scene.textures.getTextureKeys(),
    );
  });
}
