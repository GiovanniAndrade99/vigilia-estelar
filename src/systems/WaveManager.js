// Controla as ondas com uma máquina de estados:
// INICIO -> INTERVALO (anúncio) -> SPAWN (inimigos entrando) -> COMBATE -> CONCLUIDA -> próxima onda
// Na onda do chefe, a vitória chega por GameScene.onBossDefeated, que leva ao estado FIM.
const WaveState = {
  INICIO: 'INICIO',
  INTERVALO: 'INTERVALO',
  SPAWN: 'SPAWN',
  COMBATE: 'COMBATE',
  CONCLUIDA: 'CONCLUIDA',
  FIM: 'FIM',
};

class WaveManager {
  constructor(scene, startWave) {
    this.scene = scene;
    this.wave = startWave - 1;
    this.queue = [];
    this.nextSpawnAt = 0;
    this.state = WaveState.INICIO;
    this.stateAt = 0;
  }

  get isBossWave() {
    return this.wave >= CFG.TOTAL_WAVES;
  }

  setState(state, now) {
    this.state = state;
    this.stateAt = now;
  }

  update(now) {
    const elapsed = now - this.stateAt;

    switch (this.state) {
      case WaveState.INICIO:
        this.nextWave(now);
        break;
      case WaveState.INTERVALO:
        if (elapsed >= CFG.WAVE_BREAK_MS) {
          this.queue = WaveManager.composition(this.wave);
          this.nextSpawnAt = now;
          this.setState(WaveState.SPAWN, now);
        }
        break;
      case WaveState.SPAWN:
        if (now >= this.nextSpawnAt && this.queue.length) {
          this.scene.spawnEnemy(this.queue.shift());
          this.nextSpawnAt = now + this.spawnGap();
        }
        if (!this.queue.length) this.setState(WaveState.COMBATE, now);
        break;
      case WaveState.COMBATE:
        if (!this.isBossWave && this.scene.enemies.countActive(true) === 0) {
          this.setState(WaveState.CONCLUIDA, now);
          this.scene.onWaveCleared(this.wave);
        }
        break;
      case WaveState.CONCLUIDA:
        if (elapsed >= 1600) this.nextWave(now);
        break;
      case WaveState.FIM:
        break;
    }
  }

  nextWave(now) {
    this.wave++;
    this.setState(WaveState.INTERVALO, now);
    this.scene.events.emit('wave-start', this.wave, this.isBossWave);
    Sfx.waveStart();
  }

  finish(now) {
    this.setState(WaveState.FIM, now);
  }

  spawnGap() {
    return Math.max(380, 900 - this.wave * 55);
  }

  // Composição de cada onda: a quantidade e a variedade crescem com o número da onda
  static composition(n) {
    if (n >= CFG.TOTAL_WAVES) return ['nucleo'];
    const list = [];
    for (let i = 0; i < 2 + n; i++) list.push('drone');
    for (let i = 0; i < Math.floor(n / 2); i++) list.push('investida');
    for (let i = 0; i < Math.floor((n - 1) / 2); i++) list.push('sentinela');
    return Phaser.Utils.Array.Shuffle(list);
  }
}
