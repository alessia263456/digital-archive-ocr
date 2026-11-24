<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

final class AuthController
{
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ], [
            'username.required' => 'Numele de utilizator este obligatoriu.',
            'username.string' => 'Numele de utilizator trebuie să fie text.',
            'username.max' => 'Numele de utilizator este prea lung.',
            'password.required' => 'Parola este obligatorie.',
            'password.string' => 'Parola trebuie să fie text.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'eroare' => 'Datele de autentificare sunt incomplete sau nevalide.',
                'erori' => $validator->errors(),
            ], 422);
        }

        $credentials = $validator->validated();
        $user = User::query()->where('username', $credentials['username'])->first();

        if ($user === null || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'eroare' => 'Nume de utilizator sau parolă incorecte.',
            ], 401);
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $request->session()->put('authentication_started_at', now()->timestamp);
        $request->session()->put('authentication_last_activity_at', now()->timestamp);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'role' => $user->role,
            ],
        ]);
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    public function currentUser(Request $request): JsonResponse
    {
        $user = $request->user('web');

        return response()->json([
            'id' => $user->id,
            'username' => $user->username,
            'role' => $user->role,
        ]);
    }
}
