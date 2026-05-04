<?php

namespace Voidable\Laravel;

/**
 * Generate Alpine.js attributes for wiring a Voidable component.
 *
 * @param string|array $events  One or more Voidable event names
 * @param string|null  $handler Alpine expression to evaluate on event
 * @return string HTML attributes string
 */
function void_attrs(string|array $events, ?string $handler = null): string
{
    $events = (array) $events;
    $eventsStr = implode(',', $events);

    $attrs = "x-data x-void-on.{$events[0]}=\"{$handler}\"";

    if (count($events) > 1) {
        foreach (array_slice($events, 1) as $event) {
            $attrs .= " x-void-on.{$event}=\"{$handler}\"";
        }
    }

    return $attrs;
}
