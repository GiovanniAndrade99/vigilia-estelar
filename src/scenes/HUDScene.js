// Interface sobreposta ao jogo: pontos, vidas, onda, power-ups, barra do chefe e avisos.
// Roda em paralelo com a GameScene e lê o estado dela a cada quadro.
class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  create() {
    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;
    const F = CFG.FONT;
    this.gs = this.scene.get('Game');

    const big = { fontFamily: F, fontSize: '22px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };
    const small = { fontFamily: F, fontSize: '15px', color: '#9fb3c8', stroke: '#000000', strokeThickness: 3 };

    this.scoreText = this.add.text(16, 10, '', big);
    this.bestText = this.add.text(16, 40, `RECORDE ${Recorde.ler()}`, small);
    this.waveText = this.add.text(W / 2, 10, '', big).setOrigin(0.5, 0);

    this.lifeIcons = [];
    for (let i = 0; i < CFG.PLAYER.MAX_LIVES; i++) {
      this.lifeIcons.push(this.add.image(W - 26 - i * 28, 26, 'player').setScale(0.6).setAngle(-90));
    }

    // Indicadores de power-up com barra de tempo
    this.powerBars = ['triplo', 'escudo'].map((kind, i) => {
      const y = H - 52 + i * 26;
      const icon = this.add.image(26, y, 'pu_' + kind).setScale(0.7);
      const bg = this.add.rectangle(46, y, 120, 8, 0x1b2a4a).setOrigin(0, 0.5);
      const bar = this.add.rectangle(46, y, 120, 8, kind === 'triplo' ? 0xffe066 : 0x7cf5ff).setOrigin(0, 0.5);
      return { kind, parts: [icon, bg, bar], bar };
    });

    this.soundText = this.add.text(W - 16, H - 26, '', small).setOrigin(1, 0);

    // Barra de vida do chefe
    this.bossLabel = this.add.text(W / 2, 46, 'NÚCLEO', { ...small, color: '#ff7ab8', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.bossBg = this.add.rectangle(W / 2 - 200, 72, 400, 12, 0x2a0b1e).setOrigin(0, 0.5).setStrokeStyle(2, 0xff2e88);
    this.bossBar = this.add.rectangle(W / 2 - 200, 72, 400, 12, 0xff2e88).setOrigin(0, 0.5);
    this.bossParts = [this.bossLabel, this.bossBg, this.bossBar];

    // Avisos centrais
    this.banner = this.add.text(W / 2, H * 0.38, '', {
      fontFamily: F, fontSize: '54px', fontStyle: 'bold', color: '#7cf5ff', stroke: '#06223a', strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);
    this.bannerSub = this.add.text(W / 2, H * 0.38 + 50, '', {
      fontFamily: F, fontSize: '20px', color: '#e8f4ff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    this.notice = this.add.text(W / 2, H * 0.25, '', {
      fontFamily: F, fontSize: '24px', fontStyle: 'bold', color: '#7dffa8', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);

    // Dica de controles na primeira onda
    if (this.gs.startWave === 1) {
      const hint = this.add.text(W / 2, 48, 'WASD mover  ·  mouse mirar  ·  clique / Espaço atirar  ·  P pausar', small).setOrigin(0.5);
      this.tweens.add({ targets: hint, alpha: 0, delay: 7000, duration: 1000 });
    }

    this.gs.events.on('wave-start', this.onWaveStart, this);
    this.gs.events.on('notice', this.onNotice, this);
    this.events.once('shutdown', () => {
      this.gs.events.off('wave-start', this.onWaveStart, this);
      this.gs.events.off('notice', this.onNotice, this);
    });

    onKeyPress(this, (code) => {
      if (code === 'KeyM') Sfx.toggleMute();
    });
  }

  onWaveStart(wave, isBoss) {
    this.showBanner(isBoss ? 'ONDA FINAL' : `ONDA ${wave}`, isBoss ? 'O Núcleo se aproxima...' : 'Prepare-se!', isBoss ? '#ff7ab8' : '#7cf5ff');
  }

  showBanner(title, subtitle, color) {
    this.tweens.killTweensOf([this.banner, this.bannerSub]);
    this.banner.setText(title).setColor(color).setAlpha(0).setScale(0.6);
    this.bannerSub.setText(subtitle).setAlpha(0);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: 350, ease: 'Back.Out' });
    this.tweens.add({ targets: this.bannerSub, alpha: 1, duration: 350, delay: 150 });
    this.tweens.add({ targets: [this.banner, this.bannerSub], alpha: 0, duration: 450, delay: 1900 });
  }

  onNotice(text, color) {
    this.tweens.killTweensOf(this.notice);
    this.notice.setText(text).setColor(color || '#7dffa8').setAlpha(1).setY(CFG.HEIGHT * 0.25);
    this.tweens.add({ targets: this.notice, alpha: 0, y: CFG.HEIGHT * 0.25 - 30, delay: 1300, duration: 600 });
  }

  update() {
    const gs = this.gs;
    if (!gs || !gs.player) return;
    const p = gs.player;

    this.scoreText.setText(`PONTOS ${String(gs.score).padStart(6, '0')}`);
    this.waveText.setText(`ONDA ${Math.max(1, Math.min(gs.waves.wave, CFG.TOTAL_WAVES))}/${CFG.TOTAL_WAVES}`);
    this.lifeIcons.forEach((icon, i) => icon.setVisible(i < p.lives));

    this.powerBars.forEach(({ kind, parts, bar }) => {
      const until = kind === 'triplo' ? p.tripleUntil : p.shieldUntil;
      const left = Math.max(0, until - gs.now);
      parts.forEach((o) => o.setVisible(left > 0));
      bar.scaleX = Math.min(1, left / CFG.POWERUP.DURATION);
    });

    const boss = gs.boss;
    const showBoss = !!(boss && boss.active && !boss.dying && boss.aiState !== 'ENTRADA');
    this.bossParts.forEach((o) => o.setVisible(showBoss));
    if (showBoss) this.bossBar.scaleX = Math.max(0, boss.hp / boss.maxHp);

    this.soundText.setText(Sfx.muted ? 'Som: DESLIGADO (M)' : 'Som: LIGADO (M)');
  }
}
