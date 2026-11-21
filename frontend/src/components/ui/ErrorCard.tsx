// error card: red-tinted box for failed requests or computations
export default function ErrorCard({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
      {message}
    </div>
  );
}
