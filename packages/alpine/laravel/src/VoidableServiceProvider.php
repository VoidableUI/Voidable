<?php

namespace Voidable\Laravel;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class VoidableServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/../config/voidable.php' => config_path('voidable.php'),
        ], 'voidable-config');

        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'voidable');

        Blade::directive('voidableScripts', function () {
            return "<?php echo view('voidable::components.scripts')->render(); ?>";
        });

        Blade::directive('voidableStyles', function () {
            return "<?php if (\$__voidableTheme = config('voidable.theme_path')) { echo '<link rel=\"stylesheet\" href=\"' . e(asset(\$__voidableTheme)) . '\">'; } ?>";
        });
    }

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/voidable.php', 'voidable');
    }
}
