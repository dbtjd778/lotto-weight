import * as THREE from 'three'
import { CAST } from '../data'

/**
 * 3D 공간을 짓는 도구 상자.
 * 텍스처는 전부 캔버스로 그때그때 그린다 — 이미지 파일 없음 (BGM과 같은 원칙).
 */

const FONT = `'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`

/* ------------------------------------------------------------------ *
 * 캔버스 텍스처
 * ------------------------------------------------------------------ */

function canvasTexture(w, h, draw, { repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  if (repeat[0] !== 1 || repeat[1] !== 1) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
  }
  return t
}

function noise(g, w, h, amount, alpha = 0.06) {
  for (let i = 0; i < amount; i++) {
    g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2)
  }
}

const cache = new Map()
const once = (key, make) => {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)
}

export const TEX = {
  wood: (r = [2, 2]) =>
    canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#9a7350'
      g.fillRect(0, 0, w, h)
      for (let y = 0; y < h; y += 32) {
        g.fillStyle = y % 64 ? '#8c6847' : '#a57c57'
        g.fillRect(0, y, w, 31)
        g.fillStyle = 'rgba(0,0,0,.25)'
        g.fillRect(0, y + 31, w, 1)
        const off = (y * 37) % w
        g.fillRect(off, y, 1, 31)
      }
      noise(g, w, h, 900, 0.05)
    }, { repeat: r }),

  tile: (color = '#e7e2d8', line = '#c9c2b4', r = [4, 4]) =>
    canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = color
      g.fillRect(0, 0, w, h)
      g.strokeStyle = line
      g.lineWidth = 3
      g.strokeRect(0, 0, w, h)
      noise(g, w, h, 300, 0.035)
    }, { repeat: r }),

  marble: (r = [6, 6]) =>
    canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#ecebe6'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = 'rgba(120,120,130,.18)'
      for (let i = 0; i < 14; i++) {
        g.beginPath()
        let x = Math.random() * w
        g.moveTo(x, 0)
        for (let y = 0; y < h; y += 16) g.lineTo((x += (Math.random() - 0.5) * 24), y)
        g.stroke()
      }
      g.strokeStyle = 'rgba(0,0,0,.12)'
      g.lineWidth = 2
      g.strokeRect(0, 0, w, h)
    }, { repeat: r }),

  asphalt: (r = [20, 4]) =>
    canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#3d3f44'
      g.fillRect(0, 0, w, h)
      noise(g, w, h, 1400, 0.08)
    }, { repeat: r }),

  sidewalk: (r = [30, 3]) =>
    canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#b8b2a7'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#a49d90'
      g.fillRect(0, 62, w, 3)
      g.fillRect(62, 0, 3, h)
      noise(g, w, h, 500, 0.05)
    }, { repeat: r }),

  grass: (r = [10, 10]) =>
    canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#5f8a4a'
      g.fillRect(0, 0, w, h)
      for (let i = 0; i < 900; i++) {
        g.fillStyle = Math.random() < 0.5 ? '#6f9c56' : '#4f7a3d'
        g.fillRect(Math.random() * w, Math.random() * h, 1, 3)
      }
    }, { repeat: r }),

  wallpaper: (base = '#efe9df', r = [3, 1]) =>
    canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = base
      g.fillRect(0, 0, w, h)
      g.fillStyle = 'rgba(0,0,0,.035)'
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h)
      noise(g, w, h, 300, 0.025)
    }, { repeat: r }),

  /** 창밖 풍경 (열차 창문에서 흘러간다) */
  scenery: () =>
    canvasTexture(1024, 128, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#9ec9ec')
      sky.addColorStop(1, '#e8f1f7')
      g.fillStyle = sky
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#7d9b84'
      g.beginPath()
      g.moveTo(0, 70)
      for (let x = 0; x <= w; x += 32) g.lineTo(x, 50 + Math.sin(x / 70) * 14 + Math.random() * 8)
      g.lineTo(w, h)
      g.lineTo(0, h)
      g.fill()
      g.fillStyle = '#9db86a'
      g.fillRect(0, 92, w, 36)
      for (let i = 0; i < 40; i++) {
        g.fillStyle = '#4c7040'
        const x = Math.random() * w
        g.fillRect(x, 78, 6, 16)
      }
      g.fillStyle = '#666'
      for (let x = 0; x < w; x += 96) g.fillRect(x, 60, 2, 50)
    }, { repeat: [1, 1] }),
}

