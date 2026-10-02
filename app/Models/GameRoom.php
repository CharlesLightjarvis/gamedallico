<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameRoom extends Model
{
    use HasUlids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'code', 'host_id', 'capacity', 'status', 'phase', 'presentation', 'current_word_id',
        'word_index', 'word_count', 'active_participant_id', 'message',
        'answer_preview', 'submitted_answer', 'grammar_selection', 'history', 'correction',
        'starts_at', 'started_at', 'round_ends_at', 'answer_ends_at',
        'presentation_started_at', 'presentation_ends_at',
        'next_word_at', 'finished_at', 'version',
    ];

    protected function casts(): array
    {
        return [
            'history' => 'array',
            'correction' => 'array',
            'starts_at' => 'immutable_datetime',
            'started_at' => 'immutable_datetime',
            'round_ends_at' => 'immutable_datetime',
            'answer_ends_at' => 'immutable_datetime',
            'presentation_started_at' => 'immutable_datetime',
            'presentation_ends_at' => 'immutable_datetime',
            'next_word_at' => 'immutable_datetime',
            'finished_at' => 'immutable_datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'code';
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(GameParticipant::class);
    }

    public function activeParticipants(): HasMany
    {
        return $this->participants()->whereNull('left_at');
    }

    public function currentWord(): BelongsTo
    {
        return $this->belongsTo(GameWord::class, 'current_word_id');
    }

    public function activeParticipant(): BelongsTo
    {
        return $this->belongsTo(GameParticipant::class, 'active_participant_id');
    }
}
