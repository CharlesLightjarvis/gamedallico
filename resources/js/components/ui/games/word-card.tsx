"use client";

export type GameStage = "translation" | "grammar" | "conjugation" | "done";

export type HistoryEventType =
    | "buzz"
    | "correct"
    | "wrong"
    | "bonus"
    | "pass"
    | "system";

export type HistoryEvent = {
    id: string;
    player?: string;
    color?: string;
    type: HistoryEventType;
    text: string;
    points?: number;
};

type ActivePlayer = {
    name: string;
    color: string;
} | null;

type WordCardProps = {
    stage: GameStage;
    activePlayer: ActivePlayer;
    activeId: number | null;
    roundTime: number;
    playerTime: number;
    viewerPlayerId?: number;
    answer: string;
    grammarSelection: "fort" | "faible" | null;
    message: string;
    questionLabel: string;
    history: HistoryEvent[];
    nextWordCountdown: number;
    word: string;
    correction: {
        translation: string;
        strength: "fort" | "faible";
        conjugation: string;
    } | null;
};

function HistoryLine({ event }: { event: HistoryEvent }) {
    return (
        <div className="flex items-center justify-center gap-1.5 text-[9px] leading-4 text-white/55 lg:text-xs">
            <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: event.color ?? "#7c8cb3" }}
            />
            {event.player ? (
                <strong style={{ color: event.color }}>{event.player}</strong>
            ) : null}
            <span className="truncate">{event.text}</span>
            {typeof event.points === "number" ? (
                <strong className="text-white">+{event.points}</strong>
            ) : null}
        </div>
    );
}

export function WordCard({
    stage,
    activePlayer,
    activeId,
    roundTime,
    playerTime,
    viewerPlayerId,
    answer,
    grammarSelection,
    message,
    questionLabel,
    history,
    nextWordCountdown,
    word,
    correction,
}: WordCardProps) {
    const accent = activePlayer?.color ?? "#55a2ff";
    const currentTime = activeId !== null ? playerTime : roundTime;
    const isAnswering = activeId !== null && stage !== "done";
    const isViewerAnswering = activeId === viewerPlayerId;
    const activeQuestion =
        stage === "translation"
            ? `Traduction du mot ${word}`
            : stage === "grammar"
              ? "Est-ce que le verbe est fort ou faible ?"
              : "Conjugaison à la troisième personne du singulier au présent";
    const centralContent = isAnswering ? answer || "__________" : word;
    const messageColor =
        message.includes("correcte") ||
        message.includes("Faible") ||
        message.includes("Maîtrise")
            ? "#6ee7b7"
            : message.includes("Temps écoulé") ||
                message.includes("Mauvaise") ||
                message.includes("Faux") ||
                message.includes("Réponse :")
              ? "#fbbf24"
              : activePlayer
                ? accent
                : "#7dd3fc";

    return (
        <section className="relative z-10 w-[min(68vw,560px)] text-center text-white">
            {!isAnswering ? (
                <div className="mx-auto inline-flex items-baseline gap-1.5 rounded-full border border-white/10 bg-[#060822]/60 px-3 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,.25)] backdrop-blur-md lg:px-4 lg:py-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/45 lg:text-[10px]">
                        Temps
                    </span>
                    <strong
                        className="text-xl font-black tabular-nums tracking-[-0.04em] text-white lg:text-3xl"
                        style={{
                            textShadow: "0 0 16px rgba(125,211,252,.28)",
                        }}
                    >
                        00:{String(currentTime).padStart(2, "0")}
                    </strong>
                </div>
            ) : null}

            <div className={isViewerAnswering ? "mt-1" : "mt-3 lg:mt-5"}>
                <p
                    className="mx-auto max-w-[420px] text-[8px] font-black uppercase leading-relaxed  lg:text-[10px]"
                    style={{
                        color: isAnswering ? accent : "#7dd3fc",
                        textShadow: `0 0 14px ${isAnswering ? accent : "#7dd3fc"}66`,
                    }}
                >
                    {isAnswering && activePlayer
                        ? `${activePlayer.name} a la main`
                        : questionLabel}
                </p>

                {isAnswering ? (
                    <p className="mx-auto mt-1 max-w-[440px] text-[9px] font-semibold text-white/60 lg:text-xs">
                        {activeQuestion}
                    </p>
                ) : null}

                <h1 className="mt-1.5 break-words text-[clamp(1.85rem,6.5vw,3.8rem)] font-black leading-[0.98] tracking-[-0.06em] text-slate-50 [text-shadow:0_0_22px_rgba(125,211,252,.22),0_8px_28px_rgba(0,0,0,.45)] lg:mt-2">
                    {stage === "done" ? (
                        <>
                            {word}
                            <span className="mx-1.5 text-white/35">=</span>
                            {correction?.translation ?? "—"}
                        </>
                    ) : isAnswering && stage === "grammar" ? (
                        <span className="mx-auto grid max-w-[420px] grid-cols-2 gap-2 text-sm tracking-normal lg:gap-3 lg:text-lg">
                            {(["fort", "faible"] as const).map((choice) => {
                                const selected = grammarSelection === choice;

                                return (
                                    <span
                                        key={choice}
                                        className={[
                                            "rounded-xl border px-4 py-3 capitalize transition-all duration-200",
                                            selected
                                                ? "border-amber-300 bg-amber-300 text-[#11142d] shadow-[0_0_22px_rgba(251,191,36,.4)]"
                                                : "border-white/15 bg-white/[0.06] text-white/65",
                                        ].join(" ")}
                                    >
                                        {choice}
                                    </span>
                                );
                            })}
                        </span>
                    ) : (
                        centralContent
                    )}
                </h1>

                <p
                    className="mx-auto mt-2 max-w-md text-[10px] font-bold lg:mt-3 lg:text-sm"
                    style={{
                        color: messageColor,
                        textShadow: `0 0 14px ${messageColor}66`,
                    }}
                >
                    {message}
                </p>
            </div>

            <div className="mx-auto mt-3 max-w-[440px] lg:mt-5">
                {stage === "done" ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.08] px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/75 shadow-[0_10px_30px_rgba(0,0,0,.25)] backdrop-blur-md lg:text-xs">
                        Prochain mot dans {nextWordCountdown} s
                    </div>
                ) : null}
            </div>

            <div className="mx-auto mt-3 max-w-[360px] lg:mt-5">
                {history.slice(-3).map((event) => (
                    <HistoryLine key={event.id} event={event} />
                ))}
            </div>
        </section>
    );
}

export default WordCard;
