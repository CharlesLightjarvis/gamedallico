import { describe, expect, test } from "bun:test";
import {
    makeServerClockSample,
    selectBestClockSample,
} from "../../resources/js/lib/server-clock";

describe("server clock synchronization", () => {
    test("estimates the offset at the request midpoint", () => {
        expect(makeServerClockSample(10_100, 1_000, 1_200)).toEqual({
            offsetMs: 9_000,
            roundTripMs: 200,
        });
    });

    test("keeps the lowest latency sample", () => {
        const slower = { offsetMs: 9_020, roundTripMs: 80 };
        const faster = { offsetMs: 9_005, roundTripMs: 20 };

        expect(selectBestClockSample(slower, faster)).toBe(faster);
        expect(selectBestClockSample(faster, slower)).toBe(faster);
    });
});
