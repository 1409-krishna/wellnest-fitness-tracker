export default function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-sage/30 bg-paper p-8 text-center">
      <p className="font-display text-xl text-sage">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">{body}</p>
      {action}
    </div>
  )
}
