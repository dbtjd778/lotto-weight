import * as THREE from 'three'
import { SCENE_BUILDERS } from './scenes'
import { makePerson, makeMarker, animatePerson } from './kit'
import { sfx } from './sfx'

/**
 * 1인칭 월드 엔진.
 *
 * React는 "지금 무슨 이벤트인가"만 알려주고, 엔진은 그걸 공간에 놓는다.
 * 매 프레임 바뀌는 것(나침반 각도 등)은 React state를 거치지 않고 DOM에 바로 쓴다.
 */

const EYE = 1.62
const RADIUS = 0.3
const WALK = 3.0
const RUN = 5.6
const PEOPLE = new Set(['mom', 'dad', 'sis', 'boss', 'friend', 'uncle', 'pb', 'guard', 'agent', 'clerk', 'dealer', 'junior'])

/** 조명 프리셋 */
const ENV = {
  night: { sky: '#0a0f24', fog: ['#0a0f24', 6, 30], hemi: ['#7d8cc4', '#1b1410', 0.35], sun: 0 },
  train: { sky: '#d8e8f3', fog: null, hemi: ['#ffffff', '#8a8580', 1.3], sun: 0 },
  indoor: { sky: '#e8e4dc', fog: null, hemi: ['#ffffff', '#8a8580', 1.05], sun: 0 },
  morning: { sky: '#bcd8f0', fog: ['#d6e4ee', 35, 110], hemi: ['#dbeaff', '#7a6a55', 1.0], sun: 2.2, sunColor: '#ffe2b8', sunPos: [-30, 18, 20] },
  noon: { sky: '#8ec5f0', fog: ['#cfe3f2', 40, 130], hemi: ['#e8f3ff', '#776655', 1.15], sun: 3.0, sunColor: '#fffaf0', sunPos: [10, 40, 15] },
  evening: { sky: '#f0a46c', fog: ['#e9a77c', 30, 100], hemi: ['#ffc9a0', '#4a3a40', 0.75], sun: 2.0, sunColor: '#ff9a5a', sunPos: [40, 10, -10] },
  night_town: { sky: '#0c1430', fog: ['#0c1430', 18, 70], hemi: ['#6a7bb8', '#151018', 0.45], sun: 0.35, sunColor: '#9fb3ff', sunPos: [-10, 30, 10] },
}

export class WorldEngine {
  constructor(canvas, { onPrompt, onPhone, onInteract, onPointerLockChange, compassEl }) {
    this.canvas = canvas
    this.cb = { onPrompt, onPhone, onInteract, onPointerLockChange }
    this.compassEl = compassEl

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 220)
    this.camera.rotation.order = 'YXZ'

