// full-page animated aurora backdrop with grain, vignette, cash-state tint and calm/pause controls
import { useEffect } from "react";
import { getCalm } from "../../lib/theme";

// Inline SVG fractal noise used as the grain layer.
const GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export default function AuroraBackground() {
  useEffect(() => {
    const root = document.documentElement;
    const calm = getCalm();
    if (calm) root.classList.add("calm");

    // Pause the drift while the tab is hidden.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") root.setAttribute("data-paused", "");
      else root.removeAttribute("data-paused");
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      root.removeAttribute("data-paused");
      if (calm) root.classList.remove("calm");
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none overflow-hidden aurora-root">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
      <div className="aurora-grain" style={{ backgroundImage: GRAIN_URL }} />
      <div className="aurora-vignette" />
      <div className="aurora-tint" />
    </div>
  );
}
