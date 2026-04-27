import { useState } from "react";

export interface Particle {
  id: number;
  emoji: string;
  dx: number;
  dy: number;
  delay: number;
}

let particleCounter = 0;

/**
 * 포켓몬 상호작용 시 나타나는 파티클 효과를 관리하는 훅
 */
export function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  const burstParticles = (kind: "level" | "heart") => {
    const baseEmoji = kind === "level" ? ["⭐", "✨", "✦", "★"] : ["💗", "♥", "💕"];
    const newOnes: Particle[] = Array.from({ length: 10 }, () => ({
      id: ++particleCounter,
      emoji: baseEmoji[Math.floor(Math.random() * baseEmoji.length)],
      dx: (Math.random() - 0.5) * 200,
      dy: -100 - Math.random() * 80,
      delay: Math.random() * 200,
    }));

    setParticles((prev) => [...prev, ...newOnes]);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newOnes.includes(p)));
    }, 1400);
  };

  return { particles, burstParticles };
}
