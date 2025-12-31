<?php

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\OrganizationAISettings;
use App\Models\OrganizationIntegration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->admin = User::factory()->create();
    $this->organization->users()->attach($this->admin->id, [
        'role' => UserRole::Admin->value,
        'is_default' => true,
    ]);
});

describe('AI Settings Controller - Index', function () {
    it('shows AI settings page for admin', function () {
        $response = $this->actingAs($this->admin)
            ->get('/organization/ai-settings');

        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->component('organization/ai-settings')
            ->has('settings')
            ->has('providers')
            ->has('languages')
        );
    });

    it('requires admin role to view AI settings', function () {
        $agent = User::factory()->create();
        $this->organization->users()->attach($agent->id, [
            'role' => UserRole::Agent->value,
        ]);

        $response = $this->actingAs($agent)
            ->get('/organization/ai-settings');

        $response->assertForbidden();
    });

    it('shows default settings when none configured', function () {
        $response = $this->actingAs($this->admin)
            ->get('/organization/ai-settings');

        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->where('settings.default_language', 'nl')
            ->where('settings.suggested_replies_enabled', true)
            ->where('settings.reply_refactor_enabled', true)
        );
    });

    it('shows configured providers', function () {
        // Add OpenAI integration
        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'openai',
            'credentials' => ['api_key' => 'test-key'],
            'is_verified' => true,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->get('/organization/ai-settings');

        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->has('providers', fn ($providers) => $providers
                ->each(fn ($provider) => $provider
                    ->has('identifier')
                    ->has('name')
                    ->has('is_active')
                    ->has('models')
                )
            )
        );
    });
});

describe('AI Settings Controller - Update', function () {
    it('updates AI settings', function () {
        $response = $this->actingAs($this->admin)
            ->patch('/organization/ai-settings', [
                'default_provider' => 'openai',
                'default_model' => 'gpt-4o-mini',
                'default_language' => 'en',
                'detect_ticket_language' => true,
                'match_ticket_language' => true,
                'system_instructions' => 'Be professional and concise. Never use emdashes.',
                'company_context' => 'We are a software company.',
                'suggested_replies_enabled' => true,
                'reply_refactor_enabled' => true,
                'auto_replies_enabled' => false,
                'auto_reply_delay_minutes' => 5,
                'auto_reply_business_hours_only' => true,
            ]);

        $response->assertRedirect();

        $settings = $this->organization->fresh()->aiSettings;
        expect($settings)->not->toBeNull();
        expect($settings->default_provider)->toBe('openai');
        expect($settings->default_model)->toBe('gpt-4o-mini');
        expect($settings->default_language)->toBe('en');
        expect($settings->system_instructions)->toBe('Be professional and concise. Never use emdashes.');
    });

    it('validates required fields', function () {
        $response = $this->actingAs($this->admin)
            ->patch('/organization/ai-settings', [
                // missing default_language
            ]);

        $response->assertSessionHasErrors(['default_language']);
    });

    it('validates auto_reply_delay_minutes range', function () {
        $response = $this->actingAs($this->admin)
            ->patch('/organization/ai-settings', [
                'default_language' => 'nl',
                'auto_reply_delay_minutes' => 100, // max is 60
            ]);

        $response->assertSessionHasErrors(['auto_reply_delay_minutes']);
    });

    it('updates existing settings', function () {
        // Create initial settings
        OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_provider' => 'openai',
            'default_model' => 'gpt-4o',
            'default_language' => 'nl',
        ]);

        $response = $this->actingAs($this->admin)
            ->patch('/organization/ai-settings', [
                'default_provider' => 'openai',
                'default_model' => 'gpt-4o-mini',
                'default_language' => 'en',
                'suggested_replies_enabled' => false,
                'reply_refactor_enabled' => true,
                'auto_replies_enabled' => false,
                'auto_reply_delay_minutes' => 10,
                'auto_reply_business_hours_only' => false,
            ]);

        $response->assertRedirect();

        $settings = $this->organization->fresh()->aiSettings;
        expect($settings->default_model)->toBe('gpt-4o-mini');
        expect($settings->default_language)->toBe('en');
        expect($settings->suggested_replies_enabled)->toBeFalse();
    });

    it('requires admin role to update settings', function () {
        $agent = User::factory()->create();
        $this->organization->users()->attach($agent->id, [
            'role' => UserRole::Agent->value,
        ]);

        $response = $this->actingAs($agent)
            ->patch('/organization/ai-settings', [
                'default_language' => 'en',
            ]);

        $response->assertForbidden();
    });
});

