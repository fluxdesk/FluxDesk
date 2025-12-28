@extends('emails.tickets.layout')

@section('title', 'Nieuw ticket - #' . $ticket->ticket_number)

@section('preheader')
    Nieuw ticket van {{ $ticket->contact?->name ?? $ticket->contact?->email }}: {{ Str::limit($ticket->subject, 50) }}
@endsection

@section('header')
    Nieuw ticket
@endsection

@section('content')
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        Er is een nieuw ticket binnengekomen.
    </p>

    <!-- Ticket info card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Van</span>
                            <p style="margin: 4px 0 0; font-size: 15px; font-weight: 500; color: #111827;">{{ $ticket->contact?->name ?? 'Onbekend' }}</p>
                            <p style="margin: 2px 0 0; font-size: 13px; color: #6b7280;">{{ $ticket->contact?->email }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top: 16px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td width="50%" valign="top">
                                        <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Ticket</span>
                                        <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #111827;">#{{ $ticket->ticket_number }}</p>
                                    </td>
                                    <td width="50%" valign="top">
                                        <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Prioriteit</span>
                                        <p style="margin: 4px 0 0; font-size: 14px; color: {{ $ticket->priority?->color ?? '#6b7280' }}; font-weight: 500;">{{ $ticket->priority?->name ?? 'Normaal' }}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Subject -->
    <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
        Onderwerp
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; font-weight: 500; color: #111827;">
        {{ $ticket->subject }}
    </p>

    @if($message)
    <!-- Message bubble -->
    <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
        Bericht
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td style="background-color: #e5e7eb; border-radius: 12px; border-top-left-radius: 4px; padding: 16px 20px;">
                <div style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">{!! nl2br(e(html_to_text($message->body_html ?? $message->body, 600))) !!}</div>
            </td>
        </tr>
    </table>
    @endif

    @if($ticket->sla_first_response_due_at || $ticket->sla_resolution_due_at)
    <!-- SLA Deadlines -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 16px 20px;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em;">
                    SLA-deadlines
                </p>
                @if($ticket->sla_first_response_due_at && !$ticket->first_response_at)
                <p style="margin: 0 0 4px; font-size: 14px; color: #92400e;">
                    Reageer voor: <strong>{{ $ticket->sla_first_response_due_at->setTimezone($organization->settings?->timezone ?? 'UTC')->format('d-m-Y H:i') }}</strong>
                </p>
                @endif
                @if($ticket->sla_resolution_due_at)
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                    Opgelost voor: <strong>{{ $ticket->sla_resolution_due_at->setTimezone($organization->settings?->timezone ?? 'UTC')->format('d-m-Y H:i') }}</strong>
                </p>
                @endif
            </td>
        </tr>
    </table>
    @endif
@endsection

@section('footer')
    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
            <td align="center">
                <a href="{{ $actionUrl }}" style="display: inline-block; background-color: {{ $organization->settings?->primary_color ?? '#000000' }}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                    Open ticket
                </a>
            </td>
        </tr>
    </table>
@endsection
