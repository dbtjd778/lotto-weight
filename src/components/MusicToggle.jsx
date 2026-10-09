import { useEffect, useState } from 'react'
import { music, MOODS } from '../engine/music'

const KEY = 'lw.muted'

export function useMusic(state) {
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    music.setMuted(muted)
    try {
      localStorage.setItem(KEY, muted ? '1' : '0')
    } catch {
      /* 사생활 보호 모드 등에서 막히면 그냥 무시 */
    }
  }, [muted])

  return { muted, setMuted }
}

/** 현재 무드 이름을 사람이 읽을 라벨로 */
const LABEL = {
  tense: '쫓기는 중',
  triumph: '입금',
  daily: '평범한 하루',
  luxury: '돈 쓰는 맛',
  dark: '불길함',
  winning: '살아남았다',
  losing: '끝',
}

export default function MusicToggle({ muted, onToggle, moodName, compact = false }) {
  const label = LABEL[moodName] ?? ''
  return (
    <button
      onClick={onToggle}
      title={muted ? '음악 켜기' : '음악 끄기'}
      aria-label={muted ? '음악 켜기' : '음악 끄기'}
      className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
        muted
          ? 'border-stone-300 bg-stone-100 text-stone-400'
          : 'border-amber-300 bg-amber-50 text-amber-700'
      }`}
    >
      <span aria-hidden>{muted ? '🔇' : '🎵'}</span>
      {!compact && MOODS[moodName] && !muted && (
        <span className="hidden sm:inline">{label}</span>
      )}
      {!compact && muted && <span className="hidden sm:inline">음소거</span>}
    </button>
  )
}
