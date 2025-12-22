<?php

namespace App\Notifications;

use App\Models\OrganizationInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrganizationInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public OrganizationInvitation $invitation,
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
        $acceptUrl = route('invitations.show', $this->invitation->token);
        $roleLabel = $this->invitation->role === 'admin' ? 'Beheerder' : 'Medewerker';

        return (new MailMessage)
            ->subject('Uitnodiging voor '.$this->invitation->organization->name)
            ->view('emails.invitation', [
                'organization' => $this->invitation->organization,
                'organizationName' => $this->invitation->organization->name,
                'inviterName' => $this->invitation->inviter->name,
                'roleLabel' => $roleLabel,
                'acceptUrl' => $acceptUrl,
                'expiresAt' => $this->invitation->expires_at->format('d-m-Y H:i'),
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'invitation_id' => $this->invitation->id,
            'organization_name' => $this->invitation->organization->name,
        ];
    }
}
