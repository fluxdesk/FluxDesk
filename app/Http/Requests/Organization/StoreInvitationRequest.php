<?php

namespace App\Http\Requests\Organization;

use App\Enums\UserRole;
use App\Http\Requests\Concerns\AuthorizesOrganizationRequests;
use App\Services\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreInvitationRequest extends FormRequest
{
    use AuthorizesOrganizationRequests;

    public function authorize(): bool
    {
        return $this->isOrganizationAdmin();
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', 'string', Rule::enum(UserRole::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => 'E-mailadres is verplicht.',
            'email.email' => 'Voer een geldig e-mailadres in.',
            'role.required' => 'Rol is verplicht.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $organization = app(OrganizationContext::class)->organization();
            $email = strtolower($this->email);

            // Check if user is already a member
            $isMember = $organization->users()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->exists();

            if ($isMember) {
                $validator->errors()->add('email', 'Deze gebruiker is al lid van deze organisatie.');

                return;
            }

            // Check for pending invitation
            $hasPendingInvitation = $organization->pendingInvitations()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->exists();

            if ($hasPendingInvitation) {
                $validator->errors()->add('email', 'Er is al een openstaande uitnodiging voor dit e-mailadres.');
            }
        });
    }
}
