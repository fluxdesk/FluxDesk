@extends('emails.tickets.layout')

@section('title', 'SLA-waarschuwing - #' . $ticket->ticket_number)

@section('preheader')
    Dringend: SLA-deadline voor {{ $typeLabel }} nadert - Ticket #{{ $ticket->ticket_number }}
@endsection

@section('header')
    SLA-waarschuwing
@endsection

@section('content')
    <!-- Warning banner -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="vertical-align: middle; padding-right: 12px; width: 24px;">
                            <span style="font-size: 20px;">&#9888;</span>
                        </td>
                        <td>
                            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #92400e;">
                                Deadline {{ $typeLabel }}: {{ $deadline?->format('d-m-Y H:i') }}
                            </p>
                            <p style="margin: 4px 0 0; font-size: 13px; color: #b45309;">
                                Nog {{ $timeRemaining }} resterend
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        Beste {{ $user->name }},
    </p>

    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        De SLA-deadline voor <strong>{{ $typeLabel }}</strong> van onderstaand ticket nadert.
        @if($type === 'first_response')
            Zorg ervoor dat je binnen de gestelde tijd reageert op dit ticket.
        @else
            Zorg ervoor dat je dit ticket binnen de gestelde tijd oplost.
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
                    @if($ticket->sla)
                    <tr>
                        <td style="padding-top: 12px;">
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">SLA</span>
                            <p style="margin: 4px 0 0; font-size: 14px; font-weight: 500; color: #374151;">{{ $ticket->sla->name }}</p>
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
                <a href="{{ $actionUrl }}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                    Bekijk ticket nu
                </a>
            </td>
        </tr>
    </table>
@endsection
