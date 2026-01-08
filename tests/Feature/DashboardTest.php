<?php

use App\Enums\UserRole;
use App\Models\CustomWidget;
use App\Models\DashboardLayout;
use App\Models\DashboardTemplate;
use App\Models\Organization;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->organization = Organization::factory()->create();
    $this->user->organizations()->attach($this->organization->id, [
        'role' => UserRole::Admin,
        'is_default' => true,
    ]);
});

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

test('authenticated users without organization are redirected to onboarding', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get(route('dashboard'))->assertRedirect(route('onboarding.organization'));
});

test('authenticated users with organization can visit the dashboard', function () {
    $this->actingAs($this->user);

    $this->get(route('dashboard'))->assertOk();
});

test('dashboard returns layout data', function () {
    $this->actingAs($this->user);

    $response = $this->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('layout')
        ->has('availableWidgets')
        ->has('customWidgets')
        ->has('templates')
        ->has('metrics')
    );
});

test('user can update dashboard layout', function () {
    $this->actingAs($this->user);

    // First visit to create initial layout
    $this->get(route('dashboard'));

    $newWidgets = [
        ['id' => 'widget-1', 'type' => 'built-in', 'widget_key' => 'metrics-open-tickets', 'size' => 'sm', 'position' => 0],
        ['id' => 'widget-2', 'type' => 'built-in', 'widget_key' => 'tickets-by-status', 'size' => 'md', 'position' => 1],
    ];

    $response = $this->patch('/dashboard/layout', ['widgets' => $newWidgets]);

    $response->assertRedirect();

    $layout = DashboardLayout::where('user_id', $this->user->id)
        ->where('organization_id', $this->organization->id)
        ->first();

    expect($layout)->not->toBeNull();
    expect($layout->widgets)->toHaveCount(2);
});

test('user can reset dashboard layout', function () {
    $this->actingAs($this->user);

    // Create a layout with custom widgets
    DashboardLayout::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->organization->id,
        'widgets' => [['id' => 'custom', 'type' => 'built-in', 'widget_key' => 'trends', 'size' => 'lg', 'position' => 0]],
    ]);

    $response = $this->post('/dashboard/layout/reset');

    $response->assertRedirect();

    $layout = DashboardLayout::where('user_id', $this->user->id)
        ->where('organization_id', $this->organization->id)
        ->first();

    // Layout should have default widgets (more than 1)
    expect($layout->widgets)->not->toHaveCount(1);
});

test('user can create custom widget', function () {
    $this->actingAs($this->user);

    $response = $this->post('/custom-widgets', [
        'name' => 'My Custom Widget',
        'entity' => 'tickets',
        'chart_type' => 'bar',
        'group_by' => 'status',
        'aggregation' => 'count',
        'filters' => ['date_range' => '7d'],
        'is_shared' => false,
    ]);

    $response->assertRedirect();

    $widget = CustomWidget::where('user_id', $this->user->id)->first();
    expect($widget)->not->toBeNull();
    expect($widget->name)->toBe('My Custom Widget');
});

test('user can update custom widget', function () {
    $this->actingAs($this->user);

    $widget = CustomWidget::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->organization->id,
        'name' => 'Original Name',
        'entity' => 'tickets',
        'chart_type' => 'bar',
        'group_by' => 'status',
        'aggregation' => 'count',
        'filters' => [],
        'is_shared' => false,
    ]);

    $response = $this->patch("/custom-widgets/{$widget->id}", [
        'name' => 'Updated Name',
        'entity' => 'tickets',
        'chart_type' => 'pie',
        'group_by' => 'priority',
        'aggregation' => 'count',
        'filters' => [],
        'is_shared' => true,
    ]);

    $response->assertRedirect();

    $widget->refresh();
    expect($widget->name)->toBe('Updated Name');
    expect($widget->chart_type)->toBe('pie');
});