/** 간판 / 표지판 */
export function signTexture(text, { bg = '#1f2937', fg = '#fff', sub = '', w = 512, h = 128, size = 64 } = {}) {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.fillStyle = fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `800 ${size}px ${FONT}`
    g.fillText(text, w / 2, sub ? h * 0.4 : h / 2, w - 24)
    if (sub) {
      g.globalAlpha = 0.7
      g.font = `500 ${Math.round(size * 0.38)}px ${FONT}`
      g.fillText(sub, w / 2, h * 0.78, w - 24)
    }
  })
}

/* ------------------------------------------------------------------ *
 * 재질
 * ------------------------------------------------------------------ */

export const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts })

export const texMat = (map, opts = {}) =>
  new THREE.MeshStandardMaterial({ map, roughness: 0.9, ...opts })

export const glow = (color, intensity = 1.4) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity })

/* ------------------------------------------------------------------ *
 * 공간 빌더 — 상자를 쌓으면서 동시에 충돌 판정을 등록한다
 * ------------------------------------------------------------------ */

export class Builder {
  constructor() {
    this.group = new THREE.Group()
    this.colliders = [] // { minX, maxX, minZ, maxZ }
    this.spots = {}
    this.animated = [] // (t, dt) => void
    this.lights = {}
  }

  /** x,z = 바닥 중심, y = 바닥 높이. solid면 걸어서 통과할 수 없다 */
  box(x, y, z, w, h, d, material, { solid = true, rotY = 0, shadow = true } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
    m.position.set(x, y + h / 2, z)
    m.rotation.y = rotY
    m.castShadow = shadow
    m.receiveShadow = true
    this.group.add(m)
    if (solid && y < 1.5 && y + h > 0.15) {
      // 회전된 상자는 90도 단위만 지원 (가구 배치용으로 충분)
      const swap = Math.abs(Math.sin(rotY)) > 0.5
      const hw = (swap ? d : w) / 2
      const hd = (swap ? w : d) / 2
      this.colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd })
    }
    return m
  }

  floor(x, z, w, d, material, y = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material)
    m.rotation.x = -Math.PI / 2
    m.position.set(x, y, z)
    m.receiveShadow = true
    this.group.add(m)
    return m
  }

  /** 벽 하나. 문 구멍(gap)을 뚫을 수 있다: gap = { at, width } (벽 길이 방향 오프셋) */
  wall(x1, z1, x2, z2, h, material, { gap = null, thick = 0.15 } = {}) {
    const len = Math.hypot(x2 - x1, z2 - z1)
    const horiz = Math.abs(z2 - z1) < 1e-6
    const seg = (a, b) => {
      if (b - a < 0.01) return
      const mid = (a + b) / 2
      const cx = horiz ? Math.min(x1, x2) + mid : x1
      const cz = horiz ? z1 : Math.min(z1, z2) + mid
      this.box(cx, 0, cz, horiz ? b - a : thick, h, horiz ? thick : b - a, material)
    }
    if (!gap) seg(0, len)
    else {
      seg(0, gap.at - gap.width / 2)
      seg(gap.at + gap.width / 2, len)
      // 문 위 상인방
      const mid = gap.at
      const cx = horiz ? Math.min(x1, x2) + mid : x1
      const cz = horiz ? z1 : Math.min(z1, z2) + mid
      this.box(cx, 2.15, cz, horiz ? gap.width : thick, h - 2.15, horiz ? thick : gap.width, material, { solid: false })
    }
  }

  /** 벽에 붙는 평면 (간판, 창문, 포스터). rotY 0 = +z 방향을 바라봄 */
  plane(x, y, z, w, h, material, rotY = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material)
    m.position.set(x, y, z)
    m.rotation.y = rotY
    this.group.add(m)
    return m
  }

  sign(text, x, y, z, w, h, rotY = 0, opts = {}) {
    const tex = signTexture(text, { w: 512, h: Math.round((512 * h) / w), ...opts })
    return this.plane(x, y, z, w, h, new THREE.MeshBasicMaterial({ map: tex }), rotY)
  }

  /**
   * 이벤트가 일어날 수 있는 지점.
   * pos     : 느낌표 마커와 상호작용 판정 중심
   * npc     : 사람 이벤트일 때 서 있을 위치/방향 (없으면 pos)
   * label   : 사람이 아닐 때 프롬프트에 쓸 물건 이름 ("노트북을 본다")
   * fixed   : 이 지점에 항상 서 있는 인물 (경비, 창구 직원 등)
   */
  spot(name, def) {
    this.spots[name] = {
      radius: 1.9,
      ...def,
      pos: new THREE.Vector3(def.pos[0], def.pos[1] ?? 1.2, def.pos[2]),
    }
  }

  light(name, l) {
    this.lights[name] = l
    this.group.add(l)
    return l
  }
}

