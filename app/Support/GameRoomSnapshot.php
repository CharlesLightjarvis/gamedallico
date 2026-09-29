<?php

namespace App\Support;

use App\Models\GameRoom;
use App\Models\User;
use Illuminate\Support\Carbon;

class GameRoomSnapshot
{
    public static function make(GameRoom $room, ?User $viewer = null): array
    {
        $room->loadMissing(['activeParticipants.user', 'currentWord', 'activeParticipant']);
        $viewerParticipant = $viewer
            ? $room->activeParticipants->firstWhere('user_id', $viewer->id)
            : null;

        return [
            'room' => [
                'id' => $room->id,
                'code' => $room->code,
                'capacity' => $room->capacity,
                'status' => $room->status,
                'phase' => $room->phase,
                'version' => $room->version,
                'starts_at' => self::date($room->starts_at),
                'started_at' => self::date($room->started_at),
                'round_ends_at' => self::date($room->round_ends_at),
                'answer_ends_at' => self::date($room->answer_ends_at),
                'next_word_at' => self::date($room->next_word_at),
                'word_index' => $room->word_index,
                'word_count' => $room->word_count,
            ],
            'participants' => $room->activeParticipants
                ->sortBy('seat')
                ->values()
                ->map(fn ($participant): array => [
                    'id' => $participant->id,
                    'user_id' => $participant->user_id,
                    'name' => $participant->user->name,
                    'seat' => $participant->seat,
                    'color' => $participant->color,
                    'score' => $participant->score,
                    'used' => $participant->buzz_used,
                ])->all(),
            'viewer_participant_id' => $viewerParticipant?->id,
            'game' => [
                'word' => $room->currentWord?->german,
                'active_participant_id' => $room->active_participant_id,
                'message' => $room->message,
                'answer_preview' => $room->answer_preview,
                'submitted_answer' => $room->submitted_answer,
                'grammar_selection' => $room->grammar_selection,
                'history' => $room->history ?? [],
                'correction' => $room->phase === 'done' ? $room->correction : null,
            ],
            'server_time' => now()->toIso8601String(),
        ];
    }

    public static function listing(): array
    {
        return GameRoom::query()
            ->withCount(['activeParticipants as players_count'])
            ->with('host:id,name')
            ->whereIn('status', ['waiting', 'countdown'])
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn (GameRoom $room): array => [
                'id' => $room->id,
                'code' => $room->code,
                'host' => $room->host->name,
                'capacity' => $room->capacity,
                'players_count' => $room->players_count,
                'status' => $room->status,
                'starts_at' => self::date($room->starts_at),
            ])->all();
    }

    private static function date(Carbon|\DateTimeInterface|null $date): ?string
    {
        return $date?->format(DATE_ATOM);
    }
}
