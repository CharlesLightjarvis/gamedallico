<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_words', function (Blueprint $table): void {
            $table->id();
            $table->string('german')->unique();
            $table->json('translations');
            $table->enum('strength', ['fort', 'faible']);
            $table->string('third_person_singular');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_words');
    }
};
