import { PHASE4_POOL, BREAKDOWN_EVENTS } from '../data'

/* ------------------------------------------------------------------ *
 * 1. 조건 필터
 * ------------------------------------------------------------------ */

export function meetsCondition(event, state) {
  const c = event.cond
  if (!c) return true
  const { day, balance, mental, suspicion, flags } = state

  if (c.minDay != null && day < c.minDay) return false
  if (c.maxDay != null && day > c.maxDay) return false
  if (c.minBalance != null && balance < c.minBalance) return false
  if (c.maxBalance != null && balance > c.maxBalance) return false
  if (c.minMental != null && mental < c.minMental) return false
  if (c.maxMental != null && mental > c.maxMental) return false
  if (c.minSuspicion != null && suspicion < c.minSuspicion) return false
  if (c.maxSuspicion != null && suspicion > c.maxSuspicion) return false

  if (c.requireFlags?.some((f) => !flags[f])) return false
  if (c.forbidFlags?.some((f) => flags[f])) return false

  return true
}

/* ------------------------------------------------------------------ *
 * 2. 동적 가중치
 *    - 스트레스가 높으면 위기/사기 이벤트가 더 자주 뜬다
 *    - 의심도가 높으면 인간관계/배신 이벤트가 더 자주 뜬다
 *    - 잔고가 적으면 대형지출 유혹이 줄어든다
 * ------------------------------------------------------------------ */

export function dynamicWeight(event, state) {
  let w = event.weight ?? 1
  const { mental, suspicion, balance } = state

  if (mental >= 70 && (event.category === '사기' || event.category === '위기')) w *= 2.4
  if (mental >= 55 && event.category === '건강') w *= 1.8
  if (mental <= 25 && event.category === '소확행') w *= 1.4

  if (suspicion >= 55 && (event.category === '배신' || event.category === '인간관계')) w *= 2.2
  if (suspicion >= 70 && event.category === '가족') w *= 1.8
  if (suspicion <= 20 && event.category === '대형지출') w *= 1.3

  if (balance < 300000000 && event.category === '대형지출') w *= 0.3
  if (balance < 200000000 && event.category === '사치품') w *= 0.4

  return Math.max(w, 0.05)
}

/* ------------------------------------------------------------------ *
 * 3. 가중치 추첨
 * ------------------------------------------------------------------ */

function weightedPick(candidates, state, rng) {
  const total = candidates.reduce((s, e) => s + dynamicWeight(e, state), 0)
  let r = rng() * total
  for (const e of candidates) {
    r -= dynamicWeight(e, state)
    if (r <= 0) return e
  }
  return candidates[candidates.length - 1]
}

/* ------------------------------------------------------------------ *
 * 4. 절차적 이벤트 생성기
 *    큐레이션 이벤트 풀이 소진돼도 게임이 끊기지 않도록,
 *    템플릿 × 소재 조합으로 이벤트를 무한 생성한다.
 *    (템플릿을 추가하면 이벤트 풀이 곱셈으로 늘어난다)
 * ------------------------------------------------------------------ */

const SUBJECTS = {
  지출: [
    { what: '한정판 스니커즈 리셀', price: 1_800_000 },
    { what: '캠핑 풀세트', price: 4_200_000 },
    { what: '전동 킥보드 두 대', price: 2_600_000 },
    { what: '홈시어터 프로젝터', price: 3_900_000 },
    { what: '오디오 앰프와 스피커', price: 7_400_000 },
    { what: '자전거 (카본 로드)', price: 6_800_000 },
    { what: '드론과 짐벌 세트', price: 3_100_000 },
    { what: '기계식 키보드 여섯 개', price: 1_900_000 },
    { what: '에스프레소 머신', price: 5_600_000 },
    { what: '골프 풀세트와 회원권 보증금', price: 24_000_000 },
  ],
  요청: [
    { who: '고향 선배', amount: 20_000_000, reason: '가게 보증금이 모자라다며' },
    { who: '전 직장 동료', amount: 8_000_000, reason: '이달 카드값만 막으면 된다며' },
    { who: '사촌 형', amount: 35_000_000, reason: '아이 수술비라며' },
    { who: '군대 후임', amount: 5_000_000, reason: '결혼 준비가 빠듯하다며' },
    { who: '동아리 선배', amount: 15_000_000, reason: '투자할 곳이 확실하다며' },
    { who: '옆집 아저씨', amount: 3_000_000, reason: '급하게 병원비가 필요하다며' },
    { who: '먼 친척', amount: 50_000_000, reason: '땅을 사두면 두 배가 된다며' },
  ],
  투자: [
    { name: '2차전지 소재주', swing: 0.38 },
    { name: '바이오 임상 3상 종목', swing: 0.55 },
    { name: '해외 나스닥 3배 레버리지', swing: 0.62 },
    { name: '비상장 주식 장외거래', swing: 0.48 },
    { name: '원자재 선물 ETF', swing: 0.33 },
    { name: 'AI 반도체 테마주', swing: 0.44 },
  ],
}

