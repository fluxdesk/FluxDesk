<?php

namespace App\Http\Requests\Tickets;

use App\Enums\MessageType;
use App\Http\Requests\Concerns\AuthorizesOrganizationRequests;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMessageRequest extends FormRequest
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
            'body' => ['required', 'string', 'min:1'],
            'type' => ['sometimes', 'string', Rule::enum(MessageType::class)],
            'ai_assisted' => ['sometimes', 'boolean'],
            'attachments' => ['sometimes', 'array', 'max:10'],
            'attachments.*.filename' => ['required_with:attachments', 'string'],
            'attachments.*.original_filename' => ['required_with:attachments', 'string'],
            'attachments.*.mime_type' => ['required_with:attachments', 'string'],
            'attachments.*.size' => ['required_with:attachments', 'integer', 'max:26214400'], // 25MB
            'attachments.*.path' => ['required_with:attachments', 'string'],
            'attachments.*.content_id' => ['nullable', 'string'],
            'attachments.*.is_inline' => ['boolean'],
        ];
    }
}
