import * as THREE from 'three'
import { Builder, TEX, mat, texMat, glow, makePerson, signTexture } from './kit'

/**
 * 다섯 개의 공간.
 * 단위는 미터. 플레이어 기본 시선은 -z 방향(yaw 0).
 * 각 함수는 { group, colliders, spots, spawn, env, animated, update? } 를 돌려준다.
 *   env : 'night' | 'day' | 'indoor' | 'dynamic' — engine.js 의 조명 프리셋
 */

/* ================================================================== *
 * 1교시 · 창원 자취방 (토요일 밤 → 월요일 새벽)
 * ================================================================== */
function buildRoom() {
  const b = new Builder()
  const W = 3, D = 4, H = 2.5
  const wall = texMat(TEX.wallpaper('#e9e2d5', [4, 1]))

  b.floor(0, 0, W * 2, D * 2, texMat(TEX.wood([3, 4])))
  const ceil = b.floor(0, 0, W * 2, D * 2, mat('#f2efe8'), H)
  ceil.rotation.x = Math.PI / 2

  b.wall(-W, -D, W, -D, H, wall)
  b.wall(-W, D, W, D, H, wall, { gap: { at: 4.8, width: 1.0 } })
  b.wall(-W, -D, -W, D, H, wall)
  b.wall(W, -D, W, D, H, wall)

  // 현관문 (닫혀 있다)
  b.box(1.8, 0, D, 0.95, 2.1, 0.08, mat('#6b5a4a'))
  b.box(2.15, 1.0, D - 0.07, 0.12, 0.04, 0.06, mat('#c9c9c9', { metalness: 0.8, roughness: 0.3 }), { solid: false })
  b.box(1.8, 0, D - 0.6, 1.2, 0.02, 1.1, mat('#7b6f62'), { solid: false }) // 현관 매트

  // 책상 + 모니터 (당첨번호가 떠 있다)
  b.box(1.6, 0, -3.55, 1.5, 0.74, 0.7, texMat(TEX.wood([1, 1])))
  b.box(1.6, 0.74, -3.75, 0.62, 0.4, 0.04, mat('#111'))
  b.plane(1.6, 0.94, -3.725, 0.58, 0.34, new THREE.MeshBasicMaterial({ map: signTexture('1등 당첨', { bg: '#0b3d2e', fg: '#7dffb2', sub: '20억 4,477만 원', h: 300, size: 110 }) }))
  b.box(1.35, 0.74, -3.35, 0.09, 0.005, 0.16, glow('#fff3c4', 0.35), { solid: false }) // 로또 용지
  b.box(1.1, 0, -2.95, 0.5, 0.45, 0.5, mat('#30343b')) // 의자
  b.light('monitor', new THREE.PointLight('#9fffd0', 1.6, 3.2, 1.5)).position.set(1.6, 1.0, -3.3)

  // 침대
  b.box(2.15, 0, 1.4, 1.6, 0.42, 2.1, mat('#d7d2c8'))
  b.box(2.15, 0.42, 0.6, 1.4, 0.12, 0.45, mat('#f5f3ee'), { solid: false })
  b.box(2.15, 0.42, 1.75, 1.5, 0.08, 1.3, mat('#8aa4c8'), { solid: false })

  // 옷장
  b.box(-2.68, 0, -0.5, 0.6, 2.1, 1.5, mat('#b59b7c'))
  b.box(-2.37, 0.9, -0.5, 0.02, 0.5, 0.03, mat('#555'), { solid: false })

  // 냉장고 (그 소리)
  b.box(-2.6, 0, 3.3, 0.6, 0.85, 0.6, mat('#f1f1f1', { roughness: 0.4 }))

  // 창문 — 밤의 창원
  b.plane(-1.5, 1.45, -D + 0.08, 1.6, 1.0, new THREE.MeshBasicMaterial({ map: nightCity() }))
  b.box(-1.5, 0.92, -D + 0.12, 1.75, 0.06, 0.12, mat('#ddd'), { solid: false })

  // 천장 등 (꺼져 있고 스탠드만)
  b.box(-2.4, 0, -3.5, 0.3, 1.3, 0.3, mat('#333'))
  b.light('lamp', new THREE.PointLight('#ffcf8a', 3.2, 7, 1.6)).position.set(-2.3, 1.5, -3.3)

  b.spot('desk', { pos: [1.6, 1.15, -3.0], label: '책상 위 로또 용지' })
  b.spot('window', { pos: [-1.5, 1.4, -3.45], label: '창밖을 본다' })
  b.spot('closet', { pos: [-2.1, 1.3, -0.5], label: '옷장' })
  b.spot('bed', { pos: [1.2, 0.9, 1.4], label: '침대' })
  b.spot('door', { pos: [1.8, 1.3, 3.4], label: '현관문', npc: [1.8, 3.0, Math.PI] })

  return { ...b, spawn: { pos: [0, 1.4], yaw: -0.35 }, env: 'night' }
}

