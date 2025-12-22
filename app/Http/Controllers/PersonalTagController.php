<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PersonalTagController extends Controller
{
    public function __construct(
        protected OrganizationContext $organizationContext
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['required', 'string', 'max:7'],
        ]);

        Tag::create([
            'organization_id' => $this->organizationContext->id(),
            'user_id' => auth()->id(),
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'color' => $validated['color'],
        ]);

        return back()->with('success', 'Personal tag created successfully.');
    }

    public function destroy(Tag $tag): RedirectResponse
    {
        // Only allow deleting own personal tags
        if ($tag->user_id !== auth()->id()) {
            abort(403);
        }

        $tag->tickets()->detach();
        $tag->delete();

        return back()->with('success', 'Personal tag deleted successfully.');
    }
}
