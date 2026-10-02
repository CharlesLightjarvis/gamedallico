import type { GamePresentation } from "@/types/game";

export type GameAudioSound = "error" | "plusOne" | "buzzer" | "buzzerLock" | "wordAppear";

export type GameAudioState = {
    presentation: GamePresentation;
    activeParticipantId: number | null;
    totalScore: number;
};

export type GameAudioCue = {
    sound: GameAudioSound;
    delayMs: number;
};

export type GameRoomStatus = "waiting" | "countdown" | "playing" | "finished";

export function defaultGameAudioEnabled(_storedPreference: string | null) {
    return true;
}

export function audioAmbienceForState(status: GameRoomStatus, presentation: GamePresentation) {
    const music = status === "countdown" || status === "playing";

    return {
        music,
        clock: status === "playing" && presentation === "playing",
    };
}

export function audioCuesForTransition(
    previous: GameAudioState,
    current: GameAudioState,
): GameAudioCue[] {
    if (current.totalScore > previous.totalScore) {
        return [{ sound: "plusOne", delayMs: 0 }];
    }

    if (previous.activeParticipantId === null && current.activeParticipantId !== null) {
        return [
            { sound: "buzzer", delayMs: 0 },
            { sound: "buzzerLock", delayMs: 180 },
        ];
    }

    if (
        (current.presentation === "feedback_wrong" || current.presentation === "time_up") &&
        previous.presentation !== current.presentation
    ) {
        return [{ sound: "error", delayMs: 0 }];
    }

    if (previous.activeParticipantId !== null && current.activeParticipantId === null) {
        return [{ sound: "error", delayMs: 0 }];
    }

    if (previous.presentation !== "next_word" && current.presentation === "next_word") {
        return [{ sound: "wordAppear", delayMs: 0 }];
    }

    return [];
}
