import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HubPaginableTableDropdownComponent } from './paginable-table-dropdown.component';

/**
 * The legacy row-actions menu draws one glyph, and it is its own.
 *
 * The trigger carried `hub-table__icon--ellipsis-v`, a class the table's scoped stylesheet
 * never delivers outside the table's own view: the three dots were not there, and a
 * consumer who wanted another glyph had to redefine a variable named after the table. The
 * component is deprecated, which is a reason not to grow its theming surface — but the
 * glyph has to come from somewhere, and in this library a glyph is always a variable.
 */
describe('table dropdown icon tokens', () => {
	let fixture: ComponentFixture<HubPaginableTableDropdownComponent>;

	function maskOf(selector: string): string {
		const element = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
		expect(element, `no element matched "${selector}"`).not.toBeNull();
		return getComputedStyle(element!).maskImage;
	}

	/**
	 * What the component falls back to for `token`, read off its shipped rules.
	 *
	 * The default used to be declared on the host and could be read off the element. It is now
	 * the fallback of the `var()` that reads it, because a declaration on the host is one no
	 * consumer can override — see `token-defaults.spec.ts`.
	 */
	function fallbackFor(token: string): string {
		const styles = (
			(HubPaginableTableDropdownComponent as unknown as { ɵcmp: { styles: string[] } }).ɵcmp.styles ?? []
		).join('\n');
		const opens = styles.indexOf(`var(${token},`);

		expect(opens, `${token} is never read`).toBeGreaterThan(-1);

		let depth = 0;
		for (let i = opens + 3; i < styles.length; i++) {
			if (styles[i] === '(') depth++;
			else if (styles[i] === ')' && --depth === 0) {
				return styles.slice(styles.indexOf(',', opens) + 1, i).trim();
			}
		}
		throw new Error(`unterminated var(${token}, …)`);
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [HubPaginableTableDropdownComponent] });

		fixture = TestBed.createComponent(HubPaginableTableDropdownComponent);
		fixture.componentRef.setInput('options', { buttons: [] });
		fixture.detectChanges();
	});

	it('names no class of the table anywhere in its markup', () => {
		expect(fixture.nativeElement.querySelectorAll('[class*="hub-table__icon"]').length).toBe(0);
	});

	it('draws the trigger glyph from its own variable', () => {
		expect(maskOf('.hub-table-dropdown__icon')).toMatch(/^var\(--hub-table-dropdown-icon-ellipsis-v[,)]/);
	});

	it('ships a default for the glyph it draws', () => {
		expect(fallbackFor('--hub-table-dropdown-icon-ellipsis-v')).toMatch(/^url\(/);
	});

	it('exposes the ink and the size of its glyph as its own variables', () => {
		expect(fallbackFor('--hub-table-dropdown-icon-color')).not.toBe('');
		expect(fallbackFor('--hub-table-dropdown-icon-size')).not.toBe('');
	});

	it('still lets a consumer supply a glyph class of their own', () => {
		fixture.componentRef.setInput('options', { buttons: [], icon: 'my-own-glyph' });
		fixture.detectChanges();

		const icon = fixture.nativeElement.querySelector('.hub-table-dropdown__icon') as HTMLElement;

		expect(icon.classList.contains('my-own-glyph')).toBe(true);
		expect(icon.classList.contains('hub-table-dropdown__icon--ellipsis-v')).toBe(false);
	});
});
