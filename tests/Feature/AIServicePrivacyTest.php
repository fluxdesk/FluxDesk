<?php

use App\Models\Contact;
use App\Models\Department;
use App\Models\Message;
use App\Models\Organization;
use App\Models\OrganizationAISettings;
use App\Models\Ticket;
use App\Models\User;
use App\Services\AI\AIManager;
use App\Services\AI\AIService;
use App\Services\AI\UsageTracker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionMethod;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->contact = Contact::factory()->for($this->organization)->create([
        'name' => 'John Doe',
        'email' => 'john.doe@example.com',
    ]);
    $this->department = Department::create([
        'organization_id' => $this->organization->id,
        'name' => 'Technical Support',
    ]);
    $this->user = User::factory()->create(['name' => 'Jane Agent']);

    $this->ticket = Ticket::factory()->for($this->organization)->create([
        'subject' => 'Test Ticket Subject',
        'contact_id' => $this->contact->id,
        'department_id' => $this->department->id,
    ]);

    // Create some messages
    Message::factory()->for($this->ticket)->create([
        'body' => 'Customer message content',
        'is_from_contact' => true,
        'contact_id' => $this->contact->id,
    ]);

    Message::factory()->for($this->ticket)->create([
        'body' => 'Agent response content',
        'is_from_contact' => false,
        'user_id' => $this->user->id,
    ]);

    // Create AI service with mocked dependencies
    $this->manager = Mockery::mock(AIManager::class);
    $this->usageTracker = Mockery::mock(UsageTracker::class);
    $this->aiService = new AIService($this->manager, $this->usageTracker);
});

/**
 * Helper to call the protected buildTicketContext method.
 */
function callBuildTicketContext(AIService $service, Ticket $ticket, OrganizationAISettings $settings, array &$dataIncluded = []): array
{
    $method = new ReflectionMethod(AIService::class, 'buildTicketContext');
    $args = [$ticket, $settings, &$dataIncluded];

    return $method->invokeArgs($service, $args);
}

