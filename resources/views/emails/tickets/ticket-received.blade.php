@extends('emails.tickets.layout')

@section('title', __('emails.ticket_received.title', ['ticket_number' => $ticket->ticket_number]))

@section('preheader')
    {{ __('emails.ticket_received.preheader', ['ticket_number' => $ticket->ticket_number, 'subject' => Str::limit($ticket->subject, 60)]) }}
@endsection

@section('header')
    {{ __('emails.ticket_received.header') }}
@endsection

@section('content')
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        {{ __('emails.dear') }} {{ $ticket->contact?->name ?? __('emails.customer') }},
    </p>

    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        @if($createdByAgent ?? false)
            {{ __('emails.ticket_received.body_agent_created') }}
        @else
            {{ __('emails.ticket_received.body_contact_created') }}
        @endif
    </p>

    <!-- Ticket info card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="padding-bottom: 12px;">
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">{{ __('emails.ticket_received.ticket_number') }}</span>
                            <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: #111827;">#{{ $ticket->ticket_number }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">{{ __('emails.subject') }}</span>
                            <p style="margin: 4px 0 0; font-size: 15px; color: #374151;">{{ $ticket->subject }}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    @if($message)
    <!-- Message bubble -->
    @if($createdByAgent ?? false)
        {{-- Agent created ticket: show full message with formatting --}}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding-bottom: 8px;">
                                <span style="font-size: 13px; font-weight: 600; color: #374151;">{{ $message->user?->name ?? 'Support' }}</span>
                                <span style="font-size: 12px; color: #9ca3af; margin-left: 8px;">{{ $message->created_at->setTimezone($organization->settings?->timezone ?? 'UTC')->format('d M, H:i') }}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: {{ $organization->settings?->primary_color ?? '#000000' }}; border-radius: 12px; border-top-right-radius: 4px; padding: 16px 20px;">
                                @if($message->body_html)
                                    <div style="margin: 0; font-size: 14px; line-height: 1.6; color: #ffffff;">
                                        <style>
                                            .email-message-content p { margin: 0 0 12px; }
                                            .email-message-content p:last-child { margin-bottom: 0; }
                                            .email-message-content strong, .email-message-content b { font-weight: 600; }
                                            .email-message-content em, .email-message-content i { font-style: italic; }
                                            .email-message-content ul, .email-message-content ol { margin: 0 0 12px; padding-left: 24px; }
                                            .email-message-content ul:last-child, .email-message-content ol:last-child { margin-bottom: 0; }
                                            .email-message-content li { margin-bottom: 4px; }
                                            .email-message-content del { text-decoration: line-through; }
                                        </style>
                                        <div class="email-message-content">{!! $message->body_html !!}</div>
                                    </div>
                                @else
                                    <div style="margin: 0; font-size: 14px; line-height: 1.6; color: #ffffff;">{!! nl2br(e($message->body)) !!}</div>
                                @endif
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    @else
        {{-- Contact created ticket: show truncated preview --}}
        <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
            {{ __('emails.ticket_received.your_message') }}
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td style="background-color: #e5e7eb; border-radius: 12px; border-top-left-radius: 4px; padding: 16px 20px;">
                    <div style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">{!! nl2br(e(html_to_text($message->body_html ?? $message->body, 500))) !!}</div>
                </td>
            </tr>
        </table>
    @endif
    @endif

    @if(!empty($slaData) || !empty($averageReplyTime))
    <!-- SLA Information -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ecfdf5; border-radius: 8px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 16px 20px;">
                <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #065f46; text-transform: uppercase; letter-spacing: 0.05em;">
                    {{ __('emails.ticket_received.expected_response_time') }}
                </p>
                @if(!empty($averageReplyTime))
                <p style="margin: 0 0 8px; font-size: 14px; color: #047857;">
                    {{ __('emails.ticket_received.average_response_time') }}: <strong>{{ $averageReplyTime }}</strong>
                </p>
                @endif
                @if(!empty($slaData['first_response_due']))
                <p style="margin: 0 0 8px; font-size: 14px; color: #047857;">
                    {{ __('emails.ticket_received.first_response_due') }}: <strong>{{ $slaData['first_response_due']->setTimezone($organization->settings?->timezone ?? 'UTC')->format('d-m-Y H:i') }}</strong>
                </p>
                @endif
                @if(!empty($slaData['resolution_due']))
                <p style="margin: 0; font-size: 14px; color: #047857;">
                    {{ __('emails.ticket_received.resolution_due') }}: <strong>{{ $slaData['resolution_due']->setTimezone($organization->settings?->timezone ?? 'UTC')->format('d-m-Y H:i') }}</strong>
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
                    {{ __('emails.ticket_received.view_ticket') }}
                </a>
            </td>
        </tr>
    </table>
@endsection
