<?php

namespace Voidable\Laravel\Tests;

use Illuminate\Support\Facades\Blade;
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

    public function test_dev_warnings_are_off_by_default_outside_local(): void
    {
        $this->assertFalse((bool) config('voidable.dev_warnings'));
        $html = view('voidable::components.scripts')->render();

        $this->assertStringNotContainsString('dev.js', $html);
    }

    public function test_dev_warnings_script_is_emitted_when_on(): void
    {
        config(['voidable.dev_warnings' => true, 'voidable.dev_script' => '/js/voidable-dev.js']);
        $html = view('voidable::components.scripts')->render();

        $this->assertStringContainsString('<script type="module" src="/js/voidable-dev.js">', $html);
        $this->assertStringNotContainsString('VOIDABLE_DEV', $html);
    }

    public function test_dev_script_defaults_to_the_release_never_latest(): void
    {
        $cdn = fn (string $v) => 'https://cdn.jsdelivr.net/npm/@voidable/ui' . '@' . $v . '/dist/dev.js';
        $this->assertSame($cdn('1.4.2'), \Voidable\Laravel\VoidableServiceProvider::devScriptUrl('v1.4.2'));
        $this->assertSame($cdn('0.9.0-rc.1'), \Voidable\Laravel\VoidableServiceProvider::devScriptUrl('0.9.0-rc.1'));
        $this->assertNull(\Voidable\Laravel\VoidableServiceProvider::devScriptUrl('dev-master'));
        $this->assertNull(\Voidable\Laravel\VoidableServiceProvider::devScriptUrl('0.0.0'));
        $this->assertStringNotContainsString('@latest', (string) config('voidable.dev_script'));
    }

    public function test_no_dev_script_is_emitted_without_a_known_release(): void
    {
        config(['voidable.dev_warnings' => true, 'voidable.dev_script' => null]);
        $html = view('voidable::components.scripts')->render();

        $this->assertStringNotContainsString('dev.js', $html);
    }

    public function test_dev_warnings_throw_mode_sets_the_config_first(): void
    {
        config(['voidable.dev_warnings' => 'throw', 'voidable.dev_script' => '/js/dev.js']);
        $html = view('voidable::components.scripts')->render();

        $this->assertStringContainsString('window.VOIDABLE_DEV = { throw: true };', $html);
        $this->assertLessThan(strpos($html, 'dev.js'), strpos($html, 'VOIDABLE_DEV'));
    }

    public function test_a_chart_component_writes_the_data_as_one_json_attribute(): void
    {
        $data = ['series' => [['name' => 'Sales', 'values' => [1, 2]]], 'labels' => ['Mon', 'Tue']];
        $html = Blade::render('<x-voidable::bar-chart :data="$data" id="sales" show-value aria-label="Sales" />', ['data' => $data]);

        $this->assertStringContainsString('<void-bar-chart', $html);
        $this->assertStringContainsString('id="sales"', $html);
        $this->assertStringContainsString('aria-label="Sales"', $html);
        $this->assertStringContainsString('show-value', $html);
        $this->assertSame($data, $this->attributeJson($html, 'data'));
        $this->assertStringNotContainsString('data-series', $html);
    }

    public function test_a_chart_component_takes_a_json_string_and_leaves_no_attribute_without_data(): void
    {
        $html = Blade::render('<x-voidable::line-chart :data="$json" />', ['json' => '{"series":[]}']);
        $this->assertSame(['series' => []], $this->attributeJson($html, 'data'));

        $this->assertStringNotContainsString(' data=', Blade::render('<x-voidable::donut-chart aria-label="Empty" />'));
    }

    public function test_a_gauge_component_writes_data_and_zones(): void
    {
        $zones = [['from' => 0, 'to' => 60, 'color' => 'green']];
        $html = Blade::render('<x-voidable::gauge :value="42" :zones="$zones" unit="%" />', ['zones' => $zones]);

        $this->assertStringContainsString('value="42"', $html);
        $this->assertSame($zones, $this->attributeJson($html, 'zones'));
        $this->assertStringNotContainsString(' data=', $html);
    }

    private function attributeJson(string $html, string $name): mixed
    {
        $this->assertSame(1, preg_match('/ ' . $name . '="([^"]*)"/', $html, $m), "no $name attribute in $html");

        return json_decode(html_entity_decode($m[1]), true);
    }
}