describe('AIService Privacy Controls - Include Settings', function () {
    it('includes all data when all settings enabled', function () {
        $settings = OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_language' => 'en',
            'include_customer_name' => true,
            'include_agent_name' => true,
            'include_ticket_subject' => true,
            'include_message_history' => true,
            'include_department_name' => true,
            'message_history_limit' => 10,
        ]);

        $dataIncluded = [];
        $messages = callBuildTicketContext($this->aiService, $this->ticket, $settings, $dataIncluded);

        // Get the ticket context message content
        $contextContent = collect($messages)->firstWhere('role', 'user')['content'] ?? '';

        expect($contextContent)->toContain('Test Ticket Subject');
        expect($contextContent)->toContain('John Doe');
        expect($contextContent)->toContain('Technical Support');
        expect($contextContent)->toContain('Customer message content');
        expect($contextContent)->toContain('Jane Agent');

        expect($dataIncluded)->toContain('ticket_subject');
        expect($dataIncluded)->toContain('customer_name');
        expect($dataIncluded)->toContain('department_name');
        expect($dataIncluded)->toContain('message_history');
        expect($dataIncluded)->toContain('agent_name');
    });

    it('redacts ticket subject when disabled', function () {
        $settings = OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_language' => 'en',
            'include_ticket_subject' => false,
            'include_customer_name' => true,
            'include_message_history' => true,
        ]);

        $dataIncluded = [];
        $messages = callBuildTicketContext($this->aiService, $this->ticket, $settings, $dataIncluded);

        $contextContent = collect($messages)->firstWhere('role', 'user')['content'] ?? '';

        expect($contextContent)->toContain('Subject: [REDACTED]');
        expect($contextContent)->not->toContain('Test Ticket Subject');
        expect($dataIncluded)->not->toContain('ticket_subject');
    });

    it('masks customer name when disabled', function () {
        $settings = OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_language' => 'en',
            'include_customer_name' => false,
            'include_ticket_subject' => true,
            'include_message_history' => true,
        ]);

        $dataIncluded = [];
        $messages = callBuildTicketContext($this->aiService, $this->ticket, $settings, $dataIncluded);

        $contextContent = collect($messages)->firstWhere('role', 'user')['content'] ?? '';

        expect($contextContent)->toContain('Customer: [Customer]');
        expect($contextContent)->not->toContain('John Doe');
        expect($dataIncluded)->not->toContain('customer_name');
    });

    it('excludes department when disabled', function () {
        $settings = OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_language' => 'en',
            'include_department_name' => false,
            'include_ticket_subject' => true,
            'include_message_history' => false,
        ]);

        $dataIncluded = [];
        $messages = callBuildTicketContext($this->aiService, $this->ticket, $settings, $dataIncluded);

        $contextContent = collect($messages)->firstWhere('role', 'user')['content'] ?? '';

        expect($contextContent)->not->toContain('Technical Support');
        expect($contextContent)->not->toContain('Department:');
        expect($dataIncluded)->not->toContain('department_name');
    });

    it('excludes message history when disabled', function () {
        $settings = OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_language' => 'en',
            'include_message_history' => false,
            'include_ticket_subject' => true,
        ]);

        $dataIncluded = [];
        $messages = callBuildTicketContext($this->aiService, $this->ticket, $settings, $dataIncluded);

        $contextContent = collect($messages)->firstWhere('role', 'user')['content'] ?? '';

        expect($contextContent)->not->toContain('Customer message content');
        expect($contextContent)->not->toContain('Agent response content');
        expect($contextContent)->not->toContain('Conversation History');
        expect($dataIncluded)->not->toContain('message_history');
    });

    it('masks agent name when disabled', function () {
        $settings = OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_language' => 'en',
            'include_agent_name' => false,
            'include_customer_name' => true,
            'include_message_history' => true,
        ]);

        $dataIncluded = [];
        $messages = callBuildTicketContext($this->aiService, $this->ticket, $settings, $dataIncluded);

        $contextContent = collect($messages)->firstWhere('role', 'user')['content'] ?? '';

        expect($contextContent)->toContain('[Agent]');
        expect($contextContent)->not->toContain('Jane Agent');
        expect($dataIncluded)->not->toContain('agent_name');
    });

    it('respects message history limit', function () {
        // Create more messages
        for ($i = 0; $i < 15; $i++) {
            Message::factory()->for($this->ticket)->create([
                'body' => "Message number {$i}",
                'is_from_contact' => $i % 2 === 0,
            ]);
        }

        $settings = OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_language' => 'en',
            'include_message_history' => true,
            'message_history_limit' => 5,
        ]);

        $dataIncluded = [];
        $messages = callBuildTicketContext($this->aiService, $this->ticket, $settings, $dataIncluded);

        $contextContent = collect($messages)->firstWhere('role', 'user')['content'] ?? '';

        // Count message occurrences (rough check)
        preg_match_all('/\*\*.*?\*\*:/', $contextContent, $matches);
        expect(count($matches[0]))->toBeLessThanOrEqual(5);
    });

    it('includes all data with default settings', function () {
        $settings = OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_language' => 'en',
            // All defaults (null values should default to true)
        ]);

        $dataIncluded = [];
        $messages = callBuildTicketContext($this->aiService, $this->ticket, $settings, $dataIncluded);

        $contextContent = collect($messages)->firstWhere('role', 'user')['content'] ?? '';

        // With defaults, everything should be included
        expect($contextContent)->toContain('Test Ticket Subject');
        expect($dataIncluded)->toContain('ticket_subject');
        expect($dataIncluded)->toContain('message_history');
    });
});

describe('AIService Privacy Controls - Maximum Privacy Mode', function () {
    it('applies all privacy restrictions when all disabled', function () {
        $settings = OrganizationAISettings::create([
            'organization_id' => $this->organization->id,
            'default_language' => 'en',
            'include_customer_name' => false,
            'include_agent_name' => false,
            'include_ticket_subject' => false,
            'include_message_history' => false,
            'include_department_name' => false,
        ]);

        $dataIncluded = [];
        $messages = callBuildTicketContext($this->aiService, $this->ticket, $settings, $dataIncluded);

        $contextContent = collect($messages)->firstWhere('role', 'user')['content'] ?? '';

        // All personal info should be masked/excluded
        expect($contextContent)->toContain('Subject: [REDACTED]');
        expect($contextContent)->toContain('Customer: [Customer]');
        expect($contextContent)->not->toContain('John Doe');
        expect($contextContent)->not->toContain('Jane Agent');
        expect($contextContent)->not->toContain('Technical Support');
        expect($contextContent)->not->toContain('Conversation History');

        // Data included should be minimal
        expect($dataIncluded)->toBeEmpty();
    });
});
