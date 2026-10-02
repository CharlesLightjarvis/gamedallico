import { describe, expect, test } from "bun:test";
import {
    nextPresentationBoundary,
    presentationAtServerTime,
} from "../../resources/js/lib/server-presentation";

const timeline = [
    {
        presentation: "feedback_wrong" as const,
        starts_at: "2026-10-01T12:00:00.000Z",
        ends_at: "2026-10-01T12:00:01.000Z",
    },
    {
        presentation: "result" as const,
        starts_at: "2026-10-01T12:00:01.000Z",
        ends_at: "2026-10-01T12:00:04.000Z",
    },
    {
        presentation: "next_word" as const,
        starts_at: "2026-10-01T12:00:04.000Z",
        ends_at: "2026-10-01T12:00:06.000Z",
    },
];

describe("presentationAtServerTime", () => {
    test("switches to correction at the exact server-authored boundary", () => {
        expect(
            presentationAtServerTime(
                timeline,
                Date.parse("2026-10-01T12:00:00.999Z"),
            ).presentation,
        ).toBe("feedback_wrong");
        expect(
            presentationAtServerTime(
                timeline,
                Date.parse("2026-10-01T12:00:01.000Z"),
            ).presentation,
        ).toBe("result");
    });

    test("keeps the final announced scene if the server update is late", () => {
        expect(
            presentationAtServerTime(
                timeline,
                Date.parse("2026-10-01T12:00:07.000Z"),
            ).presentation,
        ).toBe("next_word");
    });

    test("returns the next server-authored visual boundary", () => {
        expect(
            nextPresentationBoundary(
                timeline,
                Date.parse("2026-10-01T12:00:00.500Z"),
            ),
        ).toBe(Date.parse("2026-10-01T12:00:01.000Z"));
    });
});
