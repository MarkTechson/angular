# Components

Angular components are the fundamental building blocks of an application. Each component consists of a TypeScript class with behaviors, an HTML template, and a CSS selector.

## Component Definition

Use the `@Component` decorator to define a component's metadata.

```angular-ts
@Component({
  selector: 'app-profile',
  template: `
    <img src="profile.jpg" alt="Profile photo" />
    <button (click)="save()">Save</button>
  `,
  styles: `
    img { border-radius: 50%; }
  `
})
export class ProfileComponent {
  save() { /* ... */ }
}
```

## Metadata Options

- `selector`: The CSS selector that identifies this component in templates.
- `template`: Inline HTML template (preferred for small templates).
- `templateUrl`: Path to an external HTML file.
- `styles`: Inline CSS styles.
- `styleUrl` / `styleUrls`: Path(s) to external CSS file(s).
- `imports`: Lists the components, directives, or pipes used in this component's template.

## Using Components

To use a component, add it to the `imports` array of the consuming component and use its selector in the template.

```angular-ts
@Component({
  selector: 'app-root',
  imports: [ProfileComponent],
  template: `<app-profile />`,
})
export class AppComponent {}
```

## Core Concepts

- **Host Element**: The DOM element that matches the component's selector.
- **View**: The DOM rendered by the component's template inside the host element.
- **Standalone**: By default, components are standalone (since Angular 19, `standalone: true` is default). For older versions, `standalone: true` must be explicit or the component must be part of an `NgModule`.
- **Component Tree**: Angular applications are structured as a tree of components, where each component can host child components.
