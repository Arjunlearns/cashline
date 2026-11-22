// time-lapse controls: play/pause/replay, skip, speed, and day scrubber
import type { Timelapse } from "./useTimelapse";

export default function TimelapseControls({
  tl,
  lastDay,
  dateLabel,
}: {
  tl: Timelapse;
  lastDay: number;
  /** Human label for the current day, e.g. "14 Jun". */
  dateLabel: string;
}) {
  const atEnd = tl.day >= lastDay && !tl.playing;
  const primary = tl.playing ? "Pause" : atEnd && tl.started ? "Replay" : "Play";
  const btn =
    "rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-text hover:border-accent focus-visible:outline-2 focus-visible:outline-accent";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={tl.toggle}
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-bg focus-visible:outline-2 focus-visible:outline-accent"
      >
        {primary}
      </button>
      {!atEnd && (
        <button type="button" onClick={tl.skipToEnd} className={btn}>
          Skip to end
        </button>
      )}
      <div role="group" aria-label="Playback speed" className="flex overflow-hidden rounded-full border border-surface-border">
        {([1, 2] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={tl.speed === s}
            onClick={() => tl.setSpeed(s)}
            className={`px-3 py-1 text-xs font-medium ${tl.speed === s ? "bg-surface-border text-text" : "text-text-muted"}`}
          >
            {s}x
          </button>
        ))}
      </div>
      <label className="flex min-w-[12rem] flex-1 items-center gap-3 text-xs text-text-muted">
        <span className="whitespace-nowrap tabular-nums">
          Day {tl.day} · {dateLabel}
        </span>
        <input
          type="range"
          aria-label="Timeline day"
          min={0}
          max={lastDay}
          step={1}
          value={tl.day}
          onChange={(e) => tl.seek(Number(e.target.value))}
          className="flex-1 accent-accent"
        />
      </label>
    </div>
  );
}
