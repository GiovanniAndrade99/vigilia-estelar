// Inimigos. Cada um tem uma máquina de estados (aiState) que define o comportamento.
// Todos começam no estado SURGINDO: aparecem crescendo (tween de escala) e sem corpo
// de física, para o jogador ver de onde vêm antes de levar dano.

class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type) {
    super(scene, x, y, type);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.kind = type;
    this.def = CFG.ENEMIES[type];
    this.hp = this.def.hp;
    this.maxHp = this.def.hp;
    this.score = this.def.score;
    this.color = this.def.color;
    this.speed = this.def.speed;
    this.speedScale = 1;
    this.isBoss = false;
    this.dying = false;
    this.baseTint = null;
    this.aiState = 'SURGINDO';
    this.stateStart = 0;
    this.seed = Math.random() * 1000;
    this.setDepth(8);
  }

  // Chamado depois de entrar no grupo de física (o grupo reconfigura o corpo ao adicionar).
  setup(speedScale) {
    this.speedScale = speedScale;
    this.speed = this.def.speed * speedScale;
    const r = this.def.radius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.setCollideWorldBounds(true);
    this.setBounce(1);
    this.spawnIn();
  }

  spawnIn() {
    this.aiState = 'SURGINDO';
    this.body.enable = false;
    this.setScale(0).setAlpha(0.2);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 1,
      duration: 450,
      ease: 'Back.Out',
      onComplete: () => {
        if (!this.active) return;
        this.body.enable = true;
        this.enterState(this.initialState());
      },
    });
  }

  initialState() {
    return 'PERSEGUIR';
  }

  enterState(state) {
    this.aiState = state;
    this.stateStart = this.scene.now;
    this.onEnter(state);
  }

  onEnter() {}

  timeInState() {
    return this.scene.now - this.stateStart;
  }

  get player() {
    return this.scene.player;
  }

  angleToPlayer() {
    return Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
  }

  distToPlayer() {
    return Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
  }

  // Retorna true se o dano matou o inimigo
  takeDamage(amount) {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.restoreTint();
    });
    return this.hp <= 0;
  }

  restoreTint() {
    if (this.baseTint !== null) this.setTint(this.baseTint);
    else this.clearTint();
  }

  // Chamado a cada quadro pelo grupo (runChildUpdate)
  update(time, delta) {
    if (!this.active || this.dying || this.aiState === 'SURGINDO') return;
    this.think(delta / 1000);
  }

  think() {}
}

// Drone: persegue o jogador em zigue-zague e gira o corpo.
class Drone extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'drone');
  }

  think(dt) {
    const wobble = Math.sin(this.scene.now / 280 + this.seed) * 0.6;
    this.scene.physics.velocityFromRotation(this.angleToPlayer() + wobble, this.speed, this.body.velocity);
    this.rotation += 5 * dt;
  }
}

// Sentinela: APROXIMAR -> MIRAR -> ATIRAR -> REPOSICIONAR
class Sentinela extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'sentinela');
    this.shotsLeft = 0;
    this.nextShotAt = 0;
  }

  initialState() {
    return 'APROXIMAR';
  }

  onEnter(state) {
    if (state === 'MIRAR') {
      this.baseTint = 0xffe066; // fica amarelado enquanto mira: aviso ao jogador
      this.restoreTint();
    } else if (state === 'ATIRAR') {
      this.shotsLeft = 3;
      this.nextShotAt = this.scene.now;
    } else if (state === 'REPOSICIONAR') {
      this.baseTint = null;
      this.restoreTint();
      const side = Math.random() < 0.5 ? -1 : 1;
      this.scene.physics.velocityFromRotation(this.angleToPlayer() + side * Math.PI / 2, this.speed * 1.4, this.body.velocity);
    }
  }

  think() {
    const range = this.def.range;
    const dist = this.distToPlayer();
    this.rotation = this.angleToPlayer();

    switch (this.aiState) {
      case 'APROXIMAR':
        this.scene.physics.velocityFromRotation(this.rotation, this.speed, this.body.velocity);
        if (dist < range) this.enterState('MIRAR');
        break;
      case 'MIRAR':
        this.body.velocity.scale(0.9);
        if (this.timeInState() > 650) this.enterState('ATIRAR');
        break;
      case 'ATIRAR':
        this.body.velocity.scale(0.9);
        if (this.shotsLeft > 0 && this.scene.now >= this.nextShotAt) {
          this.scene.fireEnemyBullet(this.x + Math.cos(this.rotation) * 20, this.y + Math.sin(this.rotation) * 20, this.rotation, CFG.ENEMY_BULLET_SPEED);
          this.shotsLeft--;
          this.nextShotAt = this.scene.now + 170;
        }
        if (this.shotsLeft === 0 && this.timeInState() > 600) this.enterState('REPOSICIONAR');
        break;
      case 'REPOSICIONAR':
        if (this.timeInState() > 900) this.enterState(dist > range * 1.2 ? 'APROXIMAR' : 'MIRAR');
        break;
    }
  }
}

