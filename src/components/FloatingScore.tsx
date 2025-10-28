import { useEffect, useRef } from "react";

interface FloatingScoreProps {
  score: number;
  x: number;
  y: number;
  id: string;
  onComplete: (id: string) => void;
}

export function FloatingScore({ score, x, y, id, onComplete }: FloatingScoreProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete(id);
    }, 1000);

    return () => clearTimeout(timer);
  }, [id, onComplete]);

  return (
    <div
      ref={elementRef}
      className="absolute pointer-events-none animate-float-up z-50"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="text-primary font-bold text-2xl">
        +{score}
      </div>
    </div>
  );
}