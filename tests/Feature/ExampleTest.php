<?php

use App\Models\Organization;

it('shows landing page when organization exists', function () {
    // Create an organization
    $organization = Organization::factory()->create([
        'slug' => 'test-org',
    ]);

    // Visit the org's landing page
    $response = $this->get("/{$organization->slug}");

    $response->assertOk();
});

it('returns 404 when no default organization', function () {
    $response = $this->get('/');

    $response->assertNotFound();
});