function fmt(n) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(n % 100_000_000 === 0 ? 0 : 1)}억 원`
  return `${Math.round(n / 10_000).toLocaleString()}만 원`
}

const TEMPLATES = [
  // 소비 유혹
  ({ pick, rng, seq }) => {
    const s = pick(SUBJECTS.지출)
    return {
      id: `gen_buy_${seq}`,
      phase: 4, category: '사치품', speaker: 'me', days: 3 + Math.floor(rng() * 4),
      generated: true,
      title: `${s.what}`,
      description: `또 그 탭을 열어놨다. ${s.what}, ${fmt(s.price)}.\n\n예전엔 이걸 보는 것만으로도 죄책감이 들었다. 지금은 살 수 있다. 그게 더 이상하다.`,
      options: [
        {
          text: `산다 (${fmt(s.price)})`,
          effect: { balance: -s.price, mental: -8, suspicion: s.price > 5_000_000 ? 6 : 2 },
          result: '샀다. 도착한 날은 좋았다. 일주일 뒤엔 그냥 물건이었다.',
        },
        {
          text: '중고로 절반 가격에 산다',
          effect: { balance: -Math.round(s.price * 0.5), mental: -5, suspicion: 1 },
          result: '당근에서 반값에 구했다. 만족도는 8할이었다.',
        },
        {
          text: '탭을 닫는다',
          effect: { mental: 5 },
          result: '닫았다. 이틀 뒤에 다시 열었다.',
        },
      ],
    }
  },

  // 돈 요청
  ({ pick, rng, seq }) => {
    const s = pick(SUBJECTS.요청)
    return {
      id: `gen_ask_${seq}`,
      phase: 4, category: '위기', speaker: 'system', days: 4 + Math.floor(rng() * 3),
      generated: true,
      cond: { minSuspicion: 25 },
      title: `${s.who}에게서 연락이 왔다`,
      description: `${s.who}가 ${s.reason} ${fmt(s.amount)}을 빌려달라고 한다.\n\n한동안 연락 없던 사람이다. 하필 지금이라는 게 계속 걸린다.`,
      options: [
        {
          text: `전액 빌려준다 (${fmt(s.amount)})`,
          effect: { balance: -s.amount, mental: 10, suspicion: 16 },
          delayed: {
            afterDays: 60 + Math.floor(rng() * 60),
            mental: 14,
            text: `${s.who}가 연락을 안 받는다. ${fmt(s.amount)}은 그렇게 사라졌다.`,
          },
          result: '계좌번호가 바로 왔다. 미리 복사해둔 것 같았다.',
        },
        {
          text: '차용증을 쓰고 절반만',
          effect: { balance: -Math.round(s.amount * 0.5), mental: 4, suspicion: 7 },
          result: '차용증 얘기를 꺼내자 분위기가 식었다. 그래도 썼다.',
        },
        {
          text: '못 한다고 한다',
          effect: { mental: 12, suspicion: -6 },
          result: `${s.who}가 알겠다고 했다. 그 뒤로 연락이 없다.`,
        },
      ],
    }
  },

  // 투자 판단
  ({ pick, rng, seq }) => {
    const s = pick(SUBJECTS.투자)
    const up = rng() < 0.42
    const stake = [30_000_000, 50_000_000, 100_000_000, 150_000_000][Math.floor(rng() * 4)]
    const delta = Math.round(stake * s.swing * (up ? 1 : -1))
    return {
      id: `gen_inv_${seq}`,
      phase: 4, category: '투자', speaker: 'system', days: 4 + Math.floor(rng() * 4),
      generated: true,
      cond: { minBalance: stake + 150_000_000 },
      title: `${s.name}`,
      description: `${s.name}이 최근 급등했다. 커뮤니티는 아직 안 늦었다고 한다.\n\n${fmt(stake)}. 넣을 수 있는 돈이긴 하다.`,
      options: [
        {
          text: `${fmt(stake)} 넣는다`,
          effect: { balance: -stake, mental: 12, suspicion: 3 },
          delayed: {
            afterDays: 30 + Math.floor(rng() * 40),
            balance: stake + delta,
            mental: up ? -12 : 20,
            text: up
              ? `${s.name} ${Math.round(s.swing * 100)}% 상승. ${fmt(stake + delta)}으로 회수했다.`
              : `${s.name} ${Math.round(s.swing * 100)}% 하락. ${fmt(Math.abs(delta))}이 사라졌다.`,
          },
          result: '매수 체결. 그날부터 장 시작 시간에 눈이 떠졌다.',
        },
        {
          text: `${fmt(Math.round(stake * 0.3))}만 넣는다`,
          effect: { balance: -Math.round(stake * 0.3), mental: 5, suspicion: 1 },
          delayed: {
            afterDays: 30 + Math.floor(rng() * 40),
            balance: Math.round((stake + delta) * 0.3),
            mental: up ? -5 : 7,
            text: up ? '소액 투자분이 수익으로 돌아왔다.' : '소액이라 손실도 작았다. 다행이다.',
          },
          result: '잃어도 되는 만큼만. 이 원칙을 지킨 날은 잠이 잘 온다.',
        },
        { text: '안 한다', effect: { mental: 3 }, result: '차트를 즐겨찾기에만 넣어뒀다.' },
      ],
    }
  },
]

let genSeq = 0

export function generateEvent(state, rng = Math.random) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)]
  // 조건에 맞는 템플릿이 나올 때까지 최대 12번 시도
  for (let i = 0; i < 12; i++) {
    const tpl = pick(TEMPLATES)
    const ev = tpl({ pick, rng, seq: ++genSeq })
    if (meetsCondition(ev, state)) return ev
  }
  // 최후의 보루: 조건 없는 소비 이벤트
  const s = pick(SUBJECTS.지출)
  return TEMPLATES[0]({ pick: () => s, rng, seq: ++genSeq })
}

/* ------------------------------------------------------------------ *
 * 5. 다음 이벤트 선택
 * ------------------------------------------------------------------ */

export function pickBreakdownEvent(state, rng = Math.random) {
  const pool = BREAKDOWN_EVENTS.filter((e) => meetsCondition(e, state))
  return pool[Math.floor(rng() * pool.length)] ?? BREAKDOWN_EVENTS[0]
}

export function pickNextEvent(state, rng = Math.random) {
  // 스트레스 100% → 강제 붕괴 이벤트
  if (state.mental >= 100) return pickBreakdownEvent(state, rng)

  const candidates = PHASE4_POOL.filter((e) => {
    if (!e.repeatable && state.seen[e.id]) return false
    if (e.repeatable && state.recent.includes(e.id)) return false
    return meetsCondition(e, state)
  })

  // 큐레이션 이벤트가 남아 있으면 80% 확률로 그쪽을 우선한다.
  if (candidates.length > 0 && rng() < 0.8) return weightedPick(candidates, state, rng)
  if (candidates.length === 0) return generateEvent(state, rng)
  return rng() < 0.5 ? generateEvent(state, rng) : weightedPick(candidates, state, rng)
}
