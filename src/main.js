// Configuração da engine e lista de cenas (a ordem da lista é a ordem de desenho).
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  width: CFG.WIDTH,
  height: CFG.HEIGHT,
  backgroundColor: '#05060f',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  input: { gamepad: true },
  audio: { noAudio: true }, // o som é gerado pelo módulo Sfx
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, HUDScene, PauseScene, EndScene],
});

window.game = game;
