<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_participants', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('game_room_id')->constrained('game_rooms')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('seat');
            $table->string('color', 7);
            $table->unsignedInteger('score')->default(0);
            $table->boolean('buzz_used')->default(false);
            $table->timestamp('joined_at');
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->unique(['game_room_id', 'user_id']);
            $table->unique(['game_room_id', 'seat']);
        });

        Schema::table('game_rooms', function (Blueprint $table): void {
            $table->foreign('active_participant_id')
                ->references('id')
                ->on('game_participants')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('game_rooms', function (Blueprint $table): void {
            $table->dropForeign(['active_participant_id']);
        });

        Schema::dropIfExists('game_participants');
    }
};
