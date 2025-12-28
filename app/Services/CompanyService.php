<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Contact;
use Illuminate\Support\Str;

class CompanyService
{
    /**
     * Match a contact to a company by email domain.
     * If a company with a matching domain exists, link the contact to it.
     */
    public function matchContactToCompany(Contact $contact): void
    {
        // Skip if contact already has a company
        if ($contact->company_id) {
            return;
        }

        // Skip if contact has no email
        if (! $contact->email) {
            return;
        }

        $domain = $this->extractDomain($contact->email);

        if (! $domain) {
            return;
        }

        $company = Company::query()
            ->where('organization_id', $contact->organization_id)
            ->whereNotNull('domains')
            ->get()
            ->first(function (Company $company) use ($domain) {
                return in_array($domain, array_map('strtolower', $company->domains ?? []));
            });

        if ($company) {
            $contact->update(['company_id' => $company->id]);
        }
    }

    /**
     * Match all contacts without a company to companies by email domain.
     * Returns the number of contacts matched.
     */
    public function matchAllContactsForCompany(Company $company): int
    {
        if (empty($company->domains)) {
            return 0;
        }

        $domains = array_map('strtolower', $company->domains);
        $matched = 0;

        foreach ($domains as $domain) {
            $count = Contact::query()
                ->where('organization_id', $company->organization_id)
                ->whereNull('company_id')
                ->where('email', 'like', '%@'.$domain)
                ->update(['company_id' => $company->id]);

            $matched += $count;
        }

        return $matched;
    }

    /**
     * Extract domain from email address.
     */
    protected function extractDomain(string $email): ?string
    {
        $domain = Str::after($email, '@');

        if (! $domain || $domain === $email) {
            return null;
        }

        return Str::lower($domain);
    }
}
