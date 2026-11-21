export default function StatCard({ label, value, hint, accent = false }) {
  return (
    <article
      className={`rounded-3xl border border-sand p-5 ${accent ? 'bg-sage text-paper' : 'bg-paper'}`}
    >
      <p className={`text-sm ${accent ? 'text-paper/80' : 'text-ink/55'}`}>{label}</p>
      <p className="font-display mt-2 text-3xl">{value}</p>
      {hint ? <p className={`mt-2 text-sm ${accent ? 'text-paper/80' : 'text-ink/50'}`}>{hint}</p> : null}
    </article>
  )
}
