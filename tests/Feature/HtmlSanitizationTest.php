<?php

use App\Services\HtmlSanitizer;

beforeEach(function () {
    $this->sanitizer = new HtmlSanitizer;
});

it('removes script tags', function () {
    $html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->not->toContain('<script');
    expect($result)->not->toContain('alert');
    expect($result)->toContain('<p>Hello</p>');
    expect($result)->toContain('<p>World</p>');
});

it('removes style tags', function () {
    $html = '<style>.evil { display: none; }</style><p>Content</p>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->not->toContain('<style');
    expect($result)->not->toContain('.evil');
    expect($result)->toContain('<p>Content</p>');
});

it('removes inline styles', function () {
    $html = '<p style="color: red; background: url(evil.js)">Text</p>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->not->toContain('style=');
    expect($result)->not->toContain('color:');
    expect($result)->toContain('<p>Text</p>');
});

it('removes event handlers', function () {
    $html = '<p onclick="evil()">Click me</p><a onmouseover="hack()">Link</a>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->not->toContain('onclick');
    expect($result)->not->toContain('onmouseover');
    expect($result)->not->toContain('evil()');
});

it('preserves safe formatting tags', function () {
    $html = '<p>Hello <strong>bold</strong> and <em>italic</em> and <b>also bold</b></p>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->toContain('<strong>bold</strong>');
    expect($result)->toContain('<em>italic</em>');
    expect($result)->toContain('<b>also bold</b>');
});

it('preserves lists', function () {
    $html = '<ul><li>One</li><li>Two</li></ul><ol><li>First</li></ol>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->toContain('<ul>');
    expect($result)->toContain('<li>One</li>');
    expect($result)->toContain('<ol>');
});

it('preserves blockquotes', function () {
    $html = '<blockquote>Quoted text</blockquote>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->toContain('<blockquote>');
    expect($result)->toContain('Quoted text');
});

it('preserves headings', function () {
    $html = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->toContain('<h1>Title</h1>');
    expect($result)->toContain('<h2>Subtitle</h2>');
    expect($result)->toContain('<h3>Section</h3>');
});

it('sanitizes links to only allow safe protocols', function () {
    $html = '<a href="https://example.com">Safe</a><a href="javascript:evil()">Evil</a><a href="mailto:test@test.com">Email</a>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->toContain('href="https://example.com"');
    expect($result)->toContain('href="mailto:test@test.com"');
    expect($result)->not->toContain('javascript:');
});

it('converts images to placeholder text', function () {
    $html = '<p>Before <img src="photo.jpg" alt="My Photo"> After</p>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->not->toContain('<img');
    expect($result)->toContain('[Image: My Photo]');
});

it('converts images without alt text to generic placeholder', function () {
    $html = '<img src="photo.jpg">';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->not->toContain('<img');
    expect($result)->toContain('[Image]');
});

it('removes iframes', function () {
    $html = '<iframe src="https://evil.com"></iframe><p>Content</p>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->not->toContain('<iframe');
    expect($result)->not->toContain('evil.com');
    expect($result)->toContain('<p>Content</p>');
});

it('cleans up excessive line breaks', function () {
    $html = '<br><br><br><br><br>Content';
    $result = $this->sanitizer->sanitize($html);

    // Should reduce to max 2 line breaks
    expect(substr_count($result, '<br>'))->toBeLessThanOrEqual(2);
});

it('handles null input', function () {
    $result = $this->sanitizer->sanitize(null);

    expect($result)->toBeNull();
});

it('handles empty string input', function () {
    $result = $this->sanitizer->sanitize('');

    expect($result)->toBe('');
});

it('removes object and embed tags', function () {
    $html = '<object data="evil.swf"></object><embed src="malware.swf"><p>Safe</p>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->not->toContain('<object');
    expect($result)->not->toContain('<embed');
    expect($result)->toContain('<p>Safe</p>');
});

it('removes form elements', function () {
    $html = '<form action="/hack"><input type="text" name="steal"><button>Submit</button></form><p>Content</p>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->not->toContain('<form');
    expect($result)->not->toContain('<input');
    expect($result)->not->toContain('<button');
});

it('preserves tables', function () {
    $html = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->toContain('<table>');
    expect($result)->toContain('<th>Header</th>');
    expect($result)->toContain('<td>Data</td>');
});

it('preserves internal storage images', function () {
    $html = '<p>Before <img src="/storage/attachments/1/2/image.jpg" alt="Internal Image"> After</p>';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->toContain('<img');
    expect($result)->toContain('/storage/attachments/1/2/image.jpg');
    expect($result)->toContain('class="max-w-full h-auto rounded"');
});

it('preserves internal absolute URL images', function () {
    config(['app.url' => 'https://example.com']);

    $sanitizer = new HtmlSanitizer;
    $html = '<img src="https://example.com/storage/attachments/test.png" alt="Test">';
    $result = $sanitizer->sanitize($html);

    expect($result)->toContain('<img');
    expect($result)->toContain('https://example.com/storage/attachments/test.png');
});

it('converts external images to placeholders', function () {
    $html = '<img src="https://external-site.com/image.jpg" alt="External Photo">';
    $result = $this->sanitizer->sanitize($html);

    expect($result)->not->toContain('<img');
    expect($result)->toContain('[Image: External Photo]');
});
