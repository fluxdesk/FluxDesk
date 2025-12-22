<?php

namespace App\Http\Requests\Organization;

use App\Http\Requests\Concerns\AuthorizesOrganizationRequests;
use App\Services\OrganizationContext;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSettingsRequest extends FormRequest
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
        $organization = app(OrganizationContext::class)->organization();

        return [
            'slug' => [
                'nullable',
                'string',
                'max:50',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('organizations', 'slug')->ignore($organization->id),
            ],
            'logo' => ['nullable', 'image', 'max:2048'],
            'primary_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondary_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'email_background_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'ticket_prefix' => ['nullable', 'string', 'max:10'],
            'ticket_number_format' => ['nullable', 'string', 'max:50'],
            'use_random_numbers' => ['nullable', 'boolean'],
            'random_number_length' => ['nullable', 'integer', 'min:4', 'max:12'],
            'timezone' => ['nullable', 'string', 'timezone'],
            'business_hours' => ['nullable', 'array'],
            'business_hours.*.day' => ['required_with:business_hours', 'integer', 'between:0,6'],
            'business_hours.*.start' => ['required_with:business_hours', 'date_format:H:i'],
            'business_hours.*.end' => ['required_with:business_hours', 'date_format:H:i'],
            'system_email_channel_id' => ['nullable', 'exists:email_channels,id'],
            'is_system_default' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slug.regex' => 'De URL-slug mag alleen kleine letters, cijfers en koppeltekens bevatten.',
            'slug.unique' => 'Deze URL-slug is al in gebruik door een andere organisatie.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->system_email_channel_id === 'default') {
            $this->merge(['system_email_channel_id' => null]);
        }
    }
}
