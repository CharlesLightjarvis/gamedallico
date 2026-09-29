"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import PlayerStation, { type Player } from "./player-station";

import WordCard, { type GameStage, type HistoryEvent } from "./word-card";

const initialPlayers: Player[] = [
    {
        id: 1,
        name: "Maya",
        score: 12,
        color: "#ef4444",
        used: false,
    },
    {
        id: 2,
        name: "Lucas",
        score: 9,
        color: "#3b82f6",
        used: false,
    },
    {
        id: 3,
        name: "Sarah",
        score: 14,
        color: "#f59e0b",
        used: false,
    },
    {
        id: 4,
        name: "Noah",
        score: 11,
        color: "#22c55e",
        used: false,
    },
];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

type BuzzWortArenaProps = {
    viewerPlayerId?: number;
};

export default function BuzzWortArena({ viewerPlayerId = 1 }: BuzzWortArenaProps) {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);

    const [activeId, setActiveId] = useState<number | null>(null);

    const [roundTime, setRoundTime] = useState(60);

    const [playerTime, setPlayerTime] = useState(15);

    const [answer, setAnswer] = useState("");

    const [grammarSelection, setGrammarSelection] = useState<
        "fort" | "faible" | null
    >(null);

    const [arenaHeight, setArenaHeight] = useState<number | null>(null);

    const [iosViewportCompensation, setIosViewportCompensation] = useState(0);

    const [nextWordCountdown, setNextWordCountdown] = useState(3);

    const [message, setMessage] = useState("Tout le monde peut buzzer");

    const [stage, setStage] = useState<GameStage>("translation");
    const [history, setHistory] = useState<HistoryEvent[]>([
        {
            id: makeId(),
            type: "system",
            text: "Nouveau mot : bestellen",
        },
    ]);

    const activePlayer = useMemo(
        () => players.find((player) => player.id === activeId) ?? null,
        [activeId, players],
    );

    useEffect(() => {
        const preventAdditionalTouch = (event: TouchEvent) => {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        };
        const preventPagePan = (event: TouchEvent) => event.preventDefault();
        const preventGesture = (event: Event) => event.preventDefault();
        const keepDocumentAtOrigin = () => {
            if (window.scrollX !== 0 || window.scrollY !== 0) {
                window.scrollTo(0, 0);
            }
        };

        document.addEventListener("touchstart", preventAdditionalTouch, {
            passive: false,
        });
        document.addEventListener("touchmove", preventPagePan, {
            passive: false,
        });
        document.addEventListener("gesturestart", preventGesture, {
            passive: false,
        });
        document.addEventListener("gesturechange", preventGesture, {
            passive: false,
        });
        document.addEventListener("gestureend", preventGesture, {
            passive: false,
        });
        window.addEventListener("scroll", keepDocumentAtOrigin);

        return () => {
            document.removeEventListener("touchstart", preventAdditionalTouch);
            document.removeEventListener("touchmove", preventPagePan);
            document.removeEventListener("gesturestart", preventGesture);
            document.removeEventListener("gesturechange", preventGesture);
            document.removeEventListener("gestureend", preventGesture);
            window.removeEventListener("scroll", keepDocumentAtOrigin);
        };
    }, []);

    useEffect(() => {
        const captureStableHeight = () => {
            const focusedElement = document.activeElement;
            const isEditing =
                focusedElement instanceof HTMLInputElement ||
                focusedElement instanceof HTMLTextAreaElement ||
                (focusedElement instanceof HTMLElement &&
                    focusedElement.isContentEditable);

            if (!isEditing) {
                setArenaHeight(window.innerHeight);
            }
        };

        captureStableHeight();
        window.addEventListener("resize", captureStableHeight);

        return () => {
            window.removeEventListener("resize", captureStableHeight);
        };
    }, []);

    useEffect(() => {
        const isIOS =
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

        if (!isIOS) {
            return;
        }

        const viewport = window.visualViewport;
        let animationFrame = 0;
        const settleTimers: number[] = [];

        const measureWebKitPan = () => {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = window.requestAnimationFrame(() => {
                const bodyPan = Math.max(
                    0,
                    -document.body.getBoundingClientRect().top,
                );
                const viewportPan = Math.max(
                    0,
                    viewport?.offsetTop ?? 0,
                    viewport?.pageTop ?? 0,
                );

                setIosViewportCompensation(Math.max(bodyPan, viewportPan));
            });
        };

        const measureUntilSettled = () => {
            settleTimers.forEach(window.clearTimeout);
            settleTimers.length = 0;
            measureWebKitPan();

            for (const delay of [50, 150, 300]) {
                settleTimers.push(window.setTimeout(measureWebKitPan, delay));
            }
        };

        measureUntilSettled();
        viewport?.addEventListener("resize", measureUntilSettled);
        viewport?.addEventListener("scroll", measureUntilSettled);
        window.addEventListener("resize", measureUntilSettled);
        window.addEventListener("scroll", measureUntilSettled);
        document.addEventListener("focusin", measureUntilSettled);
        document.addEventListener("focusout", measureUntilSettled);

        return () => {
            window.cancelAnimationFrame(animationFrame);
            settleTimers.forEach(window.clearTimeout);
            viewport?.removeEventListener("resize", measureUntilSettled);
            viewport?.removeEventListener("scroll", measureUntilSettled);
            window.removeEventListener("resize", measureUntilSettled);
            window.removeEventListener("scroll", measureUntilSettled);
            document.removeEventListener("focusin", measureUntilSettled);
            document.removeEventListener("focusout", measureUntilSettled);
        };
    }, []);

    const addHistory = (event: Omit<HistoryEvent, "id">) => {
        setHistory((current) => [
            ...current,
            {
                ...event,
                id: makeId(),
            },
        ]);
    };

    const addPoint = (id: number, amount = 1) => {
        setPlayers((current) =>
            current.map((player) =>
                player.id === id
                    ? {
                          ...player,
                          score: player.score + amount,
                      }
                    : player,
            ),
        );
    };

    const failAttempt = (reason = "Mauvaise réponse") => {
        if (activeId === null) {
            return;
        }

        const player = players.find((item) => item.id === activeId);

        if (!player) {
            return;
        }

        setPlayers((current) =>
            current.map((item) =>
                item.id === activeId
                    ? {
                          ...item,
                          used: true,
                      }
                    : item,
            ),
        );

        addHistory({
            type: "wrong",
            player: player.name,
            color: player.color,
            text: reason,
        });

        setMessage(`${reason} · ${player.name} est éliminé pour ce mot`);

        setActiveId(null);
        setPlayerTime(15);
        setAnswer("");
        setGrammarSelection(null);
    };

    /**
     * TIMER GÉNÉRAL
     */
    useEffect(() => {
        if (activeId !== null || stage === "done") {
            return;
        }

        const timer = window.setInterval(() => {
            setRoundTime((value) => {
                if (value <= 1) {
                    window.clearInterval(timer);

                    setMessage("Temps écoulé · bestellen = commander");

                    addHistory({
                        type: "system",
                        text: "Temps général écoulé · bestellen = commander",
                    });

                    setStage("done");

                    return 0;
                }

                return value - 1;
            });
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [activeId, stage]);

    /**
     * TIMER JOUEUR
     */
    useEffect(() => {
        if (activeId === null || stage === "done") {
            return;
        }

        const timer = window.setInterval(() => {
            setPlayerTime((value) => {
                if (value <= 1) {
                    window.clearInterval(timer);

                    failAttempt("Temps écoulé");

                    return 15;
                }

                return value - 1;
            });
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [activeId, stage, players]);

    /**
     * BUZZ
     */
    const buzz = (id: number) => {
        if (activeId !== null || stage === "done") {
            return;
        }

        const player = players.find((item) => item.id === id);

        if (!player || player.used) {
            return;
        }

        setActiveId(id);

        setPlayerTime(15);

        setAnswer("");

        setGrammarSelection(null);

        addHistory({
            type: "buzz",
            player: player.name,
            color: player.color,
            text: "a buzzé",
        });
    };

    /**
     * TRADUCTION
     */
    const submitTranslation = () => {
        if (activeId === null) {
            return;
        }

        const player = players.find((item) => item.id === activeId);

        if (!player) {
            return;
        }

        const normalized = answer.trim().toLowerCase();

        const accepted = ["commander", "passer commande"];

        if (!accepted.includes(normalized)) {
            failAttempt("Mauvaise traduction");

            return;
        }

        addPoint(activeId, 1);

        addHistory({
            type: "correct",
            player: player.name,
            color: player.color,
            text: "bonne traduction",
            points: 1,
        });

        setStage("grammar");

        setAnswer("");

        setPlayerTime(15);

        setMessage("Traduction correcte · +1");
    };

    /**
     * GRAMMAIRE
     */
    const submitGrammar = (value: "fort" | "faible") => {
        if (activeId === null || grammarSelection !== null) {
            return;
        }

        const player = players.find((item) => item.id === activeId);

        if (!player) {
            return;
        }

        setGrammarSelection(value);
        setPlayerTime(15);

        window.setTimeout(() => {
            if (value !== "faible") {
                addHistory({
                    type: "wrong",
                    player: player.name,
                    color: player.color,
                    text: "mauvaise réponse grammaticale",
                });

                setMessage("Faux · les autres peuvent voler ce point");
                setPlayers((current) =>
                    current.map((item) =>
                        item.id === activeId
                            ? { ...item, used: true }
                            : item,
                    ),
                );
                setActiveId(null);
                setStage("grammar");
                setPlayerTime(15);
                setGrammarSelection(null);

                return;
            }

            addPoint(activeId, 1);
            addHistory({
                type: "bonus",
                player: player.name,
                color: player.color,
                text: "bonne réponse grammaticale",
                points: 1,
            });
            setStage("conjugation");
            setPlayerTime(15);
            setMessage("Faible · +1");
            setGrammarSelection(null);
        }, 900);
    };

    /**
     * CONJUGAISON
     */
    const submitConjugation = () => {
        if (activeId === null) {
            return;
        }

        const player = players.find((item) => item.id === activeId);

        if (!player) {
            return;
        }

        const normalized = answer.trim().toLowerCase();

        if (normalized !== "er bestellt") {
            addHistory({
                type: "wrong",
                player: player.name,
                color: player.color,
                text: "mauvaise conjugaison",
            });

            addHistory({
                type: "system",
                text: "Réponse : er bestellt",
            });

            setMessage("Réponse : er bestellt");

            setStage("done");

            setActiveId(null);

            return;
        }

        addPoint(activeId, 1);

        addHistory({
            type: "bonus",
            player: player.name,
            color: player.color,
            text: "bonne conjugaison",
            points: 1,
        });

        addHistory({
            type: "system",
            text: `${player.name} termine le mot avec 3 points`,
        });

        setMessage("Maîtrise parfaite · +3 sur ce mot");

        setStage("done");

        setActiveId(null);
    };

    /**
     * NOUVEAU MOT
     */
    const resetWord = useCallback(() => {
        setPlayers((current) =>
            current.map((player) => ({
                ...player,
                used: false,
            })),
        );

        setActiveId(null);

        setRoundTime(60);

        setPlayerTime(15);

        setAnswer("");

        setGrammarSelection(null);

        setNextWordCountdown(3);

        setMessage("Tout le monde peut buzzer");

        setStage("translation");

        setHistory([
            {
                id: makeId(),
                type: "system",
                text: "Nouveau mot : bestellen",
            },
        ]);
    }, []);

    useEffect(() => {
        if (stage !== "done") {
            return;
        }

        setNextWordCountdown(3);

        const countdown = window.setInterval(() => {
            setNextWordCountdown((value) => Math.max(0, value - 1));
        }, 1000);
        const nextWord = window.setTimeout(resetWord, 3000);

        return () => {
            window.clearInterval(countdown);
            window.clearTimeout(nextWord);
        };
    }, [resetWord, stage]);

    const questionLabel =
        stage === "translation"
            ? "Traduisez ce mot"
            : stage === "grammar"
              ? "Est-ce que ce verbe est fort ou faible ?"
              : stage === "conjugation"
                ? "Conjuguez à la troisième personne du singulier au présent"
                : "Correction";

    const station = (
        player: Player,
        position: "top" | "left" | "right" | "bottom",
    ) => (
        <PlayerStation
            key={player.id}
            player={player}
            position={position}
            activeId={activeId}
            stage={stage}
            playerTime={playerTime}
            viewerPlayerId={viewerPlayerId}
            answer={answer}
            grammarSelection={grammarSelection}
            onBuzz={buzz}
            onAnswerChange={setAnswer}
            onSubmitTranslation={submitTranslation}
            onSubmitGrammar={submitGrammar}
            onSubmitConjugation={submitConjugation}
        />
    );

    return (
        <main
            data-buzz-wort-arena
            className="fixed inset-x-0 top-0 h-lvh min-h-[560px] overflow-hidden bg-[#030525] text-white selection:bg-sky-400/30"
            style={{
                backgroundImage: "url('/images/games/buzz-wort-table.png')",
                backgroundPosition: "center",
                backgroundSize: "cover",
                height:
                    arenaHeight === null
                        ? "calc(100lvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))"
                        : `calc(${arenaHeight}px + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))`,
                top: "calc(0px - env(safe-area-inset-top, 0px))",
                transform: `translate3d(0, ${iosViewportCompensation}px, 0)`,
                willChange: "transform",
            }}
        >
            <div className="pointer-events-none absolute inset-0 bg-[#02031c]/15" />

            <div
                className="relative mx-auto min-h-[560px] w-full max-w-[1500px]"
                style={{
                    top: "env(safe-area-inset-top, 0px)",
                    height: arenaHeight === null ? "100lvh" : `${arenaHeight}px`,
                }}
            >
                {station(players[1], "top")}
                {station(players[2], "left")}
                {station(players[3], "right")}
                {station(players[0], "bottom")}

                <div className="absolute left-1/2 top-[49%] z-10 -translate-x-1/2 -translate-y-1/2 lg:top-[48%]">
                    <WordCard
                        stage={stage}
                        activePlayer={activePlayer}
                        activeId={activeId}
                        roundTime={roundTime}
                        playerTime={playerTime}
                        viewerPlayerId={viewerPlayerId}
                        answer={answer}
                        grammarSelection={grammarSelection}
                        message={message}
                        questionLabel={questionLabel}
                        history={history}
                        nextWordCountdown={nextWordCountdown}
                    />
                </div>
            </div>
        </main>
    );
}
