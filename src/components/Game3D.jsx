import { useEffect, useRef, useState } from 'react'
import { WorldEngine } from '../world/engine'
import { placeEvent, SCENE_TITLES } from '../world/placement'
import { CAST } from '../data'
import EventCard from './EventCard'
import ResultCard from './ResultCard'
import AnimatedNumber, { koreanMoney } from './AnimatedNumber'
import MusicToggle from './MusicToggle'
import { ITEMS } from './Avatar'
import { BANKRUPT_LINE, GOAL_DAYS } from '../engine/gameReducer'

const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

/** 동네에서는 이벤트마다 시간대가 바뀐다 */
function timeOfDay(spot, day, prev) {
  if (spot === 'phone') return prev ?? 'noon'
  if (spot === 'desk' || spot === 'bed') return 'night_town'
  if (spot === 'office') return 'morning'
  return ['noon', 'evening', 'morning', 'noon', 'night_town'][day % 5]
}

function objectiveText(ev, place) {
  if (!ev || !place) return ''
  if (place.spot === 'phone') return '📱 휴대폰이 울린다'
  const c = CAST[ev.speaker]
  const person = !['me', 'system', 'scam'].includes(ev.speaker)
  return person ? `${c.emoji} ${c.name}을(를) 찾아간다` : `! 표시된 곳으로 — ${ev.title}`
}

