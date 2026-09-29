import { Head, Link, router } from "@inertiajs/react";
import { useEcho } from "@laravel/echo-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlayerStation, {
    type Player,
    type PlayerPosition,
} from "@/components/ui/games/player-station";
import WordCard from "@/components/ui/games/word-card";
import { Button } from "@/components/ui/button";
import { gameRequest } from "@/lib/game-api";
import type { GameSnapshot } from "@/types/game";

type Props = { initialSnapshot: GameSnapshot };

const remaining = (deadline: string | null, now: number) =>
    deadline
        ? Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000))
        : 0;

export default function BuzzWortRoom({ initialSnapshot }: Props) {
    const [snapshot, setSnapshot] = useState(initialSnapshot);
    const snapshotRef = useRef(initialSnapshot);
    const serverOffsetRef = useRef(
        Date.parse(initialSnapshot.server_time) - Date.now(),
    );
    const [now, setNow] = useState(Date.now());
    const [answer, setAnswer] = useState(initialSnapshot.game.answer_preview);
    const [pendingSubmittedAnswer, setPendingSubmittedAnswer] = useState<
        string | null
    >(null);
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
            next.game.active_participant_id !==
            current.game.active_participant_id;
        const wordChanged = next.room.word_index !== current.room.word_index;
        const serverTimestamp = Date.parse(next.server_time);
        if (Number.isFinite(serverTimestamp)) {
            serverOffsetRef.current = serverTimestamp - Date.now();
        }

        const merged = {
            ...next,
            // Broadcast snapshots are shared by the room and do not contain this browser's identity.
            viewer_participant_id: current.viewer_participant_id,
        };
        const sameTurn = !activePlayerChanged && !phaseChanged;

        snapshotRef.current = merged;
        setSnapshot(merged);
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
            roomChannel.stopListeningForWhisper(
                "answer-preview",
                onAnswerPreview,
            );
            roomChannel.stopListeningForWhisper(
                "grammar-preview",
                onGrammarPreview,
            );
        };
    }, [channel]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(timer);
    }, []);

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
    const activePlayer =
        players.find((player) => player.id === game.active_participant_id) ??
        null;
    const stage = room.phase;
    const serverNow = now + serverOffsetRef.current;
    const playerTime = remaining(room.answer_ends_at, serverNow);
    const roundTime = remaining(room.round_ends_at, serverNow);
    const nextWordCountdown = remaining(room.next_word_at, serverNow);
    const viewerIsActive =
        snapshot.viewer_participant_id === game.active_participant_id;
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
        if (!viewerIsActive || !isPlaying) return;
        const timer = window.setTimeout(() => {
            void gameRequest(`${base}/preview`, "PATCH", { answer }).catch(
                () => undefined,
            );
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
            setError(
                caught instanceof Error ? caught.message : "Action impossible.",
            );
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

    const viewerId =
        snapshot.viewer_participant_id ?? participants[0]?.id ?? null;
    const viewer = participants.find(
        (participant) => participant.id === viewerId,
    );
    const opponents = participants.filter(
        (participant) => participant.id !== viewerId,
    );
    const opponentPositions: PlayerPosition[] =
        room.capacity === 2 ? ["top"] : ["top", "left", "right"];
    const playerPositions = new Map<number, PlayerPosition>([
        ...(viewer ? [[viewer.id, "bottom"] as const] : []),
        ...opponents.map(
            (participant, index) =>
                [participant.id, opponentPositions[index] ?? "top"] as const,
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
                </header>

                <div className="relative mx-auto h-full min-h-[560px] w-full max-w-[1500px]">
                    {players.map((player) => (
                        <PlayerStation
                            key={player.id}
                            player={player}
                            word={game.word ?? "…"}
                            position={playerPositions.get(player.id) ?? "top"}
                            activeId={game.active_participant_id}
                            stage={stage}
                            playerTime={playerTime}
                            viewerPlayerId={
                                snapshot.viewer_participant_id ?? undefined
                            }
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
                            <WordCard
                                stage={stage}
                                activePlayer={activePlayer}
                                activeId={game.active_participant_id}
                                roundTime={roundTime}
                                playerTime={playerTime}
                                viewerPlayerId={
                                    snapshot.viewer_participant_id ?? undefined
                                }
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
                                {participants.length} / {room.capacity} joueurs
                                · partagez le code{" "}
                                <strong className="text-white">
                                    {room.code}
                                </strong>
                            </p>
                            {room.status === "finished" ? (
                                <Button
                                    className="mt-6"
                                    onClick={() => router.visit("/")}
                                >
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
