<?php

use App\Enums\EmailProvider;
use App\Enums\UserRole;
use App\Models\EmailChannel;
use App\Models\Organization;
use App\Models\User;
use App\Services\Email\EmailProviderFactory;
use App\Services\Email\GoogleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->adminUser = User::factory()->create();
    $this->organization->users()->attach($this->adminUser->id, [
        'role' => UserRole::Admin->value,
        'is_default' => true,
    ]);
});

describe('GoogleService', function () {
    it('generates correct authorization URL', function () {
        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.redirect_uri' => '/oauth/callback/google',
            'services.google.scopes' => ['openid', 'profile', 'email'],
        ]);

        $service = app(GoogleService::class);
        $url = $service->getAuthorizationUrl('test-state');

        expect($url)->toContain('https://accounts.google.com/o/oauth2/v2/auth');
        expect($url)->toContain('client_id=test-client-id');
        expect($url)->toContain('state=test-state');
        expect($url)->toContain('access_type=offline');
        expect($url)->toContain('prompt=consent');
    });

    it('handles OAuth callback successfully', function () {
        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.client_secret' => 'test-secret',
            'services.google.redirect_uri' => '/oauth/callback/google',
        ]);

        Http::fake([
            'oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'new-access-token',
                'refresh_token' => 'new-refresh-token',
                'expires_in' => 3600,
            ]),
            'www.googleapis.com/oauth2/v2/userinfo' => Http::response([
                'email' => 'user@gmail.com',
            ]),
        ]);

        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
        ]);

        $service = app(GoogleService::class);
        $service->handleCallback('auth-code', $channel);

        $channel->refresh();

        expect($channel->oauth_token)->toBe('new-access-token');
        expect($channel->oauth_refresh_token)->toBe('new-refresh-token');
        expect($channel->email_address)->toBe('user@gmail.com');
    });

    it('refreshes token successfully', function () {
        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.client_secret' => 'test-secret',
        ]);

        Http::fake([
            'oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'refreshed-access-token',
                'expires_in' => 3600,
                // Google doesn't always return refresh_token
            ]),
        ]);

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
            'oauth_refresh_token' => 'existing-refresh-token',
        ]);

        $service = app(GoogleService::class);
        $service->refreshToken($channel);

        $channel->refresh();

        expect($channel->oauth_token)->toBe('refreshed-access-token');
        // Should keep existing refresh token when Google doesn't return new one
        expect($channel->oauth_refresh_token)->toBe('existing-refresh-token');
    });

    it('tests connection successfully', function () {
        Http::fake([
            'www.googleapis.com/oauth2/v2/userinfo' => Http::response([
                'email' => 'user@gmail.com',
            ]),
        ]);

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
        ]);

        $service = app(GoogleService::class);
        $result = $service->testConnection($channel);

        expect($result['success'])->toBeTrue();
        expect($result['email'])->toBe('user@gmail.com');
        expect($result['error'])->toBeNull();
    });

    it('gets mail labels (folders)', function () {
        Http::fake([
            'gmail.googleapis.com/gmail/v1/users/me/labels' => Http::response([
                'labels' => [
                    ['id' => 'INBOX', 'name' => 'INBOX'],
                    ['id' => 'SENT', 'name' => 'SENT'],
                    ['id' => 'Label_1', 'name' => 'Custom Label'],
                ],
            ]),
        ]);

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
        ]);

        $service = app(GoogleService::class);
        $folders = $service->getMailFolders($channel);

        expect($folders)->toHaveCount(3);
        expect($folders[0]['id'])->toBe('INBOX');
        expect($folders[0]['name'])->toBe('INBOX');
    });

    it('fetches messages from Gmail', function () {
        Http::fake([
            // Use callback to handle all Gmail API requests dynamically
            'https://gmail.googleapis.com/gmail/v1/*' => function ($request) {
                $url = $request->url();

                // List messages endpoint
                if (str_contains($url, '/users/me/messages') && ! preg_match('/messages\/msg-/', $url)) {
                    return Http::response([
                        'messages' => [
                            ['id' => 'msg-1', 'threadId' => 'thread-1'],
                            ['id' => 'msg-2', 'threadId' => 'thread-2'],
                        ],
                    ]);
                }

                // Get message msg-1
                if (str_contains($url, 'messages/msg-1')) {
                    return Http::response([
                        'id' => 'msg-1',
                        'threadId' => 'thread-1',
                        'internalDate' => '1702900000000',
                        'payload' => [
                            'headers' => [
                                ['name' => 'From', 'value' => 'sender@example.com'],
                                ['name' => 'Subject', 'value' => 'Test Subject'],
                                ['name' => 'Message-ID', 'value' => '<msg-id-1@example.com>'],
                            ],
                            'body' => [
                                'data' => rtrim(strtr(base64_encode('Hello World'), '+/', '-_'), '='),
                            ],
                            'mimeType' => 'text/plain',
                        ],
                    ]);
                }

                // Get message msg-2
                if (str_contains($url, 'messages/msg-2')) {
                    return Http::response([
                        'id' => 'msg-2',
                        'threadId' => 'thread-2',
                        'internalDate' => '1702900000000',
                        'payload' => [
                            'headers' => [
                                ['name' => 'From', 'value' => 'another@example.com'],
                                ['name' => 'Subject', 'value' => 'Another Subject'],
                                ['name' => 'Message-ID', 'value' => '<msg-id-2@example.com>'],
                            ],
                            'body' => [
                                'data' => rtrim(strtr(base64_encode('Another message'), '+/', '-_'), '='),
                            ],
                            'mimeType' => 'text/plain',
                        ],
                    ]);
                }

                return Http::response([], 404);
            },
        ]);

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
            'fetch_folder' => 'INBOX',
        ]);

        $service = app(GoogleService::class);
        $messages = $service->fetchMessages($channel);

        expect($messages)->toHaveCount(2);
        expect($messages[0]['from_email'])->toBe('sender@example.com');
        expect($messages[0]['subject'])->toBe('Test Subject');
        expect($messages[0]['thread_id'])->toBe('thread-1');
    });

    it('archives message by removing INBOX label', function () {
        Http::fake([
            'gmail.googleapis.com/gmail/v1/users/me/messages/msg-1/modify' => Http::response([
                'id' => 'msg-1',
                'labelIds' => ['SENT'],
            ]),
        ]);

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
        ]);

        $service = app(GoogleService::class);
        $result = $service->archiveMessage($channel, 'msg-1');

        // Gmail doesn't change message ID on archive
        expect($result)->toBe('msg-1');

        Http::assertSent(function ($request) {
            return $request->url() === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/msg-1/modify'
                && in_array('INBOX', $request['removeLabelIds'] ?? []);
        });
    });

    it('deletes message by moving to trash', function () {
        Http::fake([
            'gmail.googleapis.com/gmail/v1/users/me/messages/msg-1/trash' => Http::response([
                'id' => 'msg-1',
                'labelIds' => ['TRASH'],
            ]),
        ]);

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
        ]);

        $service = app(GoogleService::class);
        $service->deleteMessage($channel, 'msg-1');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'messages/msg-1/trash');
        });
    });

    it('moves message to label', function () {
        Http::fake([
            'gmail.googleapis.com/gmail/v1/users/me/messages/msg-1/modify' => Http::response([
                'id' => 'msg-1',
                'labelIds' => ['Label_Custom'],
            ]),
        ]);

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
        ]);

        $service = app(GoogleService::class);
        $result = $service->moveMessage($channel, 'msg-1', 'Label_Custom');

        // Gmail doesn't change message ID on move
        expect($result)->toBe('msg-1');

        Http::assertSent(function ($request) {
            return $request->url() === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/msg-1/modify'
                && in_array('Label_Custom', $request['addLabelIds'] ?? [])
                && in_array('INBOX', $request['removeLabelIds'] ?? []);
        });
    });

    it('extracts multipart email body correctly', function () {
        Http::fake([
            'https://gmail.googleapis.com/gmail/v1/*' => function ($request) {
                $url = $request->url();

                // List messages endpoint
                if (str_contains($url, '/users/me/messages') && ! str_contains($url, 'msg-multipart')) {
                    return Http::response([
                        'messages' => [
                            ['id' => 'msg-multipart', 'threadId' => 'thread-1'],
                        ],
                    ]);
                }

                // Get message msg-multipart
                if (str_contains($url, 'msg-multipart')) {
                    return Http::response([
                        'id' => 'msg-multipart',
                        'threadId' => 'thread-1',
                        'internalDate' => '1702900000000',
                        'payload' => [
                            'mimeType' => 'multipart/alternative',
                            'headers' => [
                                ['name' => 'From', 'value' => 'Test <test@example.com>'],
                                ['name' => 'Subject', 'value' => 'Multipart Test'],
                            ],
                            'parts' => [
                                [
                                    'mimeType' => 'text/plain',
                                    'body' => [
                                        'data' => rtrim(strtr(base64_encode('Plain text version'), '+/', '-_'), '='),
                                    ],
                                ],
                                [
                                    'mimeType' => 'text/html',
                                    'body' => [
                                        'data' => rtrim(strtr(base64_encode('<p>HTML version</p>'), '+/', '-_'), '='),
                                    ],
                                ],
                            ],
                        ],
                    ]);
                }

                return Http::response([], 404);
            },
        ]);

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
            'fetch_folder' => 'INBOX',
        ]);

        $service = app(GoogleService::class);
        $messages = $service->fetchMessages($channel);

        expect($messages)->toHaveCount(1);
        expect($messages[0]['body_text'])->toBe('Plain text version');
        expect($messages[0]['body_html'])->toBe('<p>HTML version</p>');
    });
});

