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

    /**
     * The development warnings script of the @voidable/ui release this package
     * was released with (every Voidable package shares one version), or null
     * when the installed version is not a release (a path repository, a
     * dev-branch checkout): there is then no published file known to match,
     * and never "latest", which may predate the installed code.
     */
    public static function devScriptUrl(?string $version = null): ?string
    {
        if ($version === null && class_exists(\Composer\InstalledVersions::class)
            && \Composer\InstalledVersions::isInstalled('voidable/laravel')) {
            $version = \Composer\InstalledVersions::getPrettyVersion('voidable/laravel');
        }
        if ($version === null || !preg_match('/^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/', $version, $m) || $m[1] === '0.0.0') {
            return null;
        }

        return "https://cdn.jsdelivr.net/npm/@voidable/ui@{$m[1]}/dist/dev.js";
    }
}
