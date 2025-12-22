<?php

namespace App\Http\Controllers\Organization;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StoreMemberRequest;
use App\Http\Requests\Organization\UpdateMemberRequest;
use App\Models\User;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function __construct(private OrganizationContext $organizationContext) {}

    public function index(): Response
    {
        $organization = $this->organizationContext->organization();
        $members = $organization->users()
            ->withPivot('role')
            ->orderBy('name')
            ->get();

        $pendingInvitations = $organization->pendingInvitations()
            ->with('inviter')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($invitation) => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'role' => $invitation->role,
                'expires_at' => $invitation->expires_at->toIso8601String(),
                'inviter' => [
                    'name' => $invitation->inviter->name,
                ],
            ]);

        return Inertia::render('organization/members', [
            'members' => $members,
            'pendingInvitations' => $pendingInvitations,
            'roles' => collect(UserRole::cases())->map(fn ($role) => [
                'value' => $role->value,
                'label' => ucfirst($role->value),
            ]),
        ]);
    }

    public function store(StoreMemberRequest $request): RedirectResponse
    {
        $organization = $this->organizationContext->organization();
        $user = User::where('email', $request->email)->first();

        if ($organization->users()->where('user_id', $user->id)->exists()) {
            return back()->with('error', 'This user is already a member of this organization.');
        }

        $organization->users()->attach($user->id, [
            'role' => $request->role,
        ]);

        return back()->with('success', 'Member added successfully.');
    }

    public function update(UpdateMemberRequest $request, User $member): RedirectResponse
    {
        $organization = $this->organizationContext->organization();

        $organization->users()->updateExistingPivot($member->id, [
            'role' => $request->role,
        ]);

        return back()->with('success', 'Member role updated successfully.');
    }

    public function destroy(User $member): RedirectResponse
    {
        $organization = $this->organizationContext->organization();

        if ($member->id === auth()->id()) {
            return back()->with('error', 'You cannot remove yourself from the organization.');
        }

        $adminCount = $organization->users()
            ->wherePivot('role', UserRole::Admin->value)
            ->count();

        $memberRole = $organization->users()
            ->where('user_id', $member->id)
            ->first()?->pivot->role;

        if ($memberRole === UserRole::Admin->value && $adminCount <= 1) {
            return back()->with('error', 'Cannot remove the last admin from the organization.');
        }

        $organization->users()->detach($member->id);

        return back()->with('success', 'Member removed successfully.');
    }
}
