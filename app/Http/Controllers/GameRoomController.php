<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Services\GameRoomEngine;
use App\Support\GameRoomSnapshot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GameRoomController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('welcome', [
            'rooms' => GameRoomSnapshot::listing(),
        ]);
    }

    public function store(Request $request, GameRoomEngine $engine): RedirectResponse
    {
        $validated = $request->validate([
            'capacity' => ['required', 'integer', 'between:2,4'],
        ]);

        $room = $engine->create($request->user(), (int) $validated['capacity']);

        return to_route('game-rooms.show', $room);
    }

    public function join(Request $request, GameRoom $gameRoom, GameRoomEngine $engine): RedirectResponse
    {
        $engine->join($gameRoom, $request->user());

        return to_route('game-rooms.show', $gameRoom);
    }

    public function show(Request $request, GameRoom $gameRoom): Response
    {
        abort_unless(
            $gameRoom->activeParticipants()->where('user_id', $request->user()->id)->exists(),
            403,
        );

        $gameRoom = $gameRoom->fresh(['activeParticipants.user', 'currentWord', 'activeParticipant']);

        return Inertia::render('games/buzz-wort-room', [
            'initialSnapshot' => GameRoomSnapshot::make($gameRoom, $request->user()),
        ]);
    }
}
