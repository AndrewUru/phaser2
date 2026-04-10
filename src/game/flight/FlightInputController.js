import Phaser from 'phaser';

function createButton(scene, label) {
  const container = scene.add.container(0, 0);
  const background = scene.add.graphics();
  const text = scene.add.text(0, 0, label, {
    fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif',
    fontSize: '16px',
    color: '#edf6ff',
    fontStyle: '700'
  });

  text.setOrigin(0.5);
  container.add([background, text]);

  const hitArea = new Phaser.Geom.Circle(0, 0, 40);
  container.setSize(80, 80);
  container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

  return {
    root: container,
    background,
    text,
    pressed: false,
    radius: 40,
    setLayout(x, y, radius) {
      this.radius = radius;
      hitArea.setTo(0, 0, radius);
      container.setPosition(x, y);
      this.redraw();
    },
    setPressed(value) {
      this.pressed = value;
      this.redraw();
    },
    redraw() {
      background.clear();
      background.fillStyle(this.pressed ? 0xff9a57 : 0x13253f, this.pressed ? 0.88 : 0.55);
      background.fillCircle(0, 0, this.radius);
      background.lineStyle(3, this.pressed ? 0xffd1ac : 0x7b9bc2, 0.9);
      background.strokeCircle(0, 0, this.radius);
      text.setFontSize(Math.max(12, Math.round(this.radius * 0.44)));
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
      left: createButton(scene, 'L'),
      right: createButton(scene, 'R'),
      thrust: createButton(scene, 'GO'),
      stage: createButton(scene, 'STG')
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
    const radius = Math.round(Math.max(24, Math.min(42, 30 * metrics.uiScale)));

    this.buttons.left.setLayout(left.x, left.y, radius);
    this.buttons.right.setLayout(right.x, right.y, radius);
    this.buttons.thrust.setLayout(thrust.x, thrust.y, Math.round(radius * 1.12));
    this.buttons.stage.setLayout(stage.x, stage.y, Math.round(radius * 0.98));
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
