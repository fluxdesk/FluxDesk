<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine if the user can view the upgrade page.
     *
     * Only super admins can access system upgrades.
     */
    public function viewUpgrades(User $user): bool
    {
        return $user->isSuperAdmin();
    }
}
