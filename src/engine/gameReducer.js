import { EVENT_MAP, START_EVENT_ID } from '../data'
import { pickNextEvent } from './eventGenerator'

export const GOAL_DAYS = 365
export const BANKRUPT_LINE = 100_000_000 // 1억
export const PAYOUT = 1_370_000_000

/**
 * 하루가 지날 때마다 잦아드는 비율 (정액이 아니라 비율).
 *
 * 비율 감소는 균형점이 딱 떨어진다: S* = (이벤트당 평균 상승폭) / (rate × 평균 소요일수).
 * 이벤트 1건 평균 4.08일, rate 0.0065 → S* ≈ 상승폭 × 37.7.
 *   · 아무 생각 없이 고르면 평균 +4.5 → 균형점 169 → 100을 넘겨 발각
 *   · 적당히 조심하면      평균 +2.0 → 균형점  75 → 아슬아슬하게 생존
 *   · 철저히 숨기면        평균 -2.5 → 0에 수렴 → 완벽한 1년
 */
export const SUSPICION_DECAY_RATE = 0.0065
export const MAX_SUSPICION_DECAY_PER_DAY = 0.35
export const MENTAL_DECAY_RATE = 0.02
export const MENTAL_DECAY_FLAT = 0.12

/** 가만히 있어도 나가는 돈 (월세·식비·보험·통신·경조사). 하루치 */
export const DAILY_LIVING_COST = 95_000

/**
 * 티 나는 것들 — 한 번 사면 매일 조금씩 의심도를 밀어올린다.
 * 고의심 이벤트는 대부분 1회성이라 후반이면 고갈되는데,
 * 이 상시 압력이 없으면 "지르고 버티기"가 무조건 이긴다.
 */
export const VISIBLE_FLAGS = [
  'porsche', 'boxster', 'rolex', 'gangnam_debt', 'maldives', 'landlord',
  'cafe', 'founder', 'quit', 'public_sponsor', 'moved_up', 'has_designer',
  'told_friend', 'told_mom', 'leaked', 'youtube_out', 'wine_cellar',
]
export const VISIBILITY_PRESSURE = 0.085 // 항목당 하루치

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

export const initialState = {
  screen: 'title', // title | event | result | ending
  day: 0,
  balance: 0,
  mental: 18,
  suspicion: 0,
  flags: {},
  seen: {},
  recent: [], // 최근 반복 이벤트 (연속 재출현 방지)
  current: null,
  result: null, // { text, effect, choiceText, resolved: [] }
  pending: [], // 지연 효과
  log: [],
  ending: null,
  stats: { totalSpent: 0, choices: 0 },
}

function applyEffect(state, effect = {}) {
  return {
    balance: state.balance + (effect.balance ?? 0),
    mental: clamp(state.mental + (effect.mental ?? 0), 0, 100),
    suspicion: clamp(state.suspicion + (effect.suspicion ?? 0), 0, 100),
  }
}

function checkEnding(s) {
  if (s.suspicion >= 100) {
    return {
      type: 'lose',
      key: 'exposed',
      title: '정체 발각',
      body:
        '어느 날 아침, 현관문 앞에 사람이 서 있었다.\n' +
        '그 뒤로 친척이, 친구가, 이름도 기억 안 나는 사람들이 줄을 섰다.\n\n' +
        '거절할 때마다 나는 나쁜 놈이 됐다. 몇 달 뒤, 통장에는 아무것도 남지 않았다.\n' +
        '가장 먼저 사라진 건 돈이 아니라 사람이었다.',
    }
  }
  if (s.flags.received && s.balance < BANKRUPT_LINE) {
    return {
      type: 'lose',
      key: 'broke',
      title: '파산',
      body:
        '잔고가 1억 밑으로 떨어졌다.\n' +
        '13억 7천만 원이 어디로 갔는지 항목별로는 다 설명할 수 있다.\n' +
        '그런데 전부 합쳐서는 설명이 안 된다.\n\n' +
        '월요일 아침, 다시 출근 준비를 했다. 알람은 6시 20분이었다.',
    }
  }
  if (s.day >= GOAL_DAYS) {
    const rich = s.balance >= 1_000_000_000
    const safe = s.suspicion < 40
    if (rich && safe) {
      return {
        type: 'win',
        key: 'perfect',
        title: '완벽한 1년',
        body:
          '1년이 지났다. 아무도 모른다. 회사에도 아직 다닌다.\n' +
          '잔고는 거의 그대로다.\n\n' +
          '달라진 건 하나뿐이다. 나는 이제 아무것도 안 해도 된다는 걸 안다.\n' +
          '그 사실을 아는 채로 평범하게 사는 것. 그게 이 게임의 정답이었다.',
      }
    }
    if (safe) {
      return {
        type: 'win',
        key: 'quiet',
        title: '조용히 살아남다',
        body:
          '1년을 버텼다. 돈은 좀 줄었지만 사람은 안 줄었다.\n' +
          '아무도 내가 로또에 당첨된 줄 모른다.\n\n' +
          '가끔 그 토요일 밤이 떠오른다. 그때 그 냉장고 소리도.',
      }
    }
    return {
      type: 'win',
      key: 'noisy',
      title: '버티긴 했다',
      body:
        '1년이 지났다. 파산은 안 했다.\n' +
        '대신 주변 사람 절반이 나를 다르게 본다.\n\n' +
        '이제 누가 웃으면 저 사람은 뭘 원하나 부터 생각한다.\n' +
        '살아남았지만, 예전으로는 못 돌아간다.',
    }
  }
  return null
}

