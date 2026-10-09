/**
 * 절차적 BGM 엔진.
 *
 * 음원 파일을 쓰지 않고 Web Audio로 그때그때 연주한다.
 * 무드마다 코드 진행 / 템포 / 음색 / 리듬 패턴이 따로 있고,
 * 게임 상황이 바뀌면 한 마디 안에 크로스페이드로 갈아탄다.
 *
 * 패턴 문자열은 16분음표 16칸이다. 'x' = 세게, '.' = 쉼, '-' = 약하게.
 */

const A4 = 440
const hz = (semitonesFromA4) => A4 * Math.pow(2, semitonesFromA4 / 12)

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
}

/** 스케일 degree(옥타브 넘어가도 됨) → 반음 오프셋 */
function degree(scale, d) {
  const n = scale.length
  const i = ((d % n) + n) % n
  return scale[i] + 12 * Math.floor(d / n)
}

/**
 * root: A4 기준 반음. (예: -24 = A2)
 * prog: 마디별 코드. 각 코드는 스케일 degree 배열.
 */
export const MOODS = {
  // 당첨 직후 ~ 상경길. 쫓기는 느낌.
  tense: {
    bpm: 108, root: -21, scale: SCALES.minor,
    prog: [[0, 2, 4], [0, 2, 4], [5, 0, 2], [4, 6, 1]],
    pad: { wave: 'triangle', gain: 0.052, cutoff: 1100 },
    bass: { wave: 'sawtooth', gain: 0.10, pat: 'x.-.x.-.x.-.x.x.', cutoff: 460 },
    arp: { wave: 'square', gain: 0.028, pat: '..x...x...x...x.', oct: 2, cutoff: 2200 },
    kick: 'x.......x.......',
    hat: '..x...x...x...x.',
    swing: 0,
  },

  // 농협 15층, 계좌에 숫자가 찍히는 순간.
  triumph: {
    bpm: 96, root: -20, scale: SCALES.lydian,
    prog: [[0, 2, 4, 6], [3, 5, 0, 2], [4, 6, 1, 3], [0, 2, 4, 6]],
    pad: { wave: 'triangle', gain: 0.075, cutoff: 2600 },
    bass: { wave: 'sine', gain: 0.10, pat: 'x.......x.......', cutoff: 700 },
    arp: { wave: 'triangle', gain: 0.055, pat: 'x.x.x.x.x.x.x.x.', oct: 2, cutoff: 4200 },
    lead: { wave: 'sine', gain: 0.05, pat: 'x.....x...x.....', oct: 3 },
    kick: '',
    hat: '',
    swing: 0.08,
  },

  // 평범한 하루. 소확행.
  daily: {
    bpm: 84, root: -22, scale: SCALES.major,
    prog: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]],
    pad: { wave: 'triangle', gain: 0.062, cutoff: 1700 },
    bass: { wave: 'sine', gain: 0.085, pat: 'x.......x...x...', cutoff: 620 },
    arp: { wave: 'sine', gain: 0.036, pat: '..x...x...x...x.', oct: 2, cutoff: 3000 },
    kick: '',
    hat: '....-.......-...',
    swing: 0.12,
  },

  // 돈 쓰는 맛. 매끄럽고 비싼 느낌.
  luxury: {
    bpm: 100, root: -20, scale: SCALES.dorian,
    prog: [[0, 2, 4, 6], [0, 2, 4, 6], [3, 5, 0, 2], [3, 5, 0, 2]],
    pad: { wave: 'sawtooth', gain: 0.034, cutoff: 1500 },
    bass: { wave: 'triangle', gain: 0.10, pat: 'x..x..x...x.x...', cutoff: 560 },
    arp: { wave: 'triangle', gain: 0.03, pat: 'x.x.x.x.x.x.x.x.', oct: 2, cutoff: 3400 },
    kick: 'x.......x.......',
    hat: '..-.--x...-.--x.',
    swing: 0.16,
  },

  // 위기·사기·배신·붕괴.
  dark: {
    bpm: 68, root: -26, scale: SCALES.phrygian,
    prog: [[0, 2, 4], [0, 2, 4], [1, 3, 5], [0, 2, 4]],
    pad: { wave: 'sawtooth', gain: 0.042, cutoff: 620 },
    bass: { wave: 'sine', gain: 0.13, pat: 'x.......x.......', cutoff: 300 },
    arp: { wave: 'triangle', gain: 0.022, pat: '......x.......x.', oct: 1, cutoff: 1200 },
    kick: 'x...............',
    hat: '',
    swing: 0,
  },

  // 1년을 버텼다.
  winning: {
    bpm: 88, root: -20, scale: SCALES.major,
    prog: [[0, 2, 4], [4, 6, 1], [5, 0, 2], [3, 5, 0]],
    pad: { wave: 'triangle', gain: 0.08, cutoff: 2400 },
    bass: { wave: 'sine', gain: 0.09, pat: 'x.......x.......', cutoff: 700 },
    arp: { wave: 'sine', gain: 0.05, pat: 'x..x..x.x..x..x.', oct: 2, cutoff: 3800 },
    lead: { wave: 'triangle', gain: 0.045, pat: 'x.......x.......', oct: 3 },
    kick: '',
    hat: '',
    swing: 0.1,
  },

  // 파산 / 발각.
  losing: {
    bpm: 58, root: -28, scale: SCALES.minor,
    prog: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [0, 2, 4]],
    pad: { wave: 'sawtooth', gain: 0.05, cutoff: 520 },
    bass: { wave: 'sine', gain: 0.11, pat: 'x...............', cutoff: 260 },
    arp: { wave: 'sine', gain: 0.024, pat: '........x.......', oct: 1, cutoff: 900 },
    kick: '',
    hat: '',
    swing: 0,
  },
}

