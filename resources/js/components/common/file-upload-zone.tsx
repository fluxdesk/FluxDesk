import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Paperclip, FileText, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface UploadedFile {
    temp_id: string;
    filename: string;
    original_filename: string;
    mime_type: string;
    size: number;
    path: string;
    is_image: boolean;
    preview_url?: string;
    uploading?: boolean;
    error?: string;
}

interface FileUploadZoneProps {
    files: UploadedFile[];
    onFilesChange: (files: UploadedFile[]) => void;
    ticketId: number;
    maxFiles?: number;
    maxSize?: number;
    disabled?: boolean;
    className?: string;
    previewClassName?: string;
}

export function FileUploadZone({
    files,
    onFilesChange,
    ticketId,
    maxFiles = 10,
    maxSize = 25 * 1024 * 1024, // 25MB
    disabled = false,
    className,
    previewClassName,
}: FileUploadZoneProps) {
    const [uploadingIds, setUploadingIds] = React.useState<Set<string>>(new Set());

    const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
        const remainingSlots = maxFiles - files.length;
        const filesToUpload = acceptedFiles.slice(0, remainingSlots);

        if (filesToUpload.length === 0) return;

        // Create temporary placeholders with local previews
        const placeholders: UploadedFile[] = filesToUpload.map((file) => {
            const tempId = crypto.randomUUID();
            return {
                temp_id: tempId,
                filename: file.name,
                original_filename: file.name,
                mime_type: file.type,
                size: file.size,
                path: '',
                is_image: file.type.startsWith('image/'),
                preview_url: file.type.startsWith('image/')
                    ? URL.createObjectURL(file)
                    : undefined,
                uploading: true,
            };
        });

        // Add placeholders to files
        const newFiles = [...files, ...placeholders];
        onFilesChange(newFiles);

        // Track uploading IDs
        const newUploadingIds = new Set(placeholders.map(p => p.temp_id));
        setUploadingIds(prev => new Set([...prev, ...newUploadingIds]));

        // Upload files
        const formData = new FormData();
        filesToUpload.forEach(file => formData.append('files[]', file));

        try {
            const response = await fetch(`/inbox/${ticketId}/attachments`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const { files: uploadedFiles } = await response.json();

            // Update files with server data
            onFilesChange(prev => prev.map(f => {
                if (!f.uploading) return f;

                // Find matching uploaded file by original filename
                const uploaded = uploadedFiles.find(
                    (u: UploadedFile) => u.original_filename === f.original_filename
                );

                if (uploaded) {
                    // Revoke the local object URL if it was an image
                    if (f.preview_url?.startsWith('blob:')) {
                        URL.revokeObjectURL(f.preview_url);
                    }
                    return {
                        ...uploaded,
                        uploading: false,
                    };
                }

                return { ...f, uploading: false, error: 'Upload failed' };
            }));
        } catch (error) {
            // Mark all uploading files as failed
            onFilesChange(prev => prev.map(f => {
                if (f.uploading && newUploadingIds.has(f.temp_id)) {
                    return { ...f, uploading: false, error: 'Upload failed' };
                }
                return f;
            }));
        } finally {
            setUploadingIds(prev => {
                const next = new Set(prev);
                newUploadingIds.forEach(id => next.delete(id));
                return next;
            });
        }
    }, [files, maxFiles, ticketId, onFilesChange]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        disabled,
        maxSize,
        noClick: true,
        noKeyboard: true,
    });

    const removeFile = React.useCallback(async (tempId: string) => {
        const file = files.find(f => f.temp_id === tempId);
        if (!file) return;

        // Remove from UI immediately
        onFilesChange(files.filter(f => f.temp_id !== tempId));

        // Revoke object URL if exists
        if (file.preview_url?.startsWith('blob:')) {
            URL.revokeObjectURL(file.preview_url);
        }

        // Delete from server if it was uploaded
        if (file.path) {
            try {
                await fetch(`/inbox/${ticketId}/attachments`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({ path: file.path }),
                });
            } catch {
                // Ignore delete errors - file is already removed from UI
            }
        }
    }, [files, ticketId, onFilesChange]);

    const formatSize = (bytes: number) => {
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    const hasFiles = files.length > 0;
    const canUploadMore = files.length < maxFiles;

    return (
        <div {...getRootProps()} className={cn('relative', className)}>
            <input {...getInputProps()} />

            {/* Drag overlay */}
            {isDragActive && (
                <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
                    <div className="text-center">
                        <Paperclip className="mx-auto h-8 w-8 text-primary" />
                        <p className="mt-2 text-sm font-medium text-primary">
                            Bestanden hier neerzetten
                        </p>
                    </div>
                </div>
            )}

            {/* File preview area - above textarea */}
            {hasFiles && (
                <div className={cn(
                    'flex flex-wrap gap-2 border-b px-3 py-2',
                    previewClassName
                )}>
                    {files.map(file => (
                        <div
                            key={file.temp_id}
                            className={cn(
                                'group relative flex items-center gap-2 rounded-lg border bg-muted/50 px-2 py-1.5 text-sm transition-colors',
                                file.error && 'border-destructive/50 bg-destructive/10',
                                file.uploading && 'opacity-70'
                            )}
                        >
                            {/* Thumbnail or icon */}
                            {file.is_image && file.preview_url ? (
                                <img
                                    src={file.preview_url}
                                    alt={file.original_filename}
                                    className="h-8 w-8 rounded object-cover"
                                />
                            ) : file.error ? (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                            ) : (
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            )}

                            {/* File info */}
                            <div className="flex flex-col">
                                <span className="max-w-[120px] truncate text-xs font-medium">
                                    {file.original_filename}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {file.error || formatSize(file.size)}
                                </span>
                            </div>

                            {/* Loading indicator */}
                            {file.uploading && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}

                            {/* Remove button */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(file.temp_id);
                                }}
                                className="absolute -right-1.5 -top-1.5 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 group-hover:block"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface FileUploadButtonProps {
    onClick: () => void;
    disabled?: boolean;
    filesCount: number;
    maxFiles: number;
}

export function FileUploadButton({ onClick, disabled, filesCount, maxFiles }: FileUploadButtonProps) {
    const canUpload = filesCount < maxFiles;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={onClick}
                    disabled={disabled || !canUpload}
                >
                    <Paperclip className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
                {canUpload
                    ? `Bijlagen toevoegen (${filesCount}/${maxFiles})`
                    : `Maximum bereikt (${maxFiles})`
                }
            </TooltipContent>
        </Tooltip>
    );
}
