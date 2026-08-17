import { useEffect, useRef } from "react";

type Point = { x: number; y: number; radius: number; alpha: number; drift: number };

function sizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  const context = canvas.getContext("2d");
  context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return context;
}

export function PortalAtmosphere() {
  const starsRef = useRef<HTMLCanvasElement>(null);
  const orbitsRef = useRef<HTMLCanvasElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const starCanvas = starsRef.current;
    const orbitCanvas = orbitsRef.current;
    const grainCanvas = grainRef.current;
    if (!starCanvas || !orbitCanvas || !grainCanvas) return;

    let starsContext = sizeCanvas(starCanvas);
    let orbitContext = sizeCanvas(orbitCanvas);
    let grainContext = sizeCanvas(grainCanvas);
    const motionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const points: Point[] = Array.from({ length: Math.min(80, Math.floor(window.innerWidth / 18)) }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 1.15 + 0.25,
      alpha: Math.random() * 0.24 + 0.08,
      drift: Math.random() * 0.12 + 0.02,
    }));
    let frame = 0;
    let animationFrame = 0;

    const draw = () => {
      const stars = starsContext;
      const orbits = orbitContext;
      const grain = grainContext;
      if (!stars || !orbits || !grain) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      stars.clearRect(0, 0, width, height);
      orbits.clearRect(0, 0, width, height);
      grain.clearRect(0, 0, width, height);

      points.forEach(point => {
        if (!motionReduced) {
          point.y += point.drift;
          if (point.y > height + 4) {
            point.y = -4;
            point.x = Math.random() * width;
          }
        }
        stars.beginPath();
        stars.fillStyle = `rgba(31, 126, 117, ${point.alpha})`;
        stars.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        stars.fill();
      });

      const t = motionReduced ? 0 : frame * 0.003;
      const centerX = width * 0.78;
      const centerY = height * 0.18;
      [110, 168, 228].forEach((radius, index) => {
        orbits.save();
        orbits.translate(centerX, centerY);
        orbits.rotate(t * (index % 2 ? -1 : 1) + index * 0.8);
        orbits.beginPath();
        orbits.strokeStyle = `rgba(13, 116, 105, ${0.06 - index * 0.012})`;
        orbits.lineWidth = 1;
        orbits.ellipse(0, 0, radius, radius * 0.43, 0, 0, Math.PI * 1.55);
        orbits.stroke();
        orbits.restore();
      });

      for (let index = 0; index < 135; index += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        grain.fillStyle = "rgba(18, 43, 75, 0.018)";
        grain.fillRect(x, y, 1, 1);
      }
      frame += 1;
      if (!motionReduced) animationFrame = requestAnimationFrame(draw);
    };

    const resize = () => {
      starsContext = sizeCanvas(starCanvas);
      orbitContext = sizeCanvas(orbitCanvas);
      grainContext = sizeCanvas(grainCanvas);
      points.splice(0, points.length, ...Array.from({ length: Math.min(80, Math.floor(window.innerWidth / 18)) }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 1.15 + 0.25,
        alpha: Math.random() * 0.24 + 0.08,
        drift: Math.random() * 0.12 + 0.02,
      })));
      draw();
    };

    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <div className="portal-atmosphere" aria-hidden="true"><canvas ref={starsRef} /><canvas ref={orbitsRef} /><canvas ref={grainRef} /></div>;
}
