<?php

namespace Database\Seeders;

use App\Models\GameWord;
use Illuminate\Database\Seeder;

class GameWordSeeder extends Seeder
{
    public function run(): void
    {
        $words = [
            ['german' => 'bestellen', 'translations' => ['commander', 'passer commande'], 'strength' => 'faible', 'third_person_singular' => 'er bestellt'],
            ['german' => 'fahren', 'translations' => ['conduire', 'aller', 'se déplacer'], 'strength' => 'fort', 'third_person_singular' => 'er fährt'],
            ['german' => 'machen', 'translations' => ['faire'], 'strength' => 'faible', 'third_person_singular' => 'er macht'],
            ['german' => 'sprechen', 'translations' => ['parler'], 'strength' => 'fort', 'third_person_singular' => 'er spricht'],
            ['german' => 'schlafen', 'translations' => ['dormir'], 'strength' => 'fort', 'third_person_singular' => 'er schläft'],
            ['german' => 'lernen', 'translations' => ['apprendre', 'étudier'], 'strength' => 'faible', 'third_person_singular' => 'er lernt'],
        ];

        foreach ($words as $word) {
            GameWord::query()->updateOrCreate(['german' => $word['german']], $word);
        }
    }
}