describe('AI Settings Controller - Languages', function () {
    it('provides language options', function () {
        $response = $this->actingAs($this->admin)
            ->get('/organization/ai-settings');

        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->has('languages', fn ($languages) => $languages
                ->each(fn ($language) => $language
                    ->has('code')
                    ->has('name')
                )
            )
        );
    });
});

describe('AI Settings Controller - Privacy Settings', function () {
    it('shows default privacy settings when none configured', function () {
        $response = $this->actingAs($this->admin)
            ->get('/organization/ai-settings');

        $response->assertSuccessful();
        // GDPR-compliant defaults: personal customer data off by default
        $response->assertInertia(fn ($page) => $page
            ->where('settings.include_customer_name', false)
            ->where('settings.include_agent_name', true)
            ->where('settings.include_ticket_subject', false)
            ->where('settings.include_message_history', false)
            ->where('settings.include_department_name', true)
            ->where('settings.message_history_limit', 10)
            ->where('settings.disclosure_enabled', false)
            ->where('settings.disclosure_in_email', true)
            ->where('settings.disclosure_in_portal', true)
        );
    });

    it('updates privacy settings', function () {
        $response = $this->actingAs($this->admin)
            ->patch('/organization/ai-settings', [
                'default_language' => 'nl',
                'include_customer_name' => false,
                'include_agent_name' => false,
                'include_ticket_subject' => false,
                'include_message_history' => true,
                'include_department_name' => false,
                'message_history_limit' => 5,
                'disclosure_enabled' => true,
                'disclosure_in_email' => true,
                'disclosure_in_portal' => false,
                'disclosure_text' => 'AI generated content.',
            ]);

        $response->assertRedirect();

        $settings = $this->organization->fresh()->aiSettings;
        expect($settings)->not->toBeNull();
        expect($settings->include_customer_name)->toBeFalse();
        expect($settings->include_agent_name)->toBeFalse();
        expect($settings->include_ticket_subject)->toBeFalse();
        expect($settings->include_message_history)->toBeTrue();
        expect($settings->include_department_name)->toBeFalse();
        expect($settings->message_history_limit)->toBe(5);
        expect($settings->disclosure_enabled)->toBeTrue();
        expect($settings->disclosure_in_email)->toBeTrue();
        expect($settings->disclosure_in_portal)->toBeFalse();
        expect($settings->disclosure_text)->toBe('AI generated content.');
    });

    it('validates message_history_limit range', function () {
        $response = $this->actingAs($this->admin)
            ->patch('/organization/ai-settings', [
                'default_language' => 'nl',
                'message_history_limit' => 25, // max is 20
            ]);

        $response->assertSessionHasErrors(['message_history_limit']);
    });

    it('validates message_history_limit minimum', function () {
        $response = $this->actingAs($this->admin)
            ->patch('/organization/ai-settings', [
                'default_language' => 'nl',
                'message_history_limit' => 0, // min is 1
            ]);

        $response->assertSessionHasErrors(['message_history_limit']);
    });

    it('validates disclosure_text max length', function () {
        $response = $this->actingAs($this->admin)
            ->patch('/organization/ai-settings', [
                'default_language' => 'nl',
                'disclosure_text' => str_repeat('a', 501), // max is 500
            ]);

        $response->assertSessionHasErrors(['disclosure_text']);
    });

    it('returns saved privacy settings', function () {
        OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_language' => 'nl',
            'include_customer_name' => false,
            'include_agent_name' => true,
            'include_ticket_subject' => false,
            'message_history_limit' => 15,
            'disclosure_enabled' => true,
            'disclosure_text' => 'Custom disclosure text.',
        ]);

        $response = $this->actingAs($this->admin)
            ->get('/organization/ai-settings');

        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->where('settings.include_customer_name', false)
            ->where('settings.include_agent_name', true)
            ->where('settings.include_ticket_subject', false)
            ->where('settings.message_history_limit', 15)
            ->where('settings.disclosure_enabled', true)
            ->where('settings.disclosure_text', 'Custom disclosure text.')
        );
    });
});
