import {
	afterNextRender,
	Directive,
	effect,
	EmbeddedViewRef,
	inject,
	input,
	OnDestroy,
	output,
	ViewContainerRef
} from '@angular/core';
import { HUB_PAGINABLE_FORM_CONTROLS } from './form-controls.token';
import {
	HubPaginableControlHandle,
	HubPaginableControlKind,
	HubPaginableControlLabelType,
	HubPaginableControlOption
} from './form-controls.types';

/** What an adapter may have built that a user can focus and type into. */
const FOCUSABLE = 'input, select, textarea, [role="combobox"], [role="listbox"], [contenteditable="true"]';

/** Whether `element` already answers to a name a screen reader can read out. */
function hasAccessibleName(element: HTMLElement): boolean {
	if (element.getAttribute('aria-label')?.trim()) {
		return true;
	}

	const labelledBy = element.getAttribute('aria-labelledby');
	if (labelledBy?.split(/\s+/).some((id) => element.ownerDocument.getElementById(id)?.textContent?.trim())) {
		return true;
	}

	return ((element as HTMLInputElement).labels?.length ?? 0) > 0;
}

/**
 * Renders a table control through the optional {@link HUB_PAGINABLE_FORM_CONTROLS}
 * adapter.
 *
 * Place it on an `<ng-container>` inside the branch that runs only when an adapter
 * is present; the native `<input>` / `<select>` stays in the `@else` branch as the
 * zero-dependency fallback. The created control is inserted as a sibling of the
 * anchor, kept in sync with the `value` input, and torn down on destroy.
 */
@Directive({
	selector: '[hubPaginableControl]'
})
export class HubPaginableControlDirective implements OnDestroy {
	/** Kind of control to render. */
	readonly kind = input.required<HubPaginableControlKind>({ alias: 'hubPaginableControl' });

	/** Current value (kept in sync with the rendered control). */
	readonly value = input<unknown>('');

	/** Native input type for `kind: 'input'`. */
	readonly controlType = input<string>('text');

	/** Placeholder text. */
	readonly placeholder = input<string>('');

	/** The control's name, for the adapter to render as a real `<label>`. */
	readonly label = input<string>('');

	/** How the adapter should present {@link label}. */
	readonly labelType = input<HubPaginableControlLabelType | ''>('');

	/** Accessible name, applied to the built control if the adapter left it anonymous. */
	readonly ariaLabel = input<string>('');

	/** Extra CSS class forwarded to the control. */
	readonly cssClass = input<string>('');

	/** Options for `kind: 'select'`. */
	readonly options = input<ReadonlyArray<HubPaginableControlOption>>([]);

	/** Emits whenever the user changes the control value. */
	readonly valueChange = output<unknown>();

	private readonly vcr = inject(ViewContainerRef);
	private readonly adapter = inject(HUB_PAGINABLE_FORM_CONTROLS, { optional: true });

	private handle: HubPaginableControlHandle | null = null;
	private lastEmitted: unknown = Symbol('uninitialized');

	constructor() {
		afterNextRender(() => this.render());

		effect(() => {
			const value = this.value();
			// Skip echoing the user's own change back into the control (caret jumps).
			if (this.handle && value !== this.lastEmitted) {
				this.handle.setValue(value);
			}
		});
	}

	ngOnDestroy(): void {
		this.handle?.destroy();
		this.handle = null;
	}

	/** Creates the control via the adapter (no-op when no adapter is provided). */
	private render(): void {
		if (!this.adapter || this.handle) {
			return;
		}

		this.handle = this.adapter.create(this.vcr, {
			kind: this.kind(),
			value: this.value(),
			type: this.controlType(),
			placeholder: this.placeholder(),
			label: this.label(),
			labelType: this.labelType() || undefined,
			ariaLabel: this.ariaLabel(),
			cssClass: this.cssClass(),
			options: this.options(),
			onValueChange: (value) => {
				this.lastEmitted = value;
				this.valueChange.emit(value);
			}
		});

		this.nameControl();
	}

	/** The elements the adapter inserted for this control. */
	private createdElements(): HTMLElement[] {
		const roots: HTMLElement[] = [];
		for (let index = 0; index < this.vcr.length; index++) {
			const view = this.vcr.get(index) as EmbeddedViewRef<unknown> | null;
			for (const node of view?.rootNodes ?? []) {
				if (node instanceof HTMLElement) {
					roots.push(node);
				}
			}
		}
		return roots;
	}

	/**
	 * Makes sure the control the adapter built answers to a name.
	 *
	 * The adapter is optional and structurally typed, so the table hands its label over and has
	 * no way to be told it arrived — the implementation shipped by `ng-hub-ui-forms` reads
	 * `kind`, `value`, `placeholder` and `cssClass` and drops everything else, which left the
	 * search box and the rows-per-page select with nothing a screen reader could announce. Only
	 * the table knows what its own controls are for, so the name is its promise to keep and is
	 * verified here rather than assumed. A no-op whenever the adapter named the control itself,
	 * which is the better outcome: an associated `<label>` survives translation and answers to
	 * voice control, and an `aria-label` string does neither.
	 */
	private nameControl(): void {
		const name = this.ariaLabel() || this.label();
		if (!name) {
			return;
		}

		for (const root of this.createdElements()) {
			const control = (root.matches(FOCUSABLE) ? root : root.querySelector(FOCUSABLE)) as HTMLElement | null;
			if (!control) {
				continue;
			}
			if (!hasAccessibleName(control)) {
				control.setAttribute('aria-label', name);
			}
			return;
		}
	}
}
