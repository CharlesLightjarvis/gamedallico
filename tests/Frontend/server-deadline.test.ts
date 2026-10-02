import { describe, expect, test } from "bun:test";
import {
    authoritativeGameDeadline,
    serverDeadlineDelay,
    shouldRetryAuthoritativeDeadline,
} from "../../resources/js/lib/server-deadline";

describe("serverDeadlineDelay", () => {
    test("wakes just after the authoritative server deadline", () => {
        expect(
            serverDeadlineDelay("2026-10-01T12:00:02.000Z", Date.parse("2026-10-01T12:00:00.000Z")),
        ).toBe(2_120);
    });

    test("wakes immediately when the server deadline has already passed", () => {
        expect(
            serverDeadlineDelay("2026-10-01T12:00:00.000Z", Date.parse("2026-10-01T12:00:02.000Z")),
        ).toBe(120);
    });

    test("does not schedule a wake-up without a deadline", () => {
        expect(serverDeadlineDelay(null, Date.now())).toBeNull();
    });
});

describe("authoritativeGameDeadline", () => {
    test("prioritizes the server presentation deadline while feedback is shown", () => {
        expect(
            authoritativeGameDeadline(
                {
                    status: "playing",
                    presentation: "feedback_wrong",
                    starts_at: null,
                    presentation_ends_at: "2026-10-01T12:00:02+00:00",
                    answer_ends_at: "2026-10-01T12:00:15+00:00",
                    round_ends_at: "2026-10-01T12:01:00+00:00",
                },
                null,
            ),
        ).toBe("2026-10-01T12:00:02+00:00");
    });

    test("retries while the server snapshot still exposes the expired deadline", () => {
        const countdownRoom = {
            status: "countdown" as const,
            presentation: "playing" as const,
            starts_at: "2026-10-01T12:00:02+00:00",
            presentation_ends_at: null,
            answer_ends_at: null,
            round_ends_at: null,
        };

        expect(
            shouldRetryAuthoritativeDeadline("2026-10-01T12:00:02+00:00", countdownRoom, null),
        ).toBe(true);
    });

    test("stops retrying once the server advances beyond that deadline", () => {
        expect(
            shouldRetryAuthoritativeDeadline(
                "2026-10-01T12:00:02+00:00",
                {
                    status: "playing",
                    presentation: "next_word",
                    starts_at: null,
                    presentation_ends_at: "2026-10-01T12:00:04+00:00",
                    answer_ends_at: null,
                    round_ends_at: null,
                },
                null,
            ),
        ).toBe(false);
    });
});
