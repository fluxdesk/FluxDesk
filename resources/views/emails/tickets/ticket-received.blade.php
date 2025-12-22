@extends('emails.tickets.layout')

@section('title', 'Ticket ontvangen - #' . $ticket->ticket_number)

@section('preheader')
    Uw ticket #{{ $ticket->ticket_number }} is ontvangen: {{ Str::limit($ticket->subject, 60) }}
@endsection

@section('header')
    Ticket ontvangen
@endsection

@section('content')
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        Beste {{ $ticket->contact?->name ?? 'klant' }},
    </p>

    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        We hebben uw verzoek ontvangen en zullen zo snel mogelijk reageren.
    </p>

    <!-- Ticket info card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="padding-bottom: 12px;">
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Ticketnummer</span>
                            <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: #111827;">#{{ $ticket->ticket_number }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Onderwerp</span>
                            <p style="margin: 4px 0 0; font-size: 15px; color: #374151;">{{ $ticket->subject }}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    @if($message)
    <!-- Message bubble -->
    <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
        Uw bericht
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td style="background-color: #e5e7eb; border-radius: 12px; border-top-left-radius: 4px; padding: 16px 20px;">
                <div style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">{!! nl2br(e(html_to_text($message->body_html ?? $message->body, 500))) !!}</div>
            </td>
        </tr>
    </table>
    @endif

    @if(!empty($slaData) || !empty($averageReplyTime))
    <!-- SLA Information -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ecfdf5; border-radius: 8px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 16px 20px;">
                <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #065f46; text-transform: uppercase; letter-spacing: 0.05em;">
                    Verwachte reactietijd
                </p>
                @if(!empty($averageReplyTime))
                <p style="margin: 0 0 8px; font-size: 14px; color: #047857;">
                    Gemiddelde reactietijd: <strong>{{ $averageReplyTime }}</strong>
                </p>
                @endif
                @if(!empty($slaData['first_response_due']))
                <p style="margin: 0 0 8px; font-size: 14px; color: #047857;">
                    Eerste reactie uiterlijk: <strong>{{ $slaData['first_response_due']->format('d-m-Y H:i') }}</strong>
                </p>
                @endif
                @if(!empty($slaData['resolution_due']))
                <p style="margin: 0; font-size: 14px; color: #047857;">
                    Oplossing uiterlijk: <strong>{{ $slaData['resolution_due']->format('d-m-Y H:i') }}</strong>
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
                    Bekijk ticket
                </a>
            </td>
        </tr>
    </table>
@endsection
