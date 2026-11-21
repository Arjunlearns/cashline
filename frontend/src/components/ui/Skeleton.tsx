// loading placeholder: pulsing rounded block shown while data loads
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-surface-border ${className}`} />;
}
