import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject } from 'rxjs';

import { PaginableTableHeader } from '../../interfaces/paginable-table-header';
import { HubDropdownComponent } from '../dropdown/dropdown.component';
import { MenuFilterComponent } from './menu-filter.component';

/**
 * The filter panel draws two glyphs, and they are its own.
 *
 * `hub-table__icon--trash` and `--plus` came from the table, whose stylesheet is scoped to
 * the table's own view: the classes matched nothing here, so the panel's remove and add
 * triggers were words with an empty box in front of them. Naming the variables after this
 * panel is also what lets a product change them without changing the table's.
 */

class MockHubTranslationService {
	readonly translationObserver = new Subject<any>().asObservable();
	getTranslation(key: string) {
		return key;
	}
	setTranslations() {}
	initialize() {}
}

describe('menu filter icon tokens', () => {
	let fixture: ComponentFixture<MenuFilterComponent>;

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
		const css = ((MenuFilterComponent as unknown as { ɵcmp: { styles: string[] } }).ɵcmp.styles ?? []).join('\n');
		const opens = css.indexOf(`var(${token},`);

		expect(opens, `${token} is never read`).toBeGreaterThan(-1);

		let depth = 0;
		for (let i = opens + 3; i < css.length; i++) {
			if (css[i] === '(') depth++;
			else if (css[i] === ')' && --depth === 0) {
				return css.slice(css.indexOf(',', opens) + 1, i).trim();
			}
		}
		throw new Error(`unterminated var(${token}, …)`);
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MenuFilterComponent],
			providers: [
				{ provide: HubTranslationService, useClass: MockHubTranslationService },
				{ provide: HubDropdownComponent, useValue: { closeDropdown: () => {} } }
			]
		});

		fixture = TestBed.createComponent(MenuFilterComponent);
		fixture.componentRef.setInput('header', {
			property: 'name',
			title: 'Name',
			filter: { type: 'text' }
		} as PaginableTableHeader);
		// Two rules: the remove trigger only appears once a rule can be removed.
		fixture.componentInstance.add();
		fixture.componentInstance.add();
		fixture.detectChanges();
	});

	it('names no class of the table anywhere in its markup', () => {
		expect(fixture.nativeElement.querySelectorAll('[class*="hub-table__icon"]').length).toBe(0);
	});

	it('draws the remove-rule glyph from its own variable', () => {
		expect(maskOf('.hub-filter__remove-rule .hub-filter__icon')).toMatch(/^var\(--hub-filter-icon-trash[,)]/);
	});

	it('draws the add-rule glyph from its own variable', () => {
		expect(maskOf('.hub-filter__add-rule-btn .hub-filter__icon')).toMatch(/^var\(--hub-filter-icon-plus[,)]/);
	});

	it('ships a default for every glyph it draws', () => {
		for (const token of ['--hub-filter-icon-trash', '--hub-filter-icon-plus']) {
			expect(fallbackFor(token), `${token} has no default`).toMatch(/^url\(/);
		}
	});

	it('exposes the ink and the size of its glyphs as its own variables', () => {
		expect(fallbackFor('--hub-filter-icon-color')).not.toBe('');
		expect(fallbackFor('--hub-filter-icon-size')).not.toBe('');
	});
});
