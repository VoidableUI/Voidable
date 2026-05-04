<?php

namespace Voidable\Laravel\Tests;

use Orchestra\Testbench\TestCase;
use Voidable\Laravel\VoidableServiceProvider;

class ServiceProviderTest extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [VoidableServiceProvider::class];
    }

    public function test_config_is_loaded(): void
    {
        $this->assertNotNull(config('voidable'));
        $this->assertNotNull(config('voidable.script_path'));
    }

    public function test_views_are_registered(): void
    {
        $this->assertTrue(view()->exists('voidable::components.scripts'));
    }
}
