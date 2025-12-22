@extends('emails.tickets.layout')

@section('title', 'Interne notitie - #' . $ticket->ticket_number)

@section('preheader')
    {{ $message->user?->name ?? 'Collega' }} heeft een notitie toegevoegd aan ticket #{{ $ticket->ticket_number }}
@endsection

@section('header')
    Interne notitie toegevoegd
@endsection

@section('content')
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        Er is een interne notitie toegevoegd aan een ticket.
    </p>

    <!-- Ticket reference -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 16px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td>
                            <span style="font-size: 13px; color: #6b7280;">Ticket #{{ $ticket->ticket_number }}</span>
                            <p style="margin: 4px 0 0; font-size: 15px; font-weight: 500; color: #111827;">{{ $ticket->subject }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top: 8px;">
                            <span style="font-size: 12px; color: #6b7280;">Klant: </span>
                            <span style="font-size: 13px; color: #374151;">{{ $ticket->contact?->name ?? $ticket->contact?->email ?? 'Onbekend' }}</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Note bubble (amber styled for internal note) -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="padding-bottom: 8px;">
                            <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Interne notitie</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 600; color: #374151;">{{ $message->user?->name ?? 'Collega' }}</span>
                            <span style="font-size: 12px; color: #9ca3af; margin-left: 8px;">{{ $message->created_at->format('d M, H:i') }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; border-top-right-radius: 4px; padding: 16px 20px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78350f; white-space: pre-wrap;">{{ Str::limit(strip_tags($message->body_html ?? $message->body), 800) }}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
