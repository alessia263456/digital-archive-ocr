<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DocumentDraftController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:login')
    ->name('auth.login');

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth:web')
    ->name('auth.logout');

Route::get('/user', [AuthController::class, 'currentUser'])
    ->middleware(['auth:web', 'session.lifetime'])
    ->name('auth.user');

Route::middleware(['auth:web', 'session.lifetime', 'role:admin,arhivar'])->group(function () {
    Route::post('/drafts', [DocumentDraftController::class, 'store'])->name('drafts.store');
    Route::get('/drafts/{draft}', [DocumentDraftController::class, 'show'])->name('drafts.show');
});
