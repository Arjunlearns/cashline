// empty-list placeholder: muted, centred, dashed-border card with a title and body line
export default function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
      <p className="text-sm font-medium text-[#8a909c]">{title}</p>
      <p className="mt-1 text-xs text-[#8a909c]">{body}</p>
    </div>
  );
}
