export const FONT = 'Jua, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export const COLORS = {
  ink: '#3b2a1a',
  cream: '#fff8e8',
  panel: '#fffaf0',
  green: ['#62c24f', '#3d8f31'],
  orange: ['#ffa53d', '#cc6f1a'],
  red: ['#ff6d5a', '#c23b2c'],
  blue: ['#5bb8f0', '#2f7fb8'],
  gray: ['#c9c2b3', '#958c7a'],
  brown: ['#a8743f', '#6e4524'],
  gold: '#ffd34a',
};

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function text(g, str, x, y, { size = 32, color = '#fff', align = 'center', outline = COLORS.ink, width = 0, baseline = 'middle', alpha = 1 } = {}) {
  g.save();
  g.globalAlpha *= alpha;
  g.font = `${size}px ${FONT}`;
  g.textAlign = align;
  g.textBaseline = baseline;
  if (outline && width !== -1) {
    g.lineJoin = 'round';
    g.lineWidth = width || Math.max(3, size * 0.16);
    g.strokeStyle = outline;
    g.strokeText(str, x, y);
  }
  g.fillStyle = color;
  g.fillText(str, x, y);
  g.restore();
}

export function wrap(g, str, maxWidth, size) {
  g.font = `${size}px ${FONT}`;
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export function panel(g, x, y, w, h, { fill = COLORS.panel, edge = '#d9c49a', r = 28 } = {}) {
  g.save();
  g.fillStyle = 'rgba(40,30,15,0.25)';
  roundRect(g, x, y + 8, w, h, r);
  g.fill();
  g.fillStyle = fill;
  roundRect(g, x, y, w, h, r);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = edge;
  g.stroke();
  g.restore();
}

export class Ui {
  constructor() {
    this.buttons = [];
    this.pressed = null;
  }

  begin() {
    this.buttons = [];
  }

  button(g, id, x, y, w, h, label, { colors = COLORS.green, size = 40, disabled = false, sub = null, onTap, icon = null } = {}) {
    const pressed = this.pressed === id && !disabled;
    const c = disabled ? COLORS.gray : colors;
    const depth = h > 90 ? 10 : 7;
    const dy = pressed ? depth - 2 : 0;
    g.save();
    g.fillStyle = 'rgba(40,30,15,0.25)';
    roundRect(g, x, y + depth + 4, w, h, h * 0.32);
    g.fill();
    g.fillStyle = c[1];
    roundRect(g, x, y + depth, w, h, h * 0.32);
    g.fill();
    g.fillStyle = c[0];
    roundRect(g, x, y + dy, w, h, h * 0.32);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)';
    roundRect(g, x + 10, y + dy + 6, w - 20, h * 0.36, h * 0.18);
    g.fill();
    g.restore();
    const cy = y + dy + h / 2;
    const ty = sub ? cy - size * 0.28 : cy + 2;
    if (icon) icon(g, x + w / 2 - textWidth(g, label, size) / 2 - 30, ty);
    text(g, label, x + w / 2 + (icon ? 18 : 0), ty, { size, color: disabled ? '#f4f0e8' : '#fff', outline: c[1] });
    if (sub) text(g, sub, x + w / 2, cy + size * 0.5, { size: size * 0.5, color: '#fff', outline: c[1], width: 4 });
    this.buttons.push({ id, x, y, w, h: h + depth, disabled, onTap });
  }

  hitTest(x, y) {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }
}

export function textWidth(g, str, size) {
  g.save();
  g.font = `${size}px ${FONT}`;
  const w = g.measureText(str).width;
  g.restore();
  return w;
}
