<?php

namespace App\Services;

use HTMLPurifier;
use HTMLPurifier_Config;

/**
 * Sanitize HTML content from emails for safe display.
 *
 * Removes dangerous elements (scripts, styles, iframes) while preserving
 * safe formatting elements (bold, italic, links, lists).
 * Preserves inline images from our storage while converting external images to placeholders.
 */
class HtmlSanitizer
{
    private HTMLPurifier $purifier;

    private string $storageHost;

    public function __construct()
    {
        $config = HTMLPurifier_Config::createDefault();

        // Cache configuration
        $cacheDir = storage_path('app/htmlpurifier');
        if (! is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
        $config->set('Cache.SerializerPath', $cacheDir);

        // Allow only safe HTML elements (including img with src)
        $config->set('HTML.Allowed', 'p,br,b,strong,i,em,u,a[href],ul,ol,li,blockquote,h1,h2,h3,h4,h5,h6,span,div,table,tr,td,th,thead,tbody,img[src|alt|width|height|class]');

        // Only allow safe URI schemes
        $config->set('URI.AllowedSchemes', [
            'http' => true,
            'https' => true,
            'mailto' => true,
        ]);

        // Force all links to open in new tab with noopener
        $config->set('HTML.TargetBlank', true);
        $config->set('HTML.Nofollow', true);

        // Remove empty elements
        $config->set('AutoFormat.RemoveEmpty', true);

        // Allow our storage URLs
        $config->set('URI.DisableExternalResources', false);
        $config->set('URI.DisableResources', false);

        $this->purifier = new HTMLPurifier($config);
        $this->storageHost = parse_url(config('app.url'), PHP_URL_HOST) ?? 'localhost';
    }

    /**
     * Sanitize HTML content for safe display.
     */
    public function sanitize(?string $html): ?string
    {
        if ($html === null || $html === '') {
            return $html;
        }

        // Pre-process: convert external images to placeholder text, keep our images
        $html = $this->processImages($html);

        // Purify the HTML
        $clean = $this->purifier->purify($html);

        // Post-process: clean up whitespace
        $clean = $this->cleanupWhitespace($clean);

        return $clean;
    }

    /**
     * Process img tags - keep internal images, convert external to placeholders.
     */
    private function processImages(string $html): string
    {
        return preg_replace_callback(
            '/<img\s+[^>]*>/i',
            function ($matches) {
                $imgTag = $matches[0];

                // Extract src attribute
                if (preg_match('/src=["\']([^"\']*)["\']/', $imgTag, $srcMatch)) {
                    $src = $srcMatch[1];

                    // Check if it's our internal storage URL
                    if ($this->isInternalUrl($src)) {
                        // Add styling class for inline images
                        if (strpos($imgTag, 'class=') === false) {
                            $imgTag = str_replace('<img', '<img class="max-w-full h-auto rounded"', $imgTag);
                        }

                        return $imgTag;
                    }
                }

                // External image - convert to placeholder
                if (preg_match('/alt=["\']([^"\']*)["\']/', $imgTag, $altMatch)) {
                    $alt = $altMatch[1];
                    if (! empty($alt)) {
                        return "[Image: {$alt}]";
                    }
                }

                return '[Image]';
            },
            $html
        );
    }

    /**
     * Check if a URL points to our internal storage.
     */
    private function isInternalUrl(string $url): bool
    {
        // Check for relative URLs starting with /storage
        if (str_starts_with($url, '/storage/')) {
            return true;
        }

        // Check for absolute URLs pointing to our host
        $parsedUrl = parse_url($url);
        if (isset($parsedUrl['host'])) {
            return $parsedUrl['host'] === $this->storageHost;
        }

        return false;
    }

    /**
     * Clean up excessive whitespace from sanitized HTML.
     */
    private function cleanupWhitespace(string $html): string
    {
        // Remove excessive line breaks
        $html = preg_replace('/(\s*<br\s*\/?>\s*){3,}/i', '<br><br>', $html);

        // Remove empty paragraphs
        $html = preg_replace('/<p>\s*<\/p>/i', '', $html);

        // Trim whitespace
        return trim($html);
    }
}
