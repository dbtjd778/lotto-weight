import AnimatedNumber, { koreanMoney } from './AnimatedNumber'
import MusicToggle from './MusicToggle'
import { BANKRUPT_LINE, GOAL_DAYS } from '../engine/gameReducer'

function Gauge({ label, value, hint, from, to, danger }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-stone-500">{label}</span>
        <span
          className={`font-mono text-sm tabular-nums ${danger ? 'text-rose-600' : 'text-stone-700'}`}
        >
          <AnimatedNumber value={value} duration={700} format={(n) => Math.round(n)} />%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.max(2, value)}%`,
            background: `linear-gradient(90deg, ${from}, ${to})`,
            boxShadow: danger ? `0 0 10px ${to}` : 'none',
          }}
        />
      </div>
      <div className="mt-1 truncate text-[10px] text-stone-400">{hint}</div>
    </div>
  )
}

export default function StatHud({ state, muted, mood, onToggleMusic }) {
  const { balance, mental, suspicion, day } = state
  const brokeSoon = state.flags.received && balance < BANKRUPT_LINE * 1.8
  const week = Math.floor(day / 7)

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-4 py-3">
        {/* 잔고 */}
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] tracking-wide text-stone-500">통장 잔고</div>
            <div
              className={`font-mono text-2xl font-bold tabular-nums sm:text-3xl ${
                brokeSoon ? 'text-rose-600' : 'text-amber-600'
              }`}
            >
              <AnimatedNumber value={balance} duration={1100} />
              <span className="ml-1 text-base font-normal text-stone-400">원</span>
            </div>
            <div className="mt-0.5 text-[11px] text-stone-400">{koreanMoney(balance)}</div>
          </div>

          <div className="shrink-0 text-right">
            <div className="mb-1 flex justify-end">
              <MusicToggle muted={muted} onToggle={onToggleMusic} moodName={mood} />
            </div>
            <div className="font-mono text-lg tabular-nums text-stone-700">
              D+<AnimatedNumber value={day} duration={500} format={(n) => Math.round(n)} />
              <span className="text-stone-400">/{GOAL_DAYS}</span>
            </div>
            <div className="text-[11px] text-stone-400">{week}주 차</div>
          </div>
        </div>

        {/* 진행바 */}
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-700"
            style={{ width: `${Math.min(100, (day / GOAL_DAYS) * 100)}%` }}
          />
        </div>

        {/* 게이지 2종 */}
        <div className="flex gap-4">
          <Gauge
            label="멘탈 붕괴도"
            value={mental}
            hint={mental >= 70 ? '충동구매·사기 위험 급상승' : '아직은 버틸 만하다'}
            from="#38bdf8"
            to="#8b5cf6"
            danger={mental >= 70}
          />
          <Gauge
            label="의심도"
            value={suspicion}
            hint={suspicion >= 70 ? '주변이 눈치채고 있다' : '아직 아무도 모른다'}
            from="#fbbf24"
            to="#e11d48"
            danger={suspicion >= 70}
          />
        </div>
      </div>
    </header>
  )
}
