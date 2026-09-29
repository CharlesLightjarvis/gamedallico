<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameWord extends Model
{
    protected $fillable = [
        'german',
        'translations',
        'strength',
        'third_person_singular',
    ];

    protected function casts(): array
    {
        return [
            'translations' => 'array',
        ];
    }
}
