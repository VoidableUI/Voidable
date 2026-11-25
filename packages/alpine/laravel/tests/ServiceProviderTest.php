<?php

namespace Voidable\Laravel\Tests;

use Orchestra\Testbench\TestCase;
use Voidable\Laravel\VoidableServiceProvider;

use function Voidable\Laravel\void_attrs;

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

    public function test_void_attrs_uses_colon_syntax(): void
    {
        $this->assertSame(
            'x-data x-void-on:void-click="save()"',
            void_attrs('void-click', 'save()')
        );
    }

    public function test_void_attrs_repeats_handler_for_each_event(): void
    {
        $this->assertSame(
            'x-data x-void-on:void-click="go()" x-void-on:void-change="go()"',
            void_attrs(['void-click', 'void-change'], 'go()')
        );
    }

    public function test_void_attrs_escapes_handler(): void
    {
        $out = void_attrs('void-click', 'a = "x" + \'y\' + <b>');
        $this->assertStringNotContainsString('<b>', $out);
        $this->assertStringContainsString('&quot;x&quot;', $out);
    }

    public function test_scripts_emit_module_src_from_script_path(): void
    {
        config(['voidable.script_path' => 'build/app.js']);
        $html = view('voidable::components.scripts')->render();

        $this->assertStringContainsString('<script type="module" src="', $html);
        $this->assertStringContainsString('build/app.js', $html);
        $this->assertStringNotContainsString("import '@voidable/ui'", $html);
    }

    public function test_scripts_omit_module_tag_when_script_path_is_null(): void
    {
        config(['voidable.script_path' => null]);
        $html = view('voidable::components.scripts')->render();

        $this->assertStringNotContainsString('type="module"', $html);
        $this->assertStringContainsString('window.voidableConfig', $html);
    }

    public function test_styles_directive_emits_link_for_theme_path(): void
    {
        config(['voidable.theme_path' => 'build/theme.css']);
        $html = \Illuminate\Support\Facades\Blade::render('@voidableStyles');

        $this->assertStringContainsString('<link rel="stylesheet"', $html);
        $this->assertStringContainsString('build/theme.css', $html);
    }

    public function test_styles_directive_emits_nothing_when_theme_path_is_null(): void
    {
        config(['voidable.theme_path' => null]);
        $html = \Illuminate\Support\Facades\Blade::render('@voidableStyles');

        $this->assertStringNotContainsString('<link', $html);
    }
}