export default function Game3D({ state, dispatch, muted, mood, onToggleMusic }) {
  const canvasRef = useRef(null)
  const compassRef = useRef(null)
  const engineRef = useRef(null)
  const [prompt, setPrompt] = useState(null)
  const [phone, setPhone] = useState(false)
  const [engaged, setEngaged] = useState(false)
  const [locked, setLocked] = useState(false)
  const [dismissed, setDismissed] = useState(TOUCH)
  const [fade, setFade] = useState(null)
  const [notices, setNotices] = useState([])
  const [error, setError] = useState(null)
  const todRef = useRef(null)

  const place = state.screen === 'event' ? placeEvent(state.current) : null

  // 엔진 생성
  useEffect(() => {
    let engine
    try {
      engine = new WorldEngine(canvasRef.current, {
        onPrompt: setPrompt,
        onPhone: setPhone,
        onInteract: () => {
          engine.setPaused(true)
          setEngaged(true)
        },
        onPointerLockChange: (l) => {
          setLocked(l)
          if (!l && !TOUCH) setDismissed(false)
        },
        compassEl: compassRef,
      })
    } catch (e) {
      setError('이 브라우저에서 3D 화면을 만들 수 없습니다 (WebGL). 텍스트 모드로 플레이해 주세요.')
      return
    }
    engineRef.current = engine
    window.__world = engine // 디버깅용
    return () => engine.dispose()
  }, [])

  // 이벤트가 바뀌면 → 공간에 배치 (필요하면 장면 전환)
  useEffect(() => {
    const engine = engineRef.current
    if (!engine || state.screen !== 'event' || !state.current) return
    const ev = state.current
    const p = placeEvent(ev)
    const tod = timeOfDay(p.spot, state.day, todRef.current)
    todRef.current = tod
    setEngaged(false)
    if (state.pendingNotices?.length) setNotices(state.pendingNotices)

    const place = () => {
      engine.setTimeOfDay(tod, state.day)
      engine.setTarget(ev, p.spot)
      engine.setPaused(false)
    }

    if (engine.sceneName !== p.scene) {
      engine.setPaused(true)
      setFade({ title: SCENE_TITLES[p.scene], chapter: ev.chapter ?? '', show: true })
      const t1 = setTimeout(() => {
        engine.setScene(p.scene)
        place()
        engine.setPaused(true)
      }, 500)
      const t2 = setTimeout(() => {
        setFade((f) => f && { ...f, show: false })
        engine.setPaused(false)
      }, 2100)
      const t3 = setTimeout(() => setFade(null), 2700)
      return () => [t1, t2, t3].forEach(clearTimeout)
    }
    place()
  }, [state.current, state.screen])

  // 알림 토스트는 잠시 뒤 사라진다
  useEffect(() => {
    if (!notices.length) return
    const t = setTimeout(() => setNotices([]), 7000)
    return () => clearTimeout(t)
  }, [notices])

  const next = () => {
    dispatch({ type: 'NEXT' })
    engineRef.current?.lock()
  }

  // 대화창 단축키
  useEffect(() => {
    const onKey = (e) => {
      if (!engaged) return
      if (state.screen === 'event' && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1
        if (state.current?.options[i]) dispatch({ type: 'CHOOSE', index: i })
      }
      if (state.screen === 'result' && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault()
        next()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [engaged, state.screen, state.current])

  const dialogOpen = engaged && (state.screen === 'event' || state.screen === 'result')
  const showHelp = !TOUCH && !locked && !dialogOpen && !dismissed && !fade && !error

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center text-stone-700">
        {error}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white select-none">
      <canvas ref={canvasRef} className="block h-full w-full touch-none outline-none" tabIndex={0} />

      <WorldHud state={state} muted={muted} mood={mood} onToggleMusic={onToggleMusic} />

      {/* 목표 + 나침반 */}
      {!dialogOpen && place && !fade && (
        <div data-qa="objective" className="pointer-events-none absolute left-1/2 top-[128px] w-max max-w-[90vw] -translate-x-1/2 text-center sm:top-[84px]">
          <div className="rounded-full bg-black/45 px-3 py-1 text-xs text-amber-100 backdrop-blur-sm sm:text-[13px]">
            {objectiveText(state.current, place)}
          </div>
          <div
            ref={compassRef}
            className="mx-auto mt-2 flex w-fit flex-col items-center transition-opacity duration-300"
            style={{ opacity: 0 }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/90 text-lg font-black text-amber-950 shadow-lg shadow-black/40"
              style={{ transform: 'rotate(var(--rot, 0deg))' }}
            >
              ↑
            </div>
            <span data-dist className="mt-1 font-mono text-[11px] text-white/80 drop-shadow" />
          </div>
        </div>
      )}

      {/* 조준점 */}
      {!dialogOpen && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 shadow" />
      )}

      {/* 상호작용 안내 */}
      {prompt && !dialogOpen && !fade && (
        <button
          data-qa="prompt"
          onClick={() => engineRef.current?.interact()}
          className="absolute bottom-28 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/20 bg-black/60 px-4 py-2.5 text-sm backdrop-blur-md sm:bottom-16"
        >
          <kbd className="rounded-md bg-amber-400 px-2 py-0.5 font-mono text-xs font-bold text-amber-950">E</kbd>
          <PromptText prompt={prompt} event={state.current} />
        </button>
      )}

      {/* 휴대폰 */}
      {phone && !dialogOpen && (
        <div data-qa="phone" className="absolute right-4 top-56 w-56 animate-[ring_0.5s_ease-in-out_infinite_alternate] rounded-3xl border-4 border-stone-800 bg-stone-900 p-4 text-center shadow-2xl sm:right-8 sm:top-28">
          <div className="text-[11px] text-stone-400">수신 중</div>
          <div className="my-2 text-3xl">{CAST[state.current?.speaker]?.emoji ?? '📱'}</div>
          <div className="text-sm font-bold">{callerName(state.current)}</div>
          <button
            onClick={() => engineRef.current?.interact()}
            className="mt-3 w-full rounded-full bg-emerald-500 py-2 text-sm font-bold text-white"
          >
            받기 <span className="font-mono text-xs opacity-70">(E)</span>
          </button>
        </div>
      )}

      {/* "그동안…" 지연 정산 알림 */}
      {notices.length > 0 && !dialogOpen && (
        <div data-qa="notices" className="absolute left-4 right-4 top-56 max-w-xs space-y-2 sm:left-8 sm:top-28">
          {notices.map((n, i) => (
            <div key={i} className="animate-[fadeUp_360ms_ease-out] rounded-xl border border-amber-300/60 bg-amber-50/95 px-3 py-2 text-[13px] leading-snug text-amber-950 shadow-xl">
              <span className="mr-1.5 font-semibold text-amber-600">그동안…</span>
              {n}
            </div>
          ))}
        </div>
      )}

      {/* 대화창 */}
      {dialogOpen && (
        <div data-qa="dialog" className="absolute inset-0 z-30 overflow-y-auto bg-black/45 backdrop-blur-[2px]">
          <div className="mx-auto max-w-2xl px-4 pb-10 pt-28 text-stone-900">
            {state.screen === 'event' && (
              <EventCard event={state.current} onChoose={(i) => dispatch({ type: 'CHOOSE', index: i })} />
            )}
            {state.screen === 'result' && state.result && <ResultCard result={state.result} onNext={next} />}
            {!TOUCH && (
              <p className="mt-3 text-center text-[11px] text-white/60">
                {state.screen === 'event' ? '숫자키 1~9 로 선택' : 'Space 로 계속'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 조작 안내 / 일시정지 */}
      {showHelp && (
        <button
          data-qa="help"
          onClick={() => {
            setDismissed(true)
            engineRef.current?.lock()
            canvasRef.current?.focus()
          }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-sm"
        >
          <div className="rounded-2xl border border-white/15 bg-stone-900/90 px-8 py-7 text-left shadow-2xl">
            <div className="mb-4 text-center text-lg font-bold">클릭해서 계속</div>
            <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm text-stone-300">
              {[
                ['WASD', '이동'],
                ['마우스', '둘러보기 (방향키 ← → 도 가능)'],
                ['Shift', '달리기'],
                ['E', '대화 · 조사 · 전화 받기'],
                ['Esc', '마우스 풀기'],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <kbd className="rounded bg-white/10 px-2 py-0.5 text-center font-mono text-xs text-amber-200">{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-stone-400">노란 화살표가 다음 일이 기다리는 곳을 가리킵니다</p>
          </div>
        </button>
      )}

      {TOUCH && !dialogOpen && <TouchControls engineRef={engineRef} />}

      {/* 장면 전환 */}
      {fade && (
        <div
          data-qa="fade"
          className={`absolute inset-0 z-40 flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
            fade.show ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {fade.chapter && <div className="mb-3 text-xs tracking-[0.3em] text-amber-400/80">{fade.chapter}</div>}
          <div className="text-2xl font-bold sm:text-3xl">{fade.title}</div>
          <div className="mt-3 font-mono text-sm text-white/50">D+{state.day}</div>
        </div>
      )}
    </div>
  )
}

function callerName(ev) {
  if (!ev) return ''
  if (ev.speaker === 'scam') return '모르는 번호'
  if (ev.speaker === 'me' || ev.speaker === 'system') return ev.title
  return CAST[ev.speaker]?.name ?? ev.title
}

function PromptText({ prompt, event }) {
  if (prompt.kind === 'phone') return <span>전화 받기 — {callerName(event)}</span>
  if (prompt.kind === 'talk') return <span>{CAST[prompt.who]?.name}와(과) 이야기한다</span>
  return <span>{prompt.label ?? '살펴본다'}</span>
}

/* ------------------------------------------------------------------ *
 * 상단 HUD (3D 위에 얹는 어두운 버전)
 * ------------------------------------------------------------------ */
function Bar({ label, value, from, to, danger }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-0.5 flex justify-between text-[10px] text-white/60">
        <span>{label}</span>
        <span className={`font-mono ${danger ? 'text-rose-300' : ''}`}>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${Math.max(2, value)}%`, background: `linear-gradient(90deg, ${from}, ${to})` }}
        />
      </div>
    </div>
  )
}

function WorldHud({ state, muted, mood, onToggleMusic }) {
  const { balance, mental, suspicion, day } = state
  const brokeSoon = state.flags.received && balance < BANKRUPT_LINE * 1.8
  return (
    <div data-qa="hud" className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-4 pb-6 pt-3">
      <div className="mx-auto flex max-w-4xl items-start gap-4">
        <div className="min-w-0">
          <div className={`font-mono text-lg font-bold tabular-nums sm:text-2xl ${brokeSoon ? 'text-rose-300' : 'text-amber-300'}`}>
            <AnimatedNumber value={balance} duration={1100} />
            <span className="ml-1 text-xs font-normal text-white/50">원</span>
          </div>
          <div className="text-[10px] text-white/50">{koreanMoney(balance)}</div>
        </div>
        <div className="ml-auto hidden w-64 gap-3 sm:flex">
          <Bar label="멘탈 붕괴도" value={mental} from="#38bdf8" to="#8b5cf6" danger={mental >= 70} />
          <Bar label="의심도" value={suspicion} from="#fbbf24" to="#e11d48" danger={suspicion >= 70} />
        </div>
        <div className="ml-auto shrink-0 text-right sm:ml-0">
          <div className="pointer-events-auto mb-1 flex justify-end">
            <MusicToggle muted={muted} onToggle={onToggleMusic} moodName={mood} compact />
          </div>
          <div className="font-mono text-sm tabular-nums">
            D+{day}
            <span className="text-white/40">/{GOAL_DAYS}</span>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-2 flex max-w-4xl gap-3 sm:hidden">
        <Bar label="멘탈 붕괴도" value={mental} from="#38bdf8" to="#8b5cf6" danger={mental >= 70} />
        <Bar label="의심도" value={suspicion} from="#fbbf24" to="#e11d48" danger={suspicion >= 70} />
      </div>
      <div className="mx-auto mt-1.5 flex max-w-4xl flex-wrap gap-1 text-sm">
        {ITEMS.filter((i) => state.flags[i.flag]).map((i) => (
          <span key={i.flag} title={i.label} className="rounded-md bg-white/10 px-1">
            {i.icon}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 터치 조작 — 왼쪽 조이스틱, 오른쪽 E / 달리기
 * ------------------------------------------------------------------ */
function TouchControls({ engineRef }) {
  const [knob, setKnob] = useState(null)
  const base = useRef(null)
  const [run, setRun] = useState(false)

  const move = (e) => {
    const r = base.current.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    let dx = (e.clientX - cx) / (r.width / 2)
    let dy = (e.clientY - cy) / (r.height / 2)
    const l = Math.hypot(dx, dy)
    if (l > 1) {
      dx /= l
      dy /= l
    }
    setKnob({ x: dx, y: dy })
    if (engineRef.current) engineRef.current.touchMove = { x: dx, y: dy }
  }
  const end = () => {
    setKnob(null)
    if (engineRef.current) engineRef.current.touchMove = { x: 0, y: 0 }
  }

  return (
    <>
      <div
        ref={base}
        data-qa="joystick"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e)
        }}
        onPointerMove={(e) => knob && move(e)}
        onPointerUp={end}
        onPointerCancel={end}
        className="absolute bottom-8 left-6 z-10 h-32 w-32 touch-none rounded-full border border-white/25 bg-white/10 backdrop-blur-sm"
      >
        <div
          className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white/50"
          style={{
            transform: `translate(calc(-50% + ${(knob?.x ?? 0) * 36}px), calc(-50% + ${(knob?.y ?? 0) * 36}px))`,
          }}
        />
      </div>
      <div data-qa="touch-buttons" className="absolute bottom-10 right-6 z-10 flex flex-col items-end gap-3">
        <button
          onPointerDown={() => {
            setRun((r) => {
              if (engineRef.current) engineRef.current.running = !r
              return !r
            })
          }}
          className={`h-12 w-12 rounded-full border text-xs font-bold ${run ? 'border-amber-300 bg-amber-400/80 text-amber-950' : 'border-white/30 bg-white/10'}`}
        >
          달리기
        </button>
        <button
          onPointerDown={() => engineRef.current?.interact()}
          className="h-16 w-16 rounded-full border border-amber-300 bg-amber-400/90 text-xl font-black text-amber-950 shadow-lg"
        >
          E
        </button>
      </div>
    </>
  )
}