// Investida: VAGAR -> CARREGAR (pisca) -> INVESTIR -> RECUPERAR
class Investida extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'investida');
    this.wanderFor = 0;
  }

  initialState() {
    return 'VAGAR';
  }

  onEnter(state) {
    if (state === 'VAGAR') {
      this.wanderFor = Phaser.Math.Between(1300, 2300);
      this.scene.physics.velocityFromRotation(Math.random() * Math.PI * 2, this.speed, this.body.velocity);
    } else if (state === 'CARREGAR') {
      this.setVelocity(0, 0);
    } else if (state === 'INVESTIR') {
      this.restoreTint();
      this.scene.physics.velocityFromRotation(this.rotation, this.def.dashSpeed * (1 + (this.speedScale - 1) / 2), this.body.velocity);
    }
  }

  think() {
    switch (this.aiState) {
      case 'VAGAR':
        if (this.distToPlayer() > 420) {
          this.scene.physics.velocityFromRotation(this.angleToPlayer(), this.speed, this.body.velocity);
        }
        this.rotation = this.body.velocity.angle();
        if (this.timeInState() > this.wanderFor && this.distToPlayer() < 420) this.enterState('CARREGAR');
        break;
      case 'CARREGAR': {
        this.rotation = this.angleToPlayer();
        const blink = Math.floor(this.timeInState() / 90) % 2 === 0;
        if (blink) this.setTintFill(0xffffff);
        else this.restoreTint();
        if (this.timeInState() > 700) this.enterState('INVESTIR');
        break;
      }
      case 'INVESTIR':
        this.rotation = this.body.velocity.angle();
        if (this.timeInState() > 550) this.enterState('RECUPERAR');
        break;
      case 'RECUPERAR':
        this.body.velocity.scale(0.92);
        if (this.timeInState() > 700) this.enterState('VAGAR');
        break;
    }
  }
}

// Núcleo, o chefe: ENTRADA -> FASE1 -> FASE2 (abaixo de 50% de vida).
// O movimento dele é feito direto pelo Transform (x/y), não pela física.
class Nucleo extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'nucleo');
    this.isBoss = true;
    this.nextRadialAt = 0;
    this.nextAimedAt = 0;
    this.nextSummonAt = 0;
    this.setDepth(7);
  }

  setup() {
    const r = this.def.radius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.body.setImmovable(true);
    this.body.pushable = false;
    this.aiState = 'ENTRADA';
    this.body.enable = false;
    this.scene.tweens.add({
      targets: this,
      y: 210,
      duration: 2400,
      ease: 'Sine.Out',
      onComplete: () => {
        if (!this.active) return;
        this.body.enable = true;
        this.enterState('FASE1');
      },
    });
  }

  get phase2() {
    return this.aiState === 'FASE2';
  }

  onEnter(state) {
    const now = this.scene.now;
    if (state === 'FASE1') {
      this.nextRadialAt = now + 800;
      this.nextAimedAt = now + 1800;
    } else if (state === 'FASE2') {
      this.baseTint = 0xff9a9a;
      this.restoreTint();
      this.nextSummonAt = now + 1500;
      this.scene.cameras.main.shake(400, 0.01);
      this.scene.events.emit('notice', 'O NÚCLEO ESTÁ INSTÁVEL!', '#ff7ab8');
    }
  }

  update(time, delta) {
    if (!this.active || this.dying) return;
    const dt = delta / 1000;
    this.rotation += (this.phase2 ? 1.8 : 0.7) * dt;
    if (this.aiState === 'ENTRADA') return;
    this.think(dt);
  }

  think(dt) {
    const now = this.scene.now;
    const t = now / 1000;
    const pace = this.phase2 ? 1.6 : 1;

    // Trajetória em "8" calculada por função do tempo e aplicada no Transform
    const tx = CFG.WIDTH / 2 + Math.sin(t * 0.55 * pace) * 280;
    const ty = 210 + Math.sin(t * 1.1 * pace) * 80;
    const k = Math.min(1, 2.5 * dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;

    if (now >= this.nextRadialAt) {
      this.radialBurst(this.phase2 ? 16 : 12);
      this.nextRadialAt = now + (this.phase2 ? 1100 : 1700);
    }
    if (now >= this.nextAimedAt) {
      this.aimedBurst();
      this.nextAimedAt = now + (this.phase2 ? 1600 : 2300);
    }

    if (this.aiState === 'FASE1' && this.hp <= this.maxHp / 2) {
      this.enterState('FASE2');
    } else if (this.phase2 && now >= this.nextSummonAt) {
      if (this.scene.enemies.countActive(true) < 7) {
        this.scene.spawnEnemy('drone');
        this.scene.spawnEnemy('drone');
      }
      this.nextSummonAt = now + 5000;
    }
  }

  radialBurst(count) {
    const offset = this.rotation;
    for (let i = 0; i < count; i++) {
      const a = offset + (i / count) * Math.PI * 2;
      this.scene.fireEnemyBullet(this.x + Math.cos(a) * 56, this.y + Math.sin(a) * 56, a, 170);
    }
  }

  aimedBurst() {
    const base = this.angleToPlayer();
    [-0.18, 0, 0.18].forEach((off) => {
      const a = base + off;
      this.scene.fireEnemyBullet(this.x + Math.cos(a) * 56, this.y + Math.sin(a) * 56, a, 270);
    });
  }
}

const ENEMY_CLASSES = { drone: Drone, sentinela: Sentinela, investida: Investida, nucleo: Nucleo };