/* ------------------------------------------------------------------ *
 * 사람
 * ------------------------------------------------------------------ */

const SKIN = ['#f2cfb0', '#e8bf9c', '#dcae8a']
const HAIR = { mom: '#7a7a7a', dad: '#9a9a9a', uncle: '#bdbdbd', sis: '#3a2414', default: '#1d1a17' }

/** 로우폴리 인물. 캐스트 색을 옷 색으로 쓴다 */
export function makePerson(id, { seated = false, tag = true, shirt = null } = {}) {
  const c = CAST[id] ?? CAST.system
  const g = new THREE.Group()
  const skin = mat(SKIN[id.length % SKIN.length], { roughness: 0.7 })
  const cloth = mat(shirt ?? c.color, { roughness: 0.75 })
  const pants = mat('#2b2f38')
  const hair = mat(HAIR[id] ?? HAIR.default, { roughness: 0.95 })

  const legH = seated ? 0.0 : 0.82
  if (!seated) {
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.62, 4, 8), pants)
      leg.position.set(0.1 * s, 0.4, 0)
      leg.castShadow = true
      g.add(leg)
    }
  }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), cloth)
  torso.position.y = legH + 0.33
  torso.scale.set(1, 1, 0.68)
  torso.castShadow = true
  g.add(torso)

  const arms = []
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group()
    pivot.position.set(0.27 * s, legH + 0.56, 0)
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 4, 8), cloth)
    arm.position.y = -0.27
    arm.castShadow = true
    pivot.add(arm)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), skin)
    hand.position.y = -0.58
    pivot.add(hand)
    pivot.rotation.z = 0.08 * s
    g.add(pivot)
    arms.push(pivot)
  }

  const head = new THREE.Group()
  head.position.y = legH + 0.86
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), skin)
  face.scale.set(0.92, 1.08, 0.95)
  face.castShadow = true
  head.add(face)
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.158, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair,
  )
  cap.position.set(0, 0.02, -0.012)
  head.add(cap)
  const eyeMat = mat('#1a1a1a')
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeMat)
    eye.position.set(0.052 * s, 0.02, 0.135)
    head.add(eye)
  }
  g.add(head)

  // 머리 위 이름표 (이모지 + 이름)
  let label = null
  if (tag) {
    label = nameTag(`${c.emoji} ${c.name}`, c.color)
    label.position.y = legH + 1.32
    g.add(label)
  }

  g.userData = { head, arms, tag: label, phase: Math.random() * 6 }
  return g
}

export function nameTag(text, color = '#fbbf24') {
  const tex = canvasTexture(512, 112, (g, w, h) => {
    g.fillStyle = 'rgba(17,17,20,.72)'
    const r = 40
    g.beginPath()
    g.roundRect(8, 8, w - 16, h - 16, r)
    g.fill()
    g.strokeStyle = color
    g.lineWidth = 5
    g.stroke()
    g.fillStyle = '#fff'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `700 52px ${FONT}`
    g.fillText(text, w / 2, h / 2 + 2, w - 40)
  })
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  s.scale.set(1.0, 0.22, 1)
  s.renderOrder = 10
  return s
}

/** 이벤트 위치를 알려주는 떠 있는 느낌표 */
export function makeMarker() {
  const tex = canvasTexture(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2)
    grd.addColorStop(0, 'rgba(255,214,90,1)')
    grd.addColorStop(0.55, 'rgba(255,170,30,.9)')
    grd.addColorStop(1, 'rgba(255,170,30,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#3b2500'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `900 78px ${FONT}`
    g.fillText('!', w / 2, h / 2 + 4)
  })
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  s.scale.set(0.5, 0.5, 1)
  s.renderOrder = 11
  const light = new THREE.PointLight('#ffb347', 2.2, 5, 1.6)
  const g = new THREE.Group()
  g.add(s, light)
  g.userData = { sprite: s, light }
  return g
}

/** 사람의 숨쉬기 / 고개 돌리기 */
export function animatePerson(p, t, lookAt) {
  const u = p.userData
  if (!u?.head) return
  const k = t * 1.6 + u.phase
  u.head.position.y += Math.sin(k) * 0.0006
  u.arms[0].rotation.x = Math.sin(k) * 0.04
  u.arms[1].rotation.x = -Math.sin(k) * 0.04
  if (lookAt) {
    const dx = lookAt.x - p.position.x
    const dz = lookAt.z - p.position.z
    if (dx * dx + dz * dz < 64) {
      const want = Math.atan2(dx, dz)
      let d = want - p.rotation.y
      d = Math.atan2(Math.sin(d), Math.cos(d))
      p.rotation.y += d * 0.06
    }
  }
}