describe('EmailProviderFactory with Google', function () {
    it('returns GoogleService for Google provider', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
        ]);

        $factory = app(EmailProviderFactory::class);
        $service = $factory->make($channel);

        expect($service)->toBeInstanceOf(GoogleService::class);
    });

    it('includes Google in supported OAuth providers', function () {
        $factory = app(EmailProviderFactory::class);
        $providers = $factory->getSupportedOAuthProviders();

        expect($providers)->toContain(EmailProvider::Google);
    });

    it('reports Google as supported', function () {
        $factory = app(EmailProviderFactory::class);

        expect($factory->isSupported(EmailProvider::Google))->toBeTrue();
    });
});

describe('Google Email Threading', function () {
    it('normalizes message ID without angle brackets', function () {
        Http::fake([
            'https://gmail.googleapis.com/gmail/v1/*' => function ($request) {
                $url = $request->url();

                if (str_contains($url, '/users/me/messages') && ! str_contains($url, 'msg-threading')) {
                    return Http::response([
                        'messages' => [['id' => 'msg-threading', 'threadId' => 'thread-1']],
                    ]);
                }

                if (str_contains($url, 'msg-threading')) {
                    return Http::response([
                        'id' => 'msg-threading',
                        'threadId' => 'thread-1',
                        'internalDate' => '1702900000000',
                        'payload' => [
                            'headers' => [
                                ['name' => 'From', 'value' => 'sender@example.com'],
                                ['name' => 'Subject', 'value' => 'Test Subject'],
                                // Message-ID comes from Gmail WITH angle brackets
                                ['name' => 'Message-ID', 'value' => '<CAFuGMiVXrDpZ123@mail.gmail.com>'],
                            ],
                            'body' => ['data' => rtrim(strtr(base64_encode('Test'), '+/', '-_'), '=')],
                            'mimeType' => 'text/plain',
                        ],
                    ]);
                }

                return Http::response([], 404);
            },
        ]);

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
            'fetch_folder' => 'INBOX',
        ]);

        $service = app(GoogleService::class);
        $messages = $service->fetchMessages($channel);

        // Message ID should be stored WITHOUT angle brackets
        expect($messages[0]['internet_message_id'])->toBe('CAFuGMiVXrDpZ123@mail.gmail.com');
        expect($messages[0]['internet_message_id'])->not->toContain('<');
        expect($messages[0]['internet_message_id'])->not->toContain('>');
    });

    it('parses reply threading headers correctly', function () {
        Http::fake([
            'https://gmail.googleapis.com/gmail/v1/*' => function ($request) {
                $url = $request->url();

                if (str_contains($url, '/users/me/messages') && ! str_contains($url, 'msg-reply')) {
                    return Http::response([
                        'messages' => [['id' => 'msg-reply', 'threadId' => 'thread-1']],
                    ]);
                }

                if (str_contains($url, 'msg-reply')) {
                    return Http::response([
                        'id' => 'msg-reply',
                        'threadId' => 'thread-1',
                        'internalDate' => '1702900000000',
                        'payload' => [
                            'headers' => [
                                ['name' => 'From', 'value' => 'customer@example.com'],
                                ['name' => 'Subject', 'value' => 'Re: Original Subject'],
                                ['name' => 'Message-ID', 'value' => '<reply-msg@gmail.com>'],
                                ['name' => 'In-Reply-To', 'value' => '<ticket-1-msg-1@domain.com>'],
                                ['name' => 'References', 'value' => '<original@gmail.com> <ticket-1-msg-1@domain.com>'],
                            ],
                            'body' => ['data' => rtrim(strtr(base64_encode('Reply content'), '+/', '-_'), '=')],
                            'mimeType' => 'text/plain',
                        ],
                    ]);
                }

                return Http::response([], 404);
            },
        ]);

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'provider' => EmailProvider::Google,
            'fetch_folder' => 'INBOX',
        ]);

        $service = app(GoogleService::class);
        $messages = $service->fetchMessages($channel);

        // In-Reply-To should be cleaned (no brackets)
        expect($messages[0]['in_reply_to'])->toBe('ticket-1-msg-1@domain.com');

        // References should be an array of cleaned message IDs
        expect($messages[0]['references'])->toBeArray();
        expect($messages[0]['references'])->toHaveCount(2);
        expect($messages[0]['references'][0])->toBe('original@gmail.com');
        expect($messages[0]['references'][1])->toBe('ticket-1-msg-1@domain.com');

        // Thread ID should be preserved
        expect($messages[0]['thread_id'])->toBe('thread-1');
    });
});

describe('Google Email Channel Creation', function () {
    it('can create Google email channel', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Gmail Support',
            'email_address' => 'support@example.com',
            'provider' => EmailProvider::Google,
        ]);

        expect($channel->name)->toBe('Gmail Support');
        expect($channel->provider)->toBe(EmailProvider::Google);
    });

    it('creates Google email channel via controller', function () {
        $response = $this->actingAs($this->adminUser)
            ->post('/organization/email-channels', [
                'name' => 'Gmail Channel',
                'provider' => EmailProvider::Google->value,
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('email_channels', [
            'organization_id' => $this->organization->id,
            'name' => 'Gmail Channel',
            'provider' => EmailProvider::Google->value,
        ]);
    });
});
