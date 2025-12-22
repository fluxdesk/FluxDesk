<?php

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

test('authenticated users without organization are redirected to onboarding', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get(route('dashboard'))->assertRedirect(route('onboarding.organization'));
});

test('authenticated users with organization can visit the dashboard', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();
    $user->organizations()->attach($organization->id, [
        'role' => UserRole::Admin,
        'is_default' => true,
    ]);

    $this->actingAs($user);

    $this->get(route('dashboard'))->assertOk();
});
