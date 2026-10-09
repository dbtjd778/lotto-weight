import cast from './cast.json'
import phase1 from './events.phase1.json'
import phase2 from './events.phase2.json'
import phase3 from './events.phase3.json'
import phase4 from './events.phase4.json'
import phase4extra from './events.phase4.extra.json'
import filler from './events.filler.json'
import special from './events.special.json'

/**
 * 이벤트 스키마
 * {
 *   id, phase, chapter?, category?, speaker, title, description,
 *   weight?      : 랜덤 풀에서 뽑힐 가중치 (기본 1)
 *   days?        : 이 이벤트를 소비할 때 흐르는 게임 내 일수 (기본 4)
 *   repeatable?  : true면 재출현 가능 (기본 false = 1회성)
 *   cond?        : { minDay, maxDay, minBalance, maxBalance,
 *                    minMental, maxMental, minSuspicion, maxSuspicion,
 *                    requireFlags: [], forbidFlags: [] }
 *   options: [{
 *     text, result?,
 *     effect  : { balance, mental, suspicion },
 *     flags?  : [부여할 플래그],
 *     special?: 'halfBalance' 같은 특수 처리 키
 *     delayed?: { afterDays, balance?, mental?, suspicion?, text }
 *     nextEventId? : 스크립트 분기 (Phase 1~3)
 *   }]
 * }
 */

const SCRIPTED = [...phase1, ...phase2, ...phase3]
const POOL = [...phase4, ...phase4extra, ...filler]

export const CAST = cast
export const SCRIPTED_EVENTS = SCRIPTED
export const PHASE4_POOL = POOL
export const BREAKDOWN_EVENTS = special

export const ALL_EVENTS = [...SCRIPTED, ...POOL, ...special]

export const EVENT_MAP = ALL_EVENTS.reduce((acc, e) => {
  acc[e.id] = e
  return acc
}, {})

export const START_EVENT_ID = 'p1_00_check'

// 개발 편의: 데이터 정합성 검사 (중복 id / 끊긴 nextEventId)
if (import.meta.env.DEV) {
  const ids = new Set()
  for (const e of ALL_EVENTS) {
    if (ids.has(e.id)) console.warn('[events] 중복 id:', e.id)
    ids.add(e.id)
  }
  for (const e of ALL_EVENTS) {
    for (const o of e.options) {
      if (o.nextEventId && o.nextEventId !== 'PHASE4' && !ids.has(o.nextEventId)) {
        console.warn('[events] 끊긴 nextEventId:', e.id, '→', o.nextEventId)
      }
    }
  }
  console.info(`[events] 총 ${ALL_EVENTS.length}개 로드 (스크립트 ${SCRIPTED.length} / 풀 ${POOL.length} / 특수 ${special.length})`)
}
