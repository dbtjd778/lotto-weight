import { koreanMoney } from './AnimatedNumber'

function Delta({ label, value, invert }) {
  if (!value) return null
  // invert: 값이 오르는 게 나쁜 스탯 (멘탈/의심도)
  const bad = invert ? value > 0 : value < 0
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
        bad ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      <span className="text-stone-500">{label}</span>
      <span className="font-mono tabular-nums">
        {value > 0 ? '+' : ''}
        {label === '잔고' ? koreanMoney(value) : value}
      </span>
    </div>
  )
}

export default function ResultCard({ result, onNext }) {
  const e = result.effect ?? {}

  return (
    <div className="animate-[fadeUp_320ms_ease-out]">
      <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-300/30">
        <div className="border-b border-stone-200 bg-stone-50/80 px-5 py-3">
          <div className="text-[11px] tracking-widest text-stone-400">당신의 선택</div>
          <div className="mt-0.5 text-sm font-medium text-amber-700">{result.choiceText}</div>
        </div>

        {result.text && (
          <div className="px-5 py-6 sm:px-6">
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-stone-800">
              {result.text}
            </p>
          </div>
        )}

        {(e.balance || e.mental || e.suspicion) && (
          <div className="grid gap-2 border-t border-stone-200 px-5 py-4 sm:grid-cols-3 sm:px-6">
            <Delta label="잔고" value={e.balance} />
            <Delta label="멘탈 붕괴도" value={e.mental} invert />
            <Delta label="의심도" value={e.suspicion} invert />
          </div>
        )}

        <div className="border-t border-stone-200 bg-stone-50/60 p-4 sm:p-5">
          <button
            onClick={onNext}
            className="w-full rounded-xl bg-amber-500 px-4 py-3.5 font-semibold text-white shadow-sm transition hover:bg-amber-600 active:scale-[0.99]"
          >
            계속한다
          </button>
        </div>
      </article>
    </div>
  )
}
