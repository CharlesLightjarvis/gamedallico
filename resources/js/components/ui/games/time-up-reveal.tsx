import { GameStageEffects } from "./game-stage-effects";
import {
    CorrectionAnswer,
    type GameCorrection,
} from "./correction-answer";

export function TimeUpReveal({
    word,
    correction,
}: {
    word: string;
    correction: GameCorrection | null;
}) {
    return (
        <section
            className="game-reveal game-reveal--danger"
            aria-live="assertive"
            aria-atomic="true"
        >
            <GameStageEffects tone="danger" />
            <div className="game-reveal__content">
                <p className="game-reveal__title">Temps écoulé</p>
                <div className="game-reveal__divider" aria-hidden="true" />
                <p className="game-reveal__answer-label">La réponse était</p>
                <CorrectionAnswer word={word} correction={correction} />
            </div>
        </section>
    );
}
