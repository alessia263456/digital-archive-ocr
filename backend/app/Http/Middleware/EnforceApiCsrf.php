<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Session\TokenMismatchException;
use Symfony\Component\HttpFoundation\Response;

class EnforceApiCsrf extends ValidateCsrfToken
{
    public function handle($request, Closure $next): Response
    {
        try {
            return parent::handle($request, $next);
        } catch (TokenMismatchException $exception) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'eroare' => 'Sesiunea a expirat. Reîncărcați pagina și încercați din nou.',
                ], 419);
            }

            throw $exception;
        }
    }
}
