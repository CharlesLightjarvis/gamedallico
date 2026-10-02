import { Head, Link, router } from "@inertiajs/react";
import { useEcho } from "@laravel/echo-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlayerStation, {
    type Player,
    type PlayerPosition,
} from "@/components/ui/games/player-station";
import GameCenterStage from "@/components/ui/games/game-center-stage";
import BuzzWortAudio from "@/components/ui/games/buzz-wort-audio";
import { Button } from "@/components/ui/button";
import { gameRequest } from "@/lib/game-api";
import {
    makeServerClockSample,
    monotonicEpochNow,
    selectBestClockSample,
} from "@/lib/server-clock";
import {
    authoritativeGameDeadline,
    serverDeadlineDelay,
    shouldRetryAuthoritativeDeadline,
} from "@/lib/server-deadline";
import { nextPresentationBoundary, presentationAtServerTime } from "@/lib/server-presentation";
import type { GameSnapshot } from "@/types/game";

type Props = { initialSnapshot: GameSnapshot };

const remaining = (deadline: string | null, now: number) =>
    deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000)) : 0;

const untilNextServerSecond = (serverNow: number) => {
    const millisecond = ((serverNow % 1000) + 1000) % 1000;

    return 1000 - millisecond + 12;
};

export default function BuzzWortRoom({ initialSnapshot }: Props) {
    const [snapshot, setSnapshot] = useState(initialSnapshot);
    const snapshotRef = useRef(initialSnapshot);
    const serverClockRef = useRef({
        offsetMs: Date.parse(initialSnapshot.server_time) - monotonicEpochNow(),
        roundTripMs: Number.POSITIVE_INFINITY,
    });
    const [now, setNow] = useState(monotonicEpochNow);
    const [answer, setAnswer] = useState(initialSnapshot.game.answer_preview);
    const [pendingSubmittedAnswer, setPendingSubmittedAnswer] = useState<string | null>(null);
    const [liveGrammarPreview, setLiveGrammarPreview] = useState<{
        participantId: number;
        selection: "fort" | "faible";
    } | null>(null);
    const [error, setError] = useState("");
    const { room, participants, game } = snapshot;
    // GameRoom route model binding intentionally resolves by the room's short code.
    const base = `/game-rooms/${encodeURIComponent(room.code)}`;

    const applySnapshot = useCallback((next: GameSnapshot) => {
        const current = snapshotRef.current;

        if (next.room.version < current.room.version) return;

        const phaseChanged = next.room.phase !== current.room.phase;
        const activePlayerChanged =
            next.game.active_participant_id !== current.game.active_participant_id;
        const wordChanged = next.room.word_index !== current.room.word_index;
        const merged = {
            ...next,
            // Broadcast snapshots are shared by the room and do not contain this browser's identity.
            viewer_participant_id: current.viewer_participant_id,
        };
        const sameTurn = !activePlayerChanged && !phaseChanged;

        snapshotRef.current = merged;
        setSnapshot(merged);
        setNow(monotonicEpochNow());
        if (!sameTurn) {
            setAnswer(next.game.answer_preview);
        }
        if (phaseChanged || activePlayerChanged || wordChanged) {
            setLiveGrammarPreview(null);
        }
        if (
            wordChanged ||
            next.game.submitted_answer !== null ||
            (activePlayerChanged && next.room.phase === "translation")
        ) {
            setPendingSubmittedAnswer(null);
        }
    }, []);

    const synchronizeWithServer = useCallback(async () => {
        const sentAt = monotonicEpochNow();
        const payload = await gameRequest<{ snapshot: GameSnapshot }>(`${base}/tick`);
        const receivedAt = monotonicEpochNow();
        const serverTimestamp = Date.parse(payload.snapshot.server_time);

        if (Number.isFinite(serverTimestamp)) {
            serverClockRef.current = selectBestClockSample(
                serverClockRef.current,
                makeServerClockSample(serverTimestamp, sentAt, receivedAt),
            );
        }

        setNow(receivedAt);
        applySnapshot(payload.snapshot);
    }, [applySnapshot, base]);

    const synchronizeClock = useCallback(
        async (sampleCount = 5) => {
            const samples = await Promise.all(
                Array.from({ length: sampleCount }, async () => {
                    const sentAt = monotonicEpochNow();
                    const payload = await gameRequest<{ server_time: string }>(
                        `${base}/clock`,
                        "GET",
                    );
                    const receivedAt = monotonicEpochNow();

                    return makeServerClockSample(
                        Date.parse(payload.server_time),
                        sentAt,
                        receivedAt,
                    );
                }),
            );

            serverClockRef.current = samples.reduce(selectBestClockSample, serverClockRef.current);
            setNow(monotonicEpochNow());
        },
        [base],
    );

    const { channel } = useEcho<{ snapshot: GameSnapshot }>(
        `game-room.${room.id}`,
        ".room.updated",
        (event) => {
            applySnapshot(event.snapshot);
        },
        [room.id, applySnapshot],
    );

    useEffect(() => {
        const roomChannel = channel();
        if (!roomChannel) return;

        const onAnswerPreview = (event: {
            participantId: number;
            phase: string;
            answer: string;
        }) => {
            const current = snapshotRef.current;
            if (
                event.participantId === current.viewer_participant_id ||
                event.participantId !== current.game.active_participant_id ||
                event.phase !== current.room.phase
            )
                return;

            setAnswer(event.answer);
        };
        const onGrammarPreview = (event: {
            participantId: number;
            selection: "fort" | "faible";
        }) => {
            const current = snapshotRef.current;
            if (
                event.participantId === current.viewer_participant_id ||
                event.participantId !== current.game.active_participant_id ||
                current.room.phase !== "grammar"
            )
                return;

            setLiveGrammarPreview({
                participantId: event.participantId,
                selection: event.selection,
            });
        };

        roomChannel.listenForWhisper("answer-preview", onAnswerPreview);
        roomChannel.listenForWhisper("grammar-preview", onGrammarPreview);

        return () => {
            roomChannel.stopListeningForWhisper("answer-preview", onAnswerPreview);
            roomChannel.stopListeningForWhisper("grammar-preview", onGrammarPreview);
        };
    }, [channel]);

    useEffect(() => {
        let timer = 0;

        const tickOnServerSecond = () => {
            const clientNow = monotonicEpochNow();
            setNow(clientNow);
            timer = window.setTimeout(
                tickOnServerSecond,
                untilNextServerSecond(clientNow + serverClockRef.current.offsetMs),
            );
        };

        tickOnServerSecond();

        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        const synchronize = async () => {
            try {
                await synchronizeWithServer();
            } catch {
                // Broadcasts remain authoritative if a clock probe is missed.
            }
        };

        void synchronize();
        const timer = window.setInterval(synchronize, 15_000);
        const synchronizeWhenVisible = () => {
            if (document.visibilityState === "visible") {
                void synchronize();
            }
        };

        document.addEventListener("visibilitychange", synchronizeWhenVisible);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", synchronizeWhenVisible);
        };
    }, [synchronizeWithServer]);

    useEffect(() => {
        const synchronize = () => {
            void synchronizeClock().catch(() => undefined);
        };

        synchronize();
        const timer = window.setInterval(synchronize, 10_000);

        return () => window.clearInterval(timer);
    }, [synchronizeClock]);

    const isPlaying = room.status === "playing";
    const players = useMemo<Player[]>(
        () =>
            participants.map((participant) => ({
                id: participant.id,
                name: participant.name,
                score: participant.score,
                color: participant.color,
                used: participant.used || !isPlaying,
            })),
        [isPlaying, participants],
    );
    const activePlayer = players.find((player) => player.id === game.active_participant_id) ?? null;
    const stage = room.phase;
    const serverNow = now + serverClockRef.current.offsetMs;
    const activeScene = presentationAtServerTime(room.presentation_timeline, serverNow);
    const effectivePresentation = activeScene.presentation;
    const stationStage = effectivePresentation === "playing" ? stage : "done";
    const visualBoundary = nextPresentationBoundary(room.presentation_timeline, serverNow);
    const authoritativeDeadline = authoritativeGameDeadline(room, game.active_participant_id);
    const playerTime = remaining(room.answer_ends_at, serverNow);
    const roundTime = remaining(room.round_ends_at, serverNow);
    const nextWordCountdown = remaining(room.next_word_at, serverNow);
    const viewerIsActive = snapshot.viewer_participant_id === game.active_participant_id;
    const displayedGrammarSelection =
        game.grammar_selection ??
        (liveGrammarPreview?.participantId === game.active_participant_id
            ? liveGrammarPreview.selection
            : null);
    const cardAnswer =
        stage === "translation"
            ? answer || pendingSubmittedAnswer || ""
            : stage === "conjugation" && answer
              ? answer
              : (game.submitted_answer ?? pendingSubmittedAnswer ?? answer);

    useEffect(() => {
        if (visualBoundary === null) return;

        const timer = window.setTimeout(
            () => setNow(monotonicEpochNow()),
            Math.max(0, visualBoundary - (monotonicEpochNow() + serverClockRef.current.offsetMs)),
        );

        return () => window.clearTimeout(timer);
    }, [visualBoundary]);

    useEffect(() => {
        const delay = serverDeadlineDelay(
            authoritativeDeadline,
            monotonicEpochNow() + serverClockRef.current.offsetMs,
        );

        if (delay === null) return;

        let cancelled = false;
        let timer = 0;

        const advanceFromServer = async () => {
            try {
                await synchronizeWithServer();
            } catch {
                // The retry below keeps asking the server until it confirms
                // that the authoritative deadline has advanced.
            }

            if (cancelled) return;

            const latest = snapshotRef.current;
            if (
                shouldRetryAuthoritativeDeadline(
                    authoritativeDeadline,
                    latest.room,
                    latest.game.active_participant_id,
                )
            ) {
                timer = window.setTimeout(advanceFromServer, 500);
            }
        };

        timer = window.setTimeout(() => void advanceFromServer(), delay);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [authoritativeDeadline, synchronizeWithServer]);

    useEffect(() => {
        if (!viewerIsActive || !isPlaying) return;
        const timer = window.setTimeout(() => {
            void gameRequest(`${base}/preview`, "PATCH", { answer }).catch(() => undefined);
        }, 180);
        return () => window.clearTimeout(timer);
    }, [answer, base, isPlaying, viewerIsActive]);

    const act = async (path: string, body?: Record<string, unknown>) => {
        setError("");
        try {
            await gameRequest(`${base}/${path}`, "POST", body);
        } catch (caught) {
            if (path === "answer" && stage === "translation") {
                setPendingSubmittedAnswer(null);
            }
            if (path === "answer" && stage === "grammar") {
                setLiveGrammarPreview(null);
            }
            setError(caught instanceof Error ? caught.message : "Action impossible.");
        }
    };

    const submitAnswer = () => {
        if (!answer.trim()) return;
        if (stage === "translation") setPendingSubmittedAnswer(answer.trim());
        void act("answer", { answer: answer.trim() });
        setAnswer("");
    };

    const publishAnswerPreview = (value: string) => {
        setAnswer(value);
        channel()?.whisper("answer-preview", {
            participantId: snapshot.viewer_participant_id,
            phase: snapshot.room.phase,
            answer: value,
        });
    };

    const publishGrammarPreview = (value: "fort" | "faible") => {
        const participantId = snapshot.viewer_participant_id;
        if (participantId === null) return;

        setAnswer(value);
        setLiveGrammarPreview({ participantId, selection: value });
        channel()?.whisper("grammar-preview", {
            participantId,
            selection: value,
        });
        void act("answer", { answer: value });
    };

    const viewerId = snapshot.viewer_participant_id ?? participants[0]?.id ?? null;
    const viewer = participants.find((participant) => participant.id === viewerId);
    const opponents = participants.filter((participant) => participant.id !== viewerId);
    const opponentPositions: PlayerPosition[] =
        room.capacity === 2 ? ["top"] : ["top", "left", "right"];
    const playerPositions = new Map<number, PlayerPosition>([
        ...(viewer ? [[viewer.id, "bottom"] as const] : []),
        ...opponents.map(
            (participant, index) => [participant.id, opponentPositions[index] ?? "top"] as const,
        ),
    ]);

    return (
        <>
            <Head title={`Buzz Wort · ${room.code}`} />
            <main
                data-buzz-wort-arena
                className="fixed inset-0 min-h-[560px] overflow-hidden bg-[#030525] text-white"
                style={{
                    backgroundImage: "url('/images/games/buzz-wort-table.png')",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                }}
            >
                <div className="absolute inset-0 bg-[#02031c]/20" />
                <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
                    <Link
                        href="/"
                        className="rounded-full border border-white/15 bg-[#080a25]/70 px-4 py-2 text-xs font-bold text-white/80 backdrop-blur"
                    >
                        ←
                    </Link>
                    <BuzzWortAudio
                        status={room.status}
                        presentation={effectivePresentation}
                        activeParticipantId={game.active_participant_id}
                        totalScore={participants.reduce(
                            (score, participant) => score + participant.score,
                            0,
                        )}
                    />
                </header>

                <div className="relative mx-auto h-full min-h-[560px] w-full max-w-[1500px]">
                    {players.map((player) => (
                        <PlayerStation
                            key={player.id}
                            player={player}
                            word={game.word ?? "…"}
                            position={playerPositions.get(player.id) ?? "top"}
                            activeId={game.active_participant_id}
                            stage={stationStage}
                            playerTime={playerTime}
                            viewerPlayerId={snapshot.viewer_participant_id ?? undefined}
                            answer={answer}
                            grammarSelection={displayedGrammarSelection}
                            onBuzz={() => void act("buzz")}
                            onAnswerChange={publishAnswerPreview}
                            onSubmitTranslation={submitAnswer}
                            onSubmitGrammar={publishGrammarPreview}
                            onSubmitConjugation={submitAnswer}
                        />
                    ))}

                    {isPlaying && game.word ? (
                        <div className="absolute left-1/2 top-[49%] z-10 -translate-x-1/2 -translate-y-1/2 lg:top-[48%]">
                            <GameCenterStage
                                presentation={effectivePresentation}
                                presentationStartedAt={activeScene.starts_at}
                                serverNow={serverNow}
                                stage={stage}
                                activePlayer={activePlayer}
                                activeId={game.active_participant_id}
                                roundTime={roundTime}
                                playerTime={playerTime}
                                viewerPlayerId={snapshot.viewer_participant_id ?? undefined}
                                answer={cardAnswer}
                                grammarSelection={displayedGrammarSelection}
                                message={game.message}
                                questionLabel={
                                    stage === "translation"
                                        ? "Traduisez ce mot"
                                        : stage === "grammar"
                                          ? "Fort ou faible ?"
                                          : stage === "conjugation"
                                            ? "Conjuguez au présent"
                                            : "Correction"
                                }
                                history={game.history}
                                nextWordCountdown={nextWordCountdown}
                                word={game.word}
                                correction={game.correction}
                            />
                        </div>
                    ) : null}

                    {!isPlaying ? (
                        <div className="absolute left-1/2 top-1/2 z-10 w-[min(90vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/15 bg-[#080a25]/90 p-7 text-center shadow-2xl backdrop-blur-xl">
                            <p className="text-xs font-black uppercase tracking-[.2em] text-sky-200">
                                {room.status === "finished"
                                    ? "Partie terminée"
                                    : room.status === "countdown"
                                      ? "Préparez-vous"
                                      : "Salle d’attente"}
                            </p>
                            <h1 className="mt-3 text-3xl font-black">
                                {room.status === "countdown"
                                    ? `Départ dans ${remaining(room.starts_at, serverNow)} s`
                                    : room.status === "finished"
                                      ? "Bien joué !"
                                      : "En attente des joueurs"}
                            </h1>
                            <p className="mt-3 text-sm text-white/60">
                                {participants.length} / {room.capacity} joueurs · partagez le code{" "}
                                <strong className="text-white">{room.code}</strong>
                            </p>
                            {room.status === "finished" ? (
                                <Button className="mt-6" onClick={() => router.visit("/")}>
                                    Retour au lobby
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {error ? (
                    <div
                        role="alert"
                        className="absolute bottom-4 left-1/2 z-[120] -translate-x-1/2 rounded-xl border border-red-300/30 bg-red-950/90 px-4 py-3 text-sm text-red-100"
                    >
                        {error}
                    </div>
                ) : null}
            </main>
        </>
    );
}
