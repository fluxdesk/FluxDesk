<?php

namespace App\Http\Requests\Tickets;

use App\Http\Requests\Concerns\AuthorizesOrganizationRequests;
use App\Models\Contact;
use App\Models\Department;
use App\Models\EmailChannel;
use App\Models\Priority;
use App\Models\Status;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketRequest extends FormRequest
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
            'subject' => ['required', 'string', 'max:255'],
            'contact_id' => ['nullable', 'integer', Rule::exists(Contact::class, 'id')],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'status_id' => ['nullable', 'integer', Rule::exists(Status::class, 'id')],
            'priority_id' => ['nullable', 'integer', Rule::exists(Priority::class, 'id')],
            'department_id' => ['required', 'integer', Rule::exists(Department::class, 'id')],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'email_channel_id' => ['nullable', 'integer', Rule::exists(EmailChannel::class, 'id')],
            'message' => ['required', 'string', 'min:1'],
            'cc_emails' => ['nullable', 'array'],
            'cc_emails.*' => ['email', 'max:255'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator) {
            if (empty($this->contact_id) && empty($this->contact_email)) {
                $validator->errors()->add('contact_id', 'Een klant of e-mailadres is verplicht.');
            }
        });
    }
}
