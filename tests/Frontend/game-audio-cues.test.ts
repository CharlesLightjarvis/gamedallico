import { describe, expect, test } from "bun:test";
import {
    audioAmbienceForState,
    audioCuesForTransition,
    defaultGameAudioEnabled,
} from "../../resources/js/lib/game-audio-cues";

describe("audioCuesForTransition", () => {
    test("announces a server-confirmed buzz with its lock impact", () => {
        expect(
            audioCuesForTransition(
                { presentation: "playing", activeParticipantId: null, totalScore: 0 },
                { presentation: "playing", activeParticipantId: 12, totalScore: 0 },
            ),
        ).toEqual([
            { sound: "buzzer", delayMs: 0 },
            { sound: "buzzerLock", delayMs: 180 },
        ]);
    });

    test("plays the reward when a server snapshot increases the score", () => {
        expect(
            audioCuesForTransition(
                { presentation: "playing", activeParticipantId: 12, totalScore: 0 },
                {
                    presentation: "playing",
                    activeParticipantId: 12,
                    totalScore: 1,
                },
            ),
        ).toEqual([{ sound: "plusOne", delayMs: 0 }]);
    });

    test("plays the error when a wrong answer releases the active player", () => {
        expect(
            audioCuesForTransition(
                { presentation: "playing", activeParticipantId: 12, totalScore: 0 },
                { presentation: "playing", activeParticipantId: null, totalScore: 0 },
            ),
        ).toEqual([{ sound: "error", delayMs: 0 }]);
    });

    test("plays the error sound when entering wrong feedback", () => {
        expect(
            audioCuesForTransition(
                { presentation: "playing", activeParticipantId: 12, totalScore: 0 },
                {
                    presentation: "feedback_wrong",
                    activeParticipantId: null,
                    totalScore: 0,
                },
            ),
        ).toEqual([{ sound: "error", delayMs: 0 }]);
    });

    test("plays the error sound when the server announces time up", () => {
        expect(
            audioCuesForTransition(
                { presentation: "playing", activeParticipantId: null, totalScore: 0 },
                { presentation: "time_up", activeParticipantId: null, totalScore: 0 },
            ),
        ).toEqual([{ sound: "error", delayMs: 0 }]);
    });

    test("plays the word reveal once when the server enters next word", () => {
        expect(
            audioCuesForTransition(
                { presentation: "result", activeParticipantId: null, totalScore: 0 },
                { presentation: "next_word", activeParticipantId: null, totalScore: 0 },
            ),
        ).toEqual([{ sound: "wordAppear", delayMs: 0 }]);
    });

    test("does not replay sounds for repeated snapshots of the same state", () => {
        expect(
            audioCuesForTransition(
                { presentation: "next_word", activeParticipantId: null, totalScore: 0 },
                { presentation: "next_word", activeParticipantId: null, totalScore: 0 },
            ),
        ).toEqual([]);
    });
});

describe("audioAmbienceForState", () => {
    test("enables sound by default when no preference exists", () => {
        expect(defaultGameAudioEnabled(null)).toBe(true);
    });

    test("starts enabled even if a previous session was muted", () => {
        expect(defaultGameAudioEnabled("muted")).toBe(true);
    });

    test("keeps music during the match and the clock only during live play", () => {
        expect(audioAmbienceForState("playing", "playing")).toEqual({
            music: true,
            clock: true,
        });
        expect(audioAmbienceForState("playing", "result")).toEqual({
            music: true,
            clock: false,
        });
    });

    test("stops both ambience tracks outside countdown and play", () => {
        expect(audioAmbienceForState("finished", "result")).toEqual({
            music: false,
            clock: false,
        });
    });
});
