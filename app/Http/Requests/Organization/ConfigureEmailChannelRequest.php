<?php

namespace App\Http\Requests\Organization;

use App\Enums\PostImportAction;
use App\Http\Requests\Concerns\AuthorizesOrganizationRequests;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConfigureEmailChannelRequest extends FormRequest
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
            'department_id' => ['required', 'exists:departments,id'],
            'fetch_folder' => ['required', 'string', 'max:255'],
            'post_import_action' => ['required', Rule::enum(PostImportAction::class)],
            'post_import_folder' => ['nullable', 'required_if:post_import_action,move_to_folder', 'string', 'max:255'],
            'sync_interval_minutes' => ['integer', 'min:1', 'max:60'],
            'import_old_emails' => ['boolean'],
            'import_emails_since' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'department_id.required' => 'Selecteer een afdeling.',
            'department_id.exists' => 'De geselecteerde afdeling bestaat niet.',
            'fetch_folder.required' => 'Please select a folder to import emails from.',
            'post_import_action.required' => 'Please select what to do with emails after importing.',
            'post_import_folder.required_if' => 'Please select a folder to move emails to.',
            'sync_interval_minutes.min' => 'Sync interval must be at least 1 minute.',
            'sync_interval_minutes.max' => 'Sync interval cannot exceed 60 minutes.',
            'import_emails_since.before_or_equal' => 'The import date cannot be in the future.',
        ];
    }
}
