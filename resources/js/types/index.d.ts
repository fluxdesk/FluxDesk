import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface VersionStatus {
    current: string;
    latest: string | null;
    is_outdated: boolean;
    release_url: string | null;
    release_notes: string | null;
    release_name: string | null;
    published_at: string | null;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    organization: Organization | null;
    organizations: Organization[];
    isAdmin: boolean;
    sidebarOpen: boolean;
    unreadCount: number;
    folders: TicketFolder[];
    inboxCount: number;
    tags: Tag[];
    appVersion: VersionStatus | null;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

// Ticket System Types
export interface Contact {
    id: number;
    name: string | null;
    email: string;
    phone: string | null;
    company: string | null;
    sla_id: number | null;
    sla?: Sla;
    created_at: string;
    updated_at: string;
}

export interface Status {
    id: number;
    name: string;
    slug: string;
    color: string;
    is_default: boolean;
    is_closed: boolean;
    sort_order: number;
}

export interface Priority {
    id: number;
    name: string;
    slug: string;
    color: string;
    is_default: boolean;
    sort_order: number;
}

export interface Tag {
    id: number;
    name: string;
    slug: string;
    color: string;
    user_id: number | null; // null = organization tag, number = personal tag
}

export interface Sla {
    id: number;
    name: string;
    is_default: boolean;
    is_system: boolean;
    first_response_hours: number | null;
    resolution_hours: number | null;
    business_hours_only: boolean;
    priority_id: number | null;
    priority?: Priority;
}

export type MessageType = 'reply' | 'note' | 'system';
export type RecipientType = 'to' | 'cc' | 'bcc';
export type EmailStatus = 'pending' | 'sent' | 'failed';

export interface Attachment {
    id: number;
    message_id: number;
    filename: string;
    original_filename: string;
    mime_type: string;
    size: number;
    path: string;
    content_id: string | null;
    is_inline: boolean;
    url: string;
    human_size: string;
    created_at: string;
    updated_at: string;
}

export interface MessageRecipient {
    id: number;
    message_id: number;
    type: RecipientType;
    email: string;
    name: string | null;
    contact_id: number | null;
    contact?: Contact;
    display_name: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: number;
    ticket_id: number;
    user_id: number | null;
    contact_id: number | null;
    type: MessageType;
    body: string;
    body_html: string | null;
    raw_content: string | null;
    is_from_contact: boolean;
    // Email delivery tracking
    email_status: EmailStatus | null;
    email_error: string | null;
    email_sent_at: string | null;
    user?: User;
    contact?: Contact;
    attachments?: Attachment[];
    file_attachments?: Attachment[];
    inline_attachments?: Attachment[];
    recipients?: MessageRecipient[];
    to_recipients?: MessageRecipient[];
    cc_recipients?: MessageRecipient[];
    bcc_recipients?: MessageRecipient[];
    created_at: string;
    updated_at: string;
}

export interface TicketActivity {
    id: number;
    ticket_id: number;
    user_id: number | null;
    type: string;
    properties: Record<string, unknown> | null;
    user?: User;
    created_at: string;
}

export type TicketChannel = 'web' | 'email' | 'api';

export interface Ticket {
    id: number;
    ticket_number: string;
    subject: string;
    contact_id: number;
    status_id: number;
    priority_id: number;
    sla_id: number | null;
    assigned_to: number | null;
    channel: TicketChannel;
    folder_id: number | null;
    first_response_at: string | null;
    sla_first_response_due_at: string | null;
    sla_resolution_due_at: string | null;
    resolved_at: string | null;
    closed_at: string | null;
    is_read: boolean;
    created_at: string;
    updated_at: string;
    // Relations
    contact?: Contact;
    status?: Status;
    priority?: Priority;
    sla?: Sla;
    assignee?: User;
    folder?: TicketFolder;
    tags?: Tag[];
    messages?: Message[];
    activities?: TicketActivity[];
    latest_message?: Message[];
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    first_page_url: string | null;
    from: number | null;
    last_page: number;
    last_page_url: string | null;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

export interface InboxFilters {
    status?: string;
    priority?: string;
    assigned_to?: string;
    search?: string;
    unread?: string;
    folder?: string;
    sort?: 'latest' | 'oldest' | 'priority' | 'sla';
}

export type FolderSystemType = 'inbox' | 'solved' | 'spam' | 'archived' | 'deleted';

export interface TicketFolder {
    id: number;
    organization_id: string;
    name: string;
    slug: string;
    color: string;
    icon: string | null;
    is_system: boolean;
    system_type: FolderSystemType | null;
    auto_status_id: number | null;
    sort_order: number;
    tickets_count?: number;
    created_at: string;
    updated_at: string;
}

// Organization Types
export interface Organization {
    id: string;
    name: string;
    slug: string;
    is_system_default: boolean;
    created_at: string;
    updated_at: string;
    settings?: OrganizationSettings;
}

export interface OrganizationSettings {
    id: number;
    organization_id: string;
    logo_path: string | null;
    email_logo_path: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
    email_background_color: string | null;
    ticket_prefix: string;
    ticket_number_format: string;
    use_random_numbers: boolean;
    random_number_length: number;
    next_ticket_number: number;
    timezone: string | null;
    business_hours: BusinessHours[] | null;
    system_email_channel_id: number | null;
    share_sla_times_with_contacts: boolean;
    share_average_reply_time: boolean;
    sla_reminder_intervals: number[] | null;
    preview_ticket_number?: string;
    created_at: string;
    updated_at: string;
}

export interface SlaSettings {
    share_sla_times_with_contacts: boolean;
    share_average_reply_time: boolean;
    sla_reminder_intervals: number[];
}

export interface BusinessHours {
    day: number;
    start: string;
    end: string;
}

export interface OrganizationMember extends User {
    pivot: {
        role: 'admin' | 'agent';
    };
}

export interface RoleOption {
    value: string;
    label: string;
}

// Email Channel Types
export type EmailProvider = 'microsoft365' | 'google' | 'smtp';
export type PostImportAction = 'nothing' | 'delete' | 'archive' | 'move_to_folder';

export interface EmailChannel {
    id: number;
    organization_id: number;
    name: string;
    email_address: string | null;
    provider: EmailProvider;
    is_active: boolean;
    is_default: boolean;
    sync_interval_minutes: number;
    fetch_folder: string | null;
    auto_reply_enabled: boolean;
    post_import_action: PostImportAction;
    post_import_folder: string | null;
    last_sync_at: string | null;
    last_sync_error: string | null;
    created_at: string;
    updated_at: string;
}

export interface EmailProviderOption {
    value: EmailProvider;
    label: string;
}

export interface PostImportActionOption {
    value: PostImportAction;
    label: string;
    description: string;
}

export interface MailFolder {
    id: string;
    name: string;
    display_name: string;
}

// Notification Types
export type NotificationType = 'mention' | 'assignment';

export interface AppNotification {
    id: string;
    type: string;
    data: {
        type: NotificationType;
        ticket_id: number;
        ticket_number: string;
        ticket_subject: string;
        message_id?: number;
        message_preview?: string;
        mentioned_by_id?: number;
        mentioned_by_name?: string;
        assigned_by_id?: number;
        assigned_by_name?: string;
    };
    read_at: string | null;
    created_at: string;
}
