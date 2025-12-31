<?php

return [
    // Common
    'dear' => 'Beste',
    'customer' => 'klant',
    'subject' => 'Onderwerp',
    'message' => 'Bericht',
    'attachments' => 'Bijlagen',
    'from' => 'Van',
    'unknown' => 'Onbekend',
    'ticket' => 'Ticket',
    'priority' => 'Prioriteit',
    'normal' => 'Normaal',

    // Agent reply
    'agent_reply' => [
        'title' => 'Nieuwe reactie - #:ticket_number',
        'preheader' => 'Nieuwe reactie op ticket #:ticket_number: :subject',
        'header' => 'Nieuwe reactie op ticket #:ticket_number',
        'body' => 'Er is een nieuwe reactie op uw ticket.',
        'reply_button' => 'Reageren',
    ],

    // Ticket received
    'ticket_received' => [
        'title' => 'Ticket ontvangen - #:ticket_number',
        'preheader' => 'Uw ticket #:ticket_number is ontvangen: :subject',
        'header' => 'Ticket ontvangen',
        'body_agent_created' => 'We hebben voor u een nieuw ticket aangemaakt en zullen zo snel mogelijk reageren.',
        'body_contact_created' => 'We hebben uw verzoek ontvangen en zullen zo snel mogelijk reageren.',
        'ticket_number' => 'Ticketnummer',
        'your_message' => 'Uw bericht',
        'expected_response_time' => 'Verwachte reactietijd',
        'average_response_time' => 'Gemiddelde reactietijd',
        'first_response_due' => 'Eerste reactie uiterlijk',
        'resolution_due' => 'Oplossing uiterlijk',
        'view_ticket' => 'Bekijk ticket',
    ],

    // New ticket internal (for agents)
    'new_ticket' => [
        'title' => 'Nieuw ticket - #:ticket_number',
        'preheader' => 'Nieuw ticket van :name: :subject',
        'header' => 'Nieuw ticket',
        'body' => 'Er is een nieuw ticket binnengekomen.',
        'sla_deadlines' => 'SLA-deadlines',
        'respond_by' => 'Reageer voor',
        'resolved_by' => 'Opgelost voor',
        'open_ticket' => 'Open ticket',
    ],

    // Contact reply internal (for agents)
    'contact_reply' => [
        'title' => 'Nieuwe reactie - #:ticket_number',
        'preheader' => 'Nieuwe reactie van :name op ticket #:ticket_number',
        'header' => 'Nieuwe reactie van klant',
        'body' => ':name heeft gereageerd op ticket #:ticket_number.',
        'view_ticket' => 'Bekijk ticket',
    ],

    // Ticket assigned
    'assigned' => [
        'title' => 'Ticket toegewezen - #:ticket_number',
        'preheader' => 'Ticket #:ticket_number is aan jou toegewezen',
        'header' => 'Ticket aan jou toegewezen',
        'body' => 'Een ticket is aan jou toegewezen.',
        'assigned_by' => 'Toegewezen door',
        'view_ticket' => 'Bekijk ticket',
    ],

    // Mention
    'mention' => [
        'title' => 'Genoemd in ticket - #:ticket_number',
        'preheader' => 'Je bent genoemd in ticket #:ticket_number',
        'header' => 'Je bent genoemd',
        'body' => ':name noemde je in een notitie op ticket #:ticket_number.',
        'view_ticket' => 'Bekijk ticket',
    ],

    // Internal note
    'internal_note' => [
        'title' => 'Nieuwe notitie - #:ticket_number',
        'preheader' => 'Nieuwe interne notitie op ticket #:ticket_number',
        'header' => 'Nieuwe interne notitie',
        'body' => ':name heeft een interne notitie toegevoegd aan ticket #:ticket_number.',
        'view_ticket' => 'Bekijk ticket',
    ],

    // SLA breach warning
    'sla_breach' => [
        'title' => 'SLA-waarschuwing - #:ticket_number',
        'preheader' => 'SLA-deadline nadert voor ticket #:ticket_number',
        'header' => 'SLA-deadline nadert',
        'body' => 'Een ticket dreigt de SLA te overschrijden.',
        'first_response_warning' => 'Eerste reactie deadline over :time',
        'resolution_warning' => 'Oplossingsdeadline over :time',
        'view_ticket' => 'Bekijk ticket',
    ],
];
