// playback clock for the 90-day forecast time-lapse
import { useCallback, useEffect, useRef, useState } from "react";

/** Full run length at 1x, in milliseconds. */
export const TIMELAPSE_MS = 8000;

/** Milliseconds per forecast day at the given speed. */
export function msPerDay(lastDay: number, speed: number): number {
  return TIMELAPSE_MS / (lastDay + 1) / speed;
}

/** True when the OS asks for reduced motion (false if it cannot be read). */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export interface Timelapse {
  /** Integer day index shown on the chart, 0..lastDay. */
  day: number;
  playing: boolean;
  speed: 1 | 2;
  /** True once the user has started playback at least once. */
  started: boolean;
  /** Pause if playing; otherwise start (restarts from day 0 when at the end). */
  toggle: () => void;
  /** Jump to the last day and stop. */
  skipToEnd: () => void;
  /** Move to a day and pause. */
  seek: (day: number) => void;
  setSpeed: (s: 1 | 2) => void;
}

/**
 * Drives a day-by-day playback over [0, lastDay] with requestAnimationFrame.
 * Reduced motion never animates: start and skip both jump to the end state.
 * The clock is cancelled on unmount or pause.
 */
export function useTimelapse(lastDay: number): Timelapse {
  const reduced = useRef(prefersReducedMotion()).current;
  const [day, setDay] = useState(lastDay);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState<1 | 2>(1);
  const [started, setStarted] = useState(false);
  // Fractional day position, kept in a ref so frames do not re-render per sub-day step.
  const pos = useRef(lastDay);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const perDay = msPerDay(lastDay, speed);

    const tick = (now: number) => {
      // Clamp the step so a backgrounded tab does not jump ahead.
      const dt = Math.min(now - last, 100);
      last = now;
      const next = Math.min(lastDay, pos.current + dt / perDay);
      pos.current = next;
      setDay(Math.floor(next));
      if (next >= lastDay) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, lastDay]);

  const toggle = useCallback(() => {
    if (playing) {
      setPlaying(false);
      return;
    }
    setStarted(true);
    if (reduced) {
      pos.current = lastDay;
      setDay(lastDay);
      return;
    }
    if (Math.floor(pos.current) >= lastDay) {
      pos.current = 0;
      setDay(0);
    }
    setPlaying(true);
  }, [playing, reduced, lastDay]);

  const skipToEnd = useCallback(() => {
    setStarted(true);
    setPlaying(false);
    pos.current = lastDay;
    setDay(lastDay);
  }, [lastDay]);

  const seek = useCallback(
    (d: number) => {
      const clamped = Math.max(0, Math.min(lastDay, Math.round(d)));
      setPlaying(false);
      pos.current = clamped;
      setDay(clamped);
    },
    [lastDay],
  );

  const setSpeed = useCallback((s: 1 | 2) => setSpeedState(s), []);

  return { day, playing, speed, started, toggle, skipToEnd, seek, setSpeed };
}