/** 게임 상태 → 무드 이름 */
export function moodForState(state) {
  if (!state) return 'tense'
  if (state.screen === 'ending') {
    return state.ending?.type === 'win' ? 'winning' : 'losing'
  }
  const ev = state.current
  if (!ev) return 'tense'

  // 아직 돈을 못 받았으면 계속 쫓긴다
  if (!state.flags.received) return 'tense'

  // 수령 직후 VIP실
  if (ev.phase === 3) return 'triumph'

  // 소문이 임계에 가까우면 뭘 하든 불안하다
  if (state.suspicion >= 78 || state.mental >= 85) return 'dark'

  switch (ev.category) {
    case '위기':
    case '사기':
    case '배신':
    case '붕괴':
      return 'dark'
    case '사치품':
    case '대형지출':
    case '투자':
      return 'luxury'
    default:
      return 'daily'
  }
}

const STEPS = 16
const LOOKAHEAD_S = 0.15
const TICK_MS = 30

export class MusicEngine {
  constructor() {
    this.ctx = null
    this.started = false
    this.muted = false
    this.moodName = 'tense'
    this.nextMood = null
    this.step = 0
    this.nextNoteTime = 0
    this.timer = null
    this.volume = 0.85
  }

  get mood() {
    return MOODS[this.moodName] ?? MOODS.tense
  }

  /** 사용자 제스처 안에서 호출해야 한다 (자동재생 정책) */
  async start(moodName) {
    if (moodName) this.moodName = moodName
    if (this.started) {
      await this.ctx?.resume()
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    await this.ctx.resume()

    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : this.volume

    this.comp = this.ctx.createDynamicsCompressor()
    this.comp.threshold.value = -18
    this.comp.ratio.value = 4

    // 잔향 — 노이즈 감쇠로 임펄스를 만들어 쓴다
    this.reverb = this.ctx.createConvolver()
    this.reverb.buffer = this.#impulse(2.4, 2.6)
    this.wet = this.ctx.createGain()
    this.wet.gain.value = 0.3

    this.bus = this.ctx.createGain()
    this.bus.gain.value = 1

    this.bus.connect(this.comp)
    this.bus.connect(this.wet)
    this.wet.connect(this.reverb)
    this.reverb.connect(this.comp)
    this.comp.connect(this.master)
    this.master.connect(this.ctx.destination)

    this.noise = this.#noiseBuffer()

    this.started = true
    this.step = 0
    this.nextNoteTime = this.ctx.currentTime + 0.08
    this.timer = setInterval(() => this.#schedule(), TICK_MS)
  }

  stop() {
    clearInterval(this.timer)
    this.timer = null
    this.started = false
    this.ctx?.close()
    this.ctx = null
  }

  setMuted(m) {
    this.muted = m
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(t)
      this.master.gain.setTargetAtTime(m ? 0 : this.volume, t, 0.08)
    }
  }

  /** 다음 마디 경계에서 갈아탄다 */
  setMood(name) {
    if (!MOODS[name] || name === this.nextMood) return
    if (!this.started) {
      this.moodName = name
      return
    }
    const t = this.ctx.currentTime

    // 전환을 예약해둔 사이에 원래 무드로 되돌아온 경우.
    // 그냥 두면 볼륨이 줄어든 채로 엉뚱한 곡이 한 마디 흐른다.
    if (name === this.moodName) {
      if (this.nextMood) {
        this.nextMood = null
        this.bus.gain.cancelScheduledValues(t)
        this.bus.gain.setTargetAtTime(1, t, 0.2)
      }
      return
    }

    this.nextMood = name
    this.bus.gain.cancelScheduledValues(t)
    this.bus.gain.setTargetAtTime(0.0001, t, 0.18)
  }

  /** 탭이 백그라운드로 갔다 오면 오디오가 멈춰 있을 수 있다 */
  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume()
  }

  // ---- 내부 ----

