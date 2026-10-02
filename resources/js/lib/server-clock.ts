export type ServerClockSample = {
    offsetMs: number;
    roundTripMs: number;
};

export function monotonicEpochNow(): number {
    return performance.timeOrigin + performance.now();
}

export function makeServerClockSample(
    serverTimestamp: number,
    sentAt: number,
    receivedAt: number,
): ServerClockSample {
    return {
        offsetMs: serverTimestamp - (sentAt + receivedAt) / 2,
        roundTripMs: Math.max(0, receivedAt - sentAt),
    };
}

export function selectBestClockSample(
    current: ServerClockSample,
    candidate: ServerClockSample,
): ServerClockSample {
    return candidate.roundTripMs < current.roundTripMs ? candidate : current;
}
