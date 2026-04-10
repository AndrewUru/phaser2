import Phaser from 'phaser';
import { getViewportMetrics } from './viewport.js';

export function createResponsiveController(scene, computeLayout, applyLayout) {
  let layout = null;
  let metrics = null;

  const refresh = () => {
    metrics = getViewportMetrics(scene.scale);
    layout = computeLayout(metrics, scene);
    applyLayout(layout, metrics);
  };

  const handleResize = () => {
    refresh();
  };

  scene.scale.on(Phaser.Scale.Events.RESIZE, handleResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, handleResize);
  });

  refresh();

  return {
    refresh,
    getLayout: () => layout,
    getMetrics: () => metrics
  };
}