function nightCity() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 160
  const g = c.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, 160)
  sky.addColorStop(0, '#0b1230')
  sky.addColorStop(1, '#2a2350')
  g.fillStyle = sky
  g.fillRect(0, 0, 256, 160)
  for (let i = 0; i < 12; i++) {
    const x = i * 22 + Math.random() * 6
    const h = 50 + Math.random() * 80
    g.fillStyle = '#10142a'
    g.fillRect(x, 160 - h, 20, h)
    for (let y = 160 - h + 6; y < 156; y += 9)
      for (let wx = x + 3; wx < x + 18; wx += 6)
        if (Math.random() < 0.35) {
          g.fillStyle = Math.random() < 0.7 ? '#ffd27a' : '#b8d8ff'
          g.fillRect(wx, y, 3, 4)
        }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ================================================================== *
 * 2교시 · KTX 302 열차 6호차
 * ================================================================== */
function buildTrain() {
  const b = new Builder()
  const W = 1.5, L = 12, H = 2.3
  const wallM = mat('#e9e6df')
  b.floor(0, 0, W * 2, L * 2, mat('#6d6a73'))
  b.floor(0, 0, 0.8, L * 2 - 0.2, mat('#8b3b45'), 0.005) // 통로 카펫
  const ceil = b.floor(0, 0, W * 2, L * 2, mat('#f4f4f2'), H)
  ceil.rotation.x = Math.PI / 2

  b.wall(-W, -L, -W, L, H, wallM)
  b.wall(W, -L, W, L, H, wallM)
  b.wall(-W, -L, W, -L, H, wallM, { gap: { at: 1.5, width: 0.9 } })
  b.wall(-W, L, W, L, H, wallM)

  // 화장실 문
  b.box(0, 0, -L - 0.02, 0.88, 2.05, 0.06, mat('#9aa3ad', { metalness: 0.4, roughness: 0.4 }))
  b.sign('화장실 · 비어 있음', 0, 2.17, -L + 0.08, 0.86, 0.17, 0, { bg: '#0f5132', fg: '#b7f7c8', size: 54 })
  b.box(0, 0, -L - 0.6, 2, 2.3, 0.1, wallM) // 문 너머 막기

  // 좌석
  const seatM = mat('#3c5a8a')
  const seatBackM = mat('#335080')
  for (let z = -9.6; z <= 9; z += 1.05) {
    for (const s of [-1, 1]) {
      const x = s * 0.93
      b.box(x, 0, z, 1.05, 0.46, 0.5, seatM)
      b.box(x, 0.46, z + 0.24, 1.05, 0.72, 0.12, seatBackM, { solid: false })
      b.box(x, 1.08, z + 0.24, 1.05, 0.12, 0.13, mat('#f1f1ee'), { solid: false })
    }
  }
  // 내 자리 6호차 3D — 오른쪽 창가, 열차 한가운데
  b.sign('3D', 1.2, 1.95, -0.25, 0.3, 0.14, -Math.PI / 2, { bg: '#fde68a', fg: '#7c2d12', size: 80 })

  // 선반
  for (const s of [-1, 1]) b.box(s * 1.25, 1.85, 0, 0.45, 0.05, L * 2 - 1.5, mat('#c8c8c8', { metalness: 0.5 }), { solid: false })

  // 창문 — 풍경이 흘러간다
  const scenery = TEX.scenery()
  scenery.wrapS = THREE.RepeatWrapping
  for (const s of [-1, 1]) {
    const m = b.plane(s * (W - 0.02), 1.35, 0, L * 2 - 1.2, 0.62, new THREE.MeshBasicMaterial({ map: scenery }), -s * Math.PI / 2)
    m.material.map.repeat.set(3, 1)
  }
  b.animated.push((t, dt) => (scenery.offset.x += dt * 0.35))

  // 형광등
  for (let z = -9; z <= 9; z += 4.5) b.box(0, H - 0.04, z, 0.25, 0.03, 2.5, glow('#ffffff', 1), { solid: false })
  const sun = b.light('sun', new THREE.PointLight('#fff8ea', 6, 30, 1))
  sun.position.set(0, 2.1, 0)

  // 승객들 (말을 걸 수는 없다)
  const passengers = [[-0.93, -6.4], [0.93, -3.25], [-0.93, 2.0], [0.93, 4.1], [-0.93, 7.3]]
  for (const [x, z] of passengers) {
    const p = makePerson('system', { seated: true, tag: false, shirt: ['#64748b', '#7c3aed', '#b45309', '#0f766e', '#be123c'][Math.floor(Math.random() * 5)] })
    p.position.set(x * 1.15 - Math.sign(x) * 0.28, 0.42, z + 0.05)
    p.rotation.y = Math.PI
    b.group.add(p)
  }

  b.spot('seat', { pos: [0.55, 1.0, -0.2], label: '6호차 3D, 내 자리' })
  b.spot('toilet', { pos: [0, 1.3, -L + 0.7], label: '화장실' })

  return { ...b, spawn: { pos: [0, L - 1.0], yaw: 0 }, env: 'train' }
}

/* ================================================================== *
 * 2교시 · NH농협은행 본점 1층 로비
 * ================================================================== */
function buildLobby() {
  const b = new Builder()
  const W = 10, D = 8, H = 5
  const wallM = mat('#d9d4ca')
  b.floor(0, 0, W * 2, D * 2, texMat(TEX.marble([5, 4]), { roughness: 0.35 }))
  const ceil = b.floor(0, 0, W * 2, D * 2, mat('#f6f5f2'), H)
  ceil.rotation.x = Math.PI / 2

  b.wall(-W, -D, W, -D, H, wallM)
  b.wall(-W, -D, -W, D, H, wallM)
  b.wall(W, -D, W, D, H, wallM)
  // 정문 — 유리
  b.wall(-W, D, W, D, H, mat('#9fb6c4', { transparent: true, opacity: 0.35, roughness: 0.1 }))
  b.plane(0, 2.7, D - 0.1, 20, 4.6, new THREE.MeshBasicMaterial({ color: '#dceefb', transparent: true, opacity: 0.25 }), Math.PI)

  // 큰 간판
  b.sign('NH농협은행', 0, 3.6, -D + 0.09, 6, 1.1, 0, { bg: '#00873e', fg: '#fff', sub: '본점 · 서대문' })

  // 기둥
  for (const x of [-6, 6]) for (const z of [-3, 4]) b.box(x, 0, z, 0.8, H, 0.8, mat('#e8e3d8'))

  // 보안 게이트
  for (let x = -5; x <= 5; x += 1.25) if (Math.abs(x) > 0.5) b.box(x, 0, 2, 0.25, 1.0, 1.0, mat('#585f68', { metalness: 0.6, roughness: 0.3 }))
  b.box(-1.0, 0.9, 2, 0.04, 0.06, 0.9, glow('#22c55e', 0.8), { solid: false })

  // 안내 창구
  b.box(5, 0, -4.2, 4, 1.05, 0.8, mat('#c4a77d'))
  b.sign('안내 · Information', 5, 1.4, -3.78, 1.6, 0.25, 0, { bg: '#fff', fg: '#00873e', size: 44 })

  // 엘리베이터
  for (const x of [-4.2, -2]) {
    b.box(x, 0, -D + 0.08, 1.4, 2.4, 0.06, mat('#b8bdc3', { metalness: 0.85, roughness: 0.2 }))
    b.box(x, 2.6, -D + 0.12, 0.5, 0.18, 0.02, glow('#ff8c42', 0.7), { solid: false })
  }

  // 화분 / 소파
  for (const [x, z] of [[-8.6, 6.4], [8.6, 6.4], [-8.6, -6.4]]) {
    b.box(x, 0, z, 0.6, 0.6, 0.6, mat('#5b4636'))
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), mat('#3f7d3a'))
    leaf.position.set(x, 1.15, z)
    b.group.add(leaf)
  }
  b.box(-7.5, 0, -1, 1, 0.45, 2.6, mat('#2f3b4c'))

  b.light('a', new THREE.PointLight('#fffaf0', 18, 26, 1.3)).position.set(0, 4.6, 0)
  b.light('b', new THREE.PointLight('#fffaf0', 10, 18, 1.3)).position.set(5, 4.6, -5)

  // 늘 그 자리에 있는 사람들
  b.spot('entrance', { pos: [0, 1.3, 4.6], label: '로비를 둘러본다' })
  b.spot('guard', { pos: [-1.0, 1.3, 3.0], fixed: 'guard', npc: [-1.6, 3.2, Math.PI] })
  b.spot('clerk', { pos: [4.5, 1.3, -3.2], fixed: 'clerk', npc: [4.6, -4.95, 0] })
  b.spot('elevator', { pos: [-3.1, 1.3, -6.9], label: '엘리베이터 (15층)' })

  // 배경 인물
  for (const [x, z, r, c] of [[7.2, 1.2, -1.2, '#475569'], [-7.5, -1.6, Math.PI / 2, '#9a3412'], [2.6, -5.6, 2.8, '#1e3a8a']]) {
    const p = makePerson('system', { tag: false, shirt: c, seated: x === -7.5 })
    p.position.set(x, x === -7.5 ? 0.45 : 0, z)
    p.rotation.y = r
    b.group.add(p)
  }

  return { ...b, spawn: { pos: [0, 6.9], yaw: 0 }, env: 'indoor' }
}

