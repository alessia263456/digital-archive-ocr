<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'eroare' => 'Autentificarea este necesară.',
            ], 401);
        }

        if (! in_array($user->role, $roles, true)) {
            return response()->json([
                'eroare' => 'Nu aveți drepturi pentru această operațiune.',
            ], 403);
        }

        return $next($request);
    }
}
