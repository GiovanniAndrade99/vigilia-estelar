// Fundo de estrelas em 3 camadas (parallax). Cada estrela é movida direto
// pelo Transform (x/y) a cada quadro; camadas mais próximas andam mais rápido.
class Starfield {
  constructor(scene, count = 120) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      const star = scene.add.image(
        Phaser.Math.Between(0, CFG.WIDTH),
        Phaser.Math.Between(0, CFG.HEIGHT),
        'star',
      );
      star.setAlpha(0.25 + layer * 0.3).setScale(0.6 + layer * 0.5).setDepth(-10);
      star.layer = layer;
      star.speed = 8 + layer * 22;
      this.stars.push(star);
    }
  }

  // velocity: velocidade da nave, para o fundo se deslocar no sentido oposto
  update(dt, velocity) {
    const vx = velocity ? velocity.x : 0;
    const vy = velocity ? velocity.y : 0;
    for (const s of this.stars) {
      const parallax = 0.03 * (s.layer + 1);
      s.y += s.speed * dt - vy * parallax * dt;
      s.x -= vx * parallax * dt;
      if (s.y > CFG.HEIGHT) s.y -= CFG.HEIGHT;
      else if (s.y < 0) s.y += CFG.HEIGHT;
      if (s.x > CFG.WIDTH) s.x -= CFG.WIDTH;
      else if (s.x < 0) s.x += CFG.WIDTH;
    }
  }
}
