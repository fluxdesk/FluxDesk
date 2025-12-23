<?php

namespace App\Http\Requests\Portal;

use App\Models\Department;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class PortalStoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Auth::guard('contact')->check();
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:255'],
            'department_id' => ['required', 'integer', Rule::exists(Department::class, 'id')],
            'message' => ['required', 'string', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'subject.required' => 'Vul een onderwerp in.',
            'department_id.required' => 'Selecteer een afdeling.',
            'message.required' => 'Vul een bericht in.',
        ];
    }
}
