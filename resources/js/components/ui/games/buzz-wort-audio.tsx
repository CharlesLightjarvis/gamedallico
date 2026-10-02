import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
    audioAmbienceForState,
    audioCuesForTransition,
    defaultGameAudioEnabled,
    type GameAudioSound,
    type GameRoomStatus,
} from "@/lib/game-audio-cues";
import type { GamePresentation } from "@/types/game";

type BuzzWortAudioProps = {
    status: GameRoomStatus;
    presentation: GamePresentation;
    activeParticipantId: number | null;
    totalScore: number;
};

const volumes = {
    background: 0.16,
    clock: 0.2,
    error: 0.72,
    plusOne: 0.72,
    buzzer: 0.72,
    buzzerLock: 0.58,
    wordAppear: 0.5,
} as const;

function play(audio: HTMLAudioElement | null, volume: number, restart = false) {
    if (!audio) return;
    audio.volume = volume;
    if (restart) audio.currentTime = 0;
    void audio.play().catch(() => undefined);
}

function pause(audio: HTMLAudioElement | null, reset = false) {
    if (!audio) return;
    audio.pause();
    if (reset) audio.currentTime = 0;
}

export function BuzzWortAudio({
    status,
    presentation,
    activeParticipantId,
    totalScore,
}: BuzzWortAudioProps) {
    const [enabled, setEnabled] = useState(() => defaultGameAudioEnabled(null));
    const backgroundRef = useRef<HTMLAudioElement>(null);
    const clockRef = useRef<HTMLAudioElement>(null);
    const errorRef = useRef<HTMLAudioElement>(null);
    const plusOneRef = useRef<HTMLAudioElement>(null);
    const buzzerRef = useRef<HTMLAudioElement>(null);
    const buzzerLockRef = useRef<HTMLAudioElement>(null);
    const wordAppearRef = useRef<HTMLAudioElement>(null);
    const previousStateRef = useRef({
        presentation,
        activeParticipantId,
        totalScore,
    });
    const soundRefs: Record<GameAudioSound, RefObject<HTMLAudioElement | null>> = {
        error: errorRef,
        plusOne: plusOneRef,
        buzzer: buzzerRef,
        buzzerLock: buzzerLockRef,
        wordAppear: wordAppearRef,
    };

    useEffect(() => {
        const current = { presentation, activeParticipantId, totalScore };
        const cues = audioCuesForTransition(previousStateRef.current, current);
        previousStateRef.current = current;

        if (!enabled) return;

        const timers = cues.map(({ sound, delayMs }) =>
            window.setTimeout(() => {
                play(soundRefs[sound].current, volumes[sound], true);
            }, delayMs),
        );

        return () => timers.forEach(window.clearTimeout);
    }, [activeParticipantId, enabled, presentation, totalScore]);

    useEffect(() => {
        const ambience = audioAmbienceForState(status, presentation);

        if (enabled && ambience.music) {
            play(backgroundRef.current, volumes.background);
        } else {
            pause(backgroundRef.current, status === "finished");
        }

        if (enabled && ambience.clock) {
            play(clockRef.current, volumes.clock);
        } else {
            pause(clockRef.current, status === "finished");
        }
    }, [enabled, presentation, status]);

    useEffect(() => {
        if (!enabled) return;

        const resumeAudioOnInteraction = () => {
            const ambience = audioAmbienceForState(status, presentation);
            if (ambience.music) play(backgroundRef.current, volumes.background);
            if (ambience.clock) play(clockRef.current, volumes.clock);
        };

        window.addEventListener("pointerdown", resumeAudioOnInteraction, {
            capture: true,
        });
        window.addEventListener("keydown", resumeAudioOnInteraction, {
            capture: true,
        });

        return () => {
            window.removeEventListener("pointerdown", resumeAudioOnInteraction, {
                capture: true,
            });
            window.removeEventListener("keydown", resumeAudioOnInteraction, {
                capture: true,
            });
        };
    }, [enabled, presentation, status]);

    useEffect(
        () => () => {
            pause(backgroundRef.current);
            pause(clockRef.current);
        },
        [],
    );

    const toggleSound = () => {
        const nextEnabled = !enabled;

        if (nextEnabled) {
            const ambience = audioAmbienceForState(status, presentation);
            if (ambience.music) play(backgroundRef.current, volumes.background);
            if (ambience.clock) play(clockRef.current, volumes.clock);
        } else {
            pause(backgroundRef.current);
            pause(clockRef.current);
        }

        setEnabled(nextEnabled);
    };

    return (
        <>
            <button
                type="button"
                aria-label={enabled ? "Couper le son" : "Activer le son"}
                aria-pressed={enabled}
                onClick={toggleSound}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-[#080a25]/70 px-4 py-2 text-xs font-black uppercase tracking-[.12em] text-white/80 backdrop-blur transition hover:border-sky-300/40 hover:text-white"
            >
                {enabled ? (
                    <Volume2 aria-hidden="true" className="size-4 text-sky-300" />
                ) : (
                    <VolumeX aria-hidden="true" className="size-4" />
                )}
                Son
            </button>

            <audio
                ref={backgroundRef}
                preload="auto"
                loop
                src="/audio/buzz-wort/background%20music.mp3"
            />
            <audio ref={clockRef} preload="auto" loop src="/audio/buzz-wort/clock-timer.mp3" />
            <audio ref={errorRef} preload="auto" src="/audio/buzz-wort/error.mp3" />
            <audio ref={plusOneRef} preload="auto" src="/audio/buzz-wort/plus-one.mp3" />
            <audio ref={buzzerRef} preload="auto" src="/audio/buzz-wort/buzzer.mp3" />
            <audio ref={buzzerLockRef} preload="auto" src="/audio/buzz-wort/buzzer-lock.mp3" />
            <audio ref={wordAppearRef} preload="auto" src="/audio/buzz-wort/word-appear.mp3" />
        </>
    );
}

export default BuzzWortAudio;
