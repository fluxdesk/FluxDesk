<?php

namespace App\Notifications\Portal;

use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PortalLoginNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private string $token,
        private Organization $organization
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $loginUrl = route('portal.auth', [
            'organization' => $this->organization->slug,
            'token' => $this->token,
        ]);
        $displayName = $notifiable->display_name ?? 'klant';

        return (new MailMessage)
            ->subject("Inloggen bij {$this->organization->name}")
            ->view('emails.portal-login', [
                'organization' => $this->organization,
                'loginUrl' => $loginUrl,
                'displayName' => $displayName,
            ]);
    }
}
