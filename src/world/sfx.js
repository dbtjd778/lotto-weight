import { music } from '../engine/music'

/**
 * 효과음 — BGM 엔진의 AudioContext와 마스터 볼륨을 같이 쓴다.
 * 그래서 음소거 버튼 하나로 BGM과 효과음이 함께 꺼진다.
 */

function out() {
  const ctx = music.ctx
  if (!ctx || !music.master || ctx.state !== 'running') return null
  return { ctx, dest: music.master, t: ctx.currentTime }
}

let noiseBuf = null
function noise(ctx) {
  if (noiseBuf) return noiseBuf
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return noiseBuf
}

const FLOOR = {
  room: { freq: 520, q: 1.2, gain: 0.22 }, // 마루
  train: { freq: 380, q: 0.8, gain: 0.14 }, // 카펫
  lobby: { freq: 2400, q: 2.5, gain: 0.16 }, // 대리석
  vip: { freq: 420, q: 0.8, gain: 0.12 },
  town: { freq: 1200, q: 1.0, gain: 0.18 }, // 보도블록
}

export const sfx = {
  step(scene) {
    const o = out()
    if (!o) return
    const f = FLOOR[scene] ?? FLOOR.town
    const src = o.ctx.createBufferSource()
    src.buffer = noise(o.ctx)
    src.playbackRate.value = 0.8 + Math.random() * 0.4
    const bp = o.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f.freq * (0.9 + Math.random() * 0.2)
    bp.Q.value = f.q
    const g = o.ctx.createGain()
    g.gain.setValueAtTime(f.gain, o.t)
    g.gain.exponentialRampToValueAtTime(0.001, o.t + 0.12)
    src.connect(bp).connect(g).connect(o.dest)
    src.start(o.t)
    src.stop(o.t + 0.14)
  },

  /** 진동 + 벨소리 두 번 */
  ring() {
    const o = out()
    if (!o) return
    for (let i = 0; i < 2; i++) {
      const t = o.t + i * 0.42
      for (const fr of [1320, 1660]) {
        const osc = o.ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = fr
        const g = o.ctx.createGain()
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.07, t + 0.02)
        g.gain.setValueAtTime(0.07, t + 0.26)
        g.gain.linearRampToValueAtTime(0, t + 0.3)
        osc.connect(g).connect(o.dest)
        osc.start(t)
        osc.stop(t + 0.32)
      }
    }
  },

  blip() {
    const o = out()
    if (!o) return
    const osc = o.ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(660, o.t)
    osc.frequency.exponentialRampToValueAtTime(990, o.t + 0.08)
    const g = o.ctx.createGain()
    g.gain.setValueAtTime(0.09, o.t)
    g.gain.exponentialRampToValueAtTime(0.001, o.t + 0.16)
    osc.connect(g).connect(o.dest)
    osc.start(o.t)
    osc.stop(o.t + 0.18)
  },
}
