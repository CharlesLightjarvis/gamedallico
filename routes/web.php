<?php

use App\Http\Controllers\GameActionController;
use App\Http\Controllers\GameRoomController;
use App\Http\Controllers\GuestSessionController;
use Illuminate\Support\Facades\Route;

Route::get('/', [GameRoomController::class, 'index'])->name('home');
Route::post('/play/guest', [GuestSessionController::class, 'store'])->middleware('guest')->name('guest-session.store');

Route::middleware('auth')->group(function () {
    Route::post('/game-rooms', [GameRoomController::class, 'store'])->name('game-rooms.store');
    Route::post('/game-rooms/{gameRoom}/join', [GameRoomController::class, 'join'])->name('game-rooms.join');
    Route::get('/game-rooms/{gameRoom}', [GameRoomController::class, 'show'])->name('game-rooms.show');
    Route::get('/game-rooms/{gameRoom}/clock', [GameActionController::class, 'clock'])->name('game-rooms.clock');
    Route::post('/game-rooms/{gameRoom}/buzz', [GameActionController::class, 'buzz'])->name('game-rooms.buzz');
    Route::patch('/game-rooms/{gameRoom}/preview', [GameActionController::class, 'preview'])->name('game-rooms.preview');
    Route::post('/game-rooms/{gameRoom}/answer', [GameActionController::class, 'answer'])->name('game-rooms.answer');
    Route::post('/game-rooms/{gameRoom}/tick', [GameActionController::class, 'tick'])->name('game-rooms.tick');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
