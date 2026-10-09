import { CAST } from '../data'

/**
 * 캐릭터 아바타.
 * 이모지 + 캐릭터 고유색 링/글로우로 구성한 초경량 캐릭터 표현.
 */
export default function Avatar({ id, size = 56, showName = false }) {
  const c = CAST[id] ?? CAST.system
  const s = { width: size, height: size }

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={s}>
        <div
          className="absolute inset-0 rounded-2xl opacity-25 blur-md"
          style={{ background: c.color }}
        />
        <div
          className="relative flex h-full w-full items-center justify-center rounded-2xl border-2 bg-white shadow-sm"
          style={{ borderColor: c.color }}
        >
          <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{c.emoji}</span>
        </div>
      </div>
      {showName && (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-stone-800">{c.name}</div>
          {c.role && <div className="truncate text-xs text-stone-400">{c.role}</div>}
        </div>
      )}
    </div>
  )
}

/** 획득한 물건/상태를 아이콘 스트립으로 보여준다 */
export const ITEMS = [
  { flag: 'porsche', icon: '🏎️', label: '포르쉐 718' },
  { flag: 'boxster', icon: '🚗', label: '중고 박스터' },
  { flag: 'avante', icon: '🚙', label: '신형 아반떼' },
  { flag: 'changwon_home', icon: '🏠', label: '창원 내 집' },
  { flag: 'gangnam_debt', icon: '🏢', label: '대치동 (대출 12억)' },
  { flag: 'seoul_jeonse', icon: '🔑', label: '서울 전세' },
  { flag: 'landlord', icon: '🏘️', label: '임대 오피스텔' },
  { flag: 'rolex', icon: '⌚', label: '서브마리너' },
  { flag: 'gold', icon: '🧈', label: '골드바 2kg' },
  { flag: 'domain_owner', icon: '🌐', label: 'todayquit.com' },
  { flag: 'good_chair', icon: '🪑', label: '에어론' },
  { flag: 'ai_maxed', icon: '🤖', label: 'AI 구독 풀결제' },
  { flag: 'dog', icon: '🐕', label: '유기견 입양' },
  { flag: 'maldives', icon: '🏝️', label: '몰디브 다녀옴' },
  { flag: 'wine_cellar', icon: '🍷', label: '와인셀러' },
  { flag: 'cafe', icon: '☕', label: '카페 사장' },
  { flag: 'founder', icon: '🚀', label: '법인 대표' },
  { flag: 'solo_builder', icon: '💻', label: '1인 개발' },
  { flag: 'quit', icon: '📄', label: '퇴사함' },
  { flag: 'therapy', icon: '🧠', label: '상담 받는 중' },
  { flag: 'donor', icon: '💝', label: '정기후원' },
  { flag: 'told_friend', icon: '🗣️', label: '친구가 안다' },
  { flag: 'told_mom', icon: '👪', label: '엄마가 안다' },
  { flag: 'leaked', icon: '📢', label: '소문이 샜다' },
  { flag: 'has_cpa', icon: '🧾', label: '세무사 선임' },
  { flag: 'security_aware', icon: '🛡️', label: '사기 경계 태세' },
]

export function ItemStrip({ flags }) {
  const owned = ITEMS.filter((i) => flags[i.flag])
  if (owned.length === 0) {
    return <div className="text-xs text-stone-400">아직 아무것도 없다.</div>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {owned.map((i) => (
        <span
          key={i.flag}
          title={i.label}
          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-600"
        >
          <span>{i.icon}</span>
          <span className="hidden sm:inline">{i.label}</span>
        </span>
      ))}
    </div>
  )
}
