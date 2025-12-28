@extends('emails.tickets.layout')

@section('title', 'Nieuwe klantreactie - #' . $ticket->ticket_number)

@section('preheader')
    {{ $ticket->contact?->name ?? 'Klant' }} reageerde op ticket #{{ $ticket->ticket_number }}
@endsection

@section('header')
    Nieuwe klantreactie op ticket #{{ $ticket->ticket_number }}
@endsection

@section('content')
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        Er is een nieuwe reactie van de klant op dit ticket.
    </p>

    <!-- Contact message bubble -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="padding-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 600; color: #374151;">{{ $message->contact?->name ?? $ticket->contact?->name ?? 'Klant' }}</span>
                            <span style="font-size: 12px; color: #9ca3af; margin-left: 8px;">{{ $message->created_at->setTimezone($organization->settings?->timezone ?? 'UTC')->format('d M, H:i') }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #e5e7eb; border-radius: 12px; border-top-left-radius: 4px; padding: 16px 20px;">
                            <div style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">{!! nl2br(e(html_to_text($message->body_html ?? $message->body, 800))) !!}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Ticket reference -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 16px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td>
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Onderwerp</span>
                            <p style="margin: 4px 0 0; font-size: 15px; font-weight: 500; color: #111827;">{{ $ticket->subject }}</p>
                        </td>
                    </tr>
                    @if($ticket->assignee)
                    <tr>
                        <td style="padding-top: 12px;">
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Toegewezen aan</span>
                            <p style="margin: 4px 0 0; font-size: 14px; font-weight: 500; color: #374151;">{{ $ticket->assignee->name }}</p>
                        </td>
                    </tr>
                    @endif
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
                    Reageren
                </a>
            </td>
        </tr>
    </table>
@endsection
