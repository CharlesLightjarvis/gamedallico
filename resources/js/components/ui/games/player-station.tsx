"use client";

import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Buzzer from "./buzzer";
import type { GameStage } from "./word-card";

export type Player = {
    id: number;
    name: string;
    score: number;
    color: string;
    used: boolean;
};

export type PlayerPosition = "top" | "left" | "right" | "bottom";

type PlayerStationProps = {
    player: Player;
    position: PlayerPosition;
    activeId: number | null;
    stage: GameStage;
    playerTime: number;
    viewerPlayerId?: number;
    answer: string;
    grammarSelection: "fort" | "faible" | null;
    word: string;
    onBuzz: (id: number) => void;
    onAnswerChange: (value: string) => void;
    onSubmitTranslation: () => void;
    onSubmitGrammar: (value: "fort" | "faible") => void;
    onSubmitConjugation: () => void;
};

const positionClasses: Record<PlayerPosition, string> = {
    top: "left-1/2 top-[18px] ml-[-53px] lg:top-[18px] lg:ml-[-92px]",
    left: "left-[2%] top-[19%] lg:left-[5%] lg:top-[34%]",
    right: "right-[2%] top-[19%] lg:right-[5%] lg:top-[34%]",
    bottom: "bottom-[1%] left-1/2 ml-[-53px] lg:bottom-[2%] lg:ml-[-92px]",
};

const answerPanelPositionClasses: Record<PlayerPosition, string> = {
    top: "lg:bottom-auto lg:left-1/2 lg:top-[165px] lg:-translate-x-1/2",
    left: "lg:bottom-auto lg:left-[168px] lg:top-[48px] lg:translate-x-0",
    right: "lg:bottom-auto lg:left-auto lg:right-[168px] lg:top-[48px] lg:translate-x-0",
    bottom: "lg:bottom-[166px] lg:left-1/2 lg:-translate-x-1/2",
};

function AnswerPanelLayer({ children }: { children: ReactNode }) {
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(min-width: 1024px)");
        const updateLayoutMode = () => setIsDesktop(mediaQuery.matches);

        setPortalTarget(document.body);
        updateLayoutMode();
        mediaQuery.addEventListener("change", updateLayoutMode);

        return () => {
            mediaQuery.removeEventListener("change", updateLayoutMode);
        };
    }, []);

    if (!portalTarget || isDesktop) {
        return children;
    }

    return createPortal(children, portalTarget);
}

