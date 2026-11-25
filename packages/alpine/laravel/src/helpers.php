<?php

namespace Voidable\Laravel;

/**
 * Generate Alpine.js attributes for wiring a Voidable component.
 *
 * Emits `x-void-on:<event>` attributes (the colon form is what the
 * `x-void-on` Alpine directive reads) and HTML-escapes both the event names
 * and the handler expression, so the result is safe to print with `{!! !!}`.
 *
 * @param string|array $events  One or more Voidable event names
 * @param string|null  $handler Alpine expression to evaluate on event
 * @return string HTML attributes string
 */
function void_attrs(string|array $events, ?string $handler = null): string
{
    $handler = htmlspecialchars($handler ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    $attrs = ['x-data'];
    foreach ((array) $events as $event) {
        $event = htmlspecialchars($event, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $attrs[] = "x-void-on:{$event}=\"{$handler}\"";
    }

    return implode(' ', $attrs);
}
