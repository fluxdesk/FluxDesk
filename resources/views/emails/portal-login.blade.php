@extends('emails.tickets.layout')

@section('title', 'Inloggen bij ' . $organization->name)

@section('preheader')
    Klik op de link om in te loggen bij {{ $organization->name }}
@endsection

@section('header')
    Inloggen
@endsection

@section('content')
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        Hallo {{ $displayName }},
    </p>

    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        Je hebt een inloglink aangevraagd voor het support portal van <strong>{{ $organization->name }}</strong>.
    </p>

    <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #6b7280;">
        Klik op de onderstaande knop om in te loggen. Deze link is <strong>1 uur</strong> geldig.
    </p>
@endsection

@section('footer')
    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
            <td align="center">
                <a href="{{ $loginUrl }}" style="display: inline-block; background-color: {{ $organization->settings?->primary_color ?? '#000000' }}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                    Inloggen
                </a>
            </td>
        </tr>
    </table>

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #9ca3af; text-align: center;">
        Als je deze aanvraag niet hebt gedaan, kun je deze e-mail negeren.
    </p>
@endsection
