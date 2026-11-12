// Item coletável. A animação é só de Transform (escala e rotação via tween);
// o corpo de física existe apenas para detectar a coleta.
const POWERUP_INFO = {
  vida:   { label: '+1 VIDA',      color: '#7dffa8' },
  triplo: { label: 'TIRO TRIPLO!', color: '#ffe066' },
  escudo: { label: 'ESCUDO!',      color: '#7cf5ff' },
};

class PowerUp extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y, kind) {
    super(scene, x, y, 'pu_' + kind);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.kind = kind;
    this.setDepth(6);

    scene.tweens.add({ targets: this, scale: { from: 0.85, to: 1.15 }, duration: 450, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: this, angle: 360, duration: 2600, repeat: -1 });

    // Pisca nos últimos 2 segundos e some
    scene.time.delayedCall(CFG.POWERUP.LIFETIME - 2000, () => {
      if (this.active) scene.tweens.add({ targets: this, alpha: 0.2, duration: 120, yoyo: true, repeat: -1 });
    });
    scene.time.delayedCall(CFG.POWERUP.LIFETIME, () => {
      if (this.active) this.destroy();
    });
  }

  destroy(fromScene) {
    if (this.scene) this.scene.tweens.killTweensOf(this);
    super.destroy(fromScene);
  }
}
