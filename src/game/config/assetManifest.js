export const assetManifest = {
  images: [],
  spritesheets: [],
  audio: []
};

export function preloadAssetManifest(scene) {
  assetManifest.images.forEach((entry) => {
    scene.load.image(entry.key, entry.url);
  });

  assetManifest.spritesheets.forEach((entry) => {
    scene.load.spritesheet(entry.key, entry.url, entry.config);
  });

  assetManifest.audio.forEach((entry) => {
    scene.load.audio(entry.key, entry.urls);
  });
}
