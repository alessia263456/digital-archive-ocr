<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

final class EnforceSessionLifetime
{
    private const IDLE_SECONDS = 30 * 60;

    private const ABSOLUTE_SECONDS = 12 * 60 * 60;

    public function handle(Request $request, Closure $next): Response
    {
        // Stateful Sanctum requests have a session after the web guard runs. Unit
        // tests may authenticate the web guard directly without booting cookies.
        if (! $request->hasSession()) {
            return $next($request);
        }

        $now = now()->timestamp;
        $startedAt = (int) $request->session()->get('authentication_started_at', 0);
        $lastActivityAt = (int) $request->session()->get('authentication_last_activity_at', 0);

        if ($startedAt === 0 || $lastActivityAt === 0
            || $now - $lastActivityAt >= self::IDLE_SECONDS
            || $now - $startedAt >= self::ABSOLUTE_SECONDS) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'eroare' => 'Sesiunea a expirat. Autentificați-vă din nou.',
            ], 401);
        }

        $request->session()->put('authentication_last_activity_at', $now);

        return $next($request);
    }
}
