<?php

namespace App\Http\Controllers;

use App\Models\GameRoom;
use App\Services\GameRoomEngine;
use App\Support\GameRoomSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameActionController extends Controller
{
    public function buzz(Request $request, GameRoom $gameRoom, GameRoomEngine $engine): JsonResponse
    {
        $engine->buzz($gameRoom, $request->user());

        return response()->json(['accepted' => true]);
    }

    public function preview(Request $request, GameRoom $gameRoom, GameRoomEngine $engine): JsonResponse
    {
        $validated = $request->validate(['answer' => ['nullable', 'string', 'max:80']]);
        $engine->preview($gameRoom, $request->user(), $validated['answer'] ?? '');

        return response()->json(['accepted' => true]);
    }

    public function answer(Request $request, GameRoom $gameRoom, GameRoomEngine $engine): JsonResponse
    {
        $validated = $request->validate(['answer' => ['required', 'string', 'max:80']]);
        $engine->answer($gameRoom, $request->user(), $validated['answer']);

        return response()->json(['accepted' => true]);
    }

    public function tick(Request $request, GameRoom $gameRoom, GameRoomEngine $engine): JsonResponse
    {
        $room = $engine->tick($gameRoom);

        return response()->json([
            'snapshot' => GameRoomSnapshot::make($room, $request->user()),
        ]);
    }
}
