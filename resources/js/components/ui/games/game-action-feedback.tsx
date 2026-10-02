import type { CSSProperties } from "react";
import type { HistoryEvent } from "./word-card";

const FEEDBACK_DURATION = 1_600;

type FeedbackOutcome = "correct" | "wrong";

export function GameActionFeedback({
    event,
    serverNow,
    prominent = false,
    outcome,
    startedAt,
}: {
    event: HistoryEvent | undefined;
    serverNow: number;
    prominent?: boolean;
    outcome?: FeedbackOutcome;
    startedAt?: string | null;
}) {
    if (!outcome && (!event?.occurred_at || event.type === "system")) return null;

    const occurredAt = Date.parse(startedAt ?? event?.occurred_at ?? "");
    const elapsed = Number.isFinite(occurredAt)
        ? Math.max(0, serverNow - occurredAt)
        : 0;
    const duration = prominent ? 1_000 : FEEDBACK_DURATION;

    // A presentation is controlled by the server. It must stay rendered until
    // the server changes scenes, even when the next network tick arrives late.
    if (!prominent && elapsed >= duration) return null;

    const isPoint =
        outcome === "correct" ||
        (!outcome && (event?.type === "correct" || event?.type === "bonus"));
    const isWrong =
        outcome === "wrong" ||
        (!outcome && (event?.type === "wrong" || event?.type === "pass"));
    const label = isPoint
        ? `+${event?.points ?? 1}`
        : isWrong
          ? "Raté"
          : "Buzz !";
    const detail = prominent
        ? isPoint
            ? "Bonne conjugaison"
            : "Mauvaise réponse"
        : isPoint
          ? "Point gagné"
          : isWrong
            ? "La main est libérée"
            : `${event?.player ?? "Un joueur"} prend la main`;
    const color = isPoint
        ? "#34d399"
        : isWrong
          ? "#fb7185"
          : (event?.color ?? "#60a5fa");
    const animationElapsed = prominent
        ? Math.min(elapsed, duration * 0.68)
        : elapsed;

    return (
        <div
            key={event?.id ?? `${outcome}-${startedAt}`}
            className={
                prominent
                    ? "game-action-feedback game-action-feedback--prominent"
                    : "game-action-feedback"
            }
            data-kind={isPoint ? "point" : isWrong ? "wrong" : "buzz"}
            style={
                {
                    "--action-color": color,
                    "--action-lag": `${-animationElapsed}ms`,
                } as CSSProperties
            }
            aria-live="polite"
            aria-atomic="true"
        >
            <span className="game-action-feedback__pulse" aria-hidden="true" />
            <span className="game-action-feedback__ring" aria-hidden="true" />
            <span
                className="game-action-feedback__ring game-action-feedback__ring--late"
                aria-hidden="true"
            />
            <div className="game-action-feedback__copy">
                <strong>{label}</strong>
                <span>{detail}</span>
            </div>
            <div className="game-action-feedback__streaks" aria-hidden="true">
                {Array.from({ length: 8 }, (_, index) => (
                    <i key={index} style={{ "--streak": index } as CSSProperties} />
                ))}
            </div>
        </div>
    );
}
