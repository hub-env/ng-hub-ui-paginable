# Example Generation Workflow

Use this workflow to create new documentation examples for any component library in this workspace.

## Inputs

You must provide:

- `library`: the target library or package name
- `exampleDescription`: a precise description of what the example should demonstrate
- `exampleType`: one of `basic`, `configuration`, `styling`, `advanced`, `state`, `integration`, or `other`

Optional inputs:

- `exampleName`: the name shown in the examples page
- `exampleId`: the registry id used by the page that lists examples
- `needsCssCode`: whether the example should expose a CSS snippet
- `needsComponentCode`: whether the example should expose a component snippet

## Workflow

1. Identify the public component or directive that the example is meant to document.
2. Create a standalone example component dedicated to that example only.
3. Keep the runtime demo and the code snippet in the same file.
4. Render only the live demo in the component template using the real public API of the library.
5. Do not render a code panel inside the example component template.
6. The source code must be shown only through the top tabs managed by `example-viewer`.
7. Add the code blocks shown in those tabs as string properties on the component:
    - `templateCode`
    - `componentCode`
    - `cssCode` only when the example includes styling
8. Make the snippets match the rendered demo exactly.
9. Keep the component self-contained:
    - declare its own demo data
    - import only the modules it uses
    - avoid relying on external state unless the example explicitly demonstrates that integration
10. If the example needs styling, define the demo theme in the component `styles` and expose the same rules in `cssCode`.
11. If the example needs more than one visual variant, render each variant in a separate sample block inside the same example component.
12. Register the example in the page that lists examples for the library.
13. Add the example to the package documentation if the library publishes example links or examples tables.

## Required Structure

Use this structure for every example component:

```ts
@Component({
  selector: 'app-<example-name>',
  standalone: true,
  imports: [<public-library-component>, ...],
  template: `
    <!-- live preview only -->
  `,
  styles: [`
    /* demo-only layout and theme styles */
  `]
})
export class <ExampleName>Component {
  templateCode = `...`;
  componentCode = `...`;
  cssCode = `...`;
}
```

## Content Rules

- The example title must describe the user-facing behavior, not the internal implementation.
- The description must explain exactly what the example demonstrates.
- The demo must use real inputs and real component APIs.
- The template must not include any inline "Code" section or duplicated snippet blocks.
- Code appears only in the `example-viewer` tabs (HTML/TS/CSS as applicable).
- The code snippet must be copyable and readable.
- If the example uses CSS variables, show the exact variables that the component currently exposes.
- If the example shows multiple states, keep each state visually separated.
- If the example uses forms, signals, or selection state, include only the minimum code needed to understand the behavior.
- Keep the component naming, selector naming, and file naming aligned.

## Library Registration

When the example is ready, register it in the page that exposes examples for the library:

- add a stable `id`
- add a clear `title`
- set `componentName`
- set `packagePath`
- set the `files` entry
- add the lazy `loader`

## Quality Checklist

- The example renders without extra setup.
- The snippet matches the live demo.
- The example uses the current public API of the library.
- The example has no orphaned imports or unused helpers.
- The example follows the same structure as the rest of the examples in `paginable`.
- The example remains readable when opened in isolation.

## Output

Return:

- the example component file
- any page registration changes
- any documentation updates
- a short summary of what was created
