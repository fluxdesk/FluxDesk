<?php

use App\Enums\UserRole;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Organization;
use App\Models\Sla;
use App\Models\User;
use App\Services\CompanyService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->user = User::factory()->create();
    $this->organization->users()->attach($this->user->id, [
        'role' => UserRole::Agent->value,
        'is_default' => true,
    ]);
    Sla::factory()->create(['organization_id' => $this->organization->id, 'is_default' => true]);
});

describe('Company Controller', function () {
    it('lists companies', function () {
        Company::factory()->count(3)->create(['organization_id' => $this->organization->id]);

        $response = $this->actingAs($this->user)
            ->get('/companies');

        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->component('companies/index')
            ->has('companies.data', 3)
            ->has('slas')
        );
    });

    it('creates a company', function () {
        $response = $this->actingAs($this->user)
            ->post('/companies', [
                'name' => 'Acme Corp',
                'email' => 'info@acme.nl',
                'phone' => '+31 20 1234567',
                'website' => 'https://acme.nl',
                'domains' => ['acme.nl', 'acme.com'],
                'address' => 'Straat 123, Amsterdam',
                'notes' => 'Test notes',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $company = Company::where('organization_id', $this->organization->id)->first();

        expect($company)->not->toBeNull();
        expect($company->name)->toBe('Acme Corp');
        expect($company->email)->toBe('info@acme.nl');
        expect($company->domains)->toBe(['acme.nl', 'acme.com']);
    });

    it('validates required name when creating', function () {
        $response = $this->actingAs($this->user)
            ->post('/companies', [
                'name' => '',
            ]);

        $response->assertSessionHasErrors(['name']);
    });

    it('validates unique domain per organization', function () {
        Company::factory()->create([
            'organization_id' => $this->organization->id,
            'domains' => ['example.com'],
        ]);

        $response = $this->actingAs($this->user)
            ->post('/companies', [
                'name' => 'Another Company',
                'domains' => ['example.com'],
            ]);

        $response->assertSessionHasErrors(['domains']);
    });

    it('shows a company with contacts and tickets', function () {
        $company = Company::factory()->create(['organization_id' => $this->organization->id]);
        Contact::factory()->count(2)->create([
            'organization_id' => $this->organization->id,
            'company_id' => $company->id,
        ]);

        $response = $this->actingAs($this->user)
            ->get("/companies/{$company->id}");

        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->component('companies/show')
            ->has('company')
            ->has('contacts')
            ->has('recentTickets')
            ->has('availableContacts')
        );
    });

    it('updates a company', function () {
        $company = Company::factory()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Old Name',
        ]);

        $response = $this->actingAs($this->user)
            ->patch("/companies/{$company->id}", [
                'name' => 'New Name',
                'email' => 'new@example.com',
                'domains' => ['newdomain.com'],
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $company->refresh();
        expect($company->name)->toBe('New Name');
        expect($company->email)->toBe('new@example.com');
        expect($company->domains)->toBe(['newdomain.com']);
    });

    it('deletes a company and unlinks contacts', function () {
        $company = Company::factory()->create(['organization_id' => $this->organization->id]);
        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'company_id' => $company->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete("/companies/{$company->id}");

        $response->assertRedirect('/companies');
        $response->assertSessionHas('success');

        expect(Company::withTrashed()->find($company->id)->deleted_at)->not->toBeNull();
        $contact->refresh();
        expect($contact->company_id)->toBeNull();
    });

    it('links a contact to a company', function () {
        $company = Company::factory()->create(['organization_id' => $this->organization->id]);
        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'company_id' => null,
        ]);

        $response = $this->actingAs($this->user)
            ->post("/companies/{$company->id}/contacts/{$contact->id}");

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $contact->refresh();
        expect($contact->company_id)->toBe($company->id);
    });

    it('unlinks a contact from a company', function () {
        $company = Company::factory()->create(['organization_id' => $this->organization->id]);
        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'company_id' => $company->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete("/companies/{$company->id}/contacts/{$contact->id}");

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $contact->refresh();
        expect($contact->company_id)->toBeNull();
    });
});

describe('Company Service', function () {
    it('matches contact to company by email domain', function () {
        $company = Company::factory()->create([
            'organization_id' => $this->organization->id,
            'domains' => ['example.com'],
        ]);

        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'john@example.com',
            'company_id' => null,
        ]);

        $service = app(CompanyService::class);
        $service->matchContactToCompany($contact);

        $contact->refresh();
        expect($contact->company_id)->toBe($company->id);
    });

    it('matches contact when company has multiple domains', function () {
        $company = Company::factory()->create([
            'organization_id' => $this->organization->id,
            'domains' => ['example.com', 'example.nl', 'example.org'],
        ]);

        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'john@example.nl',
            'company_id' => null,
        ]);

        $service = app(CompanyService::class);
        $service->matchContactToCompany($contact);

        $contact->refresh();
        expect($contact->company_id)->toBe($company->id);
    });

    it('does not match contact if already has company', function () {
        $existingCompany = Company::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $company = Company::factory()->create([
            'organization_id' => $this->organization->id,
            'domains' => ['example.com'],
        ]);

        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'john@example.com',
            'company_id' => $existingCompany->id,
        ]);

        $service = app(CompanyService::class);
        $service->matchContactToCompany($contact);

        $contact->refresh();
        expect($contact->company_id)->toBe($existingCompany->id);
    });

    it('matches all contacts when company domains are set', function () {
        $company = Company::factory()->create([
            'organization_id' => $this->organization->id,
            'domains' => ['example.com', 'example.nl'],
        ]);

        Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'john@example.com',
            'company_id' => null,
        ]);
        Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'jane@example.nl',
            'company_id' => null,
        ]);
        Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'other@different.com',
            'company_id' => null,
        ]);

        $service = app(CompanyService::class);
        $matched = $service->matchAllContactsForCompany($company);

        expect($matched)->toBe(2);
        expect(Contact::where('company_id', $company->id)->count())->toBe(2);
    });
});
