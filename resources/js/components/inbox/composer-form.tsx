import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Send, StickyNote, Paperclip, X, FileText, Loader2, AlertCircle, Eye, EyeOff, Sparkles, Wand2, Check } from 'lucide-react';
import { useDraft } from '@/hooks/use-draft';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MarkdownEditor } from '@/components/common/markdown-editor';
import { MarkdownRenderer } from '@/components/common/markdown-renderer';
import type { Ticket, User } from '@/types';
import { useForm } from '@inertiajs/react';
import { suggest } from '@/actions/App/Http/Controllers/AIController';
import { refactor } from '@/actions/App/Http/Controllers/AIController';
import { useTranslation } from 'react-i18next';

interface UploadedFile {
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

interface AttachmentData {
    filename: string;
    original_filename: string;
    mime_type: string;
    size: number;
    path: string;
    content_id?: string | null;
    is_inline: boolean;
}

interface ComposerFormProps {
    ticket: Ticket;
    agents: User[];
    onSuccess?: () => void;
    noteStyle?: boolean;
}

export function ComposerForm({ ticket, agents, onSuccess }: ComposerFormProps) {
    const { t } = useTranslation('inbox');
    const [messageType, setMessageType] = React.useState<'reply' | 'note'>('reply');
    const [files, setFiles] = React.useState<UploadedFile[]>([]);
    const [showPreview, setShowPreview] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const dragCounter = React.useRef(0);
    const dropzoneRef = React.useRef<HTMLDivElement>(null);

    // AI state
    const [aiSuggesting, setAiSuggesting] = React.useState(false);
    const [aiRefactoring, setAiRefactoring] = React.useState(false);
    const [suggestions, setSuggestions] = React.useState<string[]>([]);
    const [suggestionsOpen, setSuggestionsOpen] = React.useState(false);
    const [aiError, setAiError] = React.useState<string | null>(null);
    const [aiAvailable, setAiAvailable] = React.useState<boolean | null>(null);
    const [aiUsed, setAiUsed] = React.useState(false);

    // Draft state
    const { draft, draftStatus, saveDraft, clearDraft } = useDraft({ ticketId: ticket.id });
    const draftLoaded = React.useRef(false);

    const { data, setData, post, processing, reset, transform } = useForm({
        body: '',
        type: 'reply' as 'reply' | 'note',
        attachments: [] as AttachmentData[],
        ai_assisted: false,
    });

    const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
        const maxFiles = 10;
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
        setFiles(prev => [...prev, ...placeholders]);

        // Upload files
        const formData = new FormData();
        filesToUpload.forEach(file => formData.append('files[]', file));

        try {
            const response = await api.post(`/inbox/${ticket.id}/attachments`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { files: uploadedFiles } = response.data;

            // Update files with server data
            setFiles(prev => prev.map(f => {
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
        } catch {
            // Mark all uploading files as failed
            const placeholderIds = new Set(placeholders.map(p => p.temp_id));
            setFiles(prev => prev.map(f => {
                if (f.uploading && placeholderIds.has(f.temp_id)) {
                    return { ...f, uploading: false, error: t('composer.upload_failed') };
                }
                return f;
            }));
        }
    }, [files.length, ticket.id]);

    const handleDragEnter = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDropWrapper = React.useCallback((acceptedFiles: File[]) => {
        dragCounter.current = 0;
        setIsDragging(false);
        onDrop(acceptedFiles);
    }, [onDrop]);

    const { getRootProps, getInputProps, open } = useDropzone({
        onDrop: handleDropWrapper,
        disabled: processing,
        maxSize: 25 * 1024 * 1024, // 25MB
        noClick: true,
        noKeyboard: true,
        noDragEventsBubbling: true,
    });

    const removeFile = React.useCallback(async (tempId: string) => {
        const file = files.find(f => f.temp_id === tempId);
        if (!file) return;

        // Remove from UI immediately
        setFiles(prev => prev.filter(f => f.temp_id !== tempId));

        // Revoke object URL if exists
        if (file.preview_url?.startsWith('blob:')) {
            URL.revokeObjectURL(file.preview_url);
        }

        // Delete from server if it was uploaded
        if (file.path) {
            try {
                await api.delete(`/inbox/${ticket.id}/attachments`, {
                    data: { path: file.path },
                });
            } catch {
                // Ignore delete errors
            }
        }
    }, [files, ticket.id]);

    // Transform form data before sending to include files, current messageType, and AI flag
    transform((formData) => ({
        ...formData,
        type: messageType,
        ai_assisted: aiUsed,
        attachments: files
            .filter(f => !f.error && f.path)
            .map(f => ({
                filename: f.filename,
                original_filename: f.original_filename,
                mime_type: f.mime_type,
                size: f.size,
                path: f.path,
                is_inline: false,
            })),
    }));

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!data.body.trim() || processing) return;

        post(`/inbox/${ticket.id}/messages`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setFiles([]);
                setMessageType('reply');
                setAiUsed(false);
                clearDraft();
                draftLoaded.current = false;
                onSuccess?.();
            },
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Check AI availability on mount
    React.useEffect(() => {
        const checkAI = async () => {
            try {
                const response = await api.get('/ai/status');
                const data = response.data;
                setAiAvailable(data.configured && (data.suggested_replies_enabled || data.reply_refactor_enabled));
            } catch {
                setAiAvailable(false);
            }
        };
        checkAI();
    }, []);

    // Load draft on mount
    React.useEffect(() => {
        if (draft && !draftLoaded.current) {
            draftLoaded.current = true;
            setData('body', draft.body);
            setMessageType(draft.type);
        }
    }, [draft, setData]);

    // Auto-save draft on body/type change
    React.useEffect(() => {
        // Only save if we've already loaded any existing draft
        if (draftLoaded.current || data.body.trim()) {
            draftLoaded.current = true;
            saveDraft(data.body, messageType);
        }
    }, [data.body, messageType, saveDraft]);

    const handleSuggest = React.useCallback(async () => {
        if (aiSuggesting) return;
        setAiSuggesting(true);
        setAiError(null);
        setSuggestions([]);

        try {
            const response = await api.post(suggest.url(ticket.id));
            const data = response.data;

            setSuggestions(data.suggestions || []);
            setSuggestionsOpen(true);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { error?: string } } };
            setAiError(axiosError.response?.data?.error || t('composer.ai_something_wrong'));
        } finally {
            setAiSuggesting(false);
        }
    }, [aiSuggesting, ticket.id, t]);

