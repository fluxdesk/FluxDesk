export interface PortalContact {
    id: number;
    email: string;
    name: string | null;
    display_name: string;
    phone: string | null;
    company: string | null;
}

export interface PortalOrganization {
    id: string;
    name: string;
    slug: string;
    settings: {
        logo_path: string | null;
        primary_color: string | null;
        secondary_color: string | null;
        accent_color: string | null;
    } | null;
}

export interface PortalSharedData {
    name: string;
    contact: PortalContact | null;
    organization: PortalOrganization | null;
    [key: string]: unknown;
}

export interface PortalTicket {
    id: number;
    ticket_number: string;
    subject: string;
    status?: {
        id: number;
        name: string;
        slug: string;
        color: string;
        is_closed: boolean;
    };
    priority?: {
        id: number;
        name: string;
        slug: string;
        color: string;
    };
    created_at: string;
    updated_at: string;
    messages?: PortalMessage[];
    messages_count?: number;
}

export interface PortalMessage {
    id: number;
    body: string;
    body_html: string | null;
    is_from_contact: boolean;
    user?: {
        id: number;
        name: string;
        avatar?: string;
    };
    attachments?: {
        id: number;
        original_filename: string;
        url: string;
        human_size: string;
    }[];
    created_at: string;
}
