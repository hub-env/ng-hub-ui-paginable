import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject } from 'rxjs';

import { HubListComponent } from './list.component';

/**
 * The list draws its own glyphs, so it owns the variables behind them.
 *
 * It used to borrow the table's — `hub-table__icon--chevron-down` on the collapse trigger,
 * `--info` on every state message — which cost it twice. A product wanting another chevron
 * in the list had to redefine a variable named after the table, and got the table changed
 * with it; and the borrowed class never even arrived, because the table's stylesheet is
 * scoped to the table's own view and matches nothing rendered here. The glyphs were
 * invisible.
 *
 * The assertions read the computed `mask-image`, which is where the borrowing would show:
 * a class pointing at the wrong family reports the wrong variable name.
 */

interface TestListItem {
	id: number;
	label: string;
	children?: TestListItem[];
	collapsed?: boolean;
}

class MockHubTranslationService {
	readonly translationObserver = new Subject<any>().asObservable();
	getTranslation(key: string) {
		return key;
	}
	setTranslations() {}
	initialize() {}
}

describe('list icon tokens', () => {
	let fixture: ComponentFixture<HubListComponent<TestListItem>>;

	/** The variable a rendered icon actually consumes. */
	function maskOf(selector: string): string {
		const element = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
		expect(element, `no element matched "${selector}"`).not.toBeNull();
		return getComputedStyle(element!).maskImage;
	}

	/** The value the list declares for one of its own icon variables. */
	/**
	 * What the component falls back to for `token`, read off its shipped rules.
	 *
	 * The default used to be declared on the host and could be read off the element. It is now
	 * the fallback of the `var()` that reads it, because a declaration on the host is one no
	 * consumer can override — see `token-defaults.spec.ts`.
	 */
	function fallbackFor(token: string): string {
		const css = ((HubListComponent as unknown as { ɵcmp: { styles: string[] } }).ɵcmp.styles ?? []).join('\n');
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
			imports: [HubListComponent],
			providers: [{ provide: HubTranslationService, useClass: MockHubTranslationService }]
		});

		fixture = TestBed.createComponent(HubListComponent<TestListItem>);
		fixture.componentRef.setInput('options', { searchable: true });
		fixture.componentRef.setInput('items', [
			{ id: 1, label: 'Parent', children: [{ id: 2, label: 'Child' }] }
		] as TestListItem[]);
		fixture.detectChanges();
	});

	it('names no class of the table anywhere in its markup', () => {
		fixture.componentRef.setInput('loading', true);
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelectorAll('[class*="hub-table__icon"]').length).toBe(0);
	});

	/** A parent item starts collapsed, so this is the glyph the reader meets first. */
	it('draws the expand chevron from its own variable', () => {
		expect(maskOf('.hub-list__chevron .hub-list__icon')).toMatch(/^var\(--hub-list-icon-chevron-down[,)]/);
	});

	it('draws the collapse chevron from its own variable', () => {
		fixture.componentRef.setInput('options', { searchable: true, collapsed: false });
		fixture.detectChanges();

		expect(maskOf('.hub-list__chevron .hub-list__icon')).toMatch(/^var\(--hub-list-icon-chevron-up[,)]/);
	});

	it('draws the search glyph from a variable rather than from a literal', () => {
		expect(maskOf('.hub-list__search-icon')).toMatch(/^var\(--hub-list-icon-search[,)]/);
	});

	it('draws the state glyph from its own variable', () => {
		fixture.componentRef.setInput('loading', true);
		fixture.detectChanges();

		expect(maskOf('.hub-list__loading .hub-list__icon')).toMatch(/^var\(--hub-list-icon-info[,)]/);
	});

	it('ships a default for every glyph it draws', () => {
		for (const token of [
			'--hub-list-icon-chevron-up',
			'--hub-list-icon-chevron-down',
			'--hub-list-icon-info',
			'--hub-list-icon-search'
		]) {
			expect(fallbackFor(token), `${token} has no default`).toMatch(/^url\(/);
		}
	});

	it('exposes the ink and the size of its glyphs as its own variables', () => {
		expect(fallbackFor('--hub-list-icon-color')).not.toBe('');
		expect(fallbackFor('--hub-list-icon-size')).not.toBe('');
	});
});
