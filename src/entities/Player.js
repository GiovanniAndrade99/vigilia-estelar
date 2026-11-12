// Estados da nave do jogador
const PlayerState = {
  NORMAL: 'NORMAL',
  INVULNERAVEL: 'INVULNERAVEL', // logo após levar dano: pisca e não recebe dano
  ESCUDO: 'ESCUDO',             // power-up: absorve tiros e destrói inimigos no contato
  DESTRUIDO: 'DESTRUIDO',
};

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Física: movimento por aceleração, com atrito (drag) e velocidade máxima
    this.body.setCircle(13, 7, 7);
    this.setCollideWorldBounds(true);
    this.setBounce(0.3);
    this.setDrag(CFG.PLAYER.DRAG);
    this.setMaxVelocity(CFG.PLAYER.MAX_SPEED);
    this.setDepth(10);
    this.rotation = -Math.PI / 2;

    this.lives = CFG.PLAYER.LIVES;
    this.nextShotAt = 0;
    this.tripleUntil = 0;
    this.shieldUntil = 0;
    this.invulnUntil = 0;
    this.isThrusting = false;
    this.thrustAngle = 0;

    this.shield = scene.add.image(x, y, 'shield').setDepth(11).setVisible(false);
    this.blinkTween = null;
    this.mode = null;
    this.setMode(PlayerState.NORMAL);
  }

  // Troca de estado com ações de saída e de entrada
  setMode(mode) {
    if (mode === this.mode) return;

    if (this.mode === PlayerState.INVULNERAVEL && this.blinkTween) {
      this.blinkTween.stop();
      this.blinkTween = null;
      this.setAlpha(1);
    }
    if (this.mode === PlayerState.ESCUDO) this.shield.setVisible(false);

    this.mode = mode;

    if (mode === PlayerState.INVULNERAVEL) {
      this.blinkTween = this.scene.tweens.add({ targets: this, alpha: 0.2, duration: 90, yoyo: true, repeat: -1 });
    } else if (mode === PlayerState.ESCUDO) {
      this.shield.setVisible(true).setScale(0.5);
      this.scene.tweens.add({ targets: this.shield, scale: 1, duration: 200, ease: 'Back.Out' });
    } else if (mode === PlayerState.DESTRUIDO) {
      this.setVisible(false);
      this.body.enable = false;
    }
  }

  update(now, controls, dt) {
    if (this.mode === PlayerState.DESTRUIDO) return;

    // Movimento pela física: a entrada vira aceleração
    const move = controls.moveVector();
    this.setAcceleration(move.x * CFG.PLAYER.ACCEL, move.y * CFG.PLAYER.ACCEL);
    this.isThrusting = move.x !== 0 || move.y !== 0;
    if (this.isThrusting) this.thrustAngle = Math.atan2(move.y, move.x);

    // Rotação pelo Transform: a nave gira para onde o jogador mira
    this.rotation = controls.aimAngle(this.x, this.y, this.rotation);

    if (controls.isFiring() && now >= this.nextShotAt) {
      this.nextShotAt = now + CFG.PLAYER.FIRE_DELAY;
      this.scene.firePlayerBullet(this);
    }

    // O estado é derivado dos temporizadores (escudo tem prioridade)
    if (now < this.shieldUntil) this.setMode(PlayerState.ESCUDO);
    else if (now < this.invulnUntil) this.setMode(PlayerState.INVULNERAVEL);
    else this.setMode(PlayerState.NORMAL);

    this.shield.setPosition(this.x, this.y);
    this.shield.rotation += 2 * dt;
  }

  canBeHit() {
    return this.mode === PlayerState.NORMAL;
  }

  hasShield() {
    return this.mode === PlayerState.ESCUDO;
  }

  hasTriple(now) {
    return now < this.tripleUntil;
  }

  takeHit(now) {
    this.lives--;
    this.invulnUntil = now + CFG.PLAYER.INVULN_MS;
    this.setMode(PlayerState.INVULNERAVEL);
  }

  explode() {
    this.setAcceleration(0, 0);
    this.setVelocity(0, 0);
    this.isThrusting = false;
    this.setMode(PlayerState.DESTRUIDO);
  }
}
