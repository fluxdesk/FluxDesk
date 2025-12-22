<?php

namespace App\Jobs;

use App\Models\EmailChannel;
use App\Models\OrganizationInvitation;
use App\Notifications\OrganizationInvitationNotification;
use App\Services\Email\EmailProviderFactory;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class SendInvitationEmail implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public OrganizationInvitation $invitation,
    ) {}

    public function handle(EmailProviderFactory $emailProviderFactory): void
    {
        $organization = $this->invitation->organization;
        $settings = $organization->settings;

        // Check for configured system email channel
        $emailChannel = null;
        if ($settings->system_email_channel_id) {
            $emailChannel = EmailChannel::where('id', $settings->system_email_channel_id)
                ->where('is_active', true)
                ->whereNotNull('oauth_token')
                ->first();
        }

        if ($emailChannel && $emailChannel->usesOAuth()) {
            $this->sendViaEmailChannel($emailChannel, $emailProviderFactory);
        } else {
            $this->sendViaDefaultMailer();
        }
    }

    private function sendViaEmailChannel(EmailChannel $emailChannel, EmailProviderFactory $emailProviderFactory): void
    {
        try {
            $provider = $emailProviderFactory->make($emailChannel);
            $organization = $this->invitation->organization;

            $acceptUrl = route('invitations.show', $this->invitation->token);
            $roleLabel = $this->invitation->role === 'admin' ? 'Beheerder' : 'Medewerker';
            $orgName = $organization->name;
            $inviterName = $this->invitation->inviter->name;
            $expiresAt = $this->invitation->expires_at->format('d-m-Y H:i');

            $html = view('emails.invitation', [
                'acceptUrl' => $acceptUrl,
                'roleLabel' => $roleLabel,
                'organizationName' => $orgName,
                'inviterName' => $inviterName,
                'expiresAt' => $expiresAt,
                'organization' => $organization,
            ])->render();

            $provider->sendNotification($emailChannel, [
                'to_email' => $this->invitation->email,
                'to_name' => null,
                'subject' => 'Uitnodiging voor '.$orgName,
                'html' => $html,
            ]);

            Log::info('Invitation email sent via email channel', [
                'invitation_id' => $this->invitation->id,
                'channel_id' => $emailChannel->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send invitation via email channel, falling back to default', [
                'invitation_id' => $this->invitation->id,
                'channel_id' => $emailChannel->id,
                'error' => $e->getMessage(),
            ]);

            // Fall back to default mailer
            $this->sendViaDefaultMailer();
        }
    }

    private function sendViaDefaultMailer(): void
    {
        Notification::route('mail', $this->invitation->email)
            ->notify(new OrganizationInvitationNotification($this->invitation));
    }
}
