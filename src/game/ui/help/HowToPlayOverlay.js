import { drawPanel } from '../panel.js';

export class HowToPlayOverlay {
  constructor(scene, { pages, onClose }) {
    this.scene = scene;
    this.pages = pages;
    this.onClose = onClose;
    this.visible = false;
    this.activePage = 0;

    this.backdrop = scene.add.graphics();
    this.panel = scene.add.graphics();
    this.titleText = scene.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '28px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    this.titleText.setOrigin(0, 0);

    this.bodyText = scene.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '17px',
      color: '#cfe2f4',
      lineSpacing: 8,
      wordWrap: { width: 420 }
    });
    this.bodyText.setOrigin(0, 0);

    this.footerText = scene.add.text(0, 0, '', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '14px',
      color: '#9ab7d5'
    });
    this.footerText.setOrigin(0, 0);

    this.applyVisibility();
  }

  show(pageIndex = 0) {
    this.activePage = Math.max(0, Math.min(pageIndex, this.pages.length - 1));
    this.visible = true;
    this.applyVisibility();
    this.render();
  }

  hide() {
    this.visible = false;
    this.applyVisibility();
    this.onClose?.();
  }

  toggle(pageIndex = 0) {
    if (this.visible) {
      this.hide();
      return;
    }

    this.show(pageIndex);
  }

  layout(rect, metrics) {
    this.rect = rect;
    this.metrics = metrics;
    this.render();
  }

  applyVisibility() {
    this.backdrop.setVisible(this.visible);
    this.panel.setVisible(this.visible);
    this.titleText.setVisible(this.visible);
    this.bodyText.setVisible(this.visible);
    this.footerText.setVisible(this.visible);
  }

  render() {
    if (!this.visible || !this.rect || !this.metrics) {
      return;
    }

    const page = this.pages[this.activePage];
    const padding = Math.round(22 * this.metrics.uiScale);

    this.backdrop.clear();
    this.backdrop.fillStyle(0x02060b, 0.62);
    this.backdrop.fillRect(0, 0, this.metrics.width, this.metrics.height);

    this.panel.clear();
    drawPanel(this.panel, this.rect, {
      fillColor: 0x102038,
      strokeColor: 0x8fb3da,
      fillAlpha: 0.98
    });

    this.titleText.setText(page.title);
    this.titleText.setPosition(this.rect.x + padding, this.rect.y + padding);
    this.titleText.setFontSize(Math.max(22, Math.round(28 * this.metrics.uiScale)));

    this.bodyText.setText(page.body);
    this.bodyText.setPosition(
      this.rect.x + padding,
      this.titleText.y + this.titleText.height + Math.round(12 * this.metrics.uiScale)
    );
    this.bodyText.setFontSize(Math.max(14, Math.round(17 * this.metrics.uiScale)));
    this.bodyText.setWordWrapWidth(this.rect.width - padding * 2);

    this.footerText.setText('Press H or click the help action again to close.');
    this.footerText.setPosition(
      this.rect.x + padding,
      this.rect.y + this.rect.height - padding - this.footerText.height
    );
    this.footerText.setFontSize(Math.max(12, Math.round(13 * this.metrics.uiScale)));
  }
}
