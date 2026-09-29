<?php

namespace App\Jobs;

use App\Services\GameRoomEngine;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AdvanceGameRoom implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $roomId) {}

    public function handle(GameRoomEngine $engine): void
    {
        $engine->tickById($this->roomId);
    }
}
