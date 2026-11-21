<?php

use App\Http\Controllers\DocumentDeliveryController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->noContent(200);
});

Route::get('/api/documents/deliver/{token}', DocumentDeliveryController::class)
    ->name('documents.deliver');