/* ================================================================== *
 * 3교시 · 15층 VIP실
 * ================================================================== */
function buildVip() {
  const b = new Builder()
  const W = 4, D = 4, H = 2.8
  const wallM = texMat(TEX.wallpaper('#e4ddd0', [4, 1]))
  b.floor(0, 0, W * 2, D * 2, mat('#5a4a3f', { roughness: 0.6 }))
  b.floor(0, -0.6, 4.5, 3.2, mat('#7a2e2e'), 0.005)
  const ceil = b.floor(0, 0, W * 2, D * 2, mat('#f6f3ee'), H)
  ceil.rotation.x = Math.PI / 2

  b.wall(-W, -D, W, -D, H, wallM)
  b.wall(-W, D, W, D, H, wallM, { gap: { at: 1.5, width: 1.0 } })
  b.wall(-W, -D, -W, D, H, wallM)
  b.wall(W, -D, W, D, H, wallM)
  b.box(-2.5, 0, D, 0.98, 2.15, 0.08, mat('#3d2b1f'))

  // 블라인드
  const blinds = document.createElement('canvas')
  blinds.width = 64
  blinds.height = 64
  const g = blinds.getContext('2d')
  for (let y = 0; y < 64; y += 8) {
    g.fillStyle = '#efe9da'
    g.fillRect(0, y, 64, 6)
    g.fillStyle = '#c9c0ac'
    g.fillRect(0, y + 6, 64, 2)
  }
  const bt = new THREE.CanvasTexture(blinds)
  bt.wrapS = bt.wrapT = THREE.RepeatWrapping
  bt.repeat.set(4, 6)
  b.plane(0, 1.5, -D + 0.08, 6.5, 2.0, new THREE.MeshBasicMaterial({ map: bt }))

  // 테이블
  b.box(0, 0, -0.8, 2.4, 0.74, 1.2, mat('#2e211a', { roughness: 0.4 }))
  b.box(0.2, 0.74, -0.6, 0.3, 0.005, 0.21, mat('#fff'), { solid: false }) // 서류
  b.box(-0.5, 0.74, -0.75, 0.08, 0.1, 0.08, mat('#fff'), { solid: false }) // 찻잔
  b.box(0, 0, -2.0, 0.6, 0.45, 0.55, mat('#1f1f1f')) // PB 의자
  b.box(0, 0, 0.4, 0.6, 0.45, 0.55, mat('#1f1f1f')) // 내 의자

  // 모니터 데스크
  b.box(3.0, 0, -2.6, 1.6, 0.74, 0.7, mat('#2e211a'))
  b.box(3.0, 0.74, -2.85, 0.8, 0.5, 0.04, mat('#111'))
  b.plane(3.0, 0.99, -2.825, 0.76, 0.46, new THREE.MeshBasicMaterial({ map: signTexture('1,370,000,000', { bg: '#0b1a33', fg: '#a7f3d0', sub: '입금 대기', h: 310, size: 76 }) }))

  b.light('a', new THREE.PointLight('#fff1d6', 6, 12, 1.4)).position.set(0, 2.6, -0.5)
  b.light('b', new THREE.PointLight('#fff1d6', 3, 8, 1.4)).position.set(-2.5, 2.6, 2.5)

  b.spot('pb', { pos: [0, 1.25, -0.3], fixed: 'pb', seated: true, npc: [0, -1.95, 0] })
  b.spot('monitor', { pos: [2.6, 1.2, -2.0], label: '입금 화면' })
  b.spot('exit', { pos: [-2.5, 1.3, 3.4], label: '나간다' })

  return { ...b, spawn: { pos: [-2.5, 2.8], yaw: 0.6 }, env: 'indoor' }
}

