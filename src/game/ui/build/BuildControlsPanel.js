import { drawPanel } from '../panel.js';
import { createTextButton } from '../textButton.js';

export class BuildControlsPanel {
  constructor(scene, callbacks) {
    this.scene = scene;
    this.callbacks = callbacks;

    this.background = scene.add.graphics();
    this.titleText = scene.add.text(0, 0, 'Controls', {
      fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
      fontSize: '20px',
      color: '#edf6ff',
      fontStyle: '700'
    });
    this.titleText.setOrigin(0, 0);

    this.buttons = {
      launch: createTextButton(scene, { label: 'Launch', onClick: callbacks.onLaunch }),
      delete: createTextButton(scene, { label: 'Delete Selected', onClick: callbacks.onDelete }),
      clear: createTextButton(scene, { label: 'Clear Build', onClick: callbacks.onClear }),
      menu: createTextButton(scene, { label: 'Mission Menu', onClick: callbacks.onMenu })
    };
  }

  layout(rect, metrics) {
    this.rect = rect;
    this.metrics = metrics;

    const padding = Math.round(16 * metrics.uiScale);
    const titleGap = Math.round(12 * metrics.uiScale);
    const innerWidth = rect.width - padding * 2;
    const startY = rect.y + padding + Math.round(28 * metrics.uiScale) + titleGap;
    const buttonHeight = Math.round(Math.max(42, Math.min(58, (rect.height - startY + rect.y - padding - titleGap) / 2.4)));
    const gap = Math.round(10 * metrics.uiScale);
    const singleColumn = innerWidth < 280;

    this.background.clear();
    drawPanel(this.background, rect, {
      fillColor: 0x13253f,
      strokeColor: 0x7b9bc2,
      fillAlpha: 0.96
    });

    this.titleText.setPosition(rect.x + padding, rect.y + padding);
    this.titleText.setFontSize(Math.max(17, Math.round(20 * metrics.uiScale)));

    if (singleColumn) {
      const order = ['launch', 'delete', 'clear', 'menu'];
      order.forEach((key, index) => {
        this.buttons[key].layout({
          x: rect.x + padding,
          y: startY + index * (buttonHeight + gap),
          width: innerWidth,
          height: buttonHeight
        });
      });
    } else {
      const buttonWidth = (innerWidth - gap) * 0.5;
      this.buttons.launch.layout({
        x: rect.x + padding,
        y: startY,
        width: buttonWidth,
        height: buttonHeight
      });
      this.buttons.delete.layout({
        x: rect.x + padding + buttonWidth + gap,
        y: startY,
        width: buttonWidth,
        height: buttonHeight
      });
      this.buttons.clear.layout({
        x: rect.x + padding,
        y: startY + buttonHeight + gap,
        width: buttonWidth,
        height: buttonHeight
      });
      this.buttons.menu.layout({
        x: rect.x + padding + buttonWidth + gap,
        y: startY + buttonHeight + gap,
        width: buttonWidth,
        height: buttonHeight
      });
    }
  }

  setState({ canLaunch, hasSelection }) {
    this.buttons.launch.setEnabled(canLaunch);
    this.buttons.delete.setEnabled(hasSelection);
  }
}
