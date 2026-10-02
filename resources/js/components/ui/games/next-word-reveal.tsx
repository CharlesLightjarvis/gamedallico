import { GameStageEffects } from "./game-stage-effects";

export function NextWordReveal() {
    return (
        <section
            className="game-reveal game-reveal--intro"
            aria-live="polite"
            aria-atomic="true"
        >
            <GameStageEffects tone="intro" />
            <div className="game-reveal__content">
                <p className="game-reveal__word">Prochain mot</p>
                <div className="game-reveal__ready-line" aria-hidden="true">
                    <span />
                    <i />
                    <span />
                </div>
                <p className="game-reveal__ready">
                    Le mot apparaît au lancement du chrono
                </p>
            </div>
        </section>
    );
}
