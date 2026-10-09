import { ALL_EVENTS } from '../data'
import { koreanMoney } from './AnimatedNumber'
import { ItemStrip } from './Avatar'
import MusicToggle from './MusicToggle'
import { GOAL_DAYS } from '../engine/gameReducer'

export function TitleScreen({ onStart, muted, onToggleMusic }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-12">
      <div className="animate-[fadeUp_500ms_ease-out]">
        <div className="mb-3 flex items-center gap-2 text-[11px] tracking-[0.3em] text-stone-400">
          <span className="h-px w-8 bg-stone-300" />
          초현실주의 시뮬레이션
        </div>

        <h1 className="text-4xl font-black leading-tight text-stone-900 sm:text-6xl">
          13억 7천만 원의
          <br />
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            무게
          </span>
        </h1>

        <p className="mt-6 max-w-lg whitespace-pre-line text-[15px] leading-relaxed text-stone-600">
          {
            '창원에 사는 8년 차 직장인.\n토요일 밤 편의점 앞에서 습관처럼 QR을 찍었고, 화면이 멈췄다.\n\n당첨금 20억 4,477만 원. 세금 떼고 13억 7천만 원.\n이제 1년을 버텨야 한다. 파산하지 않고, 들키지 않고.'
          }
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { k: '승리 조건', v: `${GOAL_DAYS}일 생존` },
            { k: '패배 ①', v: '잔고 1억 미만' },
            { k: '패배 ②', v: '의심도 100%' },
          ].map((x) => (
            <div
              key={x.k}
              className="rounded-xl border border-stone-200 bg-white/80 px-4 py-3 shadow-sm"
            >
              <div className="text-[11px] tracking-wide text-stone-400">{x.k}</div>
              <div className="mt-0.5 text-sm font-semibold text-stone-800">{x.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={onStart}
            className="w-full rounded-xl bg-amber-500 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600 active:scale-[0.99] sm:w-auto sm:px-12"
          >
            QR을 찍는다
          </button>
          <MusicToggle muted={muted} onToggle={onToggleMusic} moodName="tense" compact />
        </div>

        <p className="mt-6 text-xs text-stone-400">
          이벤트 {ALL_EVENTS.length}종 수록 · 절차적 생성기로 무한 확장 · BGM은 실시간 생성됩니다
        </p>
      </div>
    </div>
  )
}

export function EndingScreen({ state, onRestart, muted, mood, onToggleMusic }) {
  const { ending, balance, day, suspicion, mental, stats, flags } = state
  const win = ending.type === 'win'

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-12">
      <div className="animate-[fadeUp_500ms_ease-out]">
        <div className="mb-2 flex items-center gap-3">
          <span
            className={`text-[11px] tracking-[0.3em] ${win ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {win ? 'SURVIVED' : 'GAME OVER'}
          </span>
          <MusicToggle muted={muted} onToggle={onToggleMusic} moodName={mood} compact />
        </div>

        <h1
          className={`text-4xl font-black sm:text-5xl ${win ? 'text-emerald-700' : 'text-rose-700'}`}
        >
          {ending.title}
        </h1>

        <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-stone-700">
          {ending.body}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: '최종 잔고', v: koreanMoney(balance) },
            { k: '생존 일수', v: `${day}일` },
            { k: '의심도', v: `${Math.round(suspicion)}%` },
            { k: '멘탈 붕괴도', v: `${Math.round(mental)}%` },
          ].map((x) => (
            <div
              key={x.k}
              className="rounded-xl border border-stone-200 bg-white/80 px-3 py-3 shadow-sm"
            >
              <div className="text-[10px] tracking-wide text-stone-400">{x.k}</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-stone-800">{x.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-stone-200 bg-white/80 px-4 py-4 shadow-sm">
          <div className="mb-2 text-[11px] tracking-wide text-stone-400">
            남긴 것들 · 총 지출 {koreanMoney(stats.totalSpent)} · 선택 {stats.choices}회
          </div>
          <ItemStrip flags={flags} />
        </div>

        <button
          onClick={onRestart}
          className="mt-8 w-full rounded-xl border border-stone-300 bg-white px-6 py-4 font-bold text-stone-800 shadow-sm transition hover:bg-stone-50 sm:w-auto sm:px-12"
        >
          다시 그 토요일로
        </button>
      </div>
    </div>
  )
}
