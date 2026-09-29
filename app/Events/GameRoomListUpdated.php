<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class GameRoomListUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public readonly array $rooms) {}

    public function broadcastOn(): array
    {
        return [new Channel('game-rooms')];
    }

    public function broadcastAs(): string
    {
        return 'rooms.updated';
    }

    public function broadcastWith(): array
    {
        return ['rooms' => $this->rooms];
    }
}