function resolvePending(s, daysPassed) {
  const resolved = []
  const still = []
  for (const p of s.pending) {
    const left = p.afterDays - daysPassed
    if (left <= 0) resolved.push(p)
    else still.push({ ...p, afterDays: left })
  }
  return { resolved, still }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'START': {
      return {
        ...initialState,
        screen: 'event',
        current: EVENT_MAP[START_EVENT_ID],
      }
    }

    case 'CHOOSE': {
      const ev = state.current
      const opt = ev.options[action.index]
      if (!opt) return state

      let effect = { ...(opt.effect ?? {}) }
      if (opt.special === 'halfBalance') {
        effect.balance = -Math.round(state.balance / 2)
      }

      const next = applyEffect(state, effect)
      const flags = { ...state.flags }
      for (const f of opt.flags ?? []) flags[f] = true

      const pending = [...state.pending]
      if (opt.delayed) pending.push({ ...opt.delayed, sourceId: ev.id })

      const seen = { ...state.seen, [ev.id]: (state.seen[ev.id] ?? 0) + 1 }
      const recent = ev.repeatable ? [ev.id, ...state.recent].slice(0, 6) : state.recent

      return {
        ...state,
        ...next,
        flags,
        pending,
        seen,
        recent,
        screen: 'result',
        result: {
          choiceText: opt.text,
          text: opt.result ?? '',
          effect,
          resolved: [],
          nextEventId: opt.nextEventId ?? null,
        },
        stats: {
          totalSpent: state.stats.totalSpent + Math.max(0, -(effect.balance ?? 0)),
          choices: state.stats.choices + 1,
        },
        log: [
          ...state.log,
          { day: state.day, title: ev.title, choice: opt.text, effect },
        ].slice(-60),
      }
    }

    case 'NEXT': {
      const ev = state.current
      const nextId = state.result?.nextEventId

      // 시간 경과 (스크립트 구간은 하루씩, Phase 4는 이벤트별 days)
      const daysPassed = nextId && nextId !== 'PHASE4' ? 1 : (ev.days ?? 4)
      const day = state.day + daysPassed

      // 지연 효과 정산
      const { resolved, still } = resolvePending(state, daysPassed)
      let acc = { balance: state.balance, mental: state.mental, suspicion: state.suspicion }
      for (const p of resolved) {
        acc = applyEffect(acc, p)
      }

      // 시간이 약이다 — 지나간 날만큼 소문과 스트레스가 잦아든다.
      // 단 하루에 잦아드는 양에는 상한이 있다. 상한이 없으면 의심도가 높을수록
      // 방어력이 같이 커져서 100에 영영 도달하지 않는다.
      const dailyDecay = Math.min(acc.suspicion * SUSPICION_DECAY_RATE, MAX_SUSPICION_DECAY_PER_DAY)
      const susAfter = acc.suspicion - dailyDecay * daysPassed
      const menAfter =
        acc.mental * Math.pow(1 - MENTAL_DECAY_RATE, daysPassed) - MENTAL_DECAY_FLAT * daysPassed

      // 티 나는 자산은 가만히 있어도 계속 눈에 띈다
      const visible = VISIBLE_FLAGS.reduce((n, f) => n + (state.flags[f] ? 1 : 0), 0)
      const exposure = visible * VISIBILITY_PRESSURE * daysPassed

      acc = {
        balance: state.flags.received ? acc.balance - DAILY_LIVING_COST * daysPassed : acc.balance,
        suspicion: clamp(susAfter + exposure, 0, 100),
        mental: clamp(menAfter, 0, 100),
      }

      let s = { ...state, ...acc, day, pending: still }

      const ending = checkEnding(s)
      if (ending) {
        return { ...s, screen: 'ending', ending, current: null, result: null }
      }

      // 다음 이벤트
      let current
      if (nextId && nextId !== 'PHASE4') {
        current = EVENT_MAP[nextId]
      } else {
        current = pickNextEvent(s)
      }

      // 붕괴 이벤트를 소비했으면 스트레스를 일부 회복시켜 무한 루프를 막는다
      if (s.mental >= 100 && current?.category === '붕괴') {
        s = { ...s, mental: 96 }
      }

      return {
        ...s,
        screen: 'event',
        current,
        result: null,
        pendingNotices: resolved.map((r) => r.text).filter(Boolean),
      }
    }

    case 'RESTART':
      return { ...initialState, screen: 'title' }

    default:
      return state
  }
}
