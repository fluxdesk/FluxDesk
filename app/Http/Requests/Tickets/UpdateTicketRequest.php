<?php

namespace App\Http\Requests\Tickets;

use App\Http\Requests\Concerns\AuthorizesOrganizationRequests;
use App\Models\Contact;
use App\Models\Priority;
use App\Models\Sla;
use App\Models\Status;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketRequest extends FormRequest
{
    use AuthorizesOrganizationRequests;

    public function authorize(): bool
    {
        return $this->isOrganizationMember();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'contact_id' => ['sometimes', 'required', 'integer', Rule::exists(Contact::class, 'id')],
            'status_id' => ['sometimes', 'required', 'integer', Rule::exists(Status::class, 'id')],
            'priority_id' => ['sometimes', 'required', 'integer', Rule::exists(Priority::class, 'id')],
            'sla_id' => ['sometimes', 'nullable', 'integer', Rule::exists(Sla::class, 'id')],
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
