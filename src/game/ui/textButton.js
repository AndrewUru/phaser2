import Phaser from 'phaser';
import { theme } from '../config/theme.js';
import { drawPanel } from './panel.js';

export function createTextButton(scene, { label, onClick }) {
  const container = scene.add.container(0, 0);
  const background = scene.add.graphics();
  const text = scene.add.text(0, 0, label, {
    fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
    fontSize: '24px',
    color: theme.colors.ink,
    fontStyle: '700'
  });

  text.setOrigin(0.5);
  container.add([background, text]);

  const hitArea = new Phaser.Geom.Rectangle(-100, -28, 200, 56);
  let bounds = { x: 0, y: 0, width: 200, height: 56 };
  let hovered = false;
  let pressed = false;
  let enabled = true;

  container.setSize(bounds.width, bounds.height);
  container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

  const redraw = () => {
    background.clear();

    let fillColor = theme.colors.panelAlt;
    let strokeColor = theme.colors.panelBorder;
    let textColor = theme.colors.ink;

    if (!enabled) {
      fillColor = theme.colors.panel;
      strokeColor = 0x3f536d;
      textColor = theme.colors.muted;
    } else if (pressed) {
      fillColor = theme.colors.accentDarkFill;
      strokeColor = 0xffc48c;
    } else if (hovered) {
      fillColor = 0xff9a57;
      strokeColor = 0xffd0a5;
      textColor = '#1e1206';
    }

    drawPanel(
      background,
      {
        x: -bounds.width * 0.5,
        y: -bounds.height * 0.5,
        width: bounds.width,
        height: bounds.height
      },
      {
        fillColor,
        strokeColor,
        radius: theme.radius.button,
        strokeWidth: theme.stroke.button
      }
    );

    text.setColor(textColor);
    text.setFontSize(Math.max(18, Math.round(bounds.height * 0.32)));
  };

  const setCanvasCursor = (cursor) => {
    scene.game.canvas.style.cursor = cursor;
  };

  container.on('pointerover', () => {
    if (!enabled) {
      return;
    }

    hovered = true;
    setCanvasCursor('pointer');
    redraw();
  });

  container.on('pointerout', () => {
    hovered = false;
    pressed = false;
    setCanvasCursor('default');
    redraw();
  });

  container.on('pointerdown', () => {
    if (!enabled) {
      return;
    }

    pressed = true;
    redraw();
  });

  container.on('pointerup', () => {
    if (!enabled) {
      return;
    }

    pressed = false;
    redraw();
    onClick?.();
  });

  redraw();

  return {
    root: container,
    layout(nextBounds) {
      bounds = { ...nextBounds };
      hitArea.setTo(-bounds.width * 0.5, -bounds.height * 0.5, bounds.width, bounds.height);
      container.setPosition(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5);
      container.setSize(bounds.width, bounds.height);
      redraw();
    },
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      redraw();
    },
    destroy() {
      setCanvasCursor('default');
      container.destroy(true);
    }
  };
}
