'use client';

import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    ArrowLeft,
    Search,
    Check,
    Phone,
    Building2,
    Pencil,
    Send,
    Loader2,
    Paperclip,
    X,
    FileText,
    AlertCircle,
    Eye,
    EyeOff,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { MarkdownEditor } from '@/components/common/markdown-editor';
import { MarkdownRenderer } from '@/components/common/markdown-renderer';
import { useInitials } from '@/hooks/use-initials';
import type { Status, Priority, User, Contact, EmailChannel, Department } from '@/types';
import { toast } from 'sonner';
import { store } from '@/routes/inbox';
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

interface CreateTicketViewProps {
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    contacts: Contact[];
    emailChannels: EmailChannel[];
    departments: Department[];
    defaults?: {
        status_id?: number;
        priority_id?: number;
        department_id?: number;
    };
    onCancel: () => void;
}

export function CreateTicketView({
    statuses,
    priorities,
    agents,
    contacts,
    emailChannels,
    departments,
    defaults,
    onCancel,
}: CreateTicketViewProps) {
    const { t } = useTranslation('ticket');
    const getInitials = useInitials();
    const [isSelectContactOpen, setIsSelectContactOpen] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    // Form state
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [newContactEmail, setNewContactEmail] = useState('');
    const [newContactName, setNewContactName] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [statusId, setStatusId] = useState(String(defaults?.status_id || statuses[0]?.id || ''));
    const [priorityId, setPriorityId] = useState(String(defaults?.priority_id || priorities[0]?.id || ''));
    const [departmentId, setDepartmentId] = useState(String(defaults?.department_id || departments[0]?.id || ''));
    const [assignedTo, setAssignedTo] = useState<string>('unassigned');
    const [emailChannelId, setEmailChannelId] = useState(String(emailChannels[0]?.id || ''));

    const filteredContacts = contacts.filter((c) =>
        c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(contactSearch.toLowerCase())
    );

    const handleContactSelect = (contact: Contact) => {
        setSelectedContact(contact);
        setNewContactEmail('');
        setNewContactName('');
        setIsSelectContactOpen(false);
        setContactSearch('');
    };

    const handleNewContact = () => {
        if (!newContactEmail) return;
        setSelectedContact(null);
        setIsSelectContactOpen(false);
        setContactSearch('');
    };

    // File upload handling
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
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

        setFiles(prev => [...prev, ...placeholders]);

        // For new tickets, we'll store files locally until submission
        // Mark them as uploaded (no server upload yet for new tickets)
        setTimeout(() => {
            setFiles(prev => prev.map(f => {
                if (f.uploading) {
                    return { ...f, uploading: false };
                }
                return f;
            }));
        }, 500);
    }, [files.length]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDropWrapper = useCallback((acceptedFiles: File[]) => {
        dragCounter.current = 0;
        setIsDragging(false);
        onDrop(acceptedFiles);
    }, [onDrop]);

    const { getRootProps, getInputProps, open } = useDropzone({
        onDrop: handleDropWrapper,
        disabled: isSubmitting,
        maxSize: 25 * 1024 * 1024,
        noClick: true,
        noKeyboard: true,
        noDragEventsBubbling: true,
    });

    const removeFile = useCallback((tempId: string) => {
        const file = files.find(f => f.temp_id === tempId);
        if (!file) return;

        setFiles(prev => prev.filter(f => f.temp_id !== tempId));

        if (file.preview_url?.startsWith('blob:')) {
            URL.revokeObjectURL(file.preview_url);
        }
    }, [files]);

    const formatSize = (bytes: number) => {
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        if (!subject.trim()) {
            toast.error(t('create.validation.subject_required'));
            return;
        }
        if (!message.trim()) {
            toast.error(t('create.validation.message_required'));
            return;
        }
        if (!selectedContact && !newContactEmail) {
            toast.error(t('create.validation.contact_required'));
            return;
        }

        setIsSubmitting(true);

        const payload: Record<string, unknown> = {
            subject: subject.trim(),
            message: message.trim(),
            status_id: parseInt(statusId),
            priority_id: parseInt(priorityId),
            department_id: departmentId ? parseInt(departmentId) : null,
            assigned_to: assignedTo !== 'unassigned' ? parseInt(assignedTo) : null,
            email_channel_id: emailChannelId ? parseInt(emailChannelId) : null,
        };

        if (selectedContact) {
            payload.contact_id = selectedContact.id;
        } else {
            payload.contact_email = newContactEmail;
            payload.contact_name = newContactName || undefined;
        }

        router.post(store().url, payload, {
            onSuccess: () => {
                toast.success(t('create.created'));
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                toast.error(typeof firstError === 'string' ? firstError : t('create.error'));
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const hasFiles = files.length > 0;
    const canUploadMore = files.length < 10;
    const contactDisplay = selectedContact || (newContactEmail ? { name: newContactName, email: newContactEmail } : null);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main Content */}
            <div className="flex flex-1 flex-col min-h-0 bg-background">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-2 md:px-4 py-2 md:py-3 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onCancel}>
                        <ArrowLeft className="h-4 w-4 md:hidden" />
                        <X className="h-4 w-4 hidden md:block" />
                    </Button>
                    <div className="min-w-0 flex-1 mx-2">
                        <h1 className="text-base md:text-lg font-semibold">{t('create.title')}</h1>
                        <div className="mt-0.5 flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                            {contactDisplay ? (
                                <span className="truncate">{contactDisplay.name || contactDisplay.email}</span>
                            ) : (
                                <span className="text-muted-foreground/50">{t('create.select_contact_hint')} →</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Empty messages area */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-4">
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <p className="text-sm">{t('create.write_first_message')}</p>
                        </div>
                    </div>
                </ScrollArea>

                {/* Composer with subject */}
                <div className="shrink-0 p-3 md:p-4">
                    <div
                        {...getRootProps()}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        className={cn(
                            'relative rounded-xl border border-border/50 bg-card shadow-sm transition-shadow dark:shadow-lg',
                            'hover:shadow-md focus-within:shadow-md dark:hover:shadow-xl dark:focus-within:shadow-xl focus-within:ring-1 focus-within:ring-ring/20'
                        )}
                    >
                        <input {...getInputProps()} />

                        {/* Subject field */}
                        <div className="border-b border-border/50 px-3 py-2">
                            <Input
                                placeholder={t('create.subject_placeholder')}
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Drag overlay */}
                        {isDragging && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
                                <div className="text-center">
                                    <Paperclip className="mx-auto h-8 w-8 text-primary" />
                                    <p className="mt-2 text-sm font-medium text-primary">
                                        {t('create.drop_files')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* File preview area */}
                        {hasFiles && (
                            <div className="flex flex-wrap gap-2 border-b border-border/50 px-3 py-2">
                                {files.map(file => (
                                    <div
                                        key={file.temp_id}
                                        className={cn(
                                            'group relative flex items-center gap-2 rounded-lg border bg-background/50 px-2 py-1.5 text-sm transition-colors',
                                            file.error && 'border-destructive/50 bg-destructive/10',
                                            file.uploading && 'opacity-70'
                                        )}
                                    >
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
                                        <div className="flex flex-col">
                                            <span className="max-w-[120px] truncate text-xs font-medium">
                                                {file.original_filename}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {file.error || formatSize(file.size)}
                                            </span>
                                        </div>
                                        {file.uploading && (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        )}
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
                            <div className="min-h-[80px] px-4 py-3">
                                {message.trim() ? (
                                    <MarkdownRenderer content={message} className="prose-sm" />
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                        {t('create.preview_empty')}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <MarkdownEditor
                                value={message}
                                onChange={setMessage}
                                onKeyDown={handleKeyDown}
                                users={agents}
                                placeholder={contactDisplay
                                    ? t('create.message_to', { name: contactDisplay.name || contactDisplay.email })
                                    : t('create.write_message')
                                }
                                disabled={isSubmitting}
                                minRows={2}
                                maxRows={10}
                                toolbarClassName="border-border/50"
                            />
                        )}

                        {/* Footer bar */}
                        <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
                            <div className="flex items-center gap-2">
                                {/* File upload button */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            onClick={open}
                                            disabled={isSubmitting || !canUploadMore}
                                        >
                                            <Paperclip className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                        {canUploadMore
                                            ? t('create.add_attachments', { current: files.length })
                                            : t('create.max_attachments')
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
                                        {showPreview ? t('create.edit') : t('create.preview')}
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="hidden text-xs text-muted-foreground sm:inline">
                                    <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Cmd</kbd> + <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Enter</kbd>
                                </span>
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !message.trim() || !subject.trim() || (!selectedContact && !newContactEmail)}
                                    size="sm"
                                    className="h-7 gap-1.5 px-3 text-xs"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Send className="h-3 w-3" />
                                    )}
                                    {isSubmitting ? t('create.creating') : t('create.submit')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar - matches TicketView sidebar */}
            <div className="hidden md:block w-72 shrink-0 border-l bg-background">
                <ScrollArea className="h-full">
                    <div className="space-y-4 p-4 pr-3">
                        {/* Contact - matches TicketView contact card */}
                        <div className="rounded-lg border bg-card overflow-hidden">
                            <button
                                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent overflow-hidden"
                                onClick={() => setIsSelectContactOpen(true)}
                            >
                                <Avatar className="h-10 w-10 shrink-0 border">
                                    <AvatarFallback className={cn(
                                        "text-sm",
                                        contactDisplay ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                    )}>
                                        {contactDisplay
                                            ? getInitials(contactDisplay.name || contactDisplay.email || '')
                                            : '?'
                                        }
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                    {contactDisplay ? (
                                        <>
                                            <p className="truncate font-medium">{(contactDisplay.name || t('details.unknown')).slice(0, 15)}{((contactDisplay.name?.length ?? 0) > 15) ? '…' : ''}</p>
                                            <p className="truncate text-sm text-muted-foreground">{contactDisplay.email?.slice(0, 20)}{((contactDisplay.email?.length ?? 0) > 20) ? '…' : ''}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-medium text-muted-foreground">{t('create.select_contact')}</p>
                                            <p className="text-sm text-muted-foreground/70">{t('create.click_to_choose')}</p>
                                        </>
                                    )}
                                </div>
                                <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                            {selectedContact && (selectedContact.phone || selectedContact.company) && (
                                <div className="flex flex-col gap-1 border-t px-4 py-3 text-sm text-muted-foreground overflow-hidden">
                                    {selectedContact.phone && (
                                        <span className="flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{selectedContact.phone.slice(0, 18)}</span>
                                        </span>
                                    )}
                                    {selectedContact.company && (
                                        <span className="flex items-center gap-1.5">
                                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{selectedContact.company.slice(0, 18)}{selectedContact.company.length > 18 ? '…' : ''}</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Properties - matches TicketView properties card */}
                        <div className="rounded-lg border bg-card p-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Status</Label>
                                    <Select value={statusId} onValueChange={setStatusId}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.map((status) => (
                                                <SelectItem key={status.id} value={String(status.id)}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                                                        {status.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">{t('details.priority')}</Label>
                                    <Select value={priorityId} onValueChange={setPriorityId}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorities.map((priority) => (
                                                <SelectItem key={priority.id} value={String(priority.id)}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priority.color }} />
                                                        {priority.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">{t('details.assigned_to')}</Label>
                                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder={t('details.unassigned')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">
                                                <span className="text-muted-foreground">{t('details.unassigned')}</span>
                                            </SelectItem>
                                            {agents.map((agent) => (
                                                <SelectItem key={agent.id} value={String(agent.id)}>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarFallback className="text-[10px]">{getInitials(agent.name)}</AvatarFallback>
                                                        </Avatar>
                                                        {agent.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {departments.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">{t('details.department')}</Label>
                                        <Select value={departmentId} onValueChange={setDepartmentId}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder={t('create.select_department')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept.id} value={String(dept.id)}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {emailChannels.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">{t('create.send_via')}</Label>
                                        <Select value={emailChannelId} onValueChange={setEmailChannelId}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder={t('create.select_channel')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {emailChannels.map((channel) => (
                                                    <SelectItem key={channel.id} value={String(channel.id)}>
                                                        {channel.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Select Contact Dialog */}
            <Dialog open={isSelectContactOpen} onOpenChange={setIsSelectContactOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('contact_dialog.title')}</DialogTitle>
                        <DialogDescription>{t('contact_dialog.description')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* New contact input */}
                        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                            <Label className="text-sm font-medium">{t('contact_dialog.new_contact')}</Label>
                            <Input
                                type="email"
                                placeholder={t('contact_dialog.email_placeholder')}
                                value={newContactEmail}
                                onChange={(e) => setNewContactEmail(e.target.value)}
                            />
                            <Input
                                placeholder={t('contact_dialog.name_placeholder')}
                                value={newContactName}
                                onChange={(e) => setNewContactName(e.target.value)}
                            />
                            <Button
                                variant="secondary"
                                className="w-full"
                                disabled={!newContactEmail}
                                onClick={handleNewContact}
                            >
                                {t('contact_dialog.use_contact')}
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">{t('contact_dialog.or_existing')}</span>
                            </div>
                        </div>

                        {/* Search existing contacts */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={t('contact_dialog.search_placeholder')}
                                value={contactSearch}
                                onChange={(e) => setContactSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <ScrollArea className="h-64">
                            <div className="space-y-1">
                                {filteredContacts.map((contact) => (
                                    <button
                                        key={contact.id}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent',
                                            contact.id === selectedContact?.id && 'bg-accent',
                                        )}
                                        onClick={() => handleContactSelect(contact)}
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="text-xs">
                                                {getInitials(contact.name || contact.email)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 truncate">
                                            <p className="truncate font-medium">{contact.name || contact.email}</p>
                                            {contact.name && (
                                                <p className="truncate text-sm text-muted-foreground">{contact.email}</p>
                                            )}
                                        </div>
                                        {contact.id === selectedContact?.id && (
                                            <Check className="h-4 w-4 text-primary" />
                                        )}
                                    </button>
                                ))}
                                {filteredContacts.length === 0 && (
                                    <p className="py-4 text-center text-sm text-muted-foreground">{t('contact_dialog.no_contacts')}</p>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
