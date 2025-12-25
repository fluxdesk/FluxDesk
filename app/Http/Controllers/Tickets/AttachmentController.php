<?php

namespace App\Http\Controllers\Tickets;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    /**
     * Upload files for a ticket message (before message is created).
     * Returns temporary file info for the frontend.
     */
    public function upload(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate([
            'files' => ['required', 'array', 'max:10'],
            'files.*' => ['required', 'file', 'max:25600'], // 25MB
        ]);

        $uploaded = [];
        $organizationId = $ticket->organization_id;

        foreach ($request->file('files') as $file) {
            $uuid = Str::uuid();
            $originalName = $file->getClientOriginalName();
            $filename = $uuid.'_'.$originalName;
            $path = "attachments/{$organizationId}/{$ticket->id}/{$filename}";

            Storage::put($path, file_get_contents($file));

            $isImage = str_starts_with($file->getMimeType(), 'image/');

            $uploaded[] = [
                'temp_id' => (string) $uuid,
                'filename' => $filename,
                'original_filename' => $originalName,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'path' => $path,
                'is_image' => $isImage,
                'preview_url' => $isImage ? $this->generateTempPreviewUrl($path) : null,
            ];
        }

        return response()->json(['files' => $uploaded]);
    }

    /**
     * Delete a temporary uploaded file (before message is created).
     */
    public function deleteTemp(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate([
            'path' => ['required', 'string'],
        ]);

        $path = $request->input('path');

        // Verify the path belongs to this ticket
        $expectedPrefix = "attachments/{$ticket->organization_id}/{$ticket->id}/";
        if (! str_starts_with($path, $expectedPrefix)) {
            abort(403, 'Invalid file path');
        }

        if (Storage::exists($path)) {
            Storage::delete($path);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Download an attachment with access validation.
     */
    public function download(Attachment $attachment): StreamedResponse
    {
        $this->authorizeAttachmentAccess($attachment);

        return Storage::download(
            $attachment->path,
            $attachment->original_filename
        );
    }

    /**
     * Serve file via signed URL (validates signature).
     */
    public function serve(Request $request, Attachment $attachment): StreamedResponse
    {
        if (! $request->hasValidSignature()) {
            abort(401, 'Invalid or expired link');
        }

        $headers = [];
        if ($attachment->isImage()) {
            $headers['Content-Type'] = $attachment->mime_type;
        }

        return Storage::response($attachment->path, null, $headers);
    }

    /**
     * Serve a temporary file preview via signed URL (for uploads not yet attached to a message).
     */
    public function tempPreview(Request $request): StreamedResponse
    {
        if (! $request->hasValidSignature()) {
            abort(401, 'Invalid or expired link');
        }

        try {
            $path = decrypt($request->query('path'));
        } catch (\Exception $e) {
            abort(400, 'Invalid path');
        }

        if (! Storage::exists($path)) {
            abort(404, 'File not found');
        }

        $mimeType = Storage::mimeType($path);
        $headers = [];
        if (str_starts_with($mimeType, 'image/')) {
            $headers['Content-Type'] = $mimeType;
        }

        return Storage::response($path, null, $headers);
    }

    /**
     * Generate a signed URL for serving an attachment.
     */
    public function signedUrl(Attachment $attachment): JsonResponse
    {
        $this->authorizeAttachmentAccess($attachment);

        $url = URL::temporarySignedRoute(
            'attachments.serve',
            now()->addMinutes(30),
            ['attachment' => $attachment->id]
        );

        return response()->json(['url' => $url]);
    }

    /**
     * Generate a signed URL for temporary file preview.
     */
    private function generateTempPreviewUrl(string $path): string
    {
        return URL::temporarySignedRoute(
            'attachments.temp-preview',
            now()->addHours(1),
            ['path' => encrypt($path)]
        );
    }

    /**
     * Verify user has access to this attachment's ticket.
     */
    private function authorizeAttachmentAccess(Attachment $attachment): void
    {
        $ticket = $attachment->message->ticket;

        // User must be a member of the ticket's organization
        $user = auth()->user();
        if (! $user || ! $user->belongsToOrganization($ticket->organization)) {
            abort(403, 'Unauthorized');
        }
    }
}
