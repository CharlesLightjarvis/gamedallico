<?php

namespace App\Services;

use App\Events\GameRoomListUpdated;
use App\Events\GameRoomUpdated;
use App\Jobs\AdvanceGameRoom;
use App\Models\GameParticipant;
use App\Models\GameRoom;
use App\Models\GameWord;
use App\Models\User;
use App\Support\GameRoomSnapshot;
use App\Support\GamePresentationTiming;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GameRoomEngine
{
    private const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e'];

    public function create(User $user, int $capacity): GameRoom
    {
        $room = DB::transaction(function () use ($user, $capacity): GameRoom {
            $room = GameRoom::query()->create([
                'code' => $this->uniqueCode(),
                'host_id' => $user->id,
                'capacity' => $capacity,
                'word_count' => 5,
            ]);

            $room->participants()->create([
                'user_id' => $user->id,
                'seat' => 1,
                'color' => self::COLORS[0],
                'joined_at' => now(),
            ]);

            return $room;
        });

        $this->publish($room, true);

        return $room;
    }

    public function join(GameRoom $room, User $user): GameRoom
    {
        $room = DB::transaction(function () use ($room, $user): GameRoom {
            $room = GameRoom::query()->lockForUpdate()->findOrFail($room->id);
            $existing = $room->participants()->where('user_id', $user->id)->first();

            if ($existing) {
                if ($existing->left_at && $room->status === 'waiting') {
                    $existing->update(['left_at' => null, 'joined_at' => now()]);
                }

                return $room;
            }

            if ($room->status !== 'waiting' || $room->activeParticipants()->count() >= $room->capacity) {
                throw ValidationException::withMessages(['room' => 'Cette room n’est plus disponible.']);
            }

            $usedSeats = $room->activeParticipants()->pluck('seat')->all();
            $seat = collect(range(1, $room->capacity))->first(fn (int $seat) => ! in_array($seat, $usedSeats, true));

            $room->participants()->create([
                'user_id' => $user->id,
                'seat' => $seat,
                'color' => self::COLORS[$seat - 1],
                'joined_at' => now(),
            ]);

            if ($room->activeParticipants()->count() === $room->capacity) {
                $room->update([
                    'status' => 'countdown',
                    'starts_at' => now()->addSeconds(5),
                    'message' => 'La partie commence bientôt',
                    'version' => $room->version + 1,
                ]);
            }

            return $room->fresh();
        });

        $this->publish($room, true);
        $this->schedule($room);

        return $room;
    }

    public function buzz(GameRoom $room, User $user): GameRoom
    {
        $room = $this->mutate($room, function (GameRoom $lockedRoom) use ($user): void {
            $this->advanceExpiredState($lockedRoom);
            $participant = $this->participant($lockedRoom, $user);

            if (
                $lockedRoom->status !== 'playing'
                || $lockedRoom->phase === 'done'
                || $lockedRoom->presentation !== 'playing'
            ) {
                throw ValidationException::withMessages(['game' => 'Le buzz est fermé.']);
            }

            if ($lockedRoom->active_participant_id || $participant->buzz_used) {
                throw ValidationException::withMessages(['game' => 'Tu ne peux pas buzzer maintenant.']);
            }

            $participant->update(['buzz_used' => true]);
            $lockedRoom->fill([
                'active_participant_id' => $participant->id,
                'answer_ends_at' => now()->addSeconds(15),
                'answer_preview' => '',
                'grammar_selection' => null,
                'message' => "{$participant->user->name} a buzzé",
            ]);
            $this->history($lockedRoom, 'buzz', 'a buzzé', $participant);
        });

        $this->publish($room);
        $this->schedule($room);

        return $room;
    }

    public function preview(GameRoom $room, User $user, string $answer): GameRoom
    {
        $room = $this->mutate($room, function (GameRoom $lockedRoom) use ($user, $answer): void {
            $participant = $this->participant($lockedRoom, $user);

            if ((int) $lockedRoom->active_participant_id !== $participant->id) {
                throw ValidationException::withMessages(['game' => 'Tu n’as pas la main.']);
            }

            $lockedRoom->answer_preview = Str::limit($answer, 80, '');
        });

        $this->publish($room);

        return $room;
    }

    public function answer(GameRoom $room, User $user, string $answer): GameRoom
    {
        $room = $this->mutate($room, function (GameRoom $lockedRoom) use ($user, $answer): void {
            $this->advanceExpiredState($lockedRoom);
            $participant = $this->participant($lockedRoom, $user);

            if ((int) $lockedRoom->active_participant_id !== $participant->id) {
                throw ValidationException::withMessages(['game' => 'Tu n’as plus la main.']);
            }

            $word = $lockedRoom->currentWord()->firstOrFail();
            $normalized = $this->normalize($answer);

            if ($lockedRoom->phase === 'translation') {
                $accepted = collect($word->translations)->map(fn (string $value) => $this->normalize($value));

                if (! $accepted->contains($normalized)) {
                    $this->releaseAfterWrongAnswer($lockedRoom, $participant, 'Mauvaise traduction');

                    return;
                }

                $participant->increment('score');
                $lockedRoom->fill([
                    'phase' => 'grammar',
                    'message' => 'Traduction correcte · +1',
                    'answer_preview' => '',
                    'submitted_answer' => $answer,
                    'answer_ends_at' => now()->addSeconds(15),
                ]);
                $this->history($lockedRoom, 'correct', 'bonne traduction', $participant, 1);

                return;
            }

            if ($lockedRoom->phase === 'grammar') {
                $lockedRoom->grammar_selection = $normalized;

                if ($normalized !== $word->strength) {
                    $this->releaseAfterWrongAnswer($lockedRoom, $participant, 'Mauvaise réponse grammaticale');

                    return;
                }

                $participant->increment('score');
                $lockedRoom->fill([
                    'phase' => 'conjugation',
                    'message' => ucfirst($word->strength).' · +1',
                    'answer_preview' => '',
                    'answer_ends_at' => now()->addSeconds(15),
                ]);
                $this->history($lockedRoom, 'bonus', 'bonne réponse grammaticale', $participant, 1);

                return;
            }

            if ($lockedRoom->phase === 'conjugation') {
                $isCorrect = $normalized === $this->normalize($word->third_person_singular);

                if ($isCorrect) {
                    $participant->increment('score');
                    $this->history($lockedRoom, 'bonus', 'bonne conjugaison', $participant, 1);
                    $lockedRoom->message = 'Maîtrise parfaite · +3 sur ce mot';
                } else {
                    $this->history($lockedRoom, 'wrong', 'mauvaise conjugaison', $participant);
                    $lockedRoom->message = 'Réponse : '.$word->third_person_singular;
                }

                $this->reveal(
                    $lockedRoom,
                    $isCorrect ? 'feedback_correct' : 'feedback_wrong',
                    GamePresentationTiming::FEEDBACK_SECONDS,
                );
            }
        });

        $this->publish($room);
        $this->schedule($room);

        return $room;
    }

    public function tick(GameRoom $room): GameRoom
    {
        return $this->tickById($room->id);
    }

    public function tickById(string $roomId): GameRoom
    {
        $changed = false;
        $room = DB::transaction(function () use ($roomId, &$changed): GameRoom {
            $room = GameRoom::query()->lockForUpdate()->findOrFail($roomId);
            $before = $room->version;
            $this->advanceExpiredState($room);

            if ($room->isDirty()) {
                $room->version = $before + 1;
                $room->save();
                $changed = true;
            }

            return $room->fresh();
        });

        if ($changed) {
            $this->publish($room, true);
        }

        $this->schedule($room);

        return $room;
    }

    private function mutate(GameRoom $room, callable $callback): GameRoom
    {
        return DB::transaction(function () use ($room, $callback): GameRoom {
            $lockedRoom = GameRoom::query()->lockForUpdate()->findOrFail($room->id);
            $callback($lockedRoom);
            $lockedRoom->version++;
            $lockedRoom->save();

            return $lockedRoom->fresh();
        });
    }

    private function advanceExpiredState(GameRoom $room): void
    {
        if ($room->status === 'countdown' && $room->starts_at?->isPast()) {
            if ($room->activeParticipants()->count() !== $room->capacity) {
                $room->fill(['status' => 'waiting', 'starts_at' => null, 'message' => 'En attente des joueurs']);

                return;
            }

            $word = GameWord::query()->orderBy('id')->firstOrFail();
            $room->fill([
                'status' => 'playing',
                'phase' => 'translation',
                'presentation' => 'next_word',
                'presentation_started_at' => now(),
                'presentation_ends_at' => now()->addSeconds(GamePresentationTiming::WORD_INTRO_SECONDS),
                'started_at' => now(),
                'current_word_id' => $word->id,
                'word_index' => 0,
                'round_ends_at' => null,
                'message' => 'Nouveau mot',
                'history' => [$this->event('system', "Nouveau mot : {$word->german}")],
                'submitted_answer' => null,
                'starts_at' => null,
            ]);
            $room->participants()->update(['buzz_used' => false]);

            return;
        }

        if ($room->status !== 'playing') {
            return;
        }

        if ($room->presentation !== 'playing') {
            if (! $room->presentation_ends_at?->isPast()) {
                return;
            }

            $scheduledAt = $room->presentation_ends_at;

            if (in_array($room->presentation, ['feedback_correct', 'feedback_wrong'], true)) {
                $this->reveal($room, 'result', GamePresentationTiming::RESULT_SECONDS, $scheduledAt);
            } elseif ($room->presentation === 'next_word') {
                $this->openWord($room, $scheduledAt);
            } else {
                $this->nextWord($room, $scheduledAt);
            }

            return;
        }

        if ($room->active_participant_id && $room->answer_ends_at?->isPast()) {
            $participant = $room->activeParticipant()->with('user')->first();

            if ($room->phase === 'conjugation') {
                $room->message = 'Temps écoulé';
                $this->history($room, 'wrong', 'temps écoulé', $participant);
                $this->reveal($room, 'time_up');

                return;
            }

            $this->releaseAfterWrongAnswer($room, $participant, 'Temps écoulé');

            return;
        }

        if (! $room->active_participant_id && $room->round_ends_at?->isPast()) {
            $room->message = 'Temps général écoulé';
            $this->reveal($room, 'time_up');
        }
    }

    private function releaseAfterWrongAnswer(GameRoom $room, GameParticipant $participant, string $reason): void
    {
        $this->history($room, 'wrong', Str::lower($reason), $participant);
        $room->fill([
            'active_participant_id' => null,
            'answer_ends_at' => null,
            'answer_preview' => '',
            'grammar_selection' => null,
            'message' => "{$reason} · {$participant->user->name} est éliminé pour cette étape",
        ]);

        if ($room->activeParticipants()->where('buzz_used', false)->doesntExist()) {
            if ($reason === 'Temps écoulé') {
                $this->reveal($room, 'time_up');

                return;
            }

            $this->reveal(
                $room,
                'feedback_wrong',
                GamePresentationTiming::FEEDBACK_SECONDS,
            );
        }
    }

    private function reveal(
        GameRoom $room,
        string $presentation = 'result',
        int $duration = GamePresentationTiming::RESULT_SECONDS,
        ?\DateTimeInterface $scheduledAt = null,
    ): void
    {
        $word = $room->currentWord()->firstOrFail();
        $startsAt = $scheduledAt
            ? CarbonImmutable::instance($scheduledAt)
            : now()->toImmutable();
        $room->fill([
            'phase' => 'done',
            'presentation' => $presentation,
            'presentation_started_at' => $startsAt,
            'presentation_ends_at' => $startsAt->addSeconds($duration),
            'active_participant_id' => null,
            'answer_ends_at' => null,
            'round_ends_at' => null,
            'answer_preview' => '',
            'grammar_selection' => null,
            'next_word_at' => null,
            'correction' => [
                'translation' => $word->translations[0],
                'strength' => $word->strength,
                'conjugation' => $word->third_person_singular,
            ],
        ]);
    }

    private function nextWord(GameRoom $room, ?\DateTimeInterface $scheduledAt = null): void
    {
        $nextIndex = $room->word_index + 1;
        $word = GameWord::query()->orderBy('id')->skip($nextIndex)->first();

        if (! $word || $nextIndex >= $room->word_count) {
            $room->fill([
                'status' => 'finished',
                'finished_at' => now(),
                'message' => 'Partie terminée',
                'next_word_at' => null,
                'presentation' => 'playing',
                'presentation_started_at' => null,
                'presentation_ends_at' => null,
            ]);

            return;
        }

        $startsAt = $scheduledAt
            ? CarbonImmutable::instance($scheduledAt)
            : now()->toImmutable();

        $room->fill([
            'phase' => 'translation',
            'presentation' => 'next_word',
            'presentation_started_at' => $startsAt,
            'presentation_ends_at' => $startsAt->addSeconds(GamePresentationTiming::WORD_INTRO_SECONDS),
            'current_word_id' => $word->id,
            'word_index' => $nextIndex,
            'active_participant_id' => null,
            'round_ends_at' => null,
            'answer_ends_at' => null,
            'submitted_answer' => null,
            'next_word_at' => null,
            'message' => 'Nouveau mot',
            'history' => [$this->event('system', "Nouveau mot : {$word->german}")],
            'correction' => null,
        ]);
        $room->participants()->update(['buzz_used' => false]);
    }

    private function openWord(GameRoom $room, ?\DateTimeInterface $scheduledAt = null): void
    {
        $startsAt = $scheduledAt
            ? CarbonImmutable::instance($scheduledAt)
            : now()->toImmutable();
        $room->fill([
            'presentation' => 'playing',
            'presentation_started_at' => $startsAt,
            'presentation_ends_at' => null,
            'round_ends_at' => $startsAt->addSeconds(60),
            'message' => 'Tout le monde peut buzzer',
        ]);
    }

    private function participant(GameRoom $room, User $user): GameParticipant
    {
        return $room->activeParticipants()->with('user')->where('user_id', $user->id)->firstOrFail();
    }

    private function history(GameRoom $room, string $type, string $text, ?GameParticipant $participant = null, ?int $points = null): void
    {
        $history = $room->history ?? [];
        $history[] = $this->event($type, $text, $participant, $points);
        $room->history = array_slice($history, -12);
    }

    private function event(string $type, string $text, ?GameParticipant $participant = null, ?int $points = null): array
    {
        return array_filter([
            'id' => (string) Str::ulid(),
            'occurred_at' => now()->toISOString(),
            'type' => $type,
            'text' => $text,
            'player' => $participant?->user?->name,
            'color' => $participant?->color,
            'points' => $points,
        ], fn ($value) => $value !== null);
    }

    private function publish(GameRoom $room, bool $publishList = false): void
    {
        $room = $room->fresh(['activeParticipants.user', 'currentWord', 'activeParticipant']);
        GameRoomUpdated::dispatch($room->id, GameRoomSnapshot::make($room));

        if ($publishList) {
            GameRoomListUpdated::dispatch(GameRoomSnapshot::listing());
        }
    }

    private function schedule(GameRoom $room): void
    {
        $deadline = match (true) {
            $room->status === 'countdown' => $room->starts_at,
            $room->status === 'playing' && $room->presentation !== 'playing' => $room->presentation_ends_at,
            $room->status === 'playing' && $room->active_participant_id !== null => $room->answer_ends_at,
            $room->status === 'playing' => $room->round_ends_at,
            default => null,
        };

        if ($deadline) {
            AdvanceGameRoom::dispatch($room->id)->delay($deadline);
        }
    }

    private function normalize(string $value): string
    {
        return (string) Str::of($value)->lower()->squish();
    }

    private function uniqueCode(): string
    {
        do {
            $code = Str::upper(Str::random(6));
        } while (GameRoom::query()->where('code', $code)->exists());

        return $code;
    }
}
