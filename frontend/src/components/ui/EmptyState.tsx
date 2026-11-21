// empty-list placeholder: muted, centred, dashed-border card with a title and body line
export default function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center">
      <p className="text-sm font-medium text-text-muted">{title}</p>
      <p className="mt-1 text-xs text-text-muted">{body}</p>
    </div>
  );
}
