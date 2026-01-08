<?php

namespace App\Policies;

use App\Models\CustomWidget;
use App\Models\User;

class CustomWidgetPolicy
{
    public function view(User $user, CustomWidget $customWidget): bool
    {
        return $customWidget->user_id === $user->id
            || ($customWidget->is_shared && $customWidget->organization_id === $user->currentOrganization()?->id);
    }

    public function update(User $user, CustomWidget $customWidget): bool
    {
        return $customWidget->user_id === $user->id;
    }

    public function delete(User $user, CustomWidget $customWidget): bool
    {
        return $customWidget->user_id === $user->id;
    }
}
