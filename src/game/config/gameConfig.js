import Phaser from 'phaser';
import { theme } from './theme.js';
import { BootScene } from '../scenes/BootScene.js';
import { MenuScene } from '../scenes/MenuScene.js';
import { BuildScene } from '../scenes/BuildScene.js';
import { FlightScene } from '../scenes/FlightScene.js';
import { ResultScene } from '../scenes/ResultScene.js';

export function createGameConfig() {
  return {
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#08101c',
    scene: [BootScene, MenuScene, BuildScene, FlightScene, ResultScene],
    scale: {
      parent: 'app',
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight
    },
    render: {
      antialias: true,
      pixelArt: false
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    input: {
      activePointers: 2
    },
    callbacks: {
      postBoot: (game) => {
        game.canvas.style.background = `#${theme.colors.surface.toString(16).padStart(6, '0')}`;
      }
    }
  };
}
