<?php

namespace App\Services;

use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Collection;

class MentionService
{
    /**
     * Parse mentions in a message and store them in the pivot table.
     *
     * @return Collection<int, User>
     */
    public function parseMentions(Message $message): Collection
    {
        $mentionedUsers = $this->extractMentionedUsers($message);

        if ($mentionedUsers->isNotEmpty()) {
            $message->mentionedUsers()->sync($mentionedUsers->pluck('id'));
        }

        return $mentionedUsers;
    }

    /**
     * Extract mentioned users from a message by matching @Name patterns
     * against organization users.
     *
     * @return Collection<int, User>
     */
    public function extractMentionedUsers(Message $message): Collection
    {
        $body = $message->body ?? $message->body_html ?? '';

        if (empty($body)) {
            return collect();
        }

        // Extract all @mentions from the text
        // Matches @Name where Name consists of capitalized words (e.g., @Serge, @John Smith)
        // Stops at lowercase words, punctuation, end of string, or another @
        preg_match_all('/@([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)(?=\s+[a-z]|\s*[.,!?:;\n\r]|\s*$|\s*@|\s+\d)/u', $body, $matches);

        if (empty($matches[1])) {
            return collect();
        }

        // Get the organization from the ticket
        $organization = $message->ticket?->organization;

        if (! $organization) {
            return collect();
        }

        // Get all users in this organization
        $organizationUsers = $organization->users()->get();

        $mentionedUsers = collect();

        foreach ($matches[1] as $mentionName) {
            $mentionName = trim($mentionName);

            if (empty($mentionName)) {
                continue;
            }

            // Find a user whose name matches (case-insensitive)
            $user = $organizationUsers->first(function (User $user) use ($mentionName) {
                return strcasecmp($user->name, $mentionName) === 0;
            });

            if ($user && ! $mentionedUsers->contains('id', $user->id)) {
                $mentionedUsers->push($user);
            }
        }

        return $mentionedUsers;
    }
}
