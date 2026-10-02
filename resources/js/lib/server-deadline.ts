import type { GameSnapshot } from "@/types/game";

const SERVER_DEADLINE_GRACE_MS = 120;

type ServerTimedRoom = Pick<
    GameSnapshot["room"],
    | "status"
    | "presentation"
    | "starts_at"
    | "presentation_ends_at"
    | "answer_ends_at"
    | "round_ends_at"
>;

export function authoritativeGameDeadline(
    room: ServerTimedRoom,
    activeParticipantId: number | null,
): string | null {
    if (room.status === "countdown") return room.starts_at;
    if (room.status !== "playing") return null;
    if (room.presentation !== "playing") return room.presentation_ends_at;
    if (activeParticipantId !== null) return room.answer_ends_at;

    return room.round_ends_at;
}

export function serverDeadlineDelay(deadline: string | null, serverNow: number): number | null {
    if (!deadline) return null;

    const timestamp = Date.parse(deadline);
    if (!Number.isFinite(timestamp)) return null;

    return Math.max(0, timestamp - serverNow) + SERVER_DEADLINE_GRACE_MS;
}

export function shouldRetryAuthoritativeDeadline(
    expectedDeadline: string | null,
    room: ServerTimedRoom,
    activeParticipantId: number | null,
): boolean {
    return (
        expectedDeadline !== null &&
        authoritativeGameDeadline(room, activeParticipantId) === expectedDeadline
    );
}
