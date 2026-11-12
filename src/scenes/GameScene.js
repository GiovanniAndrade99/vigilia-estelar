// Cena principal: mundo, física, colisões e regras de pontuação, vidas, vitória e derrota.
class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.startWave = (data && data.startWave) || 1;
  }

  create() {
    // Relógio próprio da partida: só avança quando a cena não está pausada
    this.now = 0;
    this.score = 0;
    this.isOver = false;
    this.boss = null;
    this.nextThrustAt = 0;

    this.physics.world.setBounds(0, 0, CFG.WIDTH, CFG.HEIGHT);
    this.starfield = new Starfield(this);
    this.drawArena();

    this.rocks = this.physics.add.group();
    this.placeRocks(4);

    this.player = new Player(this, CFG.WIDTH / 2, CFG.HEIGHT * 0.8);
    this.playerBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 60 });
    this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 220 });
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.powerups = this.physics.add.group();

    this.createEffects();
    this.setupCollisions();

    this.controls = new InputController(this);
    this.waves = new WaveManager(this, this.startWave);
    this.cameras.main.fadeIn(300);

    // Pausa pelo teclado (P / Esc)
    onKeyPress(this, (code) => {
      if (code === 'KeyP' || code === 'Escape') this.pauseGame();
    });

    // Ao voltar da pausa, solta as teclas que ficaram "presas" durante a pausa
    const onResume = () => this.input.keyboard.resetKeys();
    // Se a aba perder o foco, o jogo pausa sozinho
    const onHidden = () => this.pauseGame();
    this.events.on('resume', onResume);
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.events.once('shutdown', () => {
      this.events.off('resume', onResume);
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
    });

    this.scene.launch('HUD');
  }

  // ---------- Montagem do cenário ----------

  drawArena() {
    const g = this.add.graphics().setDepth(-8);
    g.lineStyle(1, 0x1b2a4a, 0.45);
    for (let x = 64; x < CFG.WIDTH; x += 64) g.lineBetween(x, 0, x, CFG.HEIGHT);
    for (let y = 64; y < CFG.HEIGHT; y += 64) g.lineBetween(0, y, CFG.WIDTH, y);
    g.lineStyle(3, 0x2fd5ff, 0.55);
    g.strokeRect(1.5, 1.5, CFG.WIDTH - 3, CFG.HEIGHT - 3);
  }

  // Rochas imóveis que bloqueiam naves e tiros. Ficam longe do jogador e da rota do chefe.
  placeRocks(count) {
    const placed = [];
    for (let tries = 0; placed.length < count && tries < 300; tries++) {
      const x = Phaser.Math.Between(100, CFG.WIDTH - 100);
      const y = Phaser.Math.Between(100, CFG.HEIGHT - 100);
      if (Phaser.Math.Distance.Between(x, y, CFG.WIDTH / 2, CFG.HEIGHT * 0.8) < 150) continue;
      if (y < 320 && x > 170 && x < CFG.WIDTH - 170) continue;
      if (placed.some((p) => Phaser.Math.Distance.Between(p.x, p.y, x, y) < 170)) continue;

      const rock = this.rocks.create(x, y, 'rock' + (placed.length % 3));
      rock.body.setCircle(26, 6, 6);
      rock.body.setImmovable(true);
      rock.body.pushable = false;
      rock.body.moves = false;
      rock.spin = Phaser.Math.FloatBetween(-0.3, 0.3);
      rock.setDepth(5);
      placed.push({ x, y });
    }
  }

  createEffects() {
    this.emitters = {};
    // Rastro do propulsor: sai no sentido oposto ao movimento
    this.thruster = this.add.particles(0, 0, 'spark', {
      lifespan: 280,
      speed: { min: 40, max: 100 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: 0x7ce7ff,
      blendMode: 'ADD',
      emitting: false,
      angle: { onEmit: () => Phaser.Math.RadToDeg(this.player.thrustAngle) + 180 + Phaser.Math.Between(-18, 18) },
    }).setDepth(9);
  }

  emitterFor(color) {
    if (!this.emitters[color]) {
      this.emitters[color] = this.add.particles(0, 0, 'spark', {
        lifespan: { min: 300, max: 750 },
        speed: { min: 50, max: 300 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: color,
        blendMode: 'ADD',
        emitting: false,
      }).setDepth(20);
    }
    return this.emitters[color];
  }

  explode(x, y, color, count) {
    this.emitterFor(color).explode(count, x, y);
  }

  popText(x, y, text, color = '#ffe066', size = 18) {
    const t = this.add.text(x, y, text, {
      fontFamily: CFG.FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 42, alpha: 0, duration: 850, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  // ---------- Colisões ----------

  // O Phaser entrega os dois objetos da colisão; aqui garantimos qual é qual.
  pick(a, b, group) {
    return group.contains(a) ? [a, b] : [b, a];
  }

  setupCollisions() {
    const p = this.physics;
    const notBoss = (a, b) => !(a.isBoss || b.isBoss);

    // collider: separa os corpos (ninguém atravessa as rochas)
    p.add.collider(this.player, this.rocks);
    p.add.collider(this.enemies, this.rocks, null, notBoss);
    p.add.collider(this.enemies, this.enemies, null, notBoss);
    p.add.collider(this.playerBullets, this.rocks, (a, b) => this.onBulletHitsRock(this.pick(a, b, this.playerBullets)[0]));
    p.add.collider(this.enemyBullets, this.rocks, (a, b) => this.onBulletHitsRock(this.pick(a, b, this.enemyBullets)[0]));

    // overlap: só detecta o contato e aplica a regra do jogo
    p.add.overlap(this.playerBullets, this.enemies, (a, b) => {
      const [bullet, enemy] = this.pick(a, b, this.playerBullets);
      this.onBulletHitsEnemy(bullet, enemy);
    });
    p.add.overlap(this.player, this.enemyBullets, (a, b) => {
      const [bullet] = this.pick(a, b, this.enemyBullets);
      this.onEnemyBulletHitsPlayer(bullet);
    });
    p.add.overlap(this.player, this.enemies, (a, b) => {
      const [enemy] = this.pick(a, b, this.enemies);
      this.onPlayerTouchesEnemy(enemy);
    });
    p.add.overlap(this.player, this.powerups, (a, b) => {
      const [item] = this.pick(a, b, this.powerups);
      this.onPickup(item);
    });
  }

  onBulletHitsRock(bullet) {
    if (!bullet.active) return;
    this.explode(bullet.x, bullet.y, 0x8a90a3, 4);
    this.killBullet(bullet);
  }

  onBulletHitsEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active || enemy.dying || this.isOver) return;
    this.killBullet(bullet);
    this.explode(bullet.x, bullet.y, enemy.color, 4);
    if (enemy.takeDamage(1)) this.killEnemy(enemy, true);
    else Sfx.hitEnemy();
  }

  onEnemyBulletHitsPlayer(bullet) {
    if (!bullet.active || this.isOver) return;
    if (this.player.hasShield()) {
      this.explode(bullet.x, bullet.y, 0x7cf5ff, 5);
      this.killBullet(bullet);
    } else if (this.player.canBeHit()) {
      this.killBullet(bullet);
      this.damagePlayer();
    }
  }

  onPlayerTouchesEnemy(enemy) {
    if (!enemy.active || enemy.dying || this.isOver) return;
    if (enemy.isBoss) {
      // O chefe não morre no contato: empurra a nave para longe
      if (this.player.canBeHit()) this.damagePlayer();
      const a = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      this.physics.velocityFromRotation(a, 420, this.player.body.velocity);
    } else if (this.player.hasShield()) {
      this.killEnemy(enemy, true);
    } else if (this.player.canBeHit()) {
      this.killEnemy(enemy, false);
      this.damagePlayer();
    }
  }

  onPickup(item) {
    if (!item.active || this.isOver) return;
    const p = this.player;
    if (item.kind === 'vida') p.lives = Math.min(p.lives + 1, CFG.PLAYER.MAX_LIVES);
    else if (item.kind === 'triplo') p.tripleUntil = this.now + CFG.POWERUP.DURATION;
    else if (item.kind === 'escudo') p.shieldUntil = this.now + CFG.POWERUP.DURATION;
    const info = POWERUP_INFO[item.kind];
    this.popText(item.x, item.y - 10, info.label, info.color, 20);
    this.explode(item.x, item.y, 0xffffff, 10);
    Sfx.powerup();
    item.destroy();
  }

  // ---------- Tiros ----------

  spawnBullet(group, key, x, y, angle, speed) {
    const b = group.get(x, y, key);
    if (!b) return null;
    b.enableBody(true, x, y, true, true);
    b.setRotation(angle);
    b.setDepth(12);
    this.physics.velocityFromRotation(angle, speed, b.body.velocity);
    return b;
  }

  firePlayerBullet(player) {
    const offsets = player.hasTriple(this.now) ? [-0.2, 0, 0.2] : [0];
    const nx = player.x + Math.cos(player.rotation) * 20;
    const ny = player.y + Math.sin(player.rotation) * 20;
    offsets.forEach((off) => this.spawnBullet(this.playerBullets, 'bullet', nx, ny, player.rotation + off, CFG.PLAYER.BULLET_SPEED));
    Sfx.shoot();
  }

  fireEnemyBullet(x, y, angle, speed) {
    const b = this.spawnBullet(this.enemyBullets, 'ebullet', x, y, angle, speed);
    if (b) b.body.setCircle(5, 1, 1);
    Sfx.enemyShoot();
  }

  killBullet(b) {
    b.disableBody(true, true);
  }

  cullBullets(group) {
    const m = 20;
    group.getChildren().forEach((b) => {
      if (b.active && (b.x < -m || b.x > CFG.WIDTH + m || b.y < -m || b.y > CFG.HEIGHT + m)) this.killBullet(b);
    });
  }

  clearEnemyBullets() {
    this.enemyBullets.getChildren().forEach((b) => {
      if (b.active) this.killBullet(b);
    });
  }

  // ---------- Inimigos ----------

  spawnEnemy(type) {
    const speedScale = 1 + CFG.SPEED_SCALE_PER_WAVE * (Math.min(this.waves.wave, CFG.TOTAL_WAVES) - 1);
    const pos = type === 'nucleo' ? { x: CFG.WIDTH / 2, y: -90 } : this.findSpawnPoint();
    const enemy = new ENEMY_CLASSES[type](this, pos.x, pos.y);
    this.enemies.add(enemy);
    enemy.setup(speedScale);
    if (enemy.isBoss) {
      this.boss = enemy;
      this.cameras.main.shake(600, 0.006);
    }
    return enemy;
  }

  // Ponto nas bordas da arena, longe do jogador e das rochas
  findSpawnPoint() {
    const m = 40;
    let best = null;
    for (let i = 0; i < 25; i++) {
      const side = Phaser.Math.Between(0, 3);
      const x = side === 0 ? m : side === 1 ? CFG.WIDTH - m : Phaser.Math.Between(m, CFG.WIDTH - m);
      const y = side === 2 ? m : side === 3 ? CFG.HEIGHT - m : Phaser.Math.Between(m, CFG.HEIGHT - m);
      best = { x, y };
      const farFromPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > 260;
      const farFromRocks = this.rocks.getChildren().every((r) => Phaser.Math.Distance.Between(x, y, r.x, r.y) > 70);
      if (farFromPlayer && farFromRocks) break;
    }
    return best;
  }

  killEnemy(enemy, award) {
    if (enemy.isBoss) {
      this.onBossDefeated(enemy);
      return;
    }
    this.explode(enemy.x, enemy.y, enemy.color, 18);
    Sfx.explosion();
    if (award) {
      this.addScore(enemy.score, enemy.x, enemy.y);
      this.maybeDropPowerUp(enemy.x, enemy.y);
    }
    enemy.destroy();
  }

  maybeDropPowerUp(x, y) {
    if (Math.random() > CFG.POWERUP.DROP_CHANCE) return;
    const kinds = ['triplo', 'escudo'];
    if (this.player.lives < CFG.PLAYER.MAX_LIVES) kinds.push('vida');
    const item = new PowerUp(this, x, y, Phaser.Utils.Array.GetRandom(kinds));
    this.powerups.add(item);
    item.body.setCircle(13, 1, 1);
  }

  // ---------- Regras ----------

  addScore(points, x, y) {
    this.score += points;
    this.popText(x, y, `+${points}`);
  }

  damagePlayer() {
    if (this.isOver) return;
    this.player.takeHit(this.now);
    this.cameras.main.shake(250, 0.012);
    this.cameras.main.flash(160, 255, 60, 60);
    this.explode(this.player.x, this.player.y, 0x7ce7ff, 12);
    Sfx.playerHit();
    if (this.player.lives <= 0) this.gameOver();
  }

  onWaveCleared(wave) {
    const bonus = CFG.WAVE_BONUS * wave;
    this.score += bonus;
    this.events.emit('notice', `ONDA ${wave} CONCLUÍDA   +${bonus}`, '#7dffa8');
    Sfx.waveClear();
  }

  gameOver() {
    this.isOver = true;
    const { x, y } = this.player;
    this.explode(x, y, 0x7ce7ff, 50);
    this.explode(x, y, 0xffffff, 20);
    this.player.explode();
    this.cameras.main.shake(500, 0.02);
    Sfx.bigExplosion();
    this.time.delayedCall(500, () => Sfx.gameOver());
    this.time.delayedCall(1900, () => this.finish(false));
  }

  onBossDefeated(boss) {
    if (boss.dying) return;
    boss.dying = true;
    boss.body.enable = false;
    this.isOver = true;
    this.waves.finish(this.now);
    this.player.setAcceleration(0, 0);
    this.clearEnemyBullets();
    this.enemies.getChildren().slice().forEach((e) => {
      if (e !== boss) this.killEnemy(e, false);
    });

    // Sequência de explosões do chefe
    this.cameras.main.shake(1400, 0.01);
    Sfx.bigExplosion();
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 170, () => {
        this.explode(boss.x + Phaser.Math.Between(-50, 50), boss.y + Phaser.Math.Between(-50, 50), i % 2 ? 0xff2e88 : 0xffe066, 26);
        Sfx.explosion();
      });
    }
    this.time.delayedCall(1450, () => {
      this.explode(boss.x, boss.y, 0xffffff, 90);
      this.explode(boss.x, boss.y, 0xff2e88, 60);
      this.addScore(boss.score, boss.x, boss.y);
      this.cameras.main.flash(450, 255, 255, 255);
      boss.destroy();
      this.boss = null;
      Sfx.victory();
    });
    this.time.delayedCall(3400, () => this.finish(true));
  }

  finish(victory) {
    const lifeBonus = victory ? this.player.lives * CFG.LIFE_BONUS : 0;
    this.scene.stop('HUD');
    this.scene.start('End', {
      victory,
      score: this.score + lifeBonus,
      lifeBonus,
      wave: Math.min(this.waves.wave, CFG.TOTAL_WAVES),
      startWave: this.startWave,
    });
  }

  pauseGame() {
    if (this.isOver || !this.scene.isActive()) return;
    this.scene.launch('Pause');
    this.scene.pause();
  }

  // ---------- Laço principal ----------

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.now += delta;

    this.starfield.update(dt, this.player.body.velocity);
    this.rocks.getChildren().forEach((r) => { r.rotation += r.spin * dt; });
    this.cullBullets(this.playerBullets);
    this.cullBullets(this.enemyBullets);

    if (this.isOver) return;

    if (this.controls.padStartPressed()) {
      this.pauseGame();
      return;
    }

    this.player.update(this.now, this.controls, dt);
    this.waves.update(this.now);

    if (this.player.isThrusting && this.now >= this.nextThrustAt) {
      const a = this.player.thrustAngle;
      this.thruster.emitParticleAt(this.player.x - Math.cos(a) * 14, this.player.y - Math.sin(a) * 14, 1);
      this.nextThrustAt = this.now + 20;
    }
  }
}
