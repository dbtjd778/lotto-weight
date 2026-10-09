import { useEffect, useRef, useState } from 'react'

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

/**
 * 목표값까지 부드럽게 카운팅되는 숫자.
 * duration 동안 requestAnimationFrame으로 보간한다.
 */
export default function AnimatedNumber({
  value,
  duration = 900,
  format = (n) => Math.round(n).toLocaleString('ko-KR'),
  className = '',
}) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return

    // 탭이 숨겨져 있으면 requestAnimationFrame이 멈춘다.
    // 애니메이션할 이유도 없으니 바로 최종값으로 맞춘다.
    if (typeof document !== 'undefined' && document.hidden) {
      fromRef.current = to
      setDisplay(to)
      return
    }

    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const v = from + (to - from) * easeOutCubic(t)
      setDisplay(v)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <span className={className}>{format(display)}</span>
}

/** 13억 7천만 원 같은 한국어 축약 표기 */
export function koreanMoney(n) {
  const neg = n < 0
  const v = Math.abs(Math.round(n))
  const eok = Math.floor(v / 100_000_000)
  const man = Math.floor((v % 100_000_000) / 10_000)
  let out = ''
  if (eok) out += `${eok}억 `
  if (man) out += `${man.toLocaleString('ko-KR')}만 `
  if (!out) out = `${v.toLocaleString('ko-KR')} `
  return `${neg ? '-' : ''}${out.trim()}원`
}
