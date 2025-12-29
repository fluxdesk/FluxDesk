<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>@yield('title')</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset */
        body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .dark-bg { background-color: #1a1a2e !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: {{ $organization->settings?->email_background_color ?? '#1A1A2E' }}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

    <!-- Preheader text (hidden) -->
    <div style="display: none; max-height: 0px; overflow: hidden;">
        @yield('preheader')
    </div>

    <!-- Main wrapper -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: {{ $organization->settings?->email_background_color ?? '#1A1A2E' }};">
        <tr>
            <td align="center" style="padding: 40px 20px;">

                <!-- Email container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px;">

                    <!-- Logo -->
                    @if($organization->settings?->email_logo_path)
                    <tr>
                        <td align="center" style="padding-bottom: 24px;">
                            <img src="{{ asset('storage/' . $organization->settings->email_logo_path) }}" alt="{{ $organization->name }}" height="40" style="height: 40px; width: auto;">
                        </td>
                    </tr>
                    @endif

                    <!-- White card -->
                    <tr>
                        <td>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">

                                <!-- Colored header band -->
                                <tr>
                                    <td style="background-color: {{ $organization->settings?->primary_color ?? '#000000' }}; padding: 24px 32px;">
                                        <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; letter-spacing: -0.02em;">
                                            @yield('header')
                                        </h1>
                                    </td>
                                </tr>

                                <!-- Content -->
                                <tr>
                                    <td style="padding: 32px;">
                                        @yield('content')
                                    </td>
                                </tr>

                                <!-- Footer inside card -->
                                @hasSection('footer')
                                <tr>
                                    <td style="padding: 0 32px 32px;">
                                        @yield('footer')
                                    </td>
                                </tr>
                                @endif

                            </table>
                        </td>
                    </tr>

                    <!-- Footer text -->
                    <tr>
                        <td align="center" style="padding-top: 24px;">
                            <p style="margin: 0; font-size: 13px; color: #6b7280;">
                                {{ $organization->name }}
                            </p>
                            @if($organization->settings?->email_footer_text)
                            <p style="margin: 8px 0 0; font-size: 12px; color: #4b5563;">
                                {{ $organization->settings->email_footer_text }}
                            </p>
                            @endif
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
