import { useReducer, useEffect, useRef, useMemo } from 'react'
import { gameReducer, initialState } from './engine/gameReducer'
import { music, moodForState } from './engine/music'
import StatHud from './components/StatHud'
import EventCard from './components/EventCard'
import ResultCard from './components/ResultCard'
import { TitleScreen, EndingScreen } from './components/Screens'
import { ItemStrip } from './components/Avatar'
import MusicToggle, { useMusic } from './components/MusicToggle'

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const { muted, setMuted } = useMusic()
  const topRef = useRef(null)

  const mood = useMemo(
    () => (state.screen === 'title' ? 'tense' : moodForState(state)),
    [state.screen, state.current?.id, state.ending?.type, state.flags.received],
  )

  // 상황이 바뀌면 다음 마디에서 BGM을 갈아탄다
  useEffect(() => {
    music.setMood(mood)
  }, [mood])

  useEffect(() => {
    const onVis = () => !document.hidden && music.resume()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      music.stop()
    }
  }, [])

  // 개발 모드 전용: 콘솔에서 게임을 구동해 밸런스를 시뮬레이션하기 위한 훅
  useEffect(() => {
    if (import.meta.env.DEV) window.__game = { state, dispatch, music }
  }, [state])

  // 카드가 바뀔 때마다 상단으로
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [state.current?.id, state.screen])

  // 숫자 키로 선택지 고르기 / 스페이스로 진행
  useEffect(() => {
    const onKey = (e) => {
      if (state.screen === 'event' && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1
        if (state.current?.options[i]) dispatch({ type: 'CHOOSE', index: i })
      }
      if (state.screen === 'result' && (e.key === ' ' || e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault()
        dispatch({ type: 'NEXT' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.screen, state.current])

  // 오디오는 반드시 사용자 제스처 안에서 시작해야 한다
  const handleStart = () => {
    music.start('tense')
    dispatch({ type: 'START' })
  }

  if (state.screen === 'title') {
    return (
      <TitleScreen
        onStart={handleStart}
        muted={muted}
        onToggleMusic={() => setMuted((m) => !m)}
      />
    )
  }

  if (state.screen === 'ending') {
    return (
      <EndingScreen
        state={state}
        onRestart={() => dispatch({ type: 'RESTART' })}
        muted={muted}
        mood={mood}
        onToggleMusic={() => setMuted((m) => !m)}
      />
    )
  }

  return (
    <div className="min-h-dvh pb-16">
      <StatHud
        state={state}
        muted={muted}
        mood={mood}
        onToggleMusic={() => setMuted((m) => !m)}
      />

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div ref={topRef} />

        {state.screen === 'event' && state.current && (
          <EventCard
            event={state.current}
            notices={state.pendingNotices}
            onChoose={(i) => dispatch({ type: 'CHOOSE', index: i })}
          />
        )}

        {state.screen === 'result' && state.result && (
          <ResultCard result={state.result} onNext={() => dispatch({ type: 'NEXT' })} />
        )}

        {/* 소지품 */}
        <section className="mt-6 rounded-xl border border-stone-200 bg-white/70 px-4 py-3">
          <div className="mb-2 text-[11px] tracking-wide text-stone-400">소지품 · 상태</div>
          <ItemStrip flags={state.flags} />
        </section>

        {state.pending.length > 0 && (
          <p className="mt-3 text-center text-[11px] text-stone-400">
            정산 대기 중인 결정 {state.pending.length}건
          </p>
        )}

        <p className="mt-6 text-center text-[11px] text-stone-400">
          숫자키 1~9 로 선택 · Space 로 진행
        </p>
      </main>
    </div>
  )
}
