// Tela final: vitória ou derrota, pontuação e recorde.
class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  init(data) {
    this.result = data;
  }

  create() {
    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;
    const F = CFG.FONT;
    const r = this.result;
    this.leaving = false;
    this.readyAt = this.time.now + 700; // evita pular a tela sem querer
    this.padMemo = {};
    padButtonPressed(this, 0, this.padMemo);
    padButtonPressed(this, 9, this.padMemo);

    this.starfield = new Starfield(this);
    this.cameras.main.fadeIn(400);

    // Recorde (não é salvo no modo de avaliação)
    const evalMode = r.startWave > 1;
    const best = Recorde.ler();
    const isRecord = !evalMode && r.score > best;
    if (isRecord) Recorde.salvar(r.score);

    const title = r.victory ? 'VITÓRIA!' : 'FIM DE JOGO';
    const color = r.victory ? '#7dffa8' : '#ff5c7a';
    this.add.text(W / 2, 130, title, {
      fontFamily: F, fontSize: '72px', fontStyle: 'bold', color, stroke: '#000000', strokeThickness: 10, padding: { x: 30, y: 24 },
    }).setOrigin(0.5).setShadow(0, 0, color, 20, true, true);

    this.add.text(W / 2, 200, r.victory ? 'O Núcleo foi destruído. A arena está segura.' : `Sua nave caiu na onda ${r.wave}.`, {
      fontFamily: F, fontSize: '22px', color: '#e8f4ff',
    }).setOrigin(0.5);

    const lines = [`Pontuação: ${r.score}`];
    if (r.victory) lines.push(`(inclui bônus de vidas: +${r.lifeBonus})`);
    lines.push(`Onda alcançada: ${r.wave} de ${CFG.TOTAL_WAVES}`);
    lines.push(evalMode ? 'Modo avaliação: recorde não salvo' : `Recorde: ${Math.max(best, r.score)}`);
    this.add.text(W / 2, 300, lines.join('\n'), {
      fontFamily: F, fontSize: '24px', color: '#ffffff', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);

    if (isRecord) {
      const rec = this.add.text(W / 2, 410, 'NOVO RECORDE!', {
        fontFamily: F, fontSize: '32px', fontStyle: 'bold', color: '#ffe066', stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5);
      this.tweens.add({ targets: rec, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
    }

    const prompt = this.add.text(W / 2, 500, 'ENTER ou CLIQUE: jogar de novo     ·     ESC: menu', {
      fontFamily: F, fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 });

    onKeyPress(this, (code) => {
      if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') this.leave('Game');
      else if (code === 'Escape') this.leave('Menu');
      else if (code === 'KeyM') Sfx.toggleMute();
    });
    onPointerPress(this, () => this.leave('Game'));
  }

  update(time, delta) {
    this.starfield.update(delta / 1000);
    if (padButtonPressed(this, 0, this.padMemo)) this.leave('Game');
    else if (padButtonPressed(this, 9, this.padMemo)) this.leave('Menu');
  }

  leave(target) {
    if (this.leaving || this.time.now < this.readyAt) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(target, { startWave: this.result.startWave });
    });
  }
}
