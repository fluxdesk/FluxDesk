@extends('emails.tickets.layout')

@section('title', 'Ticket toegewezen - #' . $ticket->ticket_number)

@section('preheader')
    Ticket #{{ $ticket->ticket_number }} is aan jou toegewezen
@endsection

@section('header')
    Ticket #{{ $ticket->ticket_number }} toegewezen aan jou
@endsection

@section('content')
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        @if($assignedBy)
            <strong>{{ $assignedBy->name }}</strong> heeft dit ticket aan jou toegewezen.
        @else
            Dit ticket is aan jou toegewezen.
        @endif
    </p>

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
                    <tr>
                        <td style="padding-top: 12px;">
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Ticketnummer</span>
                            <p style="margin: 4px 0 0; font-size: 14px; font-weight: 500; color: #374151;">#{{ $ticket->ticket_number }}</p>
                        </td>
                    </tr>
                    @if($ticket->contact)
                    <tr>
                        <td style="padding-top: 12px;">
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Klant</span>
                            <p style="margin: 4px 0 0; font-size: 14px; font-weight: 500; color: #374151;">{{ $ticket->contact->name ?? $ticket->contact->email }}</p>
                        </td>
                    </tr>
                    @endif
                    @if($ticket->priority)
                    <tr>
                        <td style="padding-top: 12px;">
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Prioriteit</span>
                            <p style="margin: 4px 0 0; font-size: 14px; font-weight: 500; color: #374151;">{{ $ticket->priority->name }}</p>
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
                    Bekijk ticket
                </a>
            </td>
        </tr>
    </table>
@endsection
