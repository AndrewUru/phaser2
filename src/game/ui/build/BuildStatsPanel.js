import { drawPanel } from '../panel.js';

export class BuildStatsPanel {
  constructor(scene) {
    this.scene = scene;
    this.background = scene.add.graphics();
    this.titleText = scene.add.text(0, 0, 'Vehicle Stats', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '20px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    this.titleText.setOrigin(0, 0);

    this.rows = [
      this.#createRow('Mass'),
      this.#createRow('Thrust'),
      this.#createRow('Fuel'),
      this.#createRow('Center'),
      this.#createRow('Stability'),
      this.#createRow('TWR')
    ];
  }

  #createRow(label) {
    const labelText = this.scene.add.text(0, 0, label, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '15px',
      color: '#9ab7d5'
    });
    const valueText = this.scene.add.text(0, 0, '-', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '15px',
      color: '#edf6ff',
      fontStyle: '700'
    });

    labelText.setOrigin(0, 0);
    valueText.setOrigin(1, 0);

    return { labelText, valueText };
  }

  layout(rect, metrics) {
    this.rect = rect;
    this.metrics = metrics;
    this.renderBackground();
  }

  update(stats) {
    this.stats = stats;
    this.renderContent();
  }

  renderBackground() {
    if (!this.rect || !this.metrics) {
      return;
    }

    const padding = Math.round(16 * this.metrics.uiScale);

    this.background.clear();
    drawPanel(this.background, this.rect, {
      fillColor: 0x13253f,
      strokeColor: 0x7b9bc2,
      fillAlpha: 0.96
    });

    this.titleText.setPosition(this.rect.x + padding, this.rect.y + padding);
    this.titleText.setFontSize(Math.max(17, Math.round(20 * this.metrics.uiScale)));

    this.renderContent();
  }

  renderContent() {
    if (!this.rect || !this.metrics || !this.stats) {
      return;
    }

    const padding = Math.round(16 * this.metrics.uiScale);
    const startY = this.titleText.y + this.titleText.height + Math.round(10 * this.metrics.uiScale);
    const rowGap = Math.round(5 * this.metrics.uiScale);

    const values = [
      `${this.stats.totalMass.toFixed(1)} t`,
      `${Math.round(this.stats.totalThrust)} kN`,
      `${Math.round(this.stats.totalFuel)} u`,
      `${this.stats.centerOfMass.x.toFixed(1)}, ${this.stats.centerOfMass.y.toFixed(1)}`,
      `${this.stats.stabilityScore}/100`,
      this.stats.thrustToWeight.toFixed(2)
    ];

    let nextY = startY;
    this.rows.forEach((row, index) => {
      row.labelText.setPosition(this.rect.x + padding, nextY);
      row.valueText.setPosition(this.rect.x + this.rect.width - padding, nextY);
      row.labelText.setFontSize(Math.max(12, Math.round(14 * this.metrics.uiScale)));
      row.valueText.setFontSize(Math.max(12, Math.round(14 * this.metrics.uiScale)));
      row.valueText.setText(values[index]);
      nextY += row.labelText.height + rowGap;
    });
  }
}
