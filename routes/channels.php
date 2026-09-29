<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('game-room.{roomId}', function ($user, string $roomId) {
    return \App\Models\GameParticipant::query()
        ->where('game_room_id', $roomId)
        ->where('user_id', $user->id)
        ->whereNull('left_at')
        ->exists();
});
