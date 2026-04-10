import Phaser from 'phaser';

function createButton(scene, { label, caption, variant = 'secondary' }) {
  const container = scene.add.container(0, 0);
  const glow = scene.add.graphics();
  const background = scene.add.graphics();
  const captionText = scene.add.text(0, 0, caption, {
    fontFamily: '"Consolas", "Lucida Console", monospace',
    fontSize: '11px',
    color: '#9ab7d5',
    fontStyle: '700'
  });
  const labelText = scene.add.text(0, 0, label, {
    fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
    fontSize: '16px',
    color: '#edf6ff',
    fontStyle: '700'
  });

  captionText.setOrigin(0.5, 0.5);
  labelText.setOrigin(0.5, 0.5);
  container.add([glow, background, captionText, labelText]);

  const hitArea = new Phaser.Geom.Rectangle(-50, -40, 100, 80);
  container.setSize(100, 80);
  container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

  return {
    root: container,
    glow,
    background,
    captionText,
    labelText,
    variant,
    pressed: false,
    width: 100,
    height: 80,
    setLayout(x, y, width, height) {
      this.width = width;
      this.height = height;
      hitArea.setTo(-width * 0.5, -height * 0.5, width, height);
      container.setPosition(x, y);
      container.setSize(width, height);
      this.redraw();
    },
    setPressed(value) {
      this.pressed = value;
      this.redraw();
    },
    redraw() {
      const radius = Math.round(Math.min(this.width, this.height) * 0.28);
      const isPrimary = this.variant === 'primary';
      const isAccent = this.variant === 'accent';
      const fillColor = this.pressed
        ? 0xff9a57
        : isPrimary
          ? 0x11243d
          : 0x102038;
      const glowColor = this.pressed
        ? 0xff9a57
        : isAccent
          ? 0x74c2ff
          : 0x6dd3ff;
      const borderColor = this.pressed
        ? 0xffd9b5
        : isPrimary
          ? 0x89d1ff
          : 0x7b9bc2;

      glow.clear();
      glow.fillStyle(glowColor, this.pressed ? 0.18 : isPrimary ? 0.1 : 0.06);
      glow.fillRoundedRect(
        -this.width * 0.5 - 6,
        -this.height * 0.5 - 6,
        this.width + 12,
        this.height + 12,
        radius + 8
      );

      background.clear();
      background.fillStyle(fillColor, this.pressed ? 0.92 : 0.76);
      background.fillRoundedRect(-this.width * 0.5, -this.height * 0.5, this.width, this.height, radius);
      background.fillStyle(isPrimary ? 0x193452 : 0x16283f, 0.32);
      background.fillRoundedRect(
        -this.width * 0.5 + 2,
        -this.height * 0.5 + 2,
        this.width - 4,
        this.height * 0.42,
        radius
      );
      background.lineStyle(1.5, borderColor, this.pressed ? 0.98 : 0.82);
      background.strokeRoundedRect(-this.width * 0.5, -this.height * 0.5, this.width, this.height, radius);
      background.lineStyle(1, 0xffffff, this.pressed ? 0.14 : 0.08);
      background.lineBetween(
        -this.width * 0.5 + 12,
        -this.height * 0.5 + 14,
        this.width * 0.5 - 12,
        -this.height * 0.5 + 14
      );

      captionText.setPosition(0, -this.height * 0.22);
      captionText.setFontSize(Math.max(10, Math.round(this.height * 0.14)));
      captionText.setColor(this.pressed ? '#fff0df' : '#9ab7d5');

      labelText.setPosition(0, this.height * 0.06);
      labelText.setFontSize(Math.max(14, Math.round(this.height * (isPrimary ? 0.2 : 0.18))));
      labelText.setColor(this.pressed ? '#1f1206' : '#edf6ff');
    }
  };
}

