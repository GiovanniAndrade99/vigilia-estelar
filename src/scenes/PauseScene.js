// Sobreposição de pausa. A GameScene fica congelada (física, tweens e timers param).
class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const W = CFG.WIDTH;
    const H = CFG.HEIGHT;
    const F = CFG.FONT;
    this.padMemo = {};
    padButtonPressed(this, 9, this.padMemo);

    this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0);
    this.add.text(W / 2, H / 2 - 50, 'PAUSADO', {
      fontFamily: F, fontSize: '56px', fontStyle: 'bold', color: '#7cf5ff', stroke: '#06223a', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 20, 'P / Esc  continuar     ·     Q  voltar ao menu     ·     M  som', {
      fontFamily: F, fontSize: '19px', color: '#e8f4ff',
    }).setOrigin(0.5);

    onKeyPress(this, (code) => {
      if (code === 'KeyP' || code === 'Escape') this.resumeGame();
      else if (code === 'KeyQ') this.quitToMenu();
    });
  }

  update() {
    if (padButtonPressed(this, 9, this.padMemo)) this.resumeGame();
  }

  resumeGame() {
    this.scene.resume('Game');
    this.scene.stop();
  }

  quitToMenu() {
    this.scene.stop('HUD');
    this.scene.stop('Game');
    this.scene.start('Menu');
  }
}
