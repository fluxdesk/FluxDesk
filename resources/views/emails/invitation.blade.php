@extends('emails.tickets.layout')

@section('title', 'Uitnodiging voor ' . $organizationName)

@section('preheader')
    {{ $inviterName }} heeft je uitgenodigd om lid te worden van {{ $organizationName }}
@endsection

@section('header')
    Je bent uitgenodigd!
@endsection

@section('content')
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        Hallo,
    </p>

    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        <strong>{{ $inviterName }}</strong> heeft je uitgenodigd om lid te worden van <strong>{{ $organizationName }}</strong>.
    </p>

    <!-- Role badge -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px;">
                    <tr>
                        <td style="padding: 16px 20px;">
                            <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Jouw rol</span>
                            <p style="margin: 4px 0 0; font-size: 15px; font-weight: 500; color: #111827;">{{ $roleLabel }}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #6b7280;">
        Klik op de onderstaande knop om de uitnodiging te accepteren. Deze uitnodiging verloopt op <strong>{{ $expiresAt }}</strong>.
    </p>
@endsection

@section('footer')
    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
            <td align="center">
                <a href="{{ $acceptUrl }}" style="display: inline-block; background-color: {{ $organization->settings?->primary_color ?? '#000000' }}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                    Uitnodiging accepteren
                </a>
            </td>
        </tr>
    </table>
@endsection
