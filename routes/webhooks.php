<?php

use App\Http\Controllers\Webhooks\MessagingWebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Webhook Routes
|--------------------------------------------------------------------------
|
| These routes handle incoming webhooks from external services.
| They are intentionally minimal (no CSRF, no session, no auth).
|
*/

// Meta webhooks (Instagram, Facebook Messenger)
Route::get('webhooks/meta', [MessagingWebhookController::class, 'verifyMeta'])
    ->name('webhooks.meta.verify');

Route::post('webhooks/meta', [MessagingWebhookController::class, 'handleMeta'])
    ->name('webhooks.meta.handle');
