<?php

namespace App\Http\Requests\Organization;

use App\Enums\EmailProvider;
use App\Http\Requests\Concerns\AuthorizesOrganizationRequests;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmailChannelRequest extends FormRequest
{
    use AuthorizesOrganizationRequests;

    public function authorize(): bool
    {
        return $this->isOrganizationAdmin();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'provider' => ['required', Rule::enum(EmailProvider::class)],
            'department_id' => ['required', 'exists:departments,id'],
            'is_default' => ['boolean'],
            'auto_reply_enabled' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Een naam voor het e-mailaccount is verplicht.',
            'provider.required' => 'Selecteer een provider.',
            'department_id.required' => 'Selecteer een afdeling.',
            'department_id.exists' => 'De geselecteerde afdeling bestaat niet.',
        ];
    }
}
