<?php

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\OrganizationAISettings;
use App\Models\OrganizationIntegration;
use App\Models\Ticket;
use App\Models\User;
use App\Services\AI\AIService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->admin = User::factory()->create();
    $this->organization->users()->attach($this->admin->id, [
        'role' => UserRole::Admin->value,
        'is_default' => true,
    ]);

    // Create a ticket
    $this->ticket = Ticket::factory()->for($this->organization)->create();
});

describe('AI Controller - Status', function () {
    it('returns status when AI is not configured', function () {
        $response = $this->actingAs($this->admin)
            ->getJson('/ai/status');

        $response->assertSuccessful();
        $response->assertJson([
            'configured' => false,
            'suggested_replies_enabled' => false,
            'reply_refactor_enabled' => false,
        ]);
    });

    it('returns status when AI is configured', function () {
        // Create OpenAI integration
        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'openai',
            'credentials' => ['api_key' => 'test-key'],
            'is_verified' => true,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        // Create AI settings
        OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_provider' => 'openai',
            'default_model' => 'gpt-4o-mini',
            'suggested_replies_enabled' => true,
            'reply_refactor_enabled' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/ai/status');

        $response->assertSuccessful();
        $response->assertJson([
            'configured' => true,
            'suggested_replies_enabled' => true,
            'reply_refactor_enabled' => true,
        ]);
    });
});

describe('AI Controller - Suggest', function () {
    it('returns error when AI is not configured', function () {
        $response = $this->actingAs($this->admin)
            ->postJson("/ai/suggest/{$this->ticket->id}");

        $response->assertStatus(422);
        $response->assertJson([
            'error' => 'AI is niet geconfigureerd. Configureer eerst een AI provider in de instellingen.',
        ]);
    });

    it('returns error when suggested replies are disabled', function () {
        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'openai',
            'credentials' => ['api_key' => 'test-key'],
            'is_verified' => true,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_provider' => 'openai',
            'suggested_replies_enabled' => false,
            'reply_refactor_enabled' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/ai/suggest/{$this->ticket->id}");

        $response->assertStatus(422);
        $response->assertJson([
            'error' => 'Suggesties zijn uitgeschakeld in de AI instellingen.',
        ]);
    });

    it('returns suggestions when properly configured', function () {
        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'openai',
            'credentials' => ['api_key' => 'test-key'],
            'is_verified' => true,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_provider' => 'openai',
            'default_model' => 'gpt-4o-mini',
            'suggested_replies_enabled' => true,
            'reply_refactor_enabled' => true,
        ]);

        // Mock the AI service
        $mockService = Mockery::mock(AIService::class);
        $mockService->shouldReceive('isConfigured')->andReturn(true);
        $mockService->shouldReceive('suggestReplies')
            ->once()
            ->andReturn([
                'Thank you for reaching out. We will look into this.',
                'I understand your concern. Let me investigate further.',
                'We appreciate your patience. Here is what we found.',
            ]);

        $this->app->instance(AIService::class, $mockService);

        $response = $this->actingAs($this->admin)
            ->postJson("/ai/suggest/{$this->ticket->id}");

        $response->assertSuccessful();
        $response->assertJsonStructure(['suggestions']);
        expect($response->json('suggestions'))->toHaveCount(3);
    });
});

describe('AI Controller - Refactor', function () {
    it('validates request data', function () {
        $response = $this->actingAs($this->admin)
            ->postJson('/ai/refactor', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['text']);
    });

    it('requires minimum text length', function () {
        $response = $this->actingAs($this->admin)
            ->postJson('/ai/refactor', [
                'text' => 'too short',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['text']);
    });

    it('returns error when AI is not configured', function () {
        $response = $this->actingAs($this->admin)
            ->postJson('/ai/refactor', [
                'text' => 'This is a test text that needs to be improved by AI.',
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'error' => 'AI is niet geconfigureerd. Configureer eerst een AI provider in de instellingen.',
        ]);
    });

    it('returns error when refactoring is disabled', function () {
        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'openai',
            'credentials' => ['api_key' => 'test-key'],
            'is_verified' => true,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_provider' => 'openai',
            'suggested_replies_enabled' => true,
            'reply_refactor_enabled' => false,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson('/ai/refactor', [
                'text' => 'This is a test text that needs to be improved by AI.',
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'error' => 'Tekst verbeteren is uitgeschakeld in de AI instellingen.',
        ]);
    });

    it('refactors text when properly configured', function () {
        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'openai',
            'credentials' => ['api_key' => 'test-key'],
            'is_verified' => true,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_provider' => 'openai',
            'default_model' => 'gpt-4o-mini',
            'suggested_replies_enabled' => true,
            'reply_refactor_enabled' => true,
        ]);

        $mockService = Mockery::mock(AIService::class);
        $mockService->shouldReceive('isConfigured')->andReturn(true);
        $mockService->shouldReceive('refactorReply')
            ->once()
            ->andReturn('This text has been improved by AI to be more professional and clear.');

        $this->app->instance(AIService::class, $mockService);

        $response = $this->actingAs($this->admin)
            ->postJson('/ai/refactor', [
                'text' => 'This is a test text that needs to be improved by AI.',
            ]);

        $response->assertSuccessful();
        $response->assertJsonStructure(['text']);
    });

    it('accepts optional instructions', function () {
        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'openai',
            'credentials' => ['api_key' => 'test-key'],
            'is_verified' => true,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_provider' => 'openai',
            'default_model' => 'gpt-4o-mini',
            'suggested_replies_enabled' => true,
            'reply_refactor_enabled' => true,
        ]);

        $mockService = Mockery::mock(AIService::class);
        $mockService->shouldReceive('isConfigured')->andReturn(true);
        $mockService->shouldReceive('refactorReply')
            ->once()
            ->andReturn('Improved text without emdashes.');

        $this->app->instance(AIService::class, $mockService);

        $response = $this->actingAs($this->admin)
            ->postJson('/ai/refactor', [
                'text' => 'This is a test text — with emdashes — that needs fixing.',
                'instructions' => 'Remove all emdashes and make it more formal.',
            ]);

        $response->assertSuccessful();
    });
});

describe('AI Controller - Authentication', function () {
    it('requires authentication for suggest', function () {
        $response = $this->postJson("/ai/suggest/{$this->ticket->id}");

        $response->assertUnauthorized();
    });

    it('requires authentication for refactor', function () {
        $response = $this->postJson('/ai/refactor', [
            'text' => 'Test text that is long enough.',
        ]);

        $response->assertUnauthorized();
    });

    it('requires authentication for status', function () {
        $response = $this->getJson('/ai/status');

        $response->assertUnauthorized();
    });
});
