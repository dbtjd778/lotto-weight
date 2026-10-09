/**
 * 사람처럼 플레이하는 자동 테스트 봇.
 * 자세한 설명은 qa/sim/README.md
 */
import { chromium } from 'playwright'
import { createServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeReport } from './report.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')

/* ------------------------------------------------------------------ *
 * 옵션
 * ------------------------------------------------------------------ */
const argv = process.argv.slice(2)
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`)
  if (i < 0) return def
  const v = argv[i + 1]
  return v === undefined || v.startsWith('--') ? true : v
}
const OPTS = {
  personas: String(opt('persona', 'casual')).split(','),
  headed: !!opt('headed', false),
  sound: !!opt('sound', false),
  seed: Number(opt('seed', 0)) || null,
  untilDay: Number(opt('until-day', 0)) || Infinity,
  readSpeed: Number(opt('read-speed', 1)),
  url: opt('url', null),
  assist: !opt('no-assist', false),
  maxMinutes: Number(opt('max-minutes', 60)),
  mobileCheck: !opt('no-mobile-check', false),
}

/* ------------------------------------------------------------------ *
 * 플레이어 성향
 *   선택은 사람이 화면에서 보는 것만으로 한다: 선택지 문장 + 금액 표시(−1.2억 같은 태그)
 * ------------------------------------------------------------------ */
const PERSONAS = {
  casual: {
    label: '보통 플레이어',
    cps: 14, // 초당 읽는 글자 수
    run: (dist) => dist > 10,
    wander: 0.08,
    choose(opts, rng) {
      if (rng() < 0.3) return Math.floor(rng() * opts.length)
      // 1억 넘는 지출은 웬만하면 피하고, 나머지는 끌리는 대로
      const ok = opts.map((o, i) => i).filter((i) => opts[i].cost > -100_000_000)
      const pool = ok.length ? ok : opts.map((o, i) => i)
      return pool[Math.floor(rng() * pool.length)]
    },
  },
  explorer: {
    label: '꼼꼼한 탐험가',
    cps: 9,
    run: () => false,
    wander: 0.35,
    choose(opts, rng) {
      // 돈을 아끼고, 비밀을 말하는 선택은 피한다
      const score = (o) => o.cost / 1e6 - (/말한다|털어놓|자랑|사실대로|올린다/.test(o.text) ? 500 : 0) + rng() * 3
      return opts.reduce((b, o, i) => (score(o) > score(opts[b]) ? i : b), 0)
    },
  },
  rusher: {
    label: '급한 플레이어',
    cps: 60,
    run: () => true,
    wander: 0,
    choose(opts, rng) {
      // 금액 태그가 붙은 화끈한 선택을 좋아한다
      if (rng() < 0.5) return opts.reduce((b, o, i) => (o.cost < opts[b].cost ? i : b), 0)
      return Math.floor(rng() * opts.length)
    },
  },
}

const mkRng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))

/* ------------------------------------------------------------------ *
 * 서버
 * ------------------------------------------------------------------ */
async function startServer() {
  if (OPTS.url) return { url: OPTS.url, close: async () => {} }
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199, strictPort: false } })
  await server.listen()
  const url = server.resolvedUrls.local[0]
  return { url, close: () => server.close() }
}

/* ------------------------------------------------------------------ *
 * 한 판
 * ------------------------------------------------------------------ */
async function playOnce(browser, url, personaName) {
  const P = PERSONAS[personaName]
  if (!P) throw new Error(`알 수 없는 성향: ${personaName}`)
  const seed = OPTS.seed ?? Math.floor(Math.random() * 1e9)
  const rng = mkRng(seed)
  const startedAt = Date.now()
  const deadline = startedAt + OPTS.maxMinutes * 60_000

  const log = []
  const issues = []
  const walks = []
  const trails = {} // scene → [[x,z], ...]
  const maps = {}
  const fpsSamples = []
  const choices = []
  const shots = []
  const outDir = path.join(HERE, 'reports', `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}-${personaName}`)
  fs.mkdirSync(outDir, { recursive: true })

  const note = (level, kind, msg, extra = {}) => {
    const item = { level, kind, msg, t: (Date.now() - startedAt) / 1000, ...extra }
    issues.push(item)
    console.log(`  [${level}] ${kind}: ${msg}`)
    return item
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  if (OPTS.seed) {
    await context.addInitScript((s) => {
      let x = s >>> 0
      Math.random = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32)
    }, seed)
  }
  await context.addInitScript({ path: path.join(HERE, 'probe.js') })
  if (!OPTS.sound) await context.addInitScript(() => localStorage.setItem('lw.muted', '1'))
  const page = await context.newPage()

  page.on('pageerror', (e) => note('문제', '페이지 오류', e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') note('문제', '콘솔 오류', m.text())
    if (m.type() === 'warning' && /\[world\]|\[events\]/.test(m.text())) note('주의', '게임 경고', m.text())
  })

  const state = () => page.evaluate(() => window.__probe?.state())
  const shot = async (name) => {
    const file = `${String(shots.length).padStart(3, '0')}-${name}.png`
    await page.screenshot({ path: path.join(outDir, file) })
    shots.push(file)
    return file
  }

  const kb = page.keyboard
  const held = new Set()
  const hold = async (k, on) => {
    if (on && !held.has(k)) {
      held.add(k)
      await kb.down(k)
    } else if (!on && held.has(k)) {
      held.delete(k)
      await kb.up(k)
    }
  }
  const releaseAll = async () => {
    for (const k of [...held]) await hold(k, false)
  }

  /* --- 타이틀 → 시작 --- */
  console.log(`\n▶ ${P.label} (${personaName}) · seed ${seed}`)
  await page.goto(url)
  await page.getByRole('button', { name: /QR을 찍는다/ }).click()
  await page.waitForFunction(() => window.__probe?.ready(), null, { timeout: 20000 })
  await shot('start')

  let lastEventId = null
  let eventIndex = 0
  let ending = null
  let fpsTimer = Date.now()

  while (Date.now() < deadline) {
    // 엔딩 화면이면 3D 화면은 내려가 있다
    const end = await page.$('[data-qa="ending"]')
    if (end) {
      ending = await end.getAttribute('data-ending')
      break
    }
    const s = await state()
    if (!s) {
      await sleep(200)
      continue
    }
    if (Date.now() - fpsTimer > 3000) {
      const f = await page.evaluate(() => window.__probe.fps())
      fpsSamples.push({ scene: s.scene, fps: f / ((Date.now() - fpsTimer) / 1000) })
      fpsTimer = Date.now()
    }
    if (s.day >= OPTS.untilDay) {
      log.push({ t: (Date.now() - startedAt) / 1000, msg: `D+${s.day} 도달 — 여기서 중단 (--until-day)` })
      break
    }
    if (s.help) {
      await page.locator('[data-qa="help"]').click()
      await sleep(150)
      continue
    }
    if (s.fade || (s.paused && !s.dialog)) {
      await sleep(150)
      continue
    }
    if (s.dialog) {
      try {
        await handleDialog()
      } catch (e) {
        note('문제', '봇 예외', e.message.split('\n')[0], { shot: await shot('bot-error').catch(() => null) })
        await sleep(500)
      }
      continue
    }
    if (!s.target) {
      await sleep(150)
      continue
    }

    // 새 이벤트
    if (s.target.eventId !== lastEventId) {
      lastEventId = s.target.eventId
      eventIndex++
      maps[s.scene] ??= await page.evaluate(() => window.__probe.map())
      log.push({ t: (Date.now() - startedAt) / 1000, msg: `D+${s.day} [${s.scene}/${s.target.spot}] ${s.target.title} (${s.target.eventId})` })
    }

    if (s.target.phone) {
      await answerPhone(s)
    } else {
      await goAndInteract(s)
    }
  }
  await releaseAll()

  if (!ending && Date.now() >= deadline) note('주의', '시간 초과', `${OPTS.maxMinutes}분 안에 끝나지 않았다`)
  if (ending) {
    await sleep(800)
    await shot('ending')
    const epi = await page.locator('[data-qa="ending"]').innerText()
    log.push({ t: (Date.now() - startedAt) / 1000, msg: `엔딩: ${ending}` })
    if (/undefined|NaN|\[object/.test(epi)) note('문제', '엔딩 문구 오류', '엔딩 화면에 undefined/NaN 이 보인다')
  }

  /* ---------------------------------------------------------------- */

  async function answerPhone(s) {
    const t0 = Date.now()
    while (Date.now() - t0 < 6000) {
      const cur = await state()
      if (!cur || cur.dialog || cur.target?.eventId !== s.target.eventId) return
      if (cur.ringing) {
        await sleep(400 + rng() * 900) // 주머니에서 꺼내는 시간
        await kb.press('e')
        walks.push({ spot: 'phone', scene: s.scene, secs: (Date.now() - t0) / 1000, eventId: s.target.eventId })
        await sleep(300)
        return
      }
      await sleep(150)
    }
    note('문제', '전화가 안 울림', `${s.target.eventId}: 6초가 지나도 벨이 울리지 않았다`, { scene: s.scene })
    await kb.press('e')
  }

  async function goAndInteract(s) {
    const t0 = Date.now()
    const { eventId } = s.target
    let fails = 0

    // 탐험가는 가끔 엉뚱한 데를 먼저 둘러본다
    if (rng() < P.wander) await wanderAround(s)

    while (fails < 4) {
      const cur = await state()
      if (!cur || cur.dialog || cur.target?.eventId !== eventId) return
      if (cur.prompt) break
      const pts = await page.evaluate(([x, z, r]) => window.__probe.path(x, z, r), [cur.target.x, cur.target.z, Math.max(0.5, cur.target.radius - 0.6)])
      if (!pts) {
        note('문제', '도달 불가', `${eventId} (${cur.scene}/${cur.target.spot}): 길이 없다`, { scene: cur.scene, at: [cur.target.x, cur.target.z] })
        fails = 99
        break
      }
      const ok = await follow(pts, eventId)
      if (ok) break
      fails++
      note('참고', '끼임', `${eventId}로 가다 막혀서 다시 길을 찾는다 (${fails}회)`, { scene: cur.scene, at: [cur.x, cur.z] })
      // 뒤로 물러났다가 옆으로 비킨다
      await hold('KeyS', true)
      await sleep(350)
      await hold('KeyS', false)
      const side = rng() < 0.5 ? 'KeyA' : 'KeyD'
      await hold(side, true)
      await sleep(400)
      await hold(side, false)
    }
    await releaseAll()

    let cur = await state()
    if (cur && !cur.prompt && !cur.dialog && cur.target?.eventId === eventId) {
      // 도착은 했는데 안내 문구가 안 뜨는 경우: 조금 기다려 본다
      await sleep(600)
      cur = await state()
    }
    if (cur && !cur.prompt && !cur.dialog && cur.target?.eventId === eventId) {
      if (!OPTS.assist) throw new Error(`막힘: ${eventId}`)
      const item = note('문제', '구조', `${eventId} (${cur.scene}/${cur.target.spot}): 사람처럼 도달하지 못해 순간이동했다`, {
        scene: cur.scene,
        at: [cur.x, cur.z],
        shot: await shot(`stuck-${eventId}`),
      })
      await page.evaluate(([x, z]) => window.__probe.assistTeleport(x + 0.01, z + 0.01), [cur.target.x, cur.target.z])
      await sleep(400)
      item.assisted = true
    }
    const secs = (Date.now() - t0) / 1000
    walks.push({ spot: s.target.spot, scene: s.scene, secs, eventId })
    if (secs > 30) note('주의', '먼 길', `${eventId} (${s.scene}/${s.target.spot})까지 ${secs.toFixed(0)}초 걸었다`, { scene: s.scene })
    await sleep(150 + rng() * 300)
    await kb.press('e')
    await sleep(250)
  }

  /** 경로 따라 걷기: 방향키로 몸을 돌리고 W로 걷는다 */
  async function follow(pts, eventId) {
    for (let w = 0; w < pts.length; w++) {
      const [gx, gz] = pts[w]
      const last = w === pts.length - 1
      let best = Infinity
      let bestAt = Date.now()
      while (true) {
        const s = await state()
        if (!s || s.dialog || s.paused || s.target?.eventId !== eventId) return true
        ;(trails[s.scene] ??= []).push([+s.x.toFixed(2), +s.z.toFixed(2)])
        if (s.prompt && (last || rng() < 0.5)) return true
        const dx = gx - s.x
        const dz = gz - s.z
        const d = Math.hypot(dx, dz)
        if (d < (last ? 0.35 : 0.5)) break
        const turning = Math.abs(wrap(Math.atan2(-dx, -dz) - s.yaw)) > 1.0
        if (d < best - 0.15 || turning) {
          best = Math.min(best, d)
          bestAt = Date.now()
        } else if (Date.now() - bestAt > 2500) {
          await releaseAll()
          return false
        }
        const want = Math.atan2(-dx, -dz)
        const err = wrap(want - s.yaw)
        await hold('ArrowLeft', err > 0.12)
        await hold('ArrowRight', err < -0.12)
        await hold('KeyW', Math.abs(err) < 1.0)
        await hold('ShiftLeft', P.run(d) && Math.abs(err) < 0.3)
        await sleep(45)
      }
    }
    await releaseAll()
    return true
  }

  /** 아무 데나 가 보고, 고개를 돌려 둘러본다 */
  async function wanderAround(s) {
    const angle = rng() * Math.PI * 2
    const dist = 3 + rng() * 6
    const pts = await page.evaluate(([x, z]) => window.__probe.path(x, z, 1.2), [s.x + Math.cos(angle) * dist, s.z + Math.sin(angle) * dist])
    if (pts) await follow(pts, s.target.eventId)
    await hold('ArrowLeft', true)
    await sleep(500 + rng() * 900)
    await hold('ArrowLeft', false)
  }

  /** 대화창: 읽고, 고르고, 결과를 읽고, 계속 */
  async function handleDialog() {
    await releaseAll()
    const dialog = page.locator('[data-qa="dialog"]')
    const cur = await state()
    const opts = await dialog.locator('article button').evaluateAll((bs) =>
      bs.map((b) => {
        const tag = b.querySelector('.font-mono.tabular-nums')?.innerText ?? ''
        const text = b.querySelector('.text-\\[15px\\]')?.innerText ?? b.innerText
        return { text, tag }
      }),
    )
    const body = await dialog.innerText()
    if (/undefined|NaN|\[object/.test(body)) note('문제', '문구 오류', `${cur?.target?.eventId}: 화면에 undefined/NaN 이 보인다`, { shot: await shot('text-bug') })

    const isResult = opts.length === 1 && /계속한다/.test(opts[0].text)
    const readMs = Math.min(25_000, (body.length / P.cps) * 1000) / OPTS.readSpeed
    await sleep(readMs)

    if (isResult) {
      if (rng() < 0.5) await kb.press('Space')
      else await safeClick(dialog.getByRole('button', { name: '계속한다' }), 'Space', '결과 화면의 계속한다')
      await sleep(250)
      return
    }
    const parsed = opts.map((o) => ({ text: o.text, cost: parseCost(o.tag) }))
    const i = P.choose(parsed, rng)
    choices.push({ eventId: cur?.target?.eventId, day: cur?.day, choice: parsed[i]?.text })
    if (rng() < 0.6) await kb.press(String(i + 1))
    else await safeClick(dialog.locator('article button').nth(i), String(i + 1), `선택지 ${i + 1}`)
    await sleep(300)
  }

  /** 버튼이 안 눌리면 기록하고 키보드로 대신한다 */
  async function safeClick(loc, key, what) {
    try {
      await loc.click({ timeout: 3000 })
    } catch {
      const cur = await state()
      note('주의', 'UI 반응 없음', `${what} 버튼을 3초 안에 누를 수 없었다 (${cur?.target?.eventId ?? '?'}). 키보드로 대신 진행`, { shot: await shot('click-fail') })
      await kb.press(key)
    }
  }

  await context.close()

  /* --- 모바일 화면 검사 --- */
  let mobile = null
  if (OPTS.mobileCheck) mobile = await mobileLayoutCheck(browser, url, outDir, note)

  const result = {
    persona: personaName,
    label: P.label,
    seed,
    ending,
    minutes: (Date.now() - startedAt) / 60000,
    events: eventIndex,
    issues,
    log,
    walks,
    trails,
    maps,
    fps: fpsSamples,
    choices,
    shots,
    mobile,
    opts: OPTS,
  }
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 1))
  writeReport(result, outDir)
  console.log(`  → ${path.relative(ROOT, path.join(outDir, 'report.html'))}`)
  return result
}

/** "−1.2억" "+3,000만" 같은 금액 표시를 숫자로 */
function parseCost(tag) {
  if (!tag) return 0
  const neg = /[−-]/.test(tag)
  const n = parseFloat(tag.replace(/[^0-9.]/g, '')) || 0
  const unit = /억/.test(tag) ? 1e8 : /만/.test(tag) ? 1e4 : 1
  return (neg ? -1 : 1) * n * unit
}

/** 휴대폰 화면에서 UI가 서로 겹치거나 화면 밖으로 나가지 않는지 */
async function mobileLayoutCheck(browser, url, outDir, note) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await ctx.addInitScript({ path: path.join(HERE, 'probe.js') })
  await ctx.addInitScript(() => localStorage.setItem('lw.muted', '1'))
  const page = await ctx.newPage()
  await page.goto(url)
  await page.getByRole('button', { name: /QR을 찍는다/ }).tap()
  await page.waitForFunction(() => window.__probe?.state()?.target && !window.__probe.state().fade, null, { timeout: 20000 })
  await sleep(600)
  const rects = await page.evaluate(() => {
    const out = {}
    for (const el of document.querySelectorAll('[data-qa]')) {
      const r = el.getBoundingClientRect()
      if (r.width && r.height) out[el.dataset.qa] = [r.left, r.top, r.right, r.bottom]
    }
    return { out, w: innerWidth, h: innerHeight, scrollW: document.documentElement.scrollWidth }
  })
  const problems = []
  const overlap = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
  // HUD는 반투명 배경이 길게 깔리므로 글자 영역만 비교: objective 는 HUD 아래에 있어야 한다
  const pairs = [['objective', 'joystick'], ['objective', 'touch-buttons'], ['prompt', 'joystick'], ['prompt', 'touch-buttons'], ['joystick', 'touch-buttons']]
  for (const [a, b] of pairs) if (rects.out[a] && rects.out[b] && overlap(rects.out[a], rects.out[b])) problems.push(`${a} ↔ ${b} 겹침`)
  for (const [k, r] of Object.entries(rects.out)) if (r[0] < -1 || r[2] > rects.w + 1) problems.push(`${k} 가로로 화면 밖`)
  if (rects.scrollW > rects.w + 1) problems.push('가로 스크롤이 생김')
  const hudText = await page.locator('[data-qa="hud"]').evaluate((el) => {
    const bars = [...el.querySelectorAll('.h-1\\.5')].map((b) => b.getBoundingClientRect().bottom)
    return Math.max(...bars)
  })
  if (rects.out.objective && hudText > rects.out.objective[1]) problems.push('목표 안내가 상단 게이지를 가린다')
  const file = 'mobile.png'
  await page.screenshot({ path: path.join(outDir, file) })
  for (const p of problems) note('주의', '모바일 화면', p, { shot: file })
  await ctx.close()
  return { problems, shot: file }
}

/* ------------------------------------------------------------------ */
const server = await startServer()
const browser = await chromium.launch({
  headless: !OPTS.headed,
  args: ['--use-angle=metal', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'],
})
const results = []
try {
  for (const p of OPTS.personas) results.push(await playOnce(browser, server.url, p))
} finally {
  await browser.close()
  await server.close()
}
const bad = results.flatMap((r) => r.issues.filter((i) => i.level === '문제'))
console.log(`\n완료: ${results.map((r) => `${r.persona}=${r.ending ?? '미완'}`).join(', ')} · 문제 ${bad.length}건`)
process.exit(bad.length ? 1 : 0)
