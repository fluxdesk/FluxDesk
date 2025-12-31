@extends('emails.tickets.layout')

@section('title', __('emails.agent_reply.title', ['ticket_number' => $ticket->ticket_number]))

@section('preheader')
    {{ __('emails.agent_reply.preheader', ['ticket_number' => $ticket->ticket_number, 'subject' => Str::limit($ticket->subject, 50)]) }}
@endsection

@section('header')
    {{ __('emails.agent_reply.header', ['ticket_number' => $ticket->ticket_number]) }}
@endsection

@section('content')
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        {{ __('emails.dear') }} {{ $ticket->contact?->name ?? __('emails.customer') }},
    </p>

    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        {{ __('emails.agent_reply.body') }}
    </p>

    <!-- Agent message bubble -->
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

    @if($message->ai_assisted && $organization->aiSettings?->disclosure_enabled && $organization->aiSettings?->disclosure_in_email)
    <!-- AI Disclosure -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td style="padding: 12px 16px; background-color: #f0f9ff; border-radius: 8px; border-left: 3px solid #0284c7;">
                <p style="margin: 0; font-size: 12px; color: #0369a1;">
                    {{ $organization->aiSettings->disclosure_text ?? 'Dit antwoord is opgesteld met behulp van AI-technologie.' }}
                </p>
            </td>
        </tr>
    </table>
    @endif

    @if($message->fileAttachments && $message->fileAttachments->count() > 0)
    <!-- Attachments -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td style="padding-bottom: 8px;">
                <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">{{ __('emails.attachments') }} ({{ $message->fileAttachments->count() }})</span>
            </td>
        </tr>
        <tr>
            <td>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    @foreach($message->fileAttachments as $attachment)
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f3f4f6; border-radius: 6px; margin-bottom: 4px;">
                            <span style="font-size: 13px; color: #374151;">{{ $attachment->original_filename }}</span>
                            <span style="font-size: 12px; color: #9ca3af; margin-left: 8px;">({{ $attachment->human_size }})</span>
                        </td>
                    </tr>
                    @if(!$loop->last)
                    <tr><td style="height: 4px;"></td></tr>
                    @endif
                    @endforeach
                </table>
            </td>
        </tr>
    </table>
    @endif

    <!-- Ticket reference -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 16px 20px;">
                <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">{{ __('emails.subject') }}</span>
                <p style="margin: 4px 0 0; font-size: 15px; font-weight: 500; color: #111827;">{{ $ticket->subject }}</p>
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
                    {{ __('emails.agent_reply.reply_button') }}
                </a>
            </td>
        </tr>
    </table>
@endsection
