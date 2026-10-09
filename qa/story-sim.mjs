/**
 * 이야기 · 밸런스 자동 점검 (화면 없이 게임 엔진만 수천 판 돌린다)
 *
 *   node qa/story-sim.mjs            # 성향별 1,000판
 *   node qa/story-sim.mjs --runs 300
 *
 * 브라우저 플레이 봇(qa/sim)이 "사람이 실제로 걸어 다니며 막히는 곳"을 찾는다면,
 * 이 스크립트는 "1년치 이야기가 말이 되는가"를 찾는다.
 *   - 복선 미회수: 선택으로 얻은 플래그가 이후 어디에서도 쓰이지 않음
 *   - 엔딩 모순: "아무도 모른다" 엔딩인데 엄마/친구가 알고 있음 등
 *   - 사라지는 결과: 지연 정산이 1년이 끝날 때까지 도착하지 않음
 *   - 반복 피로: 같은 이벤트가 한 판에 너무 자주 나옴
 *   - 한 번도 못 보는 이벤트, 무의미한 선택지(다른 선택지보다 모든 면에서 나쁨)
 * 결과는 qa/reports/story-<시각>.md 로 남는다.
 */
import { createServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const RUNS = Number(args[args.indexOf('--runs') + 1]) || 1000

const server = await createServer({
  root: process.cwd(),
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
const data = await server.ssrLoadModule('/src/data/index.js')
const R = await server.ssrLoadModule('/src/engine/gameReducer.js')
const avatar = await server.ssrLoadModule('/src/components/Avatar.jsx')
await server.close()

const { ALL_EVENTS, PHASE4_POOL, EVENT_MAP } = data
const { gameReducer, initialState, VISIBLE_FLAGS, GOAL_DAYS } = R
const ITEM_FLAGS = new Set(avatar.ITEMS.map((i) => i.flag))

/* ------------------------------------------------------------------ *
 * 정적 검사
 * ------------------------------------------------------------------ */
const issues = { 문제: [], 주의: [], 참고: [] }
const add = (level, msg) => issues[level].push(msg)

const flagSetBy = {}
const flagReadBy = {}
for (const e of ALL_EVENTS) {
  for (const o of e.options) for (const f of o.flags ?? []) (flagSetBy[f] ??= []).push(e.id)
  for (const f of [...(e.cond?.requireFlags ?? []), ...(e.cond?.forbidFlags ?? [])]) (flagReadBy[f] ??= []).push(e.id)
}
const epilogueFlags = new Set(
  JSON.parse(fs.readFileSync('src/data/epilogue.json', 'utf8')).flatMap((l) => [l.flag, l.unless].filter(Boolean)),
)
const ENGINE_FLAGS = new Set(['received', ...VISIBLE_FLAGS, ...epilogueFlags])
const dangling = Object.keys(flagSetBy).filter((f) => !flagReadBy[f] && !ENGINE_FLAGS.has(f))
for (const f of dangling) {
  const shown = ITEM_FLAGS.has(f) ? ' (소지품 칸에만 표시)' : ''
  add('주의', `복선 미회수 — \`${f}\` 플래그를 주는 선택(${flagSetBy[f].join(', ')})이 이후 이야기에 아무 영향이 없다${shown}`)
}

// 다른 선택지보다 모든 면에서 나쁜 선택지 (돈↓, 멘탈↑, 의심↑ 모두 나쁨)
for (const e of ALL_EVENTS) {
  const opts = e.options
  opts.forEach((a, i) => {
    if (a.delayed || a.flags?.length || a.nextEventId !== opts[0].nextEventId) return
    const ea = a.effect ?? {}
    for (const [j, b] of opts.entries()) {
      if (i === j || b.delayed || b.flags?.length) continue
      const eb = b.effect ?? {}
      const worse =
        (ea.balance ?? 0) <= (eb.balance ?? 0) &&
        (ea.mental ?? 0) >= (eb.mental ?? 0) &&
        (ea.suspicion ?? 0) >= (eb.suspicion ?? 0)
      const strictly =
        (ea.balance ?? 0) < (eb.balance ?? 0) || (ea.mental ?? 0) > (eb.mental ?? 0) || (ea.suspicion ?? 0) > (eb.suspicion ?? 0)
      if (worse && strictly) {
        add('참고', `무의미한 선택지 — ${e.id} 「${a.text}」는 「${b.text}」보다 모든 면에서 나쁘다`)
        break
      }
    }
  })
}

/* ------------------------------------------------------------------ *
 * 플레이 시뮬레이션
 * ------------------------------------------------------------------ */
const mkRng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)

/** 사람이 화면에서 볼 수 있는 것: 선택지 문장과 금액 표시뿐. 스탯 변화는 고른 뒤에야 안다 */
const PERSONAS = {
  아무거나: (s, r) => Math.floor(r() * s.current.options.length),
  다지르기: (s) => argmax(s.current.options, (o) => -(o.effect?.balance ?? 0) + (o.flags?.length ?? 0) * 1e6),
  조심파: (s, r) => {
    if (r() < 0.25) return Math.floor(r() * s.current.options.length)
    return argmax(s.current.options, (o) => (o.effect?.balance ?? 0) - (/말한다|털어놓|자랑|올린다/.test(o.text) ? 1e9 : 0))
  },
  게이지관리: (s) =>
    argmax(s.current.options, (o) => {
      const e = o.effect ?? {}
      return (e.balance ?? 0) / 1e7 - (e.suspicion ?? 0) * (1 + s.suspicion / 30) - (e.mental ?? 0) * (s.mental / 60)
    }),
}
const argmax = (arr, f) => arr.reduce((b, x, i) => (f(x) > f(arr[b]) ? i : b), 0)

/** 엔딩 본문이 주장하는 것 ↔ 실제 플레이 기록 */
const knows = (f) => f.told_mom || f.told_friend || f.told_partner || f.told_sis || f.leaked
const ENDING_CLAIMS = [
  { says: /회사에도 아직 다닌다/, but: (f) => f.quit || f.founder, label: '"회사에 다닌다"인데 퇴사함' },
  { says: /아무도 (내가 로또에 당첨된 줄 )?모른다/, but: knows, label: '"아무도 모른다"인데 아는 사람이 있음' },
]

const report = {}
for (const [name, pick] of Object.entries(PERSONAS)) {
  const r = mkRng(name.length * 7919)
  const st = {
    endings: {}, days: 0, events: 0, seenRuns: {}, maxRepeat: [], filler: 0, generated: 0,
    lostDelayedRuns: 0, flagRuns: {}, contradictions: {}, breakdowns: 0, negBalance: 0,
    sameCatStreak: 0, deadAfterPhase3: 0, firstDeath: [],
  }
  for (let g = 0; g < RUNS; g++) {
    let s = gameReducer(initialState, { type: 'START' })
    const seen = {}
    let prevCat = null, streak = 0, maxStreak = 0
    let n = 0
    while (s.screen !== 'ending' && n++ < 3000) {
      if (s.screen === 'event') {
        const ev = s.current
        seen[ev.id] = (seen[ev.id] ?? 0) + 1
        if (ev.phase === 4) {
          st.events++
          if (ev.generated) st.generated++
          if (ev.id.startsWith('f_')) st.filler++
          if (ev.category === '붕괴') st.breakdowns++
          streak = ev.category === prevCat ? streak + 1 : 1
          maxStreak = Math.max(maxStreak, streak)
          prevCat = ev.category
        }
        s = gameReducer(s, { type: 'CHOOSE', index: pick(s, r) })
        if (s.balance < 0) st.negBalance++
      } else s = gameReducer(s, { type: 'NEXT' })
    }
    const key = s.ending.key
    st.endings[key] = (st.endings[key] ?? 0) + 1
    st.days += s.day
    if (s.day < 60) st.firstDeath.push(s.day)
    for (const id of Object.keys(seen)) st.seenRuns[id] = (st.seenRuns[id] ?? 0) + 1
    // 복선 회수율: 조건 플래그를 얻은 판에서 후속 이벤트를 실제로 봤는가
    for (const e of PHASE4_POOL) {
      const req = e.cond?.requireFlags
      if (!req?.length || !req.every((f) => s.flags[f])) continue
      const fr = (st.flagRuns[e.id] ??= { had: 0, saw: 0 })
      fr.had++
      if (seen[e.id]) fr.saw++
    }
    const generic = Object.entries(seen).filter(([id]) => !id.startsWith('gen_'))
    st.maxRepeat.push(Math.max(...generic.map(([, c]) => c)))
    st.sameCatStreak = Math.max(st.sameCatStreak, maxStreak)
    for (const c of ENDING_CLAIMS) {
      if (c.says.test(s.ending.body) && c.but(s.flags)) st.contradictions[`${key}: ${c.label}`] = (st.contradictions[`${key}: ${c.label}`] ?? 0) + 1
    }
    if (s.pending.length && s.ending.type === 'win') st.lostDelayedRuns++
  }
  report[name] = st
}

const payoffRates = []
// 성향 전체를 통틀어 한 번도 안 나온 이벤트
const everSeen = new Set(Object.values(report).flatMap((st) => Object.keys(st.seenRuns)))
for (const e of ALL_EVENTS) if (!everSeen.has(e.id)) add('문제', `도달 불가 — ${e.id} 「${e.title}」는 ${RUNS * 4}판 동안 한 번도 나오지 않았다`)
for (const e of PHASE4_POOL) {
  const total = Object.values(report).reduce((n, st) => n + (st.seenRuns[e.id] ?? 0), 0)
  const pct = (total / (RUNS * 4)) * 100
  if (e.cond?.requireFlags?.length) {
    let had = 0, saw = 0
    for (const st of Object.values(report)) ((had += st.flagRuns[e.id]?.had ?? 0), (saw += st.flagRuns[e.id]?.saw ?? 0))
    if (had >= 20) {
      const r = (saw / had) * 100
      payoffRates.push(`${e.id} ${r.toFixed(0)}%`)
      if (r < 35) add('주의', `회수 실패 — ${e.id} 「${e.title}」: 조건(${e.cond.requireFlags.join(', ')})을 만족한 판의 ${r.toFixed(0)}%만 이 이야기를 본다`)
    }
  }
  if (everSeen.has(e.id) && pct < 3 && !e.cond?.requireFlags) add('주의', `희귀 이벤트 — ${e.id} 「${e.title}」 등장률 ${pct.toFixed(1)}%`)
}
for (const [name, st] of Object.entries(report)) {
  for (const [c, n] of Object.entries(st.contradictions)) {
    add('문제', `엔딩 모순 (${name}) — ${c} 상태로 엔딩을 본 판이 ${n}/${RUNS}`)
  }
  if (st.lostDelayedRuns / RUNS > 0.2)
    add('주의', `사라지는 결과 (${name}) — ${((st.lostDelayedRuns / RUNS) * 100).toFixed(0)}%의 판에서 아직 도착하지 않은 지연 정산이 남은 채 끝난다`)
  const rep = st.maxRepeat.reduce((a, b) => a + b, 0) / RUNS
  if (rep >= 4) add('주의', `반복 피로 (${name}) — 한 판에서 같은 이벤트를 평균 최대 ${rep.toFixed(1)}번 본다`)
}

/* ------------------------------------------------------------------ *
 * 출력
 * ------------------------------------------------------------------ */
const pct = (n, d) => `${((n / d) * 100).toFixed(0)}%`
let md = `# 이야기 · 밸런스 자동 점검\n\n${new Date().toLocaleString('ko-KR')} · 성향별 ${RUNS}판\n\n`
md += `## 성향별 결과\n\n| 성향 | 엔딩 | 평균 생존 | 4교시 이벤트 수 | 일상(filler) 비중 | 절차 생성 비중 | 멘탈 붕괴 | 같은 이벤트 최다 반복 |\n|---|---|---|---|---|---|---|---|\n`
for (const [name, st] of Object.entries(report)) {
  const end = Object.entries(st.endings).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, RUNS)}`).join(' · ')
  md += `| ${name} | ${end} | ${Math.round(st.days / RUNS)}일 | ${(st.events / RUNS).toFixed(0)} | ${pct(st.filler, st.events)} | ${pct(st.generated, st.events)} | ${(st.breakdowns / RUNS).toFixed(2)}회 | ${(st.maxRepeat.reduce((a, b) => a + b, 0) / RUNS).toFixed(1)}회 |\n`
}
md += `\n## 후속 이야기 회수율 (선행 선택을 한 판 중 실제로 본 비율)\n\n${payoffRates.join(' · ')}\n`
for (const level of ['문제', '주의', '참고']) {
  md += `\n## ${level} (${issues[level].length})\n\n`
  md += issues[level].length ? issues[level].map((x) => `- ${x}`).join('\n') + '\n' : '- 없음\n'
}
const dir = path.join(process.cwd(), 'qa', 'reports')
fs.mkdirSync(dir, { recursive: true })
const file = path.join(dir, `story-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}.md`)
fs.writeFileSync(file, md)
console.log(md)
console.log(`→ ${path.relative(process.cwd(), file)}`)
