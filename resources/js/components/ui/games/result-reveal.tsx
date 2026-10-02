import { GameStageEffects } from "./game-stage-effects";
import {
    CorrectionAnswer,
    type GameCorrection,
} from "./correction-answer";

export function ResultReveal({
    word,
    message,
    correction,
}: {
    word: string;
    message: string;
    correction: GameCorrection | null;
}) {
    const mastered = message.includes("Maîtrise");

    return (
        <section
            className="game-reveal game-reveal--victory"
            aria-live="polite"
            aria-atomic="true"
        >
            <GameStageEffects tone="victory" />
            <div className="game-reveal__content">
                <p className="game-reveal__title">
                    {mastered ? "Maîtrisé !" : "Correction"}
                </p>
                <p className="game-reveal__message">{message}</p>
                <CorrectionAnswer word={word} correction={correction} />
            </div>
        </section>
    );
}
