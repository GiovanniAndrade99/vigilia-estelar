// Constantes de ajuste do jogo. Ficam todas aqui para facilitar o balanceamento.
const CFG = {
  WIDTH: 960,
  HEIGHT: 640,
  FONT: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',

  TOTAL_WAVES: 10,          // a onda 10 é a do chefe
  WAVE_BREAK_MS: 2600,      // pausa entre o anúncio da onda e o primeiro inimigo
  WAVE_BONUS: 250,          // bônus por onda concluída (multiplicado pelo número da onda)
  LIFE_BONUS: 1000,         // bônus por vida restante ao vencer
  SPEED_SCALE_PER_WAVE: 0.05,

  PLAYER: {
    LIVES: 3,
    MAX_LIVES: 5,
    ACCEL: 950,             // aceleração (px/s²) aplicada pela física
    DRAG: 650,              // desaceleração quando não há entrada
    MAX_SPEED: 320,
    FIRE_DELAY: 160,        // ms entre tiros
    BULLET_SPEED: 640,
    INVULN_MS: 1600,        // invulnerabilidade depois de levar dano
  },

  ENEMY_BULLET_SPEED: 240,

  ENEMIES: {
    drone:     { hp: 1,   speed: 110, score: 100,  radius: 10, color: 0xff4d6d },
    sentinela: { hp: 3,   speed: 90,  score: 250,  radius: 14, color: 0xa66bff, range: 280 },
    investida: { hp: 2,   speed: 70,  score: 200,  radius: 12, color: 0xffa62b, dashSpeed: 540 },
    nucleo:    { hp: 100, speed: 0,   score: 5000, radius: 48, color: 0xff2e88 },
  },

  POWERUP: {
    DROP_CHANCE: 0.14,
    DURATION: 8000,         // duração do tiro triplo e do escudo
    LIFETIME: 9000,         // tempo até o item sumir do chão
  },

  STORAGE_KEY: 'vigiliaEstelar.recorde',
};

// Recorde salvo no navegador. O try/catch cobre navegadores com armazenamento bloqueado.
const Recorde = {
  ler() {
    try { return parseInt(localStorage.getItem(CFG.STORAGE_KEY), 10) || 0; } catch (e) { return 0; }
  },
  salvar(valor) {
    try { localStorage.setItem(CFG.STORAGE_KEY, String(valor)); } catch (e) { /* sem armazenamento */ }
  },
};

// Modo de avaliação: index.html?onda=N começa direto na onda N.
function getStartWave() {
  const n = parseInt(new URLSearchParams(window.location.search).get('onda'), 10);
  return n >= 1 && n <= CFG.TOTAL_WAVES ? n : 1;
}
