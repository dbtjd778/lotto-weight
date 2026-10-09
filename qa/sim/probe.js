/**
 * 테스트 중에만 브라우저에 주입되는 읽기 전용 탐침.
 * 사람이 화면을 보고 아는 정보(어디 있는지, 화살표가 어디를 가리키는지, 안내 문구)에 해당하는 것만 꺼낸다.
 * 게임 상태를 바꾸지 않는다. 예외: assistTeleport — 봇이 사람처럼 해결하지 못했을 때만 쓰고 "구조"로 기록된다.
 */
;(() => {
  const W = () => window.__world

  // 프레임 수 측정
  let frames = 0
  const tick = () => {
    frames++
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  function hits(x, z) {
    return W()._hits(x, z)
  }

  /** 격자 A* — 게임의 충돌 판정을 그대로 써서 길을 찾는다 */
  function path(tx, tz, reach = 0.6) {
    const w = W()
    const sx = w.player.x
    const sz = w.player.z
    const C = 0.25
    const key = (i, j) => i * 100003 + j
    const ci = (v) => Math.round(v / C)
    const start = [ci(sx), ci(sz)]
    const open = new Map()
    const came = new Map()
    const g = new Map([[key(...start), 0]])
    const h = (i, j) => Math.hypot(i * C - tx, j * C - tz)
    open.set(key(...start), { i: start[0], j: start[1], f: h(...start) })
    let found = null
    let iter = 0
    const blocked = new Map()
    const isBlocked = (i, j) => {
      const k = key(i, j)
      if (!blocked.has(k)) blocked.set(k, hits(i * C, j * C))
      return blocked.get(k)
    }
    while (open.size && iter++ < 60000) {
      let best = null
      for (const n of open.values()) if (!best || n.f < best.f) best = n
      open.delete(key(best.i, best.j))
      if (h(best.i, best.j) <= reach) {
        found = best
        break
      }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = best.i + di
        const nj = best.j + dj
        if (isBlocked(ni, nj)) continue
        if (di && dj && (isBlocked(best.i + di, best.j) || isBlocked(best.i, best.j + dj))) continue
        const ng = g.get(key(best.i, best.j)) + Math.hypot(di, dj) * C
        const k = key(ni, nj)
        if (ng < (g.get(k) ?? Infinity)) {
          g.set(k, ng)
          came.set(k, key(best.i, best.j))
          open.set(k, { i: ni, j: nj, f: ng + h(ni, nj) })
        }
      }
    }
    if (!found) return null
    const pts = []
    let k = key(found.i, found.j)
    while (k !== undefined) {
      const i = Math.round(k / 100003)
      const j = k - i * 100003
      pts.unshift([i * C, j * C])
      k = came.get(k)
    }
    // 줄 당기기: 직선으로 갈 수 있는 중간 점은 건너뛴다
    const clear = (a, b) => {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1])
      for (let t = 0; t <= d; t += 0.15) {
        const x = a[0] + ((b[0] - a[0]) * t) / d
        const z = a[1] + ((b[1] - a[1]) * t) / d
        if (hits(x, z)) return false
      }
      return true
    }
    const out = [pts[0]]
    let a = 0
    while (a < pts.length - 1) {
      let b = pts.length - 1
      while (b > a + 1 && !clear(pts[a], pts[b])) b--
      out.push(pts[b])
      a = b
    }
    return out.slice(1)
  }

  window.__probe = {
    ready: () => !!W()?.current,
    state() {
      const w = W()
      if (!w?.current) return null
      const t = w.target
      let target = null
      if (t) {
        const goal = t.phone ? null : t.npc ? t.npc.position : t.spot.pos
        target = {
          phone: !!t.phone,
          spot: t.spotName ?? (t.phone ? 'phone' : null),
          eventId: t.event?.id,
          speaker: t.event?.speaker,
          title: t.event?.title,
          x: goal?.x,
          z: goal?.z,
          radius: t.phone ? 0 : (t.spot.radius ?? 1.9) + (t.npc ? 0.4 : 0),
        }
      }
      const hud = document.querySelector('[data-qa="hud"]')?.innerText ?? ''
      return {
        scene: w.sceneName,
        x: w.player.x,
        z: w.player.z,
        yaw: w.player.yaw,
        paused: w.paused,
        prompt: w.prompt,
        ringing: !!w.ringing,
        target,
        day: Number(/D\+(\d+)/.exec(hud)?.[1] ?? NaN),
        hud,
        dialog: !!document.querySelector('[data-qa="dialog"]'),
        fade: !!document.querySelector('[data-qa="fade"]'),
        help: !!document.querySelector('[data-qa="help"]'),
        ending: !!document.querySelector('[data-qa="ending"]'),
      }
    },
    path,
    fps() {
      const f = frames
      frames = 0
      return f
    },
    /** 보고서용 지도 */
    map() {
      const w = W()
      const c = w.current
      return {
        scene: w.sceneName,
        colliders: c.colliders.map((b) => [b.minX, b.minZ, b.maxX, b.maxZ]),
        spots: Object.fromEntries(Object.entries(c.spots).map(([k, s]) => [k, [s.pos.x, s.pos.z]])),
      }
    },
    assistTeleport(x, z) {
      const w = W()
      w.player.x = x
      w.player.z = z
    },
  }
})()
