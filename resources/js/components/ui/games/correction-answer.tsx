export type GameCorrection = {
    translation: string;
    strength: "fort" | "faible";
    conjugation: string;
};

export function CorrectionAnswer({
    word,
    correction,
}: {
    word: string;
    correction: GameCorrection | null;
}) {
    return (
        <div className="game-correction">
            <p className="game-reveal__answer">
                <span>{word}</span>
                <span className="game-reveal__equals">=</span>
                <strong>{correction?.translation ?? "—"}</strong>
            </p>
            {correction ? (
                <div className="game-correction__grammar">
                    <strong className="game-correction__conjugation">
                        {correction.conjugation}
                    </strong>
                    <span className="game-correction__strength">
                        Verbe {correction.strength}
                    </span>
                </div>
            ) : null}
        </div>
    );
}
