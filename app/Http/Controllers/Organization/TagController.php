<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StoreTagRequest;
use App\Http\Requests\Organization\UpdateTagRequest;
use App\Models\Tag;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class TagController extends Controller
{
    public function __construct(private OrganizationContext $organizationContext) {}

    public function index(): Response
    {
        $tags = Tag::orderBy('name')->get();

        return Inertia::render('organization/tags', [
            'tags' => $tags,
        ]);
    }

    public function store(StoreTagRequest $request): RedirectResponse
    {
        Tag::create([
            'organization_id' => $this->organizationContext->id(),
            'name' => $request->name,
            'color' => $request->color,
        ]);

        return back()->with('success', 'Tag created successfully.');
    }

    public function update(UpdateTagRequest $request, Tag $tag): RedirectResponse
    {
        $tag->update($request->validated());

        return back()->with('success', 'Tag updated successfully.');
    }

    public function destroy(Tag $tag): RedirectResponse
    {
        $tag->tickets()->detach();
        $tag->delete();

        return back()->with('success', 'Tag deleted successfully.');
    }
}
