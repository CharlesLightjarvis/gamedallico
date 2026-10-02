<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_rooms', function (Blueprint $table): void {
            $table->string('presentation', 24)->default('playing')->after('phase');
            $table->timestamp('presentation_started_at')->nullable()->after('answer_ends_at');
            $table->timestamp('presentation_ends_at')->nullable()->after('presentation_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('game_rooms', function (Blueprint $table): void {
            $table->dropColumn([
                'presentation',
                'presentation_started_at',
                'presentation_ends_at',
            ]);
        });
    }
};
