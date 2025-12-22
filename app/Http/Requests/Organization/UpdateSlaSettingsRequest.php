<?php

namespace App\Http\Requests\Organization;

use App\Http\Requests\Concerns\AuthorizesOrganizationRequests;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSlaSettingsRequest extends FormRequest
{
    use AuthorizesOrganizationRequests;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->isOrganizationAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'share_sla_times_with_contacts' => ['boolean'],
            'share_average_reply_time' => ['boolean'],
            'sla_reminder_intervals' => ['nullable', 'array'],
            'sla_reminder_intervals.*' => ['integer', 'min:1', 'max:10080'], // Max 7 days in minutes
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'share_sla_times_with_contacts' => 'SLA-tijden delen',
            'share_average_reply_time' => 'gemiddelde reactietijd delen',
            'sla_reminder_intervals' => 'herinneringsintervallen',
            'sla_reminder_intervals.*' => 'herinneringsinterval',
        ];
    }
}
