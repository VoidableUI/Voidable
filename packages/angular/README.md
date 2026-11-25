# @voidable/ui-angular

Angular module and services for Voidable UI web components.

## Install

```bash
npm install @voidable/ui-angular @voidable/ui @voidable/theme
```

## Setup

Load the theme in your global stylesheet and register the components once in `main.ts`:

```css
/* src/styles.css */
@import '@voidable/theme';
```

```ts
// src/main.ts
import '@voidable/ui';
```

Angular rejects unknown tags unless the component's module or standalone component declares `CUSTOM_ELEMENTS_SCHEMA`. For NgModule apps, `VoidableModule` bundles it:

```ts
import { VoidableModule } from '@voidable/ui-angular';

@NgModule({
  imports: [VoidableModule],
})
export class AppModule {}
```

For standalone components, add `schemas: [CUSTOM_ELEMENTS_SCHEMA]` to the component.

## Usage

```ts
import { Component, inject } from '@angular/core';
import { ThemeService } from '@voidable/ui-angular';

@Component({
  selector: 'app-root',
  template: `<void-button variant="filled" color="success">Save</void-button>`,
})
export class MyComponent {
  private theme = inject(ThemeService);
  currentTheme = this.theme.theme; // signal: 'dark' | 'light'
}
```

`color` accepts `default`, `error`, `warning`, `success`, `info` or `notice`.

## Documentation

- [Docs](https://voidable.dev/frameworks/angular/)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)
- [npm](https://www.npmjs.com/package/@voidable/ui-angular)

## License

MIT
