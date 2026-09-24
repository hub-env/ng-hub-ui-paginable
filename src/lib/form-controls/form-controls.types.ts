import { ViewContainerRef } from '@angular/core';

/** Kind of primitive control the table needs to render. */
export type HubPaginableControlKind = 'input' | 'select';

/**
 * How the adapter should present the control's label.
 *
 * Spelled out here rather than imported so the package keeps no dependency on
 * `ng-hub-ui-forms`; the values match that library's `HubLabelType` one for one, so an
 * adapter can hand the string straight to `hub-input` / `hub-select`.
 *
 * `visually-hidden` is the one a table needs: a column of controls that each repeated the
 * same visible label would be unreadable, and a column with no label at all leaves every
 * control unnamed. The other three paint, and are here so the contract does not have to
 * grow again when a consumer's own adapter wants them.
 */
export type HubPaginableControlLabelType = 'floating' | 'stacked' | 'horizontal' | 'visually-hidden';

/** A `{ value, label }` option for select-kind controls. */
export interface HubPaginableControlOption {
	value: unknown;
	label: string;
}

/**
 * Normalized, framework-neutral description of a single table control. The table
 * speaks only this shape; the adapter maps it onto whatever component library is
 * wired (e.g. `ng-hub-ui-forms`).
 */
export interface HubPaginableControlConfig {
	/** Whether to render a text-like input or a select. */
	kind: HubPaginableControlKind;
	/** Initial value. */
	value: unknown;
	/** Native input type for `kind: 'input'` (e.g. `text`, `number`, `date`). */
	type?: string;
	/** Placeholder text. */
	placeholder?: string;
	/**
	 * The control's name, for the adapter to render as a real `<label>`.
	 *
	 * Preferred over {@link ariaLabel} where the adapter supports it: a label element is
	 * associated with the control, so it survives translation and answers to voice control,
	 * which an `aria-label` string does not. Pair it with `labelType: 'visually-hidden'` to
	 * keep it out of the layout.
	 */
	label?: string;
	/** How the adapter should present {@link label}. */
	labelType?: HubPaginableControlLabelType;
	/**
	 * Accessible name, as a last resort.
	 *
	 * The floor rather than the preferred route: the table applies it to the control the
	 * adapter built if that control ended up with no name of its own, so a control is never
	 * left anonymous by an adapter that ignores {@link label}.
	 */
	ariaLabel?: string;
	/** Extra CSS class forwarded to the rendered control. */
	cssClass?: string;
	/** Options for `kind: 'select'`. */
	options?: ReadonlyArray<HubPaginableControlOption>;
	/** Called whenever the user changes the control value. */
	onValueChange: (value: unknown) => void;
}

/** Live handle to a control created by a {@link HubPaginableFormControlsAdapter}. */
export interface HubPaginableControlHandle {
	/** Pushes a new value into the control (external updates). */
	setValue(value: unknown): void;
	/** Destroys the control and releases its resources. */
	destroy(): void;
}

/**
 * Optional, structurally-typed adapter that renders the table's primitive
 * controls with a richer component set.
 *
 * Defined here (not imported) so `ng-hub-ui-paginable` keeps **zero hard
 * dependency** on `ng-hub-ui-forms`: with no adapter the table renders native
 * `<input>` / `<select>`; with one, every control upgrades automatically.
 * `ng-hub-ui-forms` ships a ready-made implementation (`hubFormControlAdapter`).
 */
export interface HubPaginableFormControlsAdapter {
	/**
	 * Creates a control inside `container` from the given `config`.
	 * @returns A handle to update or destroy the control.
	 */
	create(container: ViewContainerRef, config: HubPaginableControlConfig): HubPaginableControlHandle;
}