  #impulse(dur, decay) {
    const rate = this.ctx.sampleRate
    const len = Math.floor(rate * dur)
    const buf = this.ctx.createBuffer(2, len, rate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
      }
    }
    return buf
  }

  #noiseBuffer() {
    const rate = this.ctx.sampleRate
    const buf = this.ctx.createBuffer(1, rate * 0.5, rate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  #schedule() {
    if (!this.ctx) return
    const m = this.mood
    const stepDur = 60 / m.bpm / 4

    while (this.nextNoteTime < this.ctx.currentTime + LOOKAHEAD_S) {
      // 마디 경계에서 무드 교체
      if (this.step % STEPS === 0 && this.nextMood) {
        this.moodName = this.nextMood
        this.nextMood = null
        this.bus.gain.cancelScheduledValues(this.nextNoteTime)
        this.bus.gain.setTargetAtTime(1, this.nextNoteTime, 0.25)
      }
      this.#playStep(this.step, this.nextNoteTime)

      // 스윙: 홀수 16분음표를 살짝 늦춘다
      const sw = this.step % 2 === 0 ? 1 + (m.swing ?? 0) : 1 - (m.swing ?? 0)
      this.nextNoteTime += stepDur * sw
      this.step++
    }
  }

  #playStep(step, time) {
    const m = this.mood
    const s = step % STEPS
    const bar = Math.floor(step / STEPS)
    const chord = m.prog[bar % m.prog.length]
    const barDur = (60 / m.bpm) * 4

    // 패드 — 마디 첫 박에 코드 전체
    if (s === 0 && m.pad) {
      chord.forEach((d, i) => {
        this.#tone({
          freq: hz(m.root + 12 + degree(m.scale, d)),
          time,
          dur: barDur * 0.98,
          wave: m.pad.wave,
          gain: m.pad.gain / (1 + i * 0.25),
          attack: 0.5,
          release: 0.9,
          cutoff: m.pad.cutoff,
          detune: i % 2 ? 5 : -5,
        })
      })
    }

    // 베이스
    if (m.bass && this.#hit(m.bass.pat, s)) {
      this.#tone({
        freq: hz(m.root + degree(m.scale, chord[0])),
        time,
        dur: (60 / m.bpm) * 0.42,
        wave: m.bass.wave,
        gain: m.bass.gain * this.#vel(m.bass.pat, s),
        attack: 0.006,
        release: 0.14,
        cutoff: m.bass.cutoff,
      })
    }

    // 아르페지오
    if (m.arp && this.#hit(m.arp.pat, s)) {
      const idx = Math.floor(step / 2) % chord.length
      this.#tone({
        freq: hz(m.root + 12 * (m.arp.oct ?? 2) + degree(m.scale, chord[idx])),
        time,
        dur: (60 / m.bpm) * 0.3,
        wave: m.arp.wave,
        gain: m.arp.gain * this.#vel(m.arp.pat, s),
        attack: 0.008,
        release: 0.24,
        cutoff: m.arp.cutoff,
      })
    }

    // 리드 (있는 무드만)
    if (m.lead && this.#hit(m.lead.pat, s)) {
      const idx = (bar + Math.floor(step / 4)) % chord.length
      this.#tone({
        freq: hz(m.root + 12 * (m.lead.oct ?? 3) + degree(m.scale, chord[idx])),
        time,
        dur: (60 / m.bpm) * 1.1,
        wave: m.lead.wave,
        gain: m.lead.gain,
        attack: 0.04,
        release: 0.6,
        cutoff: 5000,
      })
    }

    if (m.kick && this.#hit(m.kick, s)) this.#kick(time)
    if (m.hat && this.#hit(m.hat, s)) this.#hat(time, this.#vel(m.hat, s))
  }

  #hit(pat, s) {
    if (!pat) return false
    const c = pat[s % pat.length]
    return c === 'x' || c === '-'
  }

  #vel(pat, s) {
    return pat[s % pat.length] === 'x' ? 1 : 0.45
  }

  #tone({ freq, time, dur, wave, gain, attack, release, cutoff, detune = 0 }) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = wave
    osc.frequency.value = freq
    osc.detune.value = detune

    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = cutoff ?? 8000
    filt.Q.value = 0.7

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), time + attack)
    g.gain.setTargetAtTime(0.0001, time + dur, release / 3)

    osc.connect(filt)
    filt.connect(g)
    g.connect(this.bus)
    osc.start(time)
    osc.stop(time + dur + release + 0.1)
  }

  #kick(time) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, time)
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(0.34, time + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3)

    osc.connect(g)
    g.connect(this.bus)
    osc.start(time)
    osc.stop(time + 0.34)
  }

  #hat(time, vel) {
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noise

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 7200

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(0.05 * vel, time + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)

    src.connect(hp)
    hp.connect(g)
    g.connect(this.bus)
    src.start(time)
    src.stop(time + 0.08)
  }
}

export const music = new MusicEngine()
