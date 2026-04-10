import Phaser from 'phaser';
import { drawPanel } from '../panel.js';

export class StarterRocketAction {
  constructor(scene, { rockets, onSelect }) {
    this.scene = scene;
    this.rockets = rockets;
    this.onSelect = onSelect;
    this.background = scene.add.graphics();
    this.titleText = scene.add.text(0, 0, 'Starter Rockets', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '18px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    this.titleText.setOrigin(0, 0);
    this.buttons = rockets.map((rocket) => this.#createButton(rocket));
  }

  #createButton(rocket) {
    const container = this.scene.add.container(0, 0);
    const background = this.scene.add.graphics();
    const label = this.scene.add.text(0, 0, rocket.label, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '14px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    label.setOrigin(0.5);
    container.add([background, label]);
    container.setSize(140, 42);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 140, 42),
      Phaser.Geom.Rectangle.Contains
    );
    container.on('pointerdown', () => this.onSelect(rocket.id));
    container.on('pointerover', () => {
      this.scene.game.canvas.style.cursor = 'pointer';
    });
    container.on('pointerout', () => {
      this.scene.game.canvas.style.cursor = 'default';
    });

    return { rocket, container, background, label };
  }

  layout(rect, metrics) {
    this.rect = rect;
    this.metrics = metrics;
    this.render();
  }

  render() {
    if (!this.rect || !this.metrics) {
      return;
    }

    const padding = Math.round(14 * this.metrics.uiScale);
    const gap = Math.round(8 * this.metrics.uiScale);
    const titleHeight = Math.round(24 * this.metrics.uiScale);
    const buttonWidth = Math.round((this.rect.width - padding * 2 - gap * 2) / 3);
    const buttonHeight = Math.round(38 * this.metrics.uiScale);

    this.background.clear();
    drawPanel(this.background, this.rect, {
      fillColor: 0x13253f,
      strokeColor: 0x7b9bc2,
      fillAlpha: 0.95
    });

    this.titleText.setPosition(this.rect.x + padding, this.rect.y + padding);
    this.titleText.setFontSize(Math.max(14, Math.round(18 * this.metrics.uiScale)));

    this.buttons.forEach((button, index) => {
      const x = this.rect.x + padding + index * (buttonWidth + gap);
      const y = this.rect.y + padding + titleHeight;
      button.container.setPosition(x, y);
      button.container.setSize(buttonWidth, buttonHeight);
      button.container.input.hitArea.setTo(0, 0, buttonWidth, buttonHeight);
      button.background.clear();
      drawPanel(button.background, { x: 0, y: 0, width: buttonWidth, height: buttonHeight }, {
        fillColor: 0x102038,
        strokeColor: 0x5f7ea4,
        radius: 14,
        fillAlpha: 1
      });
      button.label.setPosition(buttonWidth * 0.5, buttonHeight * 0.5);
      button.label.setFontSize(Math.max(11, Math.round(12 * this.metrics.uiScale)));
    });
  }
}
