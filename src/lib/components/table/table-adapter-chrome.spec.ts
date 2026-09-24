import { TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject } from 'rxjs';

import { HubPaginableService } from '../../services/paginable.service';
import { PaginableConfigService } from '../../services/paginate-config.service';
import { HubTableComponent } from './table.component';
import { HubPaginatorComponent } from '../paginator/paginator.component';

/**
 * The table's own chrome controls, when a consumer swaps them for hub-forms ones.
 *
 * `provideHubPaginableFormControls` lets the search box and the page-size picker be
 * rendered as `<hub-input>` and `<hub-select>` instead of the native fallbacks. The CSS
 * for them was written for the fallbacks, and the two encapsulation modes then failed in
 * opposite directions:
 *
 * - The table's stylesheet is **emulated**, so its `.hub-table__search-input` rule carries
 *   an `_ngcontent` attribute. A dynamically created component carries none, so the rule
 *   never reached it and the field came out with no group geometry at all — a standalone
 *   rounded control beside a button it was meant to be joined to.
 * - The paginator's stylesheet is **`encapsulation: None`**, so its `.hub-paginator__select`
 *   rule was global and *did* reach the component's host, drawing a second border and a
 *   second padding around a control that already draws its own.
 *
 * One rule too narrow, one too wide, from the same assumption.
 *
 * Asserted on the shipped rules rather than measured, like the benches next door: jsdom
 * lays nothing out, so a measurement would report zeroes and pass anything.
 */
class MockHubTranslationService {
	translationObserver = new Subject<any>().asObservable();
	getTranslation(key: string) {
		return key;
	}
	setTranslations() {}
	initialize() {}
}

class MockPaginableService {
	config = { language: 'en', mapping: {} };
	get mapping() {
		return this.config.mapping;
	}
	initialize() {}
}

/** Declarations of every shipped rule whose selector matches `test`, in source order. */
function rulesMatching(test: (selector: string) => boolean): { selector: string; style: CSSStyleDeclaration }[] {
	const out: { selector: string; style: CSSStyleDeclaration }[] = [];
	for (const sheet of [...document.styleSheets]) {
		let rules: CSSRule[];
		try {
			rules = [...(sheet.cssRules ?? [])];
		} catch {
			continue; // another origin: not ours, and not readable
		}
		for (const rule of rules) {
			const style = rule as CSSStyleRule;
			if (style.selectorText && test(style.selectorText) && style.style) {
				out.push({ selector: style.selectorText, style: style.style });
			}
		}
	}
	return out;
}

