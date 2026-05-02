# @voidable/ui-angular

Angular module and services for Voidable UI web components.

## Install

```bash
npm install @voidable/ui-angular @voidable/ui @voidable/theme
```

## Setup

Import `VoidableModule` to enable custom element schemas:

```ts
import { VoidableModule } from '@voidable/ui-angular';

@NgModule({
  imports: [VoidableModule],
})
export class AppModule {}
```

## Usage

```ts
import '@voidable/ui';
import '@voidable/theme';
import { ThemeService } from '@voidable/ui-angular';

@Component({
  template: `<void-button variant="filled" color="primary">Click me</void-button>`,
})
export class MyComponent {
  private theme = inject(ThemeService);
  currentTheme = this.theme.theme; // signal: 'dark' | 'light'
}
```

## Documentation

- [Storybook](https://voidableui.github.io/Voidable/)
- [GitHub](https://github.com/VoidableUI/Voidable)

## License

MIT
