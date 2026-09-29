<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameParticipant extends Model
{
    protected $fillable = [
        'game_room_id', 'user_id', 'seat', 'color', 'score', 'buzz_used',
        'joined_at', 'left_at',
    ];

    protected function casts(): array
    {
        return [
            'buzz_used' => 'boolean',
            'joined_at' => 'immutable_datetime',
            'left_at' => 'immutable_datetime',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(GameRoom::class, 'game_room_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
