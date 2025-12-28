<?php

namespace App\Http\Requests\Organization;

use App\Enums\WebhookEvent;
use App\Enums\WebhookFormat;
use App\Http\Requests\Concerns\AuthorizesOrganizationRequests;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWebhookRequest extends FormRequest
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
            'url' => ['required', 'url', 'max:2048'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['string', Rule::enum(WebhookEvent::class)],
            'format' => ['sometimes', 'string', Rule::enum(WebhookFormat::class)],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Een naam is verplicht.',
            'name.max' => 'De naam mag maximaal 255 karakters bevatten.',
            'url.required' => 'Een URL is verplicht.',
            'url.url' => 'Voer een geldige URL in.',
            'url.max' => 'De URL mag maximaal 2048 karakters bevatten.',
            'events.required' => 'Selecteer minimaal één event.',
            'events.min' => 'Selecteer minimaal één event.',
            'events.*.enum' => 'Ongeldige event geselecteerd.',
            'description.max' => 'De beschrijving mag maximaal 500 karakters bevatten.',
        ];
    }
}
