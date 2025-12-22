<?php

if (! function_exists('html_to_text')) {
    /**
     * Convert HTML to plain text while preserving line breaks.
     *
     * @param  string|null  $html  The HTML content to convert
     * @param  int|null  $limit  Optional character limit
     * @return string The plain text with preserved line breaks
     */
    function html_to_text(?string $html, ?int $limit = null): string
    {
        if (empty($html)) {
            return '';
        }

        // Convert block-level elements and line breaks to newlines
        $text = preg_replace('/<br\s*\/?>/i', "\n", $html);
        $text = preg_replace('/<\/p>\s*<p[^>]*>/i', "\n\n", $text);
        $text = preg_replace('/<\/(p|div|h[1-6]|li|tr)>/i', "\n", $text);
        $text = preg_replace('/<\/(blockquote|pre)>/i', "\n\n", $text);

        // Remove remaining HTML tags
        $text = strip_tags($text);

        // Decode HTML entities
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Normalize whitespace: convert multiple spaces to single space (but preserve newlines)
        $text = preg_replace('/[^\S\n]+/', ' ', $text);

        // Normalize multiple consecutive newlines to max 2
        $text = preg_replace('/\n{3,}/', "\n\n", $text);

        // Trim each line and the overall text
        $lines = array_map('trim', explode("\n", $text));
        $text = implode("\n", $lines);
        $text = trim($text);

        // Apply character limit if specified
        if ($limit !== null && mb_strlen($text) > $limit) {
            $text = mb_substr($text, 0, $limit);
            // Try to break at word boundary
            $lastSpace = mb_strrpos($text, ' ');
            if ($lastSpace !== false && $lastSpace > $limit - 50) {
                $text = mb_substr($text, 0, $lastSpace);
            }
            $text .= '...';
        }

        return $text;
    }
}
