// Todas as texturas são desenhadas por código (Graphics -> generateTexture).
// Assim o jogo não depende de imagens externas e abre direto do arquivo.
function createTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  const draw = (key, w, h, paint) => {
    g.clear();
    paint(g);
    g.generateTexture(key, w, h);
  };

  // Pontos de um polígono regular (hexágono etc.) em volta de (cx, cy)
  const ring = (cx, cy, r, sides, start = 0) => {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = start + (i / sides) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  };

  // Nave do jogador (aponta para a direita = rotação 0)
  draw('player', 40, 40, (gr) => {
    const wings = [{ x: 26, y: 20 }, { x: 5, y: 3 }, { x: 12, y: 20 }, { x: 5, y: 37 }];
    gr.fillStyle(0x2b8fc7);
    gr.fillPoints(wings, true);
    gr.lineStyle(1.5, 0xe8fbff, 0.9);
    gr.strokePoints(wings, true);
    gr.fillStyle(0x7ce7ff);
    gr.fillPoints([{ x: 38, y: 20 }, { x: 14, y: 12 }, { x: 10, y: 20 }, { x: 14, y: 28 }], true);
    gr.fillStyle(0xffffff);
    gr.fillCircle(24, 20, 3);
  });

  draw('shield', 64, 64, (gr) => {
    gr.fillStyle(0x7cf5ff, 0.12);
    gr.fillCircle(32, 32, 28);
    gr.lineStyle(3, 0x7cf5ff, 0.9);
    gr.strokeCircle(32, 32, 28);
    gr.lineStyle(2, 0xffffff, 0.8);
    gr.beginPath();
    gr.arc(32, 32, 24, -0.6, 0.6);
    gr.strokePath();
  });

  draw('bullet', 14, 6, (gr) => {
    gr.fillStyle(0xfff27a);
    gr.fillRoundedRect(0, 0, 14, 6, 3);
    gr.fillStyle(0xffffff);
    gr.fillRoundedRect(3, 2, 8, 2, 1);
  });

  draw('ebullet', 12, 12, (gr) => {
    gr.fillStyle(0xff3b6b);
    gr.fillCircle(6, 6, 6);
    gr.fillStyle(0xffd0dc);
    gr.fillCircle(6, 6, 3);
  });

  // Drone: bola com espinhos
  draw('drone', 28, 28, (gr) => {
    gr.fillStyle(0xff4d6d);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      gr.fillTriangle(
        14 + Math.cos(a) * 14, 14 + Math.sin(a) * 14,
        14 + Math.cos(a - 0.45) * 8, 14 + Math.sin(a - 0.45) * 8,
        14 + Math.cos(a + 0.45) * 8, 14 + Math.sin(a + 0.45) * 8,
      );
    }
    gr.fillCircle(14, 14, 9);
    gr.fillStyle(0x5a0f1f);
    gr.fillCircle(14, 14, 4.5);
    gr.fillStyle(0xffd0d8);
    gr.fillCircle(14, 14, 2);
  });

  // Sentinela: hexágono com canhão
  draw('sentinela', 36, 36, (gr) => {
    gr.fillStyle(0xe0c8ff);
    gr.fillRect(20, 15.5, 16, 5);
    gr.fillStyle(0xa66bff);
    gr.fillPoints(ring(18, 18, 15, 6), true);
    gr.lineStyle(1.5, 0xe0c8ff, 0.9);
    gr.strokePoints(ring(18, 18, 15, 6), true);
    gr.fillStyle(0x3d1d6b);
    gr.fillPoints(ring(18, 18, 8, 6, Math.PI / 6), true);
    gr.fillStyle(0xffffff);
    gr.fillCircle(18, 18, 2.5);
  });

  // Investida: ponta de flecha
  draw('investida', 34, 34, (gr) => {
    const body = [{ x: 33, y: 17 }, { x: 3, y: 3 }, { x: 11, y: 17 }, { x: 3, y: 31 }];
    gr.fillStyle(0xffa62b);
    gr.fillPoints(body, true);
    gr.lineStyle(1.5, 0xffe0a8, 0.9);
    gr.strokePoints(body, true);
    gr.fillStyle(0x6b3a00);
    gr.fillPoints([{ x: 24, y: 17 }, { x: 10, y: 10 }, { x: 14, y: 17 }, { x: 10, y: 24 }], true);
  });

  // Núcleo (chefe)
  draw('nucleo', 120, 120, (gr) => {
    gr.fillStyle(0xff2e88);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      gr.fillTriangle(
        60 + Math.cos(a) * 59, 60 + Math.sin(a) * 59,
        60 + Math.cos(a - 0.18) * 46, 60 + Math.sin(a - 0.18) * 46,
        60 + Math.cos(a + 0.18) * 46, 60 + Math.sin(a + 0.18) * 46,
      );
    }
    gr.fillStyle(0x4a0b2e);
    gr.fillCircle(60, 60, 47);
    gr.lineStyle(4, 0xff2e88);
    gr.strokeCircle(60, 60, 47);
    gr.fillStyle(0xff2e88);
    ring(60, 60, 37, 6).forEach((p) => gr.fillCircle(p.x, p.y, 5));
    gr.lineStyle(3, 0xff7ab8);
    gr.strokeCircle(60, 60, 27);
    gr.fillStyle(0xffd6ea);
    gr.fillCircle(60, 60, 14);
    gr.fillStyle(0xffffff);
    gr.fillCircle(60, 60, 6);
  });

  // Rochas: 3 variações de polígono irregular
  for (let v = 0; v < 3; v++) {
    draw('rock' + v, 64, 64, (gr) => {
      const pts = [];
      const sides = 9 + v;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const r = 26 + Math.random() * 5;
        pts.push({ x: 32 + Math.cos(a) * r, y: 32 + Math.sin(a) * r });
      }
      gr.fillStyle(0x4a4f5e);
      gr.fillPoints(pts, true);
      gr.lineStyle(2, 0x8a90a3);
      gr.strokePoints(pts, true);
      gr.fillStyle(0x363a45);
      gr.fillCircle(24 + v * 3, 26, 6);
      gr.fillCircle(40, 40 - v * 2, 4);
      gr.fillCircle(36, 20, 3);
    });
  }

  // Power-ups
  const powerBase = (gr, fill, stroke) => {
    gr.fillStyle(fill);
    gr.fillCircle(14, 14, 13);
    gr.lineStyle(2, stroke);
    gr.strokeCircle(14, 14, 12);
  };
  draw('pu_vida', 28, 28, (gr) => {
    powerBase(gr, 0x1f7a3f, 0x7dffa8);
    gr.fillStyle(0xffffff);
    gr.fillRect(12, 7, 4, 14);
    gr.fillRect(7, 12, 14, 4);
  });
  draw('pu_triplo', 28, 28, (gr) => {
    powerBase(gr, 0x7a6a1f, 0xffe066);
    gr.lineStyle(3, 0xffffff);
    gr.lineBetween(14, 21, 8, 8);
    gr.lineBetween(14, 21, 14, 6);
    gr.lineBetween(14, 21, 20, 8);
  });
  draw('pu_escudo', 28, 28, (gr) => {
    powerBase(gr, 0x1f5a7a, 0x7cf5ff);
    gr.lineStyle(3, 0xffffff);
    gr.strokeCircle(14, 14, 6);
  });

  draw('spark', 8, 8, (gr) => {
    gr.fillStyle(0xffffff);
    gr.fillCircle(4, 4, 4);
  });

  draw('star', 2, 2, (gr) => {
    gr.fillStyle(0xffffff);
    gr.fillRect(0, 0, 2, 2);
  });

  g.destroy();
}
