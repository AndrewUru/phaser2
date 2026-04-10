import { drawPanel } from '../panel.js';

export class BuildHintOverlay {
  constructor(scene) {
    this.scene = scene;
    this.background = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '14px',
      color: '#dfefff',
      lineSpacing: 5,
      wordWrap: { width: 280 }
    });
    this.text.setOrigin(0, 0);
  }

  layout(rect, metrics) {
    this.rect = rect;
    this.metrics = metrics;
    this.render();
  }

  update(message) {
    this.message = message;
    this.render();
  }

  render() {
    if (!this.rect || !this.metrics || !this.message) {
      this.background.clear();
      this.text.setText('');
      return;
    }

    const padding = Math.round(14 * this.metrics.uiScale);
    this.background.clear();
    drawPanel(this.background, this.rect, {
      fillColor: 0x102038,
      strokeColor: 0x6f8fb5,
      fillAlpha: 0.92
    });

    this.text.setPosition(this.rect.x + padding, this.rect.y + padding);
    this.text.setFontSize(Math.max(12, Math.round(13 * this.metrics.uiScale)));
    this.text.setWordWrapWidth(this.rect.width - padding * 2);
    this.text.setText(this.message);
  }
}
