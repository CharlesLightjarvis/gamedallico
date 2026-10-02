import type { ScheduledPresentation } from "@/types/game";

export function presentationAtServerTime(
    timeline: ScheduledPresentation[],
    serverNow: number,
): ScheduledPresentation {
    if (timeline.length === 0) {
        throw new Error("The server presentation timeline cannot be empty.");
    }

    const active = timeline.find((scene) => {
        const startsAt = Date.parse(scene.starts_at);
        const endsAt = scene.ends_at ? Date.parse(scene.ends_at) : Infinity;

        return startsAt <= serverNow && serverNow < endsAt;
    });

    if (active) return active;

    const first = timeline[0];
    return serverNow < Date.parse(first.starts_at)
        ? first
        : timeline[timeline.length - 1];
}

export function nextPresentationBoundary(
    timeline: ScheduledPresentation[],
    serverNow: number,
): number | null {
    for (const scene of timeline) {
        const startsAt = Date.parse(scene.starts_at);
        if (Number.isFinite(startsAt) && startsAt > serverNow) return startsAt;
    }

    return null;
}
