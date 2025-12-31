<?php

return [
    // Common
    'dear' => 'Dear',
    'customer' => 'customer',
    'subject' => 'Subject',
    'message' => 'Message',
    'attachments' => 'Attachments',
    'from' => 'From',
    'unknown' => 'Unknown',
    'ticket' => 'Ticket',
    'priority' => 'Priority',
    'normal' => 'Normal',

    // Agent reply
    'agent_reply' => [
        'title' => 'New reply - #:ticket_number',
        'preheader' => 'New reply on ticket #:ticket_number: :subject',
        'header' => 'New reply on ticket #:ticket_number',
        'body' => 'There is a new reply on your ticket.',
        'reply_button' => 'Reply',
    ],

    // Ticket received
    'ticket_received' => [
        'title' => 'Ticket received - #:ticket_number',
        'preheader' => 'Your ticket #:ticket_number has been received: :subject',
        'header' => 'Ticket received',
        'body_agent_created' => 'We have created a new ticket for you and will respond as soon as possible.',
        'body_contact_created' => 'We have received your request and will respond as soon as possible.',
        'ticket_number' => 'Ticket number',
        'your_message' => 'Your message',
        'expected_response_time' => 'Expected response time',
        'average_response_time' => 'Average response time',
        'first_response_due' => 'First response by',
        'resolution_due' => 'Resolution by',
        'view_ticket' => 'View ticket',
    ],

    // New ticket internal (for agents)
    'new_ticket' => [
        'title' => 'New ticket - #:ticket_number',
        'preheader' => 'New ticket from :name: :subject',
        'header' => 'New ticket',
        'body' => 'A new ticket has been received.',
        'sla_deadlines' => 'SLA deadlines',
        'respond_by' => 'Respond by',
        'resolved_by' => 'Resolved by',
        'open_ticket' => 'Open ticket',
    ],

    // Contact reply internal (for agents)
    'contact_reply' => [
        'title' => 'New reply - #:ticket_number',
        'preheader' => 'New reply from :name on ticket #:ticket_number',
        'header' => 'New reply from customer',
        'body' => ':name has replied to ticket #:ticket_number.',
        'view_ticket' => 'View ticket',
    ],

    // Ticket assigned
    'assigned' => [
        'title' => 'Ticket assigned - #:ticket_number',
        'preheader' => 'Ticket #:ticket_number has been assigned to you',
        'header' => 'Ticket assigned to you',
        'body' => 'A ticket has been assigned to you.',
        'assigned_by' => 'Assigned by',
        'view_ticket' => 'View ticket',
    ],

    // Mention
    'mention' => [
        'title' => 'Mentioned in ticket - #:ticket_number',
        'preheader' => 'You were mentioned in ticket #:ticket_number',
        'header' => 'You were mentioned',
        'body' => ':name mentioned you in a note on ticket #:ticket_number.',
        'view_ticket' => 'View ticket',
    ],

    // Internal note
    'internal_note' => [
        'title' => 'New note - #:ticket_number',
        'preheader' => 'New internal note on ticket #:ticket_number',
        'header' => 'New internal note',
        'body' => ':name added an internal note to ticket #:ticket_number.',
        'view_ticket' => 'View ticket',
    ],

    // SLA breach warning
    'sla_breach' => [
        'title' => 'SLA warning - #:ticket_number',
        'preheader' => 'SLA deadline approaching for ticket #:ticket_number',
        'header' => 'SLA deadline approaching',
        'body' => 'A ticket is about to breach its SLA.',
        'first_response_warning' => 'First response deadline in :time',
        'resolution_warning' => 'Resolution deadline in :time',
        'view_ticket' => 'View ticket',
    ],
];
