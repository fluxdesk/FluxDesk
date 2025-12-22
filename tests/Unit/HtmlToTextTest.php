<?php

test('html_to_text converts br tags to newlines', function () {
    expect(html_to_text('Hello<br>World'))->toBe("Hello\nWorld");
    expect(html_to_text('Hello<br/>World'))->toBe("Hello\nWorld");
    expect(html_to_text('Hello<br />World'))->toBe("Hello\nWorld");
});

test('html_to_text converts paragraph tags to double newlines', function () {
    expect(html_to_text('<p>First</p><p>Second</p>'))->toBe("First\n\nSecond");
});

test('html_to_text converts div tags to newlines', function () {
    expect(html_to_text('<div>First</div><div>Second</div>'))->toBe("First\nSecond");
});

test('html_to_text decodes html entities', function () {
    expect(html_to_text('Tom &amp; Jerry'))->toBe('Tom & Jerry');
    expect(html_to_text('&lt;script&gt;'))->toBe('<script>');
    expect(html_to_text('&quot;quoted&quot;'))->toBe('"quoted"');
});

test('html_to_text strips remaining html tags', function () {
    expect(html_to_text('<strong>bold</strong> text'))->toBe('bold text');
    expect(html_to_text('<a href="http://example.com">link</a>'))->toBe('link');
});

test('html_to_text limits output length', function () {
    $longText = str_repeat('word ', 100);
    $result = html_to_text("<p>{$longText}</p>", 50);

    expect(strlen($result))->toBeLessThanOrEqual(55); // 50 + '...'
    expect($result)->toEndWith('...');
});

test('html_to_text handles empty input', function () {
    expect(html_to_text(null))->toBe('');
    expect(html_to_text(''))->toBe('');
});

test('html_to_text preserves plain text', function () {
    expect(html_to_text('Simple plain text'))->toBe('Simple plain text');
});

test('html_to_text normalizes multiple newlines', function () {
    // Multiple newlines should be reduced to max 2
    expect(html_to_text("<p>First</p>\n\n\n<p>Second</p>"))->toBe("First\n\nSecond");
});
