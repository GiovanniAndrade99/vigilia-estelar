// Controle de entradas: junta teclado, mouse e gamepad em uma interface só,
// para que o jogador (Player) não precise saber de onde veio o comando.
const PAD_DEADZONE = 0.25;

class InputController {
  constructor(scene) {
    this.scene = scene;
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE');
    this.pointer = scene.input.activePointer;
    if (scene.input.mouse) scene.input.mouse.disableContextMenu();

    this.aimSource = 'none';     // 'mouse' ou 'pad': quem mirou por último
    this.lastPointer = { x: this.pointer.x, y: this.pointer.y };
    this.padAngle = -Math.PI / 2;
    this.padStartWasDown = false;
  }

  getPad() {
    const gp = this.scene.input.gamepad;
    return gp && gp.total > 0 ? gp.getPad(0) : null;
  }

  // Direção de movimento normalizada (-1..1). Teclado: WASD ou setas. Gamepad: analógico esquerdo.
  moveVector() {
    const k = this.keys;
    let x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);

    const pad = this.getPad();
    if (pad && pad.leftStick) {
      const s = pad.leftStick;
      if (Math.hypot(s.x, s.y) > PAD_DEADZONE) {
        x = s.x;
        y = s.y;
      }
    }

    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  // Ângulo da mira. Mouse: aponta para o cursor. Gamepad: analógico direito
  // (ou o esquerdo, se o direito estiver parado).
  aimAngle(fromX, fromY, current) {
    const p = this.pointer;
    if (p.x !== this.lastPointer.x || p.y !== this.lastPointer.y) {
      this.aimSource = 'mouse';
      this.lastPointer.x = p.x;
      this.lastPointer.y = p.y;
    }

    const pad = this.getPad();
    if (pad && pad.rightStick && pad.leftStick) {
      const r = pad.rightStick;
      const l = pad.leftStick;
      if (Math.hypot(r.x, r.y) > 0.35) {
        this.aimSource = 'pad';
        this.padAngle = Math.atan2(r.y, r.x);
      } else if (Math.hypot(l.x, l.y) > 0.35 && this.aimSource !== 'mouse') {
        this.aimSource = 'pad';
        this.padAngle = Math.atan2(l.y, l.x);
      }
    }

    if (this.aimSource === 'pad') return this.padAngle;
    if (this.aimSource === 'mouse') return Phaser.Math.Angle.Between(fromX, fromY, p.worldX, p.worldY);
    return current;
  }

  // Atirar: Espaço, botão do mouse, ou A / RT / RB no gamepad.
  isFiring() {
    if (this.keys.SPACE.isDown) return true;
    if (this.pointer.isDown) {
      if (this.aimSource === 'none') this.aimSource = 'mouse';
      return true;
    }
    const pad = this.getPad();
    if (pad) {
      const b = pad.buttons;
      if ((b[0] && b[0].pressed) || (b[5] && b[5].pressed) || (b[7] && b[7].value > 0.3)) return true;
    }
    return false;
  }

  // Botão Start do gamepad (detecção de borda: só conta no momento em que é apertado)
  padStartPressed() {
    const pad = this.getPad();
    const down = !!(pad && pad.buttons[9] && pad.buttons[9].pressed);
    const pressed = down && !this.padStartWasDown;
    this.padStartWasDown = down;
    return pressed;
  }
}

// Liga um tratador de tecla à cena. Ignora a repetição automática do teclado
// e remove o ouvinte quando a cena encerra (o Phaser reaproveita as cenas).
function onKeyPress(scene, handler) {
  const kb = scene.input.keyboard;
  const fn = (event) => {
    if (!event.repeat) handler(event.code);
  };
  kb.on('keydown', fn);
  scene.events.once('shutdown', () => kb.off('keydown', fn));
}

function onPointerPress(scene, handler) {
  const fn = (pointer) => handler(pointer);
  scene.input.on('pointerdown', fn);
  scene.events.once('shutdown', () => scene.input.off('pointerdown', fn));
}

// Detecção de borda para um botão do gamepad em cenas de menu.
function padButtonPressed(scene, index, memo) {
  const gp = scene.input.gamepad;
  const pad = gp && gp.total > 0 ? gp.getPad(0) : null;
  const down = !!(pad && pad.buttons[index] && pad.buttons[index].pressed);
  const pressed = down && !memo[index];
  memo[index] = down;
  return pressed;
}
