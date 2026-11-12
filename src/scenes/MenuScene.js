// Tela inicial: título, instruções, recorde e início do jogo.
class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;
    const F = CFG.FONT;
    this.starting = false;
    this.startWave = getStartWave();
    this.padMemo = {};
    padButtonPressed(this, 0, this.padMemo);
    padButtonPressed(this, 9, this.padMemo);

    this.starfield = new Starfield(this);
    this.cameras.main.fadeIn(300);

    this.add.text(W / 2, 92, 'VIGÍLIA ESTELAR', {
      fontFamily: F, fontSize: '64px', fontStyle: 'bold', color: '#7cf5ff',
      stroke: '#0b3b5c', strokeThickness: 8, padding: { x: 30, y: 24 },
    }).setOrigin(0.5).setShadow(0, 0, '#2fd5ff', 18, true, true);

    this.add.text(W / 2, 150, 'Defenda a arena por 10 ondas e destrua o Núcleo', {
      fontFamily: F, fontSize: '20px', color: '#cfe8ff',
    }).setOrigin(0.5);

    // Nave decorativa orbitando (movida pelo Transform no update)
    this.ship = this.add.image(W / 2, 230, 'player').setScale(1.5);

    // Painel de controles
    const panel = this.add.graphics();
    panel.fillStyle(0x0b1730, 0.85);
    panel.fillRoundedRect(W / 2 - 330, 282, 660, 200, 14);
    panel.lineStyle(2, 0x2fd5ff, 0.5);
    panel.strokeRoundedRect(W / 2 - 330, 282, 660, 200, 14);

    const label = { fontFamily: F, fontSize: '17px', color: '#ffe066', fontStyle: 'bold' };
    const value = { fontFamily: F, fontSize: '17px', color: '#e8f4ff' };
    const rows = [
      ['Mover', 'W A S D  ou  setas'],
      ['Mirar', 'mouse'],
      ['Atirar', 'clique esquerdo  ou  Espaço'],
      ['Pausar', 'P  ou  Esc'],
      ['Som', 'M liga / desliga'],
      ['Controle', 'analógicos movem e miram, A / RT atira, Start pausa'],
    ];
    rows.forEach(([k, v], i) => {
      this.add.text(W / 2 - 300, 298 + i * 28, k, label);
      this.add.text(W / 2 - 190, 298 + i * 28, v, value);
    });

    // Legenda dos power-ups
    const legend = [['pu_vida', '+1 vida'], ['pu_triplo', 'tiro triplo'], ['pu_escudo', 'escudo']];
    legend.forEach(([key, text], i) => {
      const x = W / 2 - 230 + i * 170;
      this.add.image(x, 512, key);
      this.add.text(x + 20, 512, text, { fontFamily: F, fontSize: '16px', color: '#cfe8ff' }).setOrigin(0, 0.5);
    });

    this.prompt = this.add.text(W / 2, 560, 'ENTER, ESPAÇO ou CLIQUE para começar', {
      fontFamily: F, fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.prompt, alpha: 0.25, duration: 650, yoyo: true, repeat: -1 });

    this.add.text(16, H - 26, `Recorde: ${Recorde.ler()}`, { fontFamily: F, fontSize: '16px', color: '#ffe066' });
    this.soundText = this.add.text(W - 16, H - 26, '', { fontFamily: F, fontSize: '16px', color: '#9fb3c8' }).setOrigin(1, 0);

    if (this.startWave > 1) {
      this.add.text(W / 2, 600, `Modo avaliação: começa na onda ${this.startWave} (o recorde não é salvo)`, {
        fontFamily: F, fontSize: '15px', color: '#ff9f6b',
      }).setOrigin(0.5);
    }

    onKeyPress(this, (code) => {
      if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') this.startGame();
      else if (code === 'KeyM') Sfx.toggleMute();
    });
    onPointerPress(this, () => this.startGame());
  }

  update(time, delta) {
    this.starfield.update(delta / 1000);
    const t = time / 1000;
    this.ship.x = CFG.WIDTH / 2 + Math.cos(t * 1.2) * 150;
    this.ship.y = 230 + Math.sin(t * 2.4) * 22;
    this.ship.rotation = Math.atan2(Math.cos(t * 2.4) * 2.4 * 22, -Math.sin(t * 1.2) * 1.2 * 150);
    this.soundText.setText(Sfx.muted ? 'Som: DESLIGADO (M)' : 'Som: LIGADO (M)');

    if (padButtonPressed(this, 0, this.padMemo) || padButtonPressed(this, 9, this.padMemo)) this.startGame();
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    Sfx.unlock();
    Sfx.start();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { startWave: this.startWave });
    });
  }
}
