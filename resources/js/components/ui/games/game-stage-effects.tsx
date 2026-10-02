import type { CSSProperties } from "react";

export type GameSceneTone = "danger" | "victory" | "intro";

const PARTICLES = Array.from({ length: 14 }, (_, index) => ({
    angle: index * (360 / 14) + (index % 2) * 8,
    distance: 118 + (index % 4) * 34,
    delay: (index % 5) * 35,
    size: 3 + (index % 3) * 2,
}));

export function GameStageEffects({ tone }: { tone: GameSceneTone }) {
    return (
        <div className="game-stage-fx" data-tone={tone} aria-hidden="true">
            <span className="game-stage-fx__wash" />
            <span className="game-stage-fx__flash" />
            <span className="game-stage-fx__ring game-stage-fx__ring--one" />
            <span className="game-stage-fx__ring game-stage-fx__ring--two" />
            <span className="game-stage-fx__sweep" />
            {PARTICLES.map((particle, index) => (
                <span
                    key={index}
                    className="game-stage-fx__particle"
                    style={
                        {
                            "--particle-angle": `${particle.angle}deg`,
                            "--particle-distance": `${particle.distance}px`,
                            "--particle-delay": `${particle.delay}ms`,
                            "--particle-size": `${particle.size}px`,
                        } as CSSProperties
                    }
                />
            ))}
        </div>
    );
}