const WHITE = new THREE.Color('#ffffff')

/* ================================================================== *
 * 4교시 · 창원, 우리 동네
 * ================================================================== */
function buildTown() {
  const b = new Builder()
  const X = 42, Z = 19

  b.floor(0, 0, X * 2, 8, texMat(TEX.asphalt([24, 3])))
  b.floor(0, -5.5, X * 2, 3, texMat(TEX.sidewalk([42, 2])), 0.01)
  b.floor(0, 5.5, X * 2, 3, texMat(TEX.sidewalk([42, 2])), 0.01)
  const grass = b.floor(0, 0, X * 2 + 30, Z * 2 + 30, texMat(TEX.grass([24, 14])), -0.02)
  // 차선 & 횡단보도
  for (let x = -X; x < X; x += 4) b.box(x, 0.005, 0, 2, 0.01, 0.15, mat('#f5d061'), { solid: false, shadow: false })
  for (let z = -3.4; z <= 3.4; z += 0.8) b.box(2, 0.006, z, 3, 0.01, 0.45, mat('#eee'), { solid: false, shadow: false })

  // 바깥 경계 (보이지 않는 벽)
  b.colliders.push(
    { minX: -X - 1, maxX: -X, minZ: -Z, maxZ: Z },
    { minX: X, maxX: X + 1, minZ: -Z, maxZ: Z },
    { minX: -X, maxX: X, minZ: -Z - 1, maxZ: -Z },
    { minX: -X, maxX: X, minZ: Z, maxZ: Z + 1 },
  )

  /** 북쪽(-z) / 남쪽(+z) 건물: 정면이 도로를 본다 */
  const building = (x0, x1, side, h, color, name, sub, signColor) => {
    const front = side < 0 ? -7 : 7
    const back = side < 0 ? -17 : 17
    const cx = (x0 + x1) / 2
    const cz = (front + back) / 2
    b.box(cx, 0, cz, x1 - x0, h, Math.abs(back - front), mat(color))
    // 유리 쇼윈도
    const facing = side < 0 ? 0 : Math.PI
    const fz = front + (side < 0 ? 0.02 : -0.02)
    b.plane(cx, 1.4, fz, (x1 - x0) * 0.8, 2.2, mat('#9cc3d5', { roughness: 0.15, metalness: 0.4, emissive: '#3a5868', emissiveIntensity: 0.25 }), facing)
    b.box(cx, 0, front + (side < 0 ? 0.03 : -0.03), 1.4, 2.3, 0.04, mat('#2b3138', { metalness: 0.5 }), { solid: false })
    b.sign(name, cx, Math.min(h - 0.6, 3.6), front + (side < 0 ? 0.05 : -0.05), Math.min((x1 - x0) * 0.8, 7), 0.9, facing, { bg: signColor, fg: '#fff', sub, size: 58 })
    // 창문 줄
    for (let y = 4.6; y < h - 0.6; y += 2.4)
      b.plane(cx, y, fz, (x1 - x0) * 0.85, 1.0, mat('#7da6bc', { roughness: 0.2, metalness: 0.5 }), facing)
  }

  building(-26, -12, -1, 14, '#c9c3b8', '(주)경남정밀', '본사 · 3층 영업2팀', '#334155')
  building(-10, -2, -1, 8, '#e8e4dc', 'NH농협은행', '성산지점', '#00873e')
  building(0, 8, -1, 6, '#e9d8c3', '카페 오늘', 'COFFEE · DESSERT', '#7c4a2d')
  building(10, 26, -1, 9, '#d6d9de', '더시티몰', '명품관 · 와인샵 · GS25 · 헤어', '#9d174d')
  building(28, 40, -1, 7, '#1f2226', 'PORSCHE', '창원 전시장', '#111')
  building(-12, -5, 1, 6, '#e6dcc8', '행운공인중개사', '아파트 · 상가 · 토지', '#b45309')

  // 전시장 차
  car(b, 34, -9.5, '#e5e7eb', 0)

  /* --- 우리 집: 3층 빌라 1층, 안으로 들어갈 수 있다 --- */
  const hx0 = -39, hx1 = -27, hz0 = 7.5, hz1 = 16.5
  const hw = texMat(TEX.wallpaper('#ece5d8', [4, 1]))
  b.floor((hx0 + hx1) / 2, (hz0 + hz1) / 2, hx1 - hx0, hz1 - hz0, texMat(TEX.wood([4, 3])), 0.02)
  b.wall(hx0, hz0, hx1, hz0, 3, mat('#b9a58f'), { gap: { at: 6, width: 1.7 } })
  b.wall(hx0, hz1, hx1, hz1, 3, hw)
  b.wall(hx0, hz0, hx0, hz1, 3, hw)
  b.wall(hx1, hz0, hx1, hz1, 3, hw)
  const roof = b.floor((hx0 + hx1) / 2, (hz0 + hz1) / 2, hx1 - hx0 + 0.4, hz1 - hz0 + 0.4, mat('#8a7c6c'), 3)
  roof.rotation.x = Math.PI / 2
  b.box((hx0 + hx1) / 2, 3, (hz0 + hz1) / 2, hx1 - hx0 + 0.4, 5, hz1 - hz0 + 0.4, mat('#b9a58f'), { solid: false }) // 위층
  b.sign('행복빌라 101호', -33, 2.55, hz0 - 0.1, 2.2, 0.36, Math.PI, { bg: '#f5f5f4', fg: '#44403c', size: 56 })
  // 집 안
  b.box(-28.6, 0, 15.6, 1.6, 0.74, 0.7, texMat(TEX.wood([1, 1])))
  b.box(-28.6, 0.74, 15.8, 0.6, 0.38, 0.04, mat('#111'))
  b.plane(-28.6, 0.93, 15.775, 0.56, 0.32, new THREE.MeshBasicMaterial({ map: signTexture('장바구니 (3)', { bg: '#1e293b', fg: '#fde68a', h: 292, size: 80 }) }), Math.PI)
  b.box(-35.6, 0, 13.6, 1.7, 0.45, 2.2, mat('#d7d2c8'))
  b.box(-35.6, 0.45, 14.4, 1.5, 0.08, 1.2, mat('#8aa4c8'), { solid: false })
  b.box(-38.85, 0.4, 10.5, 0.04, 1.4, 0.7, mat('#cfe3ee', { metalness: 0.9, roughness: 0.05 }), { solid: false }) // 거울
  b.box(-32, 0, 16.0, 2.2, 0.8, 0.6, mat('#a58a6a')) // 수납장
  b.light('home', new THREE.PointLight('#ffd7a0', 5, 10, 1.4)).position.set(-33, 2.7, 12)
  // 우편함
  b.box(-35.5, 0, 6.4, 0.7, 1.2, 0.35, mat('#9aa1a8', { metalness: 0.6, roughness: 0.4 }))

  /* --- 주차장 --- */
  b.floor(-19, 12, 10, 9, texMat(TEX.asphalt([4, 4])), 0.01)
  for (let x = -23; x <= -15; x += 2.6) b.box(x, 0.012, 12, 0.1, 0.01, 4.5, mat('#eee'), { solid: false, shadow: false })
  car(b, -20.3, 12.2, '#64748b', Math.PI)
  car(b, -15.1, 12.4, '#7f1d1d', Math.PI)

  /* --- 광장 + 버스정류장 --- */
  b.floor(1, 11, 11, 7, texMat(TEX.tile('#d9cfbf', '#bfb3a0', [6, 4])), 0.01)
  b.box(1, 0, 7.6, 3.2, 0.05, 1.2, mat('#3b4048'), { solid: false })
  b.box(-0.5, 0, 8.0, 0.08, 2.4, 0.08, mat('#3b4048'))
  b.box(2.5, 0, 8.0, 0.08, 2.4, 0.08, mat('#3b4048'))
  b.box(1, 2.4, 7.8, 3.4, 0.08, 1.4, mat('#3b4048'), { solid: false })
  b.box(1, 0, 8.2, 2.6, 0.45, 0.45, mat('#9a6b3f'))
  b.sign('🚌 성산구청 · 상남동', 1, 2.15, 7.15, 2.8, 0.36, Math.PI, { bg: '#1d4ed8', fg: '#fff', size: 50 })
  // 모금함, 분수
  b.box(5, 0, 12, 0.5, 1.0, 0.5, mat('#dc2626'))
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.5, 24), mat('#a8a29e'))
  fountain.position.set(0, 0.25, 13)
  b.group.add(fountain)
  b.colliders.push({ minX: -1.6, maxX: 1.6, minZ: 11.4, maxZ: 14.6 })
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.45, 24), mat('#60a5fa', { roughness: 0.1, metalness: 0.3 }))
  water.rotation.x = -Math.PI / 2
  water.position.set(0, 0.51, 13)
  b.group.add(water)

  /* --- 공원 (계절이 바뀐다) --- */
  b.floor(24, 12, 30, 9, texMat(TEX.grass([8, 3])), 0.01)
  const trees = []
  for (const [x, z] of [[11, 9], [14, 15], [18, 9.5], [22, 15.5], [27, 9], [30, 14.5], [35, 10], [38, 15]]) {
    const trunk = b.box(x, 0, z, 0.3, 2.2, 0.3, mat('#5b4334'))
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), mat('#4d7c3a', { flatShading: true }))
    leaves.position.set(x, 2.9, z)
    leaves.castShadow = true
    b.group.add(leaves)
    trees.push(leaves)
  }
  b.box(20, 0, 12.3, 2.0, 0.45, 0.55, mat('#8b5a2b'))
  b.box(20, 0.45, 12.55, 2.0, 0.5, 0.08, mat('#8b5a2b'), { solid: false })

  /* --- 가로등 & 오가는 차 --- */
  const lamps = []
  for (let x = -36; x <= 38; x += 12) {
    for (const z of [-4.3, 4.3]) {
      b.box(x, 0, z, 0.12, 4.2, 0.12, mat('#2f343b'))
      const bulb = b.box(x, 4.2, z + (z < 0 ? 0.4 : -0.4), 0.3, 0.12, 0.8, glow('#fff1c1', 0), { solid: false })
      lamps.push(bulb)
    }
  }
  const movers = [car(b, -30, -2, '#2563eb', Math.PI / 2, false), car(b, 20, 2, '#f8fafc', -Math.PI / 2, false)]
  b.animated.push((t, dt) => {
    movers[0].position.x += dt * 9
    if (movers[0].position.x > X + 6) movers[0].position.x = -X - 6
    movers[1].position.x -= dt * 7
    if (movers[1].position.x < -X - 6) movers[1].position.x = X + 6
  })

  // 지나가는 동네 사람들
  for (const [x, z, r, c] of [[-14, -5.2, 0.4, '#475569'], [16, 5.6, 2.2, '#9a3412'], [25, -5.4, -1, '#0e7490'], [6.2, 11.5, 1.8, '#6d28d9']]) {
    const p = makePerson('system', { tag: false, shirt: c })
    p.position.set(x, 0, z)
    p.rotation.y = r
    b.group.add(p)
  }

  /* --- 이벤트 지점 --- */
  // npc: [x, z, 바라보는 방향]  — 사람이 오는 이벤트면 여기 선다
  b.spot('desk', { pos: [-28.6, 1.15, 14.9], label: '노트북' })
  b.spot('bed', { pos: [-35.6, 0.9, 12.0], label: '침대' })
  b.spot('homeDoor', { pos: [-33, 1.3, 5.9], npc: [-33, 6.0, Math.PI], label: '현관 앞' })
  b.spot('mailbox', { pos: [-35.5, 1.4, 5.8], label: '우편함' })
  b.spot('parking', { pos: [-19.5, 1.2, 9.4], npc: [-18.5, 9.2, Math.PI], label: '빌라 주차장' })
  b.spot('office', { pos: [-19, 1.3, -6.0], npc: [-19, -6.2, 0], label: '회사 앞' })
  b.spot('bank', { pos: [-6, 1.3, -6.0], npc: [-6, -6.2, 0], label: '은행' })
  b.spot('cafe', { pos: [4, 1.3, -5.6], npc: [4.8, -6.1, 0], label: '카페 테라스' })
  b.spot('mall', { pos: [18, 1.3, -6.0], npc: [18, -6.2, 0], label: '더시티몰 입구' })
  b.spot('showroom', { pos: [34, 1.3, -6.0], npc: [32.6, -6.2, 0], label: '전시장' })
  b.spot('realty', { pos: [-8.5, 1.3, 6.0], npc: [-8.5, 6.2, Math.PI], label: '공인중개사 앞' })
  b.spot('plaza', { pos: [3, 1.3, 9.0], npc: [3.8, 9.5, Math.PI], label: '광장' })
  b.spot('park', { pos: [20, 1.1, 11.4], npc: [21.3, 11.3, Math.PI], label: '공원 벤치' })

  // 카페 테라스 테이블
  for (const x of [2.5, 5.5]) {
    b.box(x, 0, -4.8, 0.7, 0.72, 0.7, mat('#e7e5e4'))
  }

  /** 계절 · 시간 반영 */
  const SEASONS = [
    { until: 70, leaf: '#f4a6c0', grass: '#7aa05a', name: '봄' },
    { until: 160, leaf: '#3f7d34', grass: '#5f8a4a', name: '여름' },
    { until: 250, leaf: '#d97a2b', grass: '#8b8a4a', name: '가을' },
    { until: 340, leaf: '#e8eef2', grass: '#a3a89a', name: '겨울' },
    { until: 999, leaf: '#f4a6c0', grass: '#7aa05a', name: '봄' },
  ]
  const update = ({ day, night }) => {
    const s = SEASONS.find((x) => day < x.until)
    for (const l of trees) l.material.color.set(s.leaf)
    grass.material.color.set(s.grass).lerp(WHITE, 0.55)
    for (const l of lamps) l.material.emissiveIntensity = night ? 2.2 : 0
  }

  return { ...b, spawn: { pos: [-33, 4.2], yaw: Math.PI * 0.55 }, env: 'dynamic', update }
}

function car(b, x, z, color, rotY, solid = true) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.2), mat(color, { roughness: 0.35, metalness: 0.4 }))
  body.position.y = 0.6
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 2.1), mat('#1e293b', { roughness: 0.1, metalness: 0.6 }))
  cabin.position.set(0, 1.12, -0.2)
  g.add(body, cabin)
  for (const [wx, wz] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14), mat('#111'))
    w.rotation.z = Math.PI / 2
    w.position.set(wx, 0.33, wz)
    g.add(w)
  }
  g.traverse((m) => m.isMesh && (m.castShadow = true))
  g.position.set(x, 0, z)
  g.rotation.y = rotY
  b.group.add(g)
  if (solid) {
    const swap = Math.abs(Math.sin(rotY)) > 0.5
    const hw = swap ? 2.1 : 0.9
    const hd = swap ? 0.9 : 2.1
    b.colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd })
  }
  return g
}

export const SCENE_BUILDERS = {
  room: buildRoom,
  train: buildTrain,
  lobby: buildLobby,
  vip: buildVip,
  town: buildTown,
}