test('user can delete custom widget', function () {
    $this->actingAs($this->user);

    $widget = CustomWidget::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->organization->id,
        'name' => 'To Delete',
        'entity' => 'tickets',
        'chart_type' => 'bar',
        'group_by' => 'status',
        'aggregation' => 'count',
        'filters' => [],
        'is_shared' => false,
    ]);

    $response = $this->delete("/custom-widgets/{$widget->id}");

    $response->assertRedirect();
    expect(CustomWidget::find($widget->id))->toBeNull();
});

test('user cannot delete another user custom widget', function () {
    $this->actingAs($this->user);

    $otherUser = User::factory()->create();
    $widget = CustomWidget::create([
        'user_id' => $otherUser->id,
        'organization_id' => $this->organization->id,
        'name' => 'Other User Widget',
        'entity' => 'tickets',
        'chart_type' => 'bar',
        'group_by' => 'status',
        'aggregation' => 'count',
        'filters' => [],
        'is_shared' => false,
    ]);

    $response = $this->delete("/custom-widgets/{$widget->id}");

    $response->assertForbidden();
});

test('user can preview custom widget data', function () {
    $this->actingAs($this->user);

    $response = $this->post('/custom-widgets/preview', [
        'entity' => 'tickets',
        'chart_type' => 'bar',
        'group_by' => 'status',
        'aggregation' => 'count',
        'filters' => ['date_range' => '7d'],
    ]);

    $response->assertOk();
    $response->assertJsonStructure(['data']);
});

test('user can save dashboard as template', function () {
    $this->actingAs($this->user);

    // Create a layout first
    DashboardLayout::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->organization->id,
        'widgets' => [['id' => 'w1', 'type' => 'built-in', 'widget_key' => 'trends', 'size' => 'md', 'position' => 0]],
    ]);

    $response = $this->post('/dashboard/templates', [
        'name' => 'My Template',
        'description' => 'A test template',
    ]);

    $response->assertRedirect();

    $template = DashboardTemplate::where('created_by', $this->user->id)->first();
    expect($template)->not->toBeNull();
    expect($template->name)->toBe('My Template');
    expect($template->is_preset)->toBeFalse();
});

test('user can apply template', function () {
    $this->actingAs($this->user);

    // Create initial layout
    $layout = DashboardLayout::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->organization->id,
        'widgets' => [],
    ]);

    // Create template
    $template = DashboardTemplate::create([
        'organization_id' => $this->organization->id,
        'created_by' => $this->user->id,
        'name' => 'Template to Apply',
        'is_preset' => false,
        'widgets' => [
            ['id' => 't1', 'type' => 'built-in', 'widget_key' => 'metrics-open-tickets', 'size' => 'sm', 'position' => 0],
            ['id' => 't2', 'type' => 'built-in', 'widget_key' => 'trends', 'size' => 'md', 'position' => 1],
        ],
    ]);

    $response = $this->post("/dashboard/templates/{$template->id}/apply");

    $response->assertRedirect();

    $layout->refresh();
    expect($layout->widgets)->toHaveCount(2);
});

test('user can delete own template', function () {
    $this->actingAs($this->user);

    $template = DashboardTemplate::create([
        'organization_id' => $this->organization->id,
        'created_by' => $this->user->id,
        'name' => 'Template to Delete',
        'is_preset' => false,
        'widgets' => [],
    ]);

    $response = $this->delete("/dashboard/templates/{$template->id}");

    $response->assertRedirect();
    expect(DashboardTemplate::find($template->id))->toBeNull();
});

test('user cannot delete preset template', function () {
    $this->actingAs($this->user);

    $template = DashboardTemplate::create([
        'organization_id' => null,
        'created_by' => null,
        'name' => 'Preset Template',
        'is_preset' => true,
        'widgets' => [],
    ]);

    $response = $this->delete("/dashboard/templates/{$template->id}");

    $response->assertForbidden();
});
