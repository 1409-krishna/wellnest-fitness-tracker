export default function InsightCard({ eyebrow, title, detail, children }) {
  return (
    <article className="rounded-3xl border border-sand bg-paper p-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-clay uppercase">{eyebrow}</p>
      <h2 className="font-display mt-2 text-2xl text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-ink/70">{detail}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  )
}