    const handleRefactor = React.useCallback(async () => {
        if (aiRefactoring || !data.body.trim()) return;
        setAiRefactoring(true);
        setAiError(null);

        try {
            const response = await api.post(refactor.url(), {
                text: data.body,
                ticket_id: ticket.id,
            });

            setData('body', response.data.text);
            setAiUsed(true);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { error?: string } } };
            setAiError(axiosError.response?.data?.error || t('composer.ai_something_wrong'));
        } finally {
            setAiRefactoring(false);
        }
    }, [aiRefactoring, data.body, ticket.id, setData, t]);

    const selectSuggestion = React.useCallback((suggestion: string) => {
        setData('body', suggestion);
        setAiUsed(true);
        setSuggestionsOpen(false);
        setSuggestions([]);
    }, [setData]);

    const formatSize = (bytes: number) => {
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    const isNote = messageType === 'note';
    const hasFiles = files.length > 0;
    const canUploadMore = files.length < 10;

    return (
        <form onSubmit={handleSubmit}>
            <div
                {...getRootProps()}
                ref={dropzoneRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                className={cn(
                    'relative rounded-xl border border-border/50 bg-card shadow-sm transition-shadow dark:shadow-lg',
                    'hover:shadow-md focus-within:shadow-md dark:hover:shadow-xl dark:focus-within:shadow-xl focus-within:ring-1 focus-within:ring-ring/20',
                    isNote && 'border-amber-300/50 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-900/20'
                )}
            >
                <input {...getInputProps()} />

                {/* Drag overlay */}
                {isDragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
                        <div className="text-center">
                            <Paperclip className="mx-auto h-8 w-8 text-primary" />
                            <p className="mt-2 text-sm font-medium text-primary">
                                {t('composer.drop_files')}
                            </p>
                        </div>
                    </div>
                )}

                {/* File preview area - above textarea */}
                {hasFiles && (
                    <div className={cn(
                        'flex flex-wrap gap-2 border-b px-3 py-2',
                        isNote ? 'border-amber-200/50 dark:border-amber-800/50' : 'border-border/50'
                    )}>
                        {files.map(file => (
                            <div
                                key={file.temp_id}
                                className={cn(
                                    'group relative flex items-center gap-2 rounded-lg border bg-background/50 px-2 py-1.5 text-sm transition-colors',
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

                {/* Markdown Editor or Preview */}
                {showPreview ? (
                    <div className={cn(
                        'min-h-[80px] px-4 py-3',
                        isNote ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''
                    )}>
                        {data.body.trim() ? (
                            <MarkdownRenderer content={data.body} className="prose-sm" />
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                {t('composer.preview_empty')}
                            </p>
                        )}
                    </div>
                ) : (
                    <MarkdownEditor
                        value={data.body}
                        onChange={(value) => setData('body', value)}
                        onKeyDown={handleKeyDown}
                        users={agents}
                        placeholder={isNote
                            ? t('composer.note_placeholder')
                            : t('composer.reply_placeholder', { name: ticket.contact?.name || 'customer' })
                        }
                        disabled={processing}
                        minRows={2}
                        maxRows={10}
                        toolbarClassName={isNote ? 'border-amber-200/50 dark:border-amber-800/50' : 'border-border/50'}
                    />
                )}

                {/* Footer bar */}
                <div className={cn(
                    'flex items-center justify-between border-t px-3 py-2',
                    isNote ? 'border-amber-200/50 dark:border-amber-800/50' : 'border-border/50'
                )}>
                    <div className="flex items-center gap-2">
                        {/* Reply/Note tabs */}
                        <Tabs value={messageType} onValueChange={(v) => setMessageType(v as 'reply' | 'note')}>
                            <TabsList className="h-7 bg-transparent p-0">
                                <TabsTrigger
                                    value="reply"
                                    className="h-7 gap-1 rounded-md px-2 text-xs data-[state=active]:bg-muted data-[state=active]:shadow-none"
                                >
                                    <Send className="h-3 w-3" />
                                    {t('composer.reply')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="note"
                                    className="h-7 gap-1 rounded-md px-2 text-xs data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-amber-900/50 dark:data-[state=active]:text-amber-400"
                                >
                                    <StickyNote className="h-3 w-3" />
                                    {t('composer.note')}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {isNote && (
                            <span className="hidden text-xs text-amber-600 dark:text-amber-400 sm:inline">
                                {t('composer.internal')}
                            </span>
                        )}

                        {/* File upload button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={open}
                                    disabled={processing || !canUploadMore}
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                {canUploadMore
                                    ? t('composer.add_attachments', { current: files.length, max: 10 })
                                    : t('composer.max_attachments', { max: 10 })
                                }
                            </TooltipContent>
                        </Tooltip>

                        {/* Preview toggle button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        'h-7 w-7 p-0',
                                        showPreview && 'bg-muted'
                                    )}
                                    onClick={() => setShowPreview(!showPreview)}
                                >
                                    {showPreview ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                {showPreview ? t('composer.edit') : t('composer.preview')}
                            </TooltipContent>
                        </Tooltip>

                        {/* AI Buttons */}
                        {aiAvailable && messageType === 'reply' && (
                            <>
                                <div className="mx-1 h-4 w-px bg-border/50" />

                                {/* AI Suggest */}
                                <Popover open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 gap-1 px-2"
                                                    onClick={handleSuggest}
                                                    disabled={aiSuggesting || processing}
                                                >
                                                    {aiSuggesting ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="h-3.5 w-3.5" />
                                                    )}
                                                    <span className="hidden text-xs sm:inline">{t('composer.ai_suggestion')}</span>
                                                </Button>
                                            </PopoverTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                            {t('composer.ai_generates_suggestions')}
                                        </TooltipContent>
                                    </Tooltip>
                                    <PopoverContent
                                        align="start"
                                        className="w-96 p-0"
                                        onOpenAutoFocus={(e) => e.preventDefault()}
                                    >
                                        <div className="border-b px-3 py-2">
                                            <p className="text-sm font-medium">{t('composer.ai_suggestions_title')}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {t('composer.ai_suggestions_description')}
                                            </p>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {suggestions.length === 0 && !aiError && (
                                                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {t('composer.ai_loading')}
                                                </div>
                                            )}
                                            {aiError && (
                                                <div className="flex items-center gap-2 px-3 py-4 text-sm text-destructive">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {aiError}
                                                </div>
                                            )}
                                            {suggestions.map((suggestion, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    className="w-full border-b px-3 py-3 text-left text-sm transition-colors last:border-0 hover:bg-muted/50"
                                                    onClick={() => selectSuggestion(suggestion)}
                                                >
                                                    <p className="line-clamp-4 whitespace-pre-wrap">
                                                        {suggestion}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* AI Refactor */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 gap-1 px-2"
                                            onClick={handleRefactor}
                                            disabled={aiRefactoring || processing || !data.body.trim()}
                                        >
                                            {aiRefactoring ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Wand2 className="h-3.5 w-3.5" />
                                            )}
                                            <span className="hidden text-xs sm:inline">{t('composer.ai_improve')}</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                        {t('composer.ai_improves_text')}
                                    </TooltipContent>
                                </Tooltip>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Draft status indicator - subtle checkmark only */}
                        {draftStatus === 'saved' && (
                            <Check className="h-3 w-3 text-muted-foreground/50" />
                        )}
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                            <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Cmd</kbd> + <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Enter</kbd>
                        </span>
                        <Button
                            type="submit"
                            disabled={processing || !data.body.trim()}
                            size="sm"
                            className="h-7 gap-1.5 px-3 text-xs"
                        >
                            <Send className="h-3 w-3" />
                            {isNote ? t('composer.add') : t('composer.send')}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}
