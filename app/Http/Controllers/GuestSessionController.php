<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class GuestSessionController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nickname' => ['required', 'string', 'min:2', 'max:20', 'regex:/^[\pL\pN _.-]+$/u'],
        ]);

        if ($request->user()) {
            return back();
        }

        $identity = (string) Str::ulid();
        $user = User::query()->create([
            'name' => trim($validated['nickname']),
            'email' => "guest-{$identity}@gamedal.local",
            'password' => Str::random(48),
            'email_verified_at' => now(),
            'is_guest' => true,
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return to_route('home');
    }
}
