<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_rooms', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('code', 6)->unique();
            $table->foreignId('host_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('capacity');
            $table->enum('status', ['waiting', 'countdown', 'playing', 'finished'])->default('waiting')->index();
            $table->enum('phase', ['translation', 'grammar', 'conjugation', 'done'])->default('translation');
            $table->foreignId('current_word_id')->nullable()->constrained('game_words')->nullOnDelete();
            $table->unsignedTinyInteger('word_index')->default(0);
            $table->unsignedTinyInteger('word_count')->default(5);
            $table->foreignId('active_participant_id')->nullable();
            $table->string('message')->default('En attente des joueurs');
            $table->string('answer_preview')->default('');
            $table->string('grammar_selection')->nullable();
            $table->json('history')->nullable();
            $table->json('correction')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('round_ends_at')->nullable();
            $table->timestamp('answer_ends_at')->nullable();
            $table->timestamp('next_word_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedBigInteger('version')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_rooms');
    }
};
