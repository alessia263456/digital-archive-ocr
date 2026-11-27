<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DocumentDraftController;
use App\Http\Controllers\PhysicalDossierController;
use App\Http\Controllers\ArchiveController;
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
    Route::get('/physical-dossiers', [PhysicalDossierController::class, 'index'])->name('physical-dossiers.index');
    Route::post('/drafts', [DocumentDraftController::class, 'store'])->name('drafts.store');
    Route::get('/drafts/queue', [DocumentDraftController::class, 'queue'])->name('drafts.queue');
    Route::get('/drafts/recent', [DocumentDraftController::class, 'recent'])->name('drafts.recent');
    Route::post('/drafts/{draft}/retry', [DocumentDraftController::class, 'retry'])->name('drafts.retry');
    Route::post('/drafts/{draft}/permanent-failure', [DocumentDraftController::class, 'permanentFailure'])->name('drafts.permanent-failure');
    Route::get('/drafts/{draft}', [DocumentDraftController::class, 'show'])->name('drafts.show');
    Route::get('/drafts/{draft}/ocr', [DocumentDraftController::class, 'ocr'])->name('drafts.ocr');
    Route::get('/drafts/{draft}/editor', [DocumentDraftController::class, 'editor'])->name('drafts.editor');
    Route::patch('/drafts/{draft}/editor/ocr', [DocumentDraftController::class, 'saveEditorOcr'])->name('drafts.editor.ocr');
    Route::patch('/drafts/{draft}/editor/redaction-marks', [DocumentDraftController::class, 'saveRedactionMarks'])->name('drafts.editor.redaction-marks');
    Route::post('/drafts/{draft}/editor/redaction-preview', [DocumentDraftController::class, 'generateRedaction'])->name('drafts.editor.redaction-preview');
    Route::get('/drafts/{draft}/editor/redaction-preview', [DocumentDraftController::class, 'redactedPdf'])->name('drafts.editor.redaction-preview.show');
    Route::get('/drafts/{draft}/editor/pages/{page}/image', [DocumentDraftController::class, 'editorPageImage'])->whereNumber('page')->name('drafts.editor.page-image');
    Route::get('/drafts/{draft}/metadata', [DocumentDraftController::class, 'metadata'])->name('drafts.metadata');
    Route::patch('/drafts/{draft}/metadata', [DocumentDraftController::class, 'updateMetadata'])->name('drafts.metadata.update');
    Route::post('/drafts/{draft}/metadata/confirm', [DocumentDraftController::class, 'confirmMetadata'])->name('drafts.metadata.confirm');
    Route::post('/drafts/{draft}/review/confirm', [DocumentDraftController::class, 'confirmFinalReview'])->name('drafts.review.confirm');
    Route::post('/drafts/{draft}/publish', [DocumentDraftController::class, 'publish'])->name('drafts.publish');
    Route::post('/drafts/{draft}/preview', [DocumentDraftController::class, 'preview'])->name('drafts.preview');
});

Route::middleware(['auth:web', 'session.lifetime', 'role:admin,arhivar'])->post('/physical-dossiers', [PhysicalDossierController::class, 'store'])->name('physical-dossiers.store');

Route::middleware(['auth:web', 'session.lifetime', 'role:admin,arhivar,cititor'])->group(function () {
    Route::get('/archive/browse', [ArchiveController::class, 'browse'])->name('archive.browse');
    Route::get('/documents', [ArchiveController::class, 'index'])->name('documents.index');
});
