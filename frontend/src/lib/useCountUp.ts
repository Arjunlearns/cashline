// count-up hook: eases a displayed number from its previous value toward target
import { useEffect, useRef, useState } from "react";

/** Animates toward `target` with an ease-out curve via requestAnimationFrame. Cancels on unmount. */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = t >= 1 ? target : from + (target - from) * eased;
      fromRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

export default useCountUp;