export class FlightInputController {
  constructor(scene) {
    this.scene = scene;
    this.touchState = {
      left: false,
      right: false,
      thrust: false,
      stageQueued: false
    };

    this.keys = {
      a: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      left: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      space: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      enter: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      shift: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
    };

    this.buttons = {
      left: createButton(scene, { label: '<', caption: 'LEFT', variant: 'secondary' }),
      right: createButton(scene, { label: '>', caption: 'RIGHT', variant: 'secondary' }),
      thrust: createButton(scene, { label: 'THRUST', caption: 'PRIMARY', variant: 'primary' }),
      stage: createButton(scene, { label: 'STAGE', caption: 'SEPARATE', variant: 'accent' })
    };

    this.#bindHoldButton(this.buttons.left, 'left');
    this.#bindHoldButton(this.buttons.right, 'right');
    this.#bindHoldButton(this.buttons.thrust, 'thrust');
    this.#bindTapButton(this.buttons.stage, 'stageQueued');

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.game.canvas.style.cursor = 'default';
    });
  }

  #bindHoldButton(button, key) {
    button.root.on('pointerdown', () => {
      this.touchState[key] = true;
      button.setPressed(true);
    });

    const release = () => {
      this.touchState[key] = false;
      button.setPressed(false);
    };

    button.root.on('pointerup', release);
    button.root.on('pointerout', release);
    button.root.on('pointerupoutside', release);
    button.root.on('pointerover', () => {
      this.scene.game.canvas.style.cursor = 'pointer';
    });
  }

  #bindTapButton(button, key) {
    button.root.on('pointerdown', () => {
      this.touchState[key] = true;
      button.setPressed(true);
    });

    button.root.on('pointerup', () => {
      button.setPressed(false);
    });
    button.root.on('pointerout', () => {
      button.setPressed(false);
    });
    button.root.on('pointerupoutside', () => {
      button.setPressed(false);
    });
    button.root.on('pointerover', () => {
      this.scene.game.canvas.style.cursor = 'pointer';
    });
  }

  layout(layout, metrics) {
    const left = layout.touchControls.left;
    const right = layout.touchControls.right;
    const thrust = layout.touchControls.thrust;
    const stage = layout.touchControls.stage;
    const baseWidth = Math.round(Math.max(84, Math.min(112, 94 * metrics.uiScale)));
    const baseHeight = Math.round(Math.max(66, Math.min(82, 74 * metrics.uiScale)));

    this.buttons.left.setLayout(left.x, left.y, baseWidth, baseHeight);
    this.buttons.right.setLayout(right.x, right.y, baseWidth, baseHeight);
    this.buttons.thrust.setLayout(
      thrust.x,
      thrust.y,
      Math.round(baseWidth * 1.18),
      Math.round(baseHeight * 1.42)
    );
    this.buttons.stage.setLayout(
      stage.x,
      stage.y,
      Math.round(baseWidth * 1.08),
      Math.round(baseHeight * 0.82)
    );
  }

  getInputState() {
    const keyboardLeft = Boolean(this.keys.a?.isDown || this.keys.left?.isDown);
    const keyboardRight = Boolean(this.keys.d?.isDown || this.keys.right?.isDown);
    const thrust = Boolean(this.keys.space?.isDown || this.keys.up?.isDown || this.touchState.thrust);
    const stagePressed =
      Boolean(
        Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
          Phaser.Input.Keyboard.JustDown(this.keys.shift)
      ) || this.touchState.stageQueued;

    const rotate =
      (keyboardRight || this.touchState.right ? 1 : 0) -
      (keyboardLeft || this.touchState.left ? 1 : 0);

    this.touchState.stageQueued = false;
    this.buttons.left.setPressed(keyboardLeft || this.touchState.left);
    this.buttons.right.setPressed(keyboardRight || this.touchState.right);
    this.buttons.thrust.setPressed(thrust);
    this.buttons.stage.setPressed(false);

    return {
      thrust,
      rotate,
      stagePressed
    };
  }
}
