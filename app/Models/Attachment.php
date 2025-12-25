<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\URL;

class Attachment extends Model
{
    protected $fillable = [
        'message_id',
        'filename',
        'original_filename',
        'mime_type',
        'size',
        'path',
        'content_id',
        'is_inline',
    ];

    protected $appends = [
        'url',
        'download_url',
        'human_size',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'is_inline' => 'boolean',
        ];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    /**
     * Get a signed URL for serving this attachment (expires in 30 minutes).
     */
    public function getUrlAttribute(): string
    {
        return URL::temporarySignedRoute(
            'attachments.serve',
            now()->addMinutes(30),
            ['attachment' => $this->id]
        );
    }

    /**
     * Get a signed URL for downloading this attachment.
     */
    public function getDownloadUrlAttribute(): string
    {
        return URL::temporarySignedRoute(
            'attachments.download',
            now()->addMinutes(30),
            ['attachment' => $this->id]
        );
    }

    public function getHumanSizeAttribute(): string
    {
        $bytes = $this->size;

        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2).' GB';
        }

        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2).' MB';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2).' KB';
        }

        return $bytes.' bytes';
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }
}
