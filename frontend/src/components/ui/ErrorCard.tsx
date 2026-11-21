// error card: red-tinted box for failed requests or computations
export default function ErrorCard({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
      {message}
    </div>
  );
}
