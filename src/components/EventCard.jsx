import Avatar from './Avatar'
import { koreanMoney } from './AnimatedNumber'

/** 선택지에 붙는 효과 미리보기 (금액만 노출, 스탯은 숨긴다 — 쪼는 맛) */
function CostHint({ effect }) {
  if (!effect?.balance) return null
  const up = effect.balance > 0
  return (
    <span
      className={`ml-auto shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
        up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}
    >
      {up ? '+' : '−'}
      {koreanMoney(Math.abs(effect.balance)).replace('원', '')}
    </span>
  )
}

export default function EventCard({ event, onChoose, notices }) {
  return (
    <div className="animate-[fadeUp_360ms_ease-out]">
      {notices?.length > 0 && (
        <div className="mb-4 space-y-2">
          {notices.map((n, i) => (
            <div
              key={i}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
            >
              <span className="mr-2 font-semibold text-amber-600">그동안…</span>
              {n}
            </div>
          ))}
        </div>
      )}

      <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-300/30">
        <div className="flex items-center gap-3 border-b border-stone-200 bg-stone-50/80 px-4 py-3">
          <Avatar id={event.speaker} size={48} showName />
          {event.category && (
            <span className="ml-auto shrink-0 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[10px] tracking-wide text-stone-500">
              {event.category}
            </span>
          )}
        </div>

        <div className="px-5 py-5 sm:px-6">
          {event.chapter && (
            <div className="mb-2 text-[11px] tracking-widest text-stone-400">{event.chapter}</div>
          )}
          <h2 className="mb-3 text-xl font-bold leading-snug text-stone-900 sm:text-2xl">
            {event.title}
          </h2>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-stone-700">
            {event.description}
          </p>
        </div>

        <div className="space-y-2 border-t border-stone-200 bg-stone-50/60 p-4 sm:p-5">
          {event.options.map((o, i) => (
            <button
              key={i}
              onClick={() => onChoose(i)}
              className="group flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:-translate-y-px hover:border-amber-400 hover:bg-amber-50/60 hover:shadow-md active:translate-y-0"
            >
              <span className="shrink-0 font-mono text-xs text-stone-400 group-hover:text-amber-600">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[15px] leading-snug text-stone-800 group-hover:text-stone-950">
                {o.text}
              </span>
              <CostHint effect={o.effect} />
            </button>
          ))}
        </div>
      </article>
    </div>
  )
}
