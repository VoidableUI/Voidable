<?php
// SPDX-License-Identifier: MIT
// Render <dir>/view.blade.php with Illuminate View (Laravel's Blade) and print
// the HTML. <dir>/data.json holds the component's public properties; an
// "errors" object (field => [messages]) becomes the $errors bag that @error
// reads. Livewire itself is not booted: wire:* attributes are emitted as
// written and the Livewire directives render nothing.

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Container\Container;
use Illuminate\Events\Dispatcher;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\MessageBag;
use Illuminate\Support\ViewErrorBag;
use Illuminate\View\Compilers\BladeCompiler;
use Illuminate\View\Engines\CompilerEngine;
use Illuminate\View\Engines\EngineResolver;
use Illuminate\View\Factory;
use Illuminate\View\FileViewFinder;

$dir = $argv[1];
$data = json_decode(file_get_contents("$dir/data.json"), false, 512, JSON_THROW_ON_ERROR);
$data = (array) $data;

$fs = new Filesystem();
$cache = sys_get_temp_dir() . '/voidable-eval-blade-' . getmypid();
@mkdir($cache, 0777, true);
$container = new Container();
Container::setInstance($container);
$blade = new BladeCompiler($fs, $cache);
foreach (['livewireStyles', 'livewireScripts', 'livewireScriptConfig', 'vite', 'viteReactRefresh'] as $d) {
    $blade->directive($d, fn () => '');
}
$blade->directive('method', fn ($m) => "<?php echo '<input type=\"hidden\" name=\"_method\" value=\"'.e($m).'\">'; ?>");
$resolver = new EngineResolver();
$resolver->register('blade', fn () => new CompilerEngine($blade, $fs));
$finder = new FileViewFinder($fs, [$dir]);
$factory = new Factory($resolver, $finder, new Dispatcher($container));
$factory->setContainer($container);
$container->instance(\Illuminate\Contracts\View\Factory::class, $factory);
$container->instance('view', $factory);
$container->instance('blade.compiler', $blade);

$bag = new ViewErrorBag();
$errors = (array) ($data['errors'] ?? []);
unset($data['errors']);
$bag->put('default', new MessageBag(array_map(fn ($v) => (array) $v, $errors)));
$factory->share('errors', $bag);

// Helpers a Blade view commonly calls.
if (!function_exists('csrf_token')) { function csrf_token() { return 'eval-csrf-token'; } }
if (!function_exists('csrf_field')) { function csrf_field() { return new \Illuminate\Support\HtmlString('<input type="hidden" name="_token" value="eval-csrf-token">'); } }
if (!function_exists('old')) { function old($key = null, $default = null) { return $default; } }
if (!function_exists('route')) { function route($name, $params = []) { return '/' . str_replace('.', '/', $name); } }
if (!function_exists('url')) { function url($path = '') { return '/' . ltrim($path, '/'); } }
if (!function_exists('asset')) { function asset($path) { return '/' . ltrim($path, '/'); } }

// Objects stay objects ($user->name), arrays of objects stay lists.
echo $factory->make('view', $data)->render();
