<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_rooms', function (Blueprint $table): void {
            $table->string('submitted_answer', 80)->nullable()->after('answer_preview');
        });
    }

    public function down(): void
    {
        Schema::table('game_rooms', function (Blueprint $table): void {
            $table->dropColumn('submitted_answer');
        });
    }
};
