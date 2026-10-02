import type { CSSProperties, ComponentProps } from "react";
import type { GamePresentation } from "@/types/game";
import { GameActionFeedback } from "./game-action-feedback";
import { NextWordReveal } from "./next-word-reveal";
import { ResultReveal } from "./result-reveal";
import { TimeUpReveal } from "./time-up-reveal";
import WordCard from "./word-card";

type GameCenterStageProps = ComponentProps<typeof WordCard> & {
    presentation: GamePresentation;
    presentationStartedAt: string | null;
    serverNow: number;
};

export function GameCenterStage({
    presentation,
    presentationStartedAt,
    serverNow,
    ...wordCardProps
}: GameCenterStageProps) {
    const startedAt = presentationStartedAt
        ? Date.parse(presentationStartedAt)
        : serverNow;
    const elapsed = Number.isFinite(startedAt)
        ? Math.max(0, serverNow - startedAt)
        : 0;
    const sceneStyle = {
        "--game-scene-lag": `${-elapsed}ms`,
    } as CSSProperties;

    return (
        <div
            className="game-center-stage"
            data-presentation={presentation}
            style={sceneStyle}
        >
            {presentation === "feedback_correct" ||
            presentation === "feedback_wrong" ? (
                <GameActionFeedback
                    event={wordCardProps.history.at(-1)}
                    serverNow={serverNow}
                    prominent
                    outcome={
                        presentation === "feedback_correct"
                            ? "correct"
                            : "wrong"
                    }
                    startedAt={presentationStartedAt}
                />
            ) : presentation === "time_up" ? (
                <TimeUpReveal
                    word={wordCardProps.word}
                    correction={wordCardProps.correction}
                />
            ) : presentation === "result" ? (
                <ResultReveal
                    word={wordCardProps.word}
                    message={wordCardProps.message}
                    correction={wordCardProps.correction}
                />
            ) : presentation === "next_word" ? (
                <NextWordReveal />
            ) : (
                <>
                    <div className="game-center-stage__card">
                        <WordCard {...wordCardProps} />
                    </div>
                    <GameActionFeedback
                        event={wordCardProps.history.at(-1)}
                        serverNow={serverNow}
                    />
                </>
            )}
        </div>
    );
}

export default GameCenterStage;
