<?php

namespace App\Http\Requests\Organization;

use App\Http\Requests\Concerns\AuthorizesOrganizationRequests;
use App\Models\Priority;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSlaRequest extends FormRequest
{
    use AuthorizesOrganizationRequests;

    public function authorize(): bool
    {
        return $this->isOrganizationAdmin();
    }

    protected function prepareForValidation(): void
    {
        if ($this->priority_id === '' || $this->priority_id === null || $this->priority_id === 'all' || ! $this->has('priority_id')) {
            $this->merge(['priority_id' => null]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'first_response_hours' => ['required', 'integer', 'min:1'],
            'resolution_hours' => ['required', 'integer', 'min:1'],
            'business_hours_only' => ['boolean'],
            'is_default' => ['boolean'],
            'priority_id' => ['nullable', 'integer', Rule::exists(Priority::class, 'id')->whereNull('deleted_at')],
        ];
    }
}
