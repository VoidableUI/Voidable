<?php

namespace Voidable\Laravel\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \Voidable\Laravel\VoidableServiceProvider
 */
class Voidable extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'voidable';
    }
}
