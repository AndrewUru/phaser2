import { BUILD_LABELS } from '../../build/buildConstants.js';
import { getPartDefinition } from '../../build/partsCatalog.js';
import { drawPanel } from '../panel.js';

export class BuildSidebar {
  constructor(scene) {
    this.scene = scene;
    this.background = scene.add.graphics();

    this.titleText = scene.add.text(0, 0, 'Inspector', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '20px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    this.titleText.setOrigin(0, 0);

    this.selectionTitle = scene.add.text(0, 0, 'Selected', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '15px',
      color: '#9ab7d5'
    });
    this.selectionTitle.setOrigin(0, 0);

    this.selectionBody = scene.add.text(0, 0, BUILD_LABELS.emptySelection, {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '15px',
      color: '#edf6ff',
      wordWrap: { width: 280 },
      lineSpacing: 6
    });
    this.selectionBody.setOrigin(0, 0);

    this.validationTitle = scene.add.text(0, 0, 'Validation', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '15px',
      color: '#9ab7d5'
    });
    this.validationTitle.setOrigin(0, 0);

    this.validationLines = Array.from({ length: 4 }, () => {
      const text = scene.add.text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
        fontSize: '14px',
        color: '#edf6ff',
        wordWrap: { width: 280 },
        lineSpacing: 5
      });
      text.setOrigin(0, 0);
      return text;
    });
  }

  layout(rect, metrics) {
    this.rect = rect;
    this.metrics = metrics;

    this.background.clear();
    drawPanel(this.background, rect, {
      fillColor: 0x13253f,
      strokeColor: 0x7b9bc2,
      fillAlpha: 0.96
    });

    const padding = Math.round(16 * metrics.uiScale);
    this.titleText.setPosition(rect.x + padding, rect.y + padding);
    this.titleText.setFontSize(Math.max(17, Math.round(20 * metrics.uiScale)));

    this.render();
  }

  update({ selectedPlacement, validation }) {
    this.selectedPlacement = selectedPlacement;
    this.validation = validation;
    this.render();
  }

  render() {
    if (!this.rect || !this.metrics) {
      return;
    }

    const padding = Math.round(16 * this.metrics.uiScale);
    const contentWidth = this.rect.width - padding * 2;
    const selectionY = this.titleText.y + this.titleText.height + Math.round(12 * this.metrics.uiScale);

    this.selectionTitle.setPosition(this.rect.x + padding, selectionY);
    this.selectionTitle.setFontSize(Math.max(12, Math.round(14 * this.metrics.uiScale)));

    const selectedText = this.selectedPlacement
      ? this.#formatSelectedPlacement(this.selectedPlacement)
      : BUILD_LABELS.emptySelection;

    this.selectionBody.setPosition(this.rect.x + padding, this.selectionTitle.y + this.selectionTitle.height + 4);
    this.selectionBody.setFontSize(Math.max(12, Math.round(14 * this.metrics.uiScale)));
    this.selectionBody.setWordWrapWidth(contentWidth);
    this.selectionBody.setText(selectedText);

    this.validationTitle.setPosition(
      this.rect.x + padding,
      this.selectionBody.y + this.selectionBody.height + Math.round(14 * this.metrics.uiScale)
    );
    this.validationTitle.setFontSize(Math.max(12, Math.round(14 * this.metrics.uiScale)));

    const messages = this.validation?.issues?.length
      ? this.validation.issues.slice(0, this.validationLines.length)
      : [{ severity: 'info', message: BUILD_LABELS.emptyValidation }];

    let nextY = this.validationTitle.y + this.validationTitle.height + 4;
    this.validationLines.forEach((line, index) => {
      const issue = messages[index];
      line.setPosition(this.rect.x + padding, nextY);
      line.setFontSize(Math.max(11, Math.round(13 * this.metrics.uiScale)));
      line.setWordWrapWidth(contentWidth);

      if (!issue) {
        line.setText('');
        return;
      }

      const marker = issue.severity === 'blocker' ? 'BLOCKER' : issue.severity === 'warning' ? 'WARNING' : 'INFO';
      const color = issue.severity === 'blocker' ? '#ff9d96' : issue.severity === 'warning' ? '#ffd777' : '#9ab7d5';
      line.setColor(color);
      line.setText(`${marker}: ${issue.message}`);
      nextY += line.height + Math.round(6 * this.metrics.uiScale);
    });
  }

  #formatSelectedPlacement(placement) {
    const definition = getPartDefinition(placement.partId);
    return `${definition.name}\nGrid origin: ${placement.origin.x}, ${placement.origin.y}\nSize: ${definition.size.width} x ${definition.size.height}\nMass: ${definition.mass.toFixed(1)} t\nFuel: ${Math.round(definition.fuel)} u\nThrust: ${Math.round(definition.thrust)} kN`;
  }
}