export function PlayerStation({
    player,
    position,
    activeId,
    stage,
    playerTime,
    viewerPlayerId,
    answer,
    grammarSelection,
    word,
    onBuzz,
    onAnswerChange,
    onSubmitTranslation,
    onSubmitGrammar,
    onSubmitConjugation,
}: PlayerStationProps) {
    const active = activeId === player.id;
    const isActiveViewer = viewerPlayerId === player.id;
    const isLocalDemo = viewerPlayerId === undefined;
    const canControl = isLocalDemo || isActiveViewer;
    const buzzerLocked =
        player.used || stage === "done" || (activeId !== null && !active);
    const answerPanelRef = useRef<HTMLDivElement>(null);
    const playerTimeProgress = Math.max(
        0,
        Math.min(100, (playerTime / 15) * 100),
    );

    const buzzerColorClasses: Record<string, string> = {
        "#ef4444": "",
        "#3b82f6": "[filter:hue-rotate(220deg)]",
        "#f59e0b": "[filter:hue-rotate(38deg)_saturate(1.2)]",
        "#22c55e": "[filter:hue-rotate(105deg)]",
    };

    useEffect(() => {
        if (!active || (!isActiveViewer && !isLocalDemo)) {
            return;
        }

        const viewport = window.visualViewport;
        let animationFrame = 0;
        const settleTimers: number[] = [];

        const placeAnswerPanel = () => {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = window.requestAnimationFrame(() => {
                const panel = answerPanelRef.current;

                if (
                    !panel ||
                    window.matchMedia("(min-width: 1024px)").matches
                ) {
                    return;
                }

                const visibleTop = viewport?.offsetTop ?? 0;
                const visibleHeight = viewport?.height ?? window.innerHeight;
                const panelHeight = panel.getBoundingClientRect().height;
                const panelTop = Math.max(
                    visibleTop + 8,
                    visibleTop + visibleHeight - panelHeight - 12,
                );

                panel.style.bottom = "auto";
                panel.style.top = `${Math.round(panelTop)}px`;
            });
        };

        const placeUntilSettled = () => {
            settleTimers.forEach(window.clearTimeout);
            settleTimers.length = 0;
            placeAnswerPanel();

            for (const delay of [50, 150, 300]) {
                settleTimers.push(window.setTimeout(placeAnswerPanel, delay));
            }
        };

        const resizeObserver = new ResizeObserver(placeAnswerPanel);

        if (answerPanelRef.current) {
            resizeObserver.observe(answerPanelRef.current);
        }

        placeUntilSettled();
        viewport?.addEventListener("resize", placeUntilSettled);
        viewport?.addEventListener("scroll", placeUntilSettled);
        viewport?.addEventListener("scrollend", placeAnswerPanel);
        window.addEventListener("resize", placeUntilSettled);
        document.addEventListener("focusin", placeUntilSettled);
        document.addEventListener("focusout", placeUntilSettled);

        return () => {
            window.cancelAnimationFrame(animationFrame);
            settleTimers.forEach(window.clearTimeout);
            resizeObserver.disconnect();
            viewport?.removeEventListener("resize", placeUntilSettled);
            viewport?.removeEventListener("scroll", placeUntilSettled);
            viewport?.removeEventListener("scrollend", placeAnswerPanel);
            window.removeEventListener("resize", placeUntilSettled);
            document.removeEventListener("focusin", placeUntilSettled);
            document.removeEventListener("focusout", placeUntilSettled);
        };
    }, [active, isActiveViewer, isLocalDemo]);

    return (
        <section
            className={[
                "absolute z-20 flex w-[106px] flex-col items-center lg:w-[184px]",
                positionClasses[position],
                buzzerLocked && !active ? "opacity-45" : "opacity-100",
            ].join(" ")}
            aria-label={`${player.name}, ${player.score} points`}
        >
            {active && stage !== "done" && (!isActiveViewer || isLocalDemo) ? (
                <div className="absolute -top-2 left-1/2 h-1.5 w-20 -translate-x-1/2 overflow-hidden rounded-full bg-white/10 shadow-[0_0_16px_rgba(245,158,11,.18)] lg:-top-3 lg:w-40">
                    <div
                        className="h-full rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,.7)] transition-[width] duration-300"
                        style={{ width: `${playerTimeProgress}%` }}
                    />
                </div>
            ) : null}

            <div
                className={[
                    "relative z-20 flex max-w-full items-center gap-1.5 rounded-full px-2 py-1.5 lg:gap-2 lg:px-3 lg:py-2",
                    "border bg-[#080a25]/82 shadow-[0_8px_28px_rgba(0,0,0,.42)] backdrop-blur-md",
                    active ? "border-white/45" : "border-white/10",
                ].join(" ")}
                style={{
                    boxShadow: active
                        ? `0 8px 30px rgba(0,0,0,.5), 0 0 24px ${player.color}55`
                        : undefined,
                }}
            >
                <span
                    className="grid size-6 shrink-0 place-items-center rounded-full border text-[9px] font-black text-white lg:size-8 lg:text-xs"
                    style={{
                        borderColor: player.color,
                        backgroundColor: `${player.color}28`,
                    }}
                    aria-hidden="true"
                >
                    {player.name.charAt(0)}
                </span>

                <strong className="min-w-0 truncate text-[10px] font-semibold text-white lg:text-sm">
                    {player.name}
                </strong>

                <span
                    className="shrink-0 text-base font-black tabular-nums lg:text-2xl"
                    style={{ color: player.color }}
                >
                    {player.score}
                </span>
            </div>

            <div className="relative -mt-5 size-[92px] lg:-mt-8 lg:size-[158px]">
                <div
                    className={[
                        "absolute left-1/2 top-1/2 origin-center -translate-x-1/2 -translate-y-1/2 scale-[0.39] lg:scale-[0.62]",
                        buzzerColorClasses[player.color] ?? "",
                        active
                            ? "drop-shadow-[0_0_22px_rgba(255,255,255,.25)]"
                            : "",
                    ].join(" ")}
                >
                    <Buzzer
                        locked={buzzerLocked}
                        disabled={!canControl || buzzerLocked}
                        label={active ? "À TOI" : undefined}
                        onBuzz={() => onBuzz(player.id)}
                    />
                </div>
            </div>

            {active ? (
                <span
                    className="-mt-2 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white lg:-mt-3 lg:text-[10px]"
                    style={{ backgroundColor: player.color }}
                >
                    À toi
                </span>
            ) : null}

            {active && stage !== "done" && (isActiveViewer || isLocalDemo) ? (
                <AnswerPanelLayer>
                    <div
                        ref={answerPanelRef}
                        className={[
                            "fixed bottom-3 left-1/2 top-auto z-[100] w-[calc(100vw-24px)] max-w-[380px] -translate-x-1/2 rounded-[18px] border border-amber-300/25 bg-[#0c1027]/95 p-2.5",
                            "shadow-[0_18px_50px_rgba(0,0,0,.5)] backdrop-blur-xl lg:absolute lg:w-[320px] lg:p-3",
                            answerPanelPositionClasses[position],
                        ].join(" ")}
                        style={
                            {
                                boxShadow: `0 18px 50px rgba(0,0,0,.5), 0 0 28px ${player.color}22`,
                            } as CSSProperties
                        }
                    >
                        <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0 text-left">
                                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-300 lg:text-[9px]">
                                    {stage === "translation"
                                        ? "Traduction"
                                        : "Bonus"}
                                </p>
                                <p className="mt-0.5 text-[10px] font-bold leading-snug text-white lg:text-xs">
                                    {stage === "translation"
                                        ? `Que signifie « ${word} » ?`
                                        : stage === "grammar"
                                          ? "Est-ce que ce verbe est fort ou faible ?"
                                          : "Conjuguez à la troisième personne du singulier au présent."}
                                </p>
                            </div>

                            <strong className="shrink-0 text-sm font-black tabular-nums text-amber-300 lg:text-base">
                                00:{String(playerTime).padStart(2, "0")}
                            </strong>
                        </div>

                        <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,.55)] transition-[width] duration-300"
                                style={{ width: `${playerTimeProgress}%` }}
                            />
                        </div>

                        {stage === "translation" ? (
                            <form
                                className="flex gap-1.5"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    onSubmitTranslation();
                                }}
                            >
                                <Input
                                    value={answer}
                                    onChange={(event) =>
                                        onAnswerChange(event.target.value)
                                    }
                                    placeholder="Votre réponse"
                                    aria-label="Votre traduction"
                                    className="h-10 min-w-0 flex-1 rounded-xl border-white/15 bg-white/[0.07] px-3 text-base text-white placeholder:text-white/35 focus-visible:ring-amber-300/35 lg:h-9 lg:text-xs"
                                />
                                <Button
                                    type="submit"
                                    disabled={!answer.trim()}
                                    className="h-9 rounded-xl bg-amber-300 px-3 text-[10px] font-black text-[#11142d] hover:bg-amber-200"
                                >
                                    Répondre
                                </Button>
                            </form>
                        ) : null}

                        {stage === "grammar" ? (
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    onClick={() => onSubmitGrammar("fort")}
                                    disabled={grammarSelection !== null}
                                    className={[
                                        "h-9 rounded-xl border text-[10px] font-black disabled:opacity-100",
                                        grammarSelection === "fort"
                                            ? "border-amber-300 bg-amber-300 text-[#11142d] hover:bg-amber-300"
                                            : "border-white/15 bg-white/[0.07] text-white hover:bg-white/15 hover:text-white",
                                    ].join(" ")}
                                >
                                    Fort
                                </Button>
                                <Button
                                    onClick={() => onSubmitGrammar("faible")}
                                    disabled={grammarSelection !== null}
                                    className={[
                                        "h-9 rounded-xl border text-[10px] font-black disabled:opacity-100",
                                        grammarSelection === "faible"
                                            ? "border-amber-300 bg-amber-300 text-[#11142d] hover:bg-amber-300"
                                            : "border-white/15 bg-white/[0.07] text-white hover:bg-white/15 hover:text-white",
                                    ].join(" ")}
                                >
                                    Faible
                                </Button>
                            </div>
                        ) : null}

                        {stage === "conjugation" ? (
                            <form
                                className="flex gap-1.5"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    onSubmitConjugation();
                                }}
                            >
                                <Input
                                    value={answer}
                                    onChange={(event) =>
                                        onAnswerChange(event.target.value)
                                    }
                                    placeholder="er …"
                                    aria-label="Conjugaison à la troisième personne du singulier"
                                    className="h-10 min-w-0 flex-1 rounded-xl border-white/15 bg-white/[0.07] px-3 text-base text-white placeholder:text-white/35 focus-visible:ring-amber-300/35 lg:h-9 lg:text-xs"
                                />
                                <Button
                                    type="submit"
                                    disabled={!answer.trim()}
                                    className="h-9 rounded-xl bg-amber-300 px-3 text-[10px] font-black text-[#11142d] hover:bg-amber-200"
                                >
                                    Répondre
                                </Button>
                            </form>
                        ) : null}
                    </div>
                </AnswerPanelLayer>
            ) : null}
        </section>
    );
}

export default PlayerStation;
