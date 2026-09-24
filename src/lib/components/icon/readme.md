# HubIconComponent

## Overview

The `HubIconComponent` is a versatile Angular component designed to render icons from different icon libraries. It supports Font Awesome, Material Icons, and Bootstrap icons, making it a flexible solution for projects that use multiple icon sets.

## Part of ng-hub-ui Family

This component is part of the ng-hub-ui ecosystem, which includes:

- [ng-hub-ui-paginable](https://www.npmjs.com/package/ng-hub-ui-paginable)
- [ng-hub-ui-modal](https://www.npmjs.com/package/ng-hub-ui-modal)
- [ng-hub-ui-stepper](https://www.npmjs.com/package/ng-hub-ui-stepper)
- [ng-hub-ui-breadcrumbs](https://www.npmjs.com/package/ng-hub-ui-breadcrumbs)
- [ng-hub-ui-portal](https://www.npmjs.com/package/ng-hub-ui-portal)

## Installation

Ensure you have the necessary dependencies installed in your Angular project. The component is designed to be used as a standalone component, so it doesn't require additional module imports.

## Usage

### Basic Usage

To use the `HubIconComponent` in your template, use the following selector:

```html
<ng-hub-ui-icon [config]="iconConfig"></ng-hub-ui-icon>
```

### Input Properties

The component accepts the following input properties:

1. `config` (required): This can be either a string or an `Icon` object.

#### Using a string

When using a string, it's interpreted as the icon's class or value:

```html
<ng-hub-ui-icon config="fas fa-user"></ng-hub-ui-icon>
```

#### Using an Icon object

The `Icon` object has the following structure:

```typescript
interface Icon {
	type?: 'font-awesome' | 'material' | 'bootstrap';
	value?: string;
	variant?: string;
}
```

Example usage:

```html
<ng-hub-ui-icon [config]="{ type: 'font-awesome', value: 'fa-user' }"></ng-hub-ui-icon>
```

### Supported Icon Types

The component supports three types of icons:

1. **Font Awesome**: Use the `'font-awesome'` type.
2. **Material Icons**: Use the `'material'` type.
3. **Bootstrap Icons**: Use the `'bootstrap'` type.

### Examples

#### Font Awesome Icon

```html
<ng-hub-ui-icon [config]="{ type: 'font-awesome', value: 'fa-user' }"></ng-hub-ui-icon>
```

or

```html
<ng-hub-ui-icon [config]="'fas fa-user'"></ng-hub-ui-icon>
```

#### Material Icon

```html
<ng-hub-ui-icon [config]="{ type: 'material', value: 'person' }"></ng-hub-ui-icon>
```

#### Bootstrap Icon

```html
<ng-hub-ui-icon [config]="{ type: 'bootstrap', value: 'person-fill' }"></ng-hub-ui-icon>
```

### Advanced Usage

#### Using Variants

Some icon libraries support variants. You can specify a variant using the `variant` property:

```html
<ng-hub-ui-icon [config]="{ type: 'font-awesome', value: 'fa-user', variant: 'fa-lg' }"></ng-hub-ui-icon>
```

#### Dynamic Icons

You can easily switch between different icons dynamically:

```typescript
export class MyComponent {
	currentIcon: Icon = { type: 'font-awesome', value: 'fa-home' };

	changeIcon() {
		this.currentIcon = { type: 'material', value: 'settings' };
	}
}
```

```html
<ng-hub-ui-icon [config]="currentIcon"></ng-hub-ui-icon> <button (click)="changeIcon()">Change Icon</button>
```

## How It Works

The `HubIconComponent` processes the input configuration and generates the appropriate CSS classes or content for the icon:

1. For Font Awesome and Bootstrap icons, it generates CSS classes.
2. For Material Icons, it sets the icon name as the content of the element.
3. It automatically adds base classes (e.g., 'fa' for Font Awesome) if they're not already included in the icon value.

## Performance Considerations

The component uses `ChangeDetectionStrategy.OnPush`, which means it only checks for changes when its input properties change. This can lead to better performance, especially when used in lists or frequently updated views.

## Customization

You can further customize the appearance of icons by applying additional CSS classes or styles to the `<ng-hub-ui-icon>` element.

## Troubleshooting

If icons are not displaying correctly, ensure that:

1. The correct icon library is included in your project.
2. The icon name or class is correctly specified.
3. For Material Icons, make sure the font is properly loaded in your application.

## Contributing

Contributions to improve the `HubIconComponent` are welcome. Please ensure that any pull requests or issues are well-documented and adhere to the existing coding style.

## License

[Specify the license under which this component is released]
