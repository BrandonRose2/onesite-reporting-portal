import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%*+";

export function ScrambleText({ text, className = "" }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const [hasStarted, setHasStarted] = useState(false);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setHasStarted(true);
    }, { threshold: 0.45 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const totalFrames = Math.max(10, text.length);
    const interval = window.setInterval(() => {
      frame += 1;
      const settled = Math.min(text.length, Math.floor((frame / totalFrames) * text.length));
      setDisplay(text.split("").map((character, index) => {
        if (character === " " || index < settled) return character;
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }).join(""));
      if (frame >= totalFrames) {
        window.clearInterval(interval);
        setDisplay(text);
      }
    }, 24);
    return () => window.clearInterval(interval);
  }, [hasStarted, text]);

  return <span ref={nodeRef} className={`scramble-wrap ${className}`}><span aria-hidden="true">{display}</span><span className="sr-only">{text}</span></span>;
}