    this.hemi = new THREE.HemisphereLight('#fff', '#444', 1)
    this.sun = new THREE.DirectionalLight('#fff', 0)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    Object.assign(this.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 })
    this.sun.shadow.bias = -0.0005
    this.scene.add(this.hemi, this.sun, this.sun.target)

    this.built = {}
    this.current = null // 현재 장면 데이터
    this.sceneName = null
    this.player = { x: 0, z: 0, yaw: 0, pitch: 0, bob: 0, stride: 0 }
    this.keys = new Set()
    this.touchMove = { x: 0, y: 0 }
    this.running = false
    this.paused = true
    this.target = null // { spot, npc, marker }
    this.phone = false
    this.prompt = null
    this.fixedNpcs = []
    this.clock = new THREE.Clock()
    this.t = 0

    this._bind()
    this._resize()
    this.renderer.setAnimationLoop(() => this._frame())
  }

  /* ------------------------------------------------------------ *
   * 장면 / 이벤트 / 시간
   * ------------------------------------------------------------ */

  setScene(name) {
    if (this.sceneName === name) return
    if (this.current) this.scene.remove(this.current.group)
    if (!this.built[name]) {
      this.built[name] = SCENE_BUILDERS[name]()
      this._spawnFixed(this.built[name])
    }
    this.current = this.built[name]
    this.sceneName = name
    this.scene.add(this.current.group)
    const [x, z] = this.current.spawn.pos
    Object.assign(this.player, { x, z, yaw: this.current.spawn.yaw, pitch: -0.05 })
    this.clearTarget()
    if (this.current.env !== 'dynamic') this._applyEnv(ENV[this.current.env])
    else this._applyEnv(ENV[this.tod ?? 'noon'])
  }

  /** 이 장면에 늘 있는 사람들 (경비, 창구 직원, PB) */
  _spawnFixed(sc) {
    sc.fixed = {}
    for (const [name, s] of Object.entries(sc.spots)) {
      if (!s.fixed) continue
      const p = makePerson(s.fixed, { seated: s.seated })
      const [x, z, r] = s.npc
      p.position.set(x, s.seated ? 0.45 : 0, z)
      p.rotation.y = r
      sc.group.add(p)
      sc.fixed[name] = p
    }
  }

  setTimeOfDay(tod, day) {
    this.tod = tod
    if (this.current?.env === 'dynamic') {
      this._applyEnv(ENV[tod])
      this.current.update?.({ day, night: tod === 'night_town' })
    }
  }

  _applyEnv(e) {
    this.scene.background = new THREE.Color(e.sky)
    this.scene.fog = e.fog ? new THREE.Fog(...e.fog) : null
    this.hemi.color.set(e.hemi[0])
    this.hemi.groundColor.set(e.hemi[1])
    this.hemi.intensity = e.hemi[2]
    this.sun.intensity = e.sun
    if (e.sun) {
      this.sun.color.set(e.sunColor)
      this.sunOffset = e.sunPos
    }
    this.renderer.toneMappingExposure = e.sun ? 1.0 : 1.1
  }

  /** 이벤트를 공간에 놓는다 */
  setTarget(event, spotName) {
    this.clearTarget()
    if (!event) return
    if (spotName === 'phone') {
      this.phone = true
      this.target = { phone: true, event }
      this._phoneTimer = setTimeout(() => {
        if (this.target?.event === event) {
          this.ringing = true
          this.cb.onPhone?.(true)
          sfx.ring()
          this._ringLoop = setInterval(() => !this.paused && sfx.ring(), 2600)
        }
      }, 900)
      return
    }
    const spot = this.current.spots[spotName]
    if (!spot) {
      console.warn('[world] 없는 지점', spotName)
      return
    }
    const marker = makeMarker()
    marker.position.copy(spot.pos).add(new THREE.Vector3(0, 0.75, 0))
    this.current.group.add(marker)

    let npc = null
    const speaker = event.speaker
    const fixedHere = this.current.fixed?.[spotName]
    if (fixedHere && spot.fixed === speaker) {
      npc = fixedHere
      marker.position.set(npc.position.x, npc.position.y + 2.15, npc.position.z)
    } else if (PEOPLE.has(speaker) && spot.npc) {
      npc = makePerson(speaker)
      const [x, z, r] = spot.npc
      npc.position.set(x, 0, z)
      npc.rotation.y = r
      this.current.group.add(npc)
      marker.position.set(x, 2.35, z)
    }
    this.target = { spot, spotName, npc, marker, event, ownNpc: npc && npc !== fixedHere }
  }

  clearTarget() {
    clearTimeout(this._phoneTimer)
    clearInterval(this._ringLoop)
    if (this.phone) this.cb.onPhone?.(false)
    this.phone = false
    this.ringing = false
    if (this.target?.marker) this.current?.group.remove(this.target.marker)
    if (this.target?.ownNpc) this.current?.group.remove(this.target.npc)
    this.target = null
    this._setPrompt(null)
  }

  /** 대화창이 열려 있는 동안은 멈춘다 */
  setPaused(p) {
    this.paused = p
    if (p && document.pointerLockElement === this.canvas) document.exitPointerLock()
  }

  lock() {
    if (matchMedia('(pointer: coarse)').matches) return
    try {
      const r = this.canvas.requestPointerLock?.()
      r?.catch?.(() => {})
    } catch {
      /* 거절되면 드래그로 둘러보면 된다 */
    }
  }

  interact() {
    if (this.paused || !this.target) return false
    if (this.phone ? !this.ringing : !this.prompt) return false
    sfx.blip()
    clearInterval(this._ringLoop)
    this.cb.onInteract?.()
    return true
  }

  /* ------------------------------------------------------------ *
   * 입력
   * ------------------------------------------------------------ */

  _bind() {
    // 이동 키는 멈춰 있는 동안에도 '눌려 있음'을 기억한다.
    // 대화창이 닫히는 순간 이미 W를 누르고 있었다면 바로 걸어 나가야 한다 (움직임 자체는 _frame에서 막는다)
    this._onKeyDown = (e) => {
      const k = e.code
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(k)) {
        this.keys.add(k)
        if (k.startsWith('Arrow') && !this.paused) e.preventDefault()
      }
      if (k === 'KeyE' && !e.repeat && !this.paused) this.interact()
    }
    this._onKeyUp = (e) => this.keys.delete(e.code)
    this._onMouseMove = (e) => {
      if (this.paused) return
      if (document.pointerLockElement === this.canvas) this._look(e.movementX, e.movementY, 0.0022)
    }
    this._onLockChange = () => this.cb.onPointerLockChange?.(document.pointerLockElement === this.canvas)
    this._onResize = () => this._resize()
    this._onBlur = () => this.keys.clear()

    // 포인터 고정이 안 되는 환경 — 드래그로 둘러보기
    let drag = null
    this._onPointerDown = (e) => {
      if (this.paused) return
      if (e.pointerType === 'mouse' && document.pointerLockElement !== this.canvas) this.lock()
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
    }
    this._onPointerMove = (e) => {
      if (!drag || drag.id !== e.pointerId || document.pointerLockElement === this.canvas) return
      this._look(e.clientX - drag.x, e.clientY - drag.y, e.pointerType === 'touch' ? 0.005 : 0.004)
      drag.x = e.clientX
      drag.y = e.clientY
    }
    this._onPointerUp = (e) => {
      if (drag?.id === e.pointerId) drag = null
    }

    addEventListener('keydown', this._onKeyDown)
    addEventListener('keyup', this._onKeyUp)
    addEventListener('mousemove', this._onMouseMove)
    addEventListener('resize', this._onResize)
    addEventListener('blur', this._onBlur)
    document.addEventListener('pointerlockchange', this._onLockChange)
    this.canvas.addEventListener('pointerdown', this._onPointerDown)
    addEventListener('pointermove', this._onPointerMove)
    addEventListener('pointerup', this._onPointerUp)
    addEventListener('pointercancel', this._onPointerUp)
  }

  _look(dx, dy, s) {
    this.player.yaw -= dx * s
    this.player.pitch = Math.max(-1.35, Math.min(1.35, this.player.pitch - dy * s))
  }

  _resize() {
    const w = this.canvas.clientWidth || innerWidth
    const h = this.canvas.clientHeight || innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  /* ------------------------------------------------------------ *
   * 매 프레임
   * ------------------------------------------------------------ */

  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.t += dt
    if (!this.current) return

    if (!this.paused) this._move(dt)

    const p = this.player
    const bob = Math.sin(p.bob) * 0.035
    this.camera.position.set(p.x, EYE + bob, p.z)
    this.camera.rotation.set(p.pitch, p.yaw, 0)

    if (this.sun.intensity) {
      const [ox, oy, oz] = this.sunOffset
      this.sun.position.set(p.x + ox, oy, p.z + oz)
      this.sun.target.position.set(p.x, 0, p.z)
    }

    for (const fn of this.current.animated) fn(this.t, dt)
    for (const npc of Object.values(this.current.fixed ?? {})) animatePerson(npc, this.t, this.camera.position)
    if (this.target?.ownNpc) animatePerson(this.target.npc, this.t, this.camera.position)
    if (this.target?.marker) {
      const m = this.target.marker
      m.userData.sprite.position.y = Math.sin(this.t * 3) * 0.08
      m.userData.light.intensity = 1.6 + Math.sin(this.t * 4) * 0.8
    }

    this._updateTargetHud()
    this.renderer.render(this.scene, this.camera)
  }

  _move(dt) {
    const p = this.player
    const k = this.keys
    // 방향키 좌우는 고개 돌리기
    if (k.has('ArrowLeft')) p.yaw += 2.0 * dt
    if (k.has('ArrowRight')) p.yaw -= 2.0 * dt

    let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    let s = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0)
    f += -this.touchMove.y
    s += this.touchMove.x
    const len = Math.hypot(f, s)
    if (len < 0.05) {
      p.bob *= 0.9
      return
    }
    if (len > 1) {
      f /= len
      s /= len
    }
    const run = k.has('ShiftLeft') || k.has('ShiftRight') || this.running
    const speed = (run ? RUN : WALK) * (this.sceneName === 'town' ? 1.25 : 1)
    const sin = Math.sin(p.yaw)
    const cos = Math.cos(p.yaw)
    const dx = (-sin * f + cos * s) * speed * dt
    const dz = (-cos * f - sin * s) * speed * dt

    // 축별로 따로 밀어내서 벽을 따라 미끄러지게
    const nx = p.x + dx
    if (!this._hits(nx, p.z)) p.x = nx
    const nz = p.z + dz
    if (!this._hits(p.x, nz)) p.z = nz

    const moved = Math.hypot(dx, dz)
    p.bob += moved * (run ? 2.6 : 3.2)
    p.stride += moved
    if (p.stride > (run ? 1.6 : 1.25)) {
      p.stride = 0
      sfx.step(this.sceneName)
    }
  }

  _hits(x, z) {
    for (const c of this.current.colliders) {
      if (x + RADIUS > c.minX && x - RADIUS < c.maxX && z + RADIUS > c.minZ && z - RADIUS < c.maxZ) return true
    }
    return false
  }

  _updateTargetHud() {
    const t = this.target
    const el = this.compassEl?.current
    if (!t || t.phone || this.paused) {
      if (el) el.style.opacity = '0'
      if (!t?.phone) this._setPrompt(null)
      else this._setPrompt(this.ringing ? { kind: 'phone' } : null)
      return
    }
    const goal = t.npc ? t.npc.position : t.spot.pos
    const dx = goal.x - this.player.x
    const dz = goal.z - this.player.z
    const dist = Math.hypot(dx, dz)

    const near = dist < (t.spot.radius ?? 1.9) + (t.npc ? 0.4 : 0)
    if (near) {
      const who = t.npc ? t.event.speaker : null
      this._setPrompt({ kind: who ? 'talk' : 'look', who, label: t.spot.label })
    } else this._setPrompt(null)

    if (el) {
      // 시선 방향 대비 목표의 상대 각도
      const want = Math.atan2(-dx, -dz)
      let rel = want - this.player.yaw
      rel = Math.atan2(Math.sin(rel), Math.cos(rel))
      el.style.opacity = near ? '0' : '1'
      el.style.setProperty('--rot', `${(-rel * 180) / Math.PI}deg`)
      const d = el.querySelector('[data-dist]')
      if (d) d.textContent = `${Math.round(dist)}m`
    }
  }

  _setPrompt(p) {
    const key = p ? `${p.kind}|${p.who ?? ''}|${p.label ?? ''}` : ''
    if (key === this._promptKey) return
    this._promptKey = key
    this.prompt = p
    this.cb.onPrompt?.(p)
  }

  dispose() {
    this.clearTarget()
    this.renderer.setAnimationLoop(null)
    removeEventListener('keydown', this._onKeyDown)
    removeEventListener('keyup', this._onKeyUp)
    removeEventListener('mousemove', this._onMouseMove)
    removeEventListener('resize', this._onResize)
    removeEventListener('blur', this._onBlur)
    document.removeEventListener('pointerlockchange', this._onLockChange)
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    removeEventListener('pointermove', this._onPointerMove)
    removeEventListener('pointerup', this._onPointerUp)
    removeEventListener('pointercancel', this._onPointerUp)
    if (document.pointerLockElement === this.canvas) document.exitPointerLock()
    this.renderer.dispose()
  }
}
