import { theme } from '../config/theme.js';

export function drawPanel(graphics, rect, style = {}) {
  const fillColor = style.fillColor ?? theme.colors.panel;
  const fillAlpha = style.fillAlpha ?? 0.96;
  const strokeColor = style.strokeColor ?? theme.colors.panelBorder;
  const strokeAlpha = style.strokeAlpha ?? 0.9;
  const strokeWidth = style.strokeWidth ?? theme.stroke.panel;
  const radius = style.radius ?? theme.radius.panel;

  graphics.fillStyle(fillColor, fillAlpha);
  graphics.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, radius);

  graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha);
  graphics.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, radius);
}