describe('adapter-rendered chrome', () => {
	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HubTableComponent, HubPaginatorComponent, BrowserAnimationsModule],
			providers: [
				{ provide: HubTranslationService, useClass: MockHubTranslationService },
				{ provide: HubPaginableService, useClass: MockPaginableService },
				{ provide: PaginableConfigService, useValue: { language: 'en', mapping: {} } }
			]
		}).compileComponents();

		// Instantiating them is what loads their stylesheets into the document.
		TestBed.createComponent(HubTableComponent).detectChanges();
		TestBed.createComponent(HubPaginatorComponent).detectChanges();
	});

	describe('the search button', () => {
		/**
		 * It declared a border colour and no width or style, which only draws a border if
		 * something else supplies them. That something was Bootstrap's `.btn`, which this
		 * family does not ship.
		 */
		it('declares its own border rather than borrowing one', () => {
			const declared = rulesMatching((s) => s.includes('hub-table__search-button')).map(
				({ style }) => style.getPropertyValue('border') || style.getPropertyValue('border-width')
			);

			expect(declared.some(Boolean)).toBe(true);
		});
	});

	describe('the page-size picker', () => {
		/** The native skin has to name the native element, or it lands on the component too. */
		it('paints the native control by element, not by class alone', () => {
			const painted = rulesMatching((s) => s.includes('hub-paginator__select') && s.includes('select.'));

			expect(painted.length).toBeGreaterThan(0);
		});

		/**
		 * The rule has to REACH the control, which is a different question from whether it exists.
		 *
		 * Every case above reads the stylesheet and none of them reads the element, so all of them
		 * stayed green while the skin reached nothing at all: the two picker rules were nested under
		 * `.hub-paginator` and compiled to a descendant selector, and the control is a SIBLING of
		 * `<hub-paginator>` in the table's bottom bar, not a descendant of it. Declared, correct,
		 * and never applied — for the surface, the border, the radius and the padding alike.
		 *
		 * So this one renders a table and asks the element.
		 */
		it('reaches the control the table actually renders', () => {
			const fixture = TestBed.createComponent(HubTableComponent);
			fixture.componentRef.setInput('data', [{ id: 1 }, { id: 2 }]);
			fixture.componentRef.setInput('headers', ['id']);
			fixture.componentRef.setInput('perPage', 1);
			fixture.detectChanges();

			const picker = fixture.nativeElement.querySelector('select.hub-paginator__select') as HTMLElement;

			const computed = getComputedStyle(picker);

			expect(picker, 'the native page-size control').toBeTruthy();
			expect(computed.appearance, 'the system widget is off').toBe('none');
			expect(computed.backgroundImage, 'the caret it draws in its place').toContain('svg');
		});

		/**
		 * Order inside the rule, which the cascade will not rescue.
		 *
		 * The caret is a background image and the room for it is `padding-inline-end`. The
		 * `padding` shorthand resets that longhand, so declared above it the room survives and
		 * declared below it the room is gone — same rule, same specificity, and the caret ends
		 * up printed over the last digit of the page size.
		 */
		it('keeps the caret its room after the padding shorthand', () => {
			const [rule] = rulesMatching((s) => s.trim() === 'select.hub-paginator__select');
			const order = [...(rule.style as unknown as string[])];

			expect(order).toContain('padding-inline-end');
			expect(order.indexOf('padding-inline-end')).toBeGreaterThan(order.lastIndexOf('padding'));
		});

		/**
		 * The one declaration that decides whether any of the others reach the pixels.
		 *
		 * Left at `appearance: auto`, a `<select>` on macOS draws the system box, the system
		 * corner radius and the system caret, and ignores most of what the stylesheet says. Every
		 * `--hub-paginator-select-*` token was being set, and a table themed down to its border
		 * colour still ended with the one control on screen that looked like the operating system.
		 * Nothing in the cascade reports that, which is why it is pinned here.
		 */
		it('takes the system widget off the native control, and draws the caret itself', () => {
			const native = rulesMatching((s) => s.includes('hub-paginator__select') && s.includes('select.'));

			expect(native.map(({ style }) => style.getPropertyValue('appearance'))).toContain('none');
			expect(
				native.some(({ style }) => (style.getPropertyValue('background-image') || '').includes('svg')),
				'a caret of our own, since the system one went with the widget'
			).toBe(true);
		});

		/** And the component's host draws no box, because the control inside draws one. */
		it('strips the box from the adapter host', () => {
			const host = rulesMatching((s) => s.includes('hub-select.hub-paginator__select'));

			expect(host.length).toBeGreaterThan(0);
			// The CSSOM re-serialises the shorthand, so the assertion is on what the
			// declaration means rather than on the exact string a browser chose for it.
			const borders = host.map(({ style }) => style.getPropertyValue('border'));
			expect(borders.some((value) => /^0(px)?\b/.test(value.trim()))).toBe(true);
			expect(host.map(({ style }) => style.getPropertyValue('background'))).toContain('transparent');
		});

		/**
		 * The rule that caused it, stated as its own case so a regression names the reason:
		 * a bare `.hub-paginator__select` in a global sheet reaches every element wearing
		 * the class, the component host included.
		 */
		it('has no bare class rule painting a background', () => {
			const bare = rulesMatching((s) => s.split(',').some((part) => part.trim() === '.hub-paginator__select')).filter(
				({ style }) => style.getPropertyValue('background-color')
			);

			expect(bare).toEqual([]);
		});
	});

	describe('the search field', () => {
		/**
		 * The geometry is handed over, not reached for.
		 *
		 * When the adapter is wired, the field here is a component this table creates at
		 * runtime, and a dynamically created component carries no `_ngcontent` attribute —
		 * so no rule in this emulated stylesheet can name it. The first attempt was a
		 * `::ng-deep` rule, which is a rule reaching into someone else's component: it
		 * shipped nested inside the right-to-left block, compiled to
		 * `:host.hub-table--rtl :host ::ng-deep …`, and was inert in every table.
		 *
		 * Custom properties inherit, so the container states the geometry and whatever fills
		 * it reads it. The native fallback ignores what it does not use.
		 */
		it('states the group radius on its own container', () => {
			const declared = rulesMatching((s) => s.includes('hub-table__search'))
				.map(({ style }) => style.getPropertyValue('--hub-input-border-radius'))
				.filter(Boolean);

			expect(declared.length).toBeGreaterThan(0);
		});

		/** No rule may name the control: that is what emulation forbids and what broke. */
		it('never reaches into the control it does not own', () => {
			const invasoras = rulesMatching((s) => s.includes('ng-deep') || /hub-input\.hub-table__search-input/.test(s));

			expect(invasoras.map(({ selector }) => selector)).toEqual([]);
		});

		/**
		 * The stacking gap is deliberately NOT zeroed here. A control the adapter creates is
		 * embedded wherever it is created — a search group, a paginator row, anything wired
		 * next — so `ng-hub-ui-forms` states it once in the adapter rather than each host
		 * library discovering the same margin separately.
		 */
		it('leaves the stacking gap to the adapter that creates the control', () => {
			const declared = rulesMatching((s) => s.includes('hub-table__search'))
				.map(({ style }) => style.getPropertyValue('--hub-field-stack-gap'))
				.filter(Boolean);

			expect(declared).toEqual([]);
		});
	});
});
