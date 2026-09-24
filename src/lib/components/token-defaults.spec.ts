import { HubListComponent } from './list/paginable-list/list.component';
import { MenuFilterComponent } from './menu-filter/menu-filter.component';
import { HubPaginableTableDropdownComponent } from './paginable-table-dropdown/paginable-table-dropdown.component';
import { HubPaginatorComponent } from './paginator/paginator.component';
import { HubTableComponent } from './table/table.component';

/**
 * A token default declared on the host is a token the consumer cannot set.
 *
 * Angular's emulated encapsulation shims `:host` to `[_nghost-…]`, an attribute the host
 * element itself carries, so a default written there is declared ON `<hub-table>`. A custom
 * property declared on an element beats the one it would otherwise inherit from an ancestor,
 * and specificity never enters into it — so no `:root { --hub-table-…: … }` a consumer writes
 * can reach the component, however it is written. The theming mixin invites exactly that
 * declaration, so the invitation was false for every token the block redeclared. Measured in
 * Chrome against 22.23.0: `--hub-table-bottom-bar-gap: 99px` at `:root` moved nothing.
 *
 * The bench reads the SHIPPED stylesheets off the component definitions rather than mounting
 * anything: what matters is what a consumer's browser receives, and jsdom resolves no `var()`
 * and lays nothing out, so a measurement here would report zeroes and pass anything.
 *
 * Two halves, because deleting the block alone would satisfy the first while leaving the table
 * undrawn: no rule may declare a default, AND the defaults must still be reachable as the
 * fallbacks of the `var()`s that read them.
 */

/** The compiled stylesheets a component ships, as the browser receives them. */
function stylesOf(component: unknown): string[] {
	return ((component as { ɵcmp?: { styles?: string[] } }).ɵcmp?.styles ?? []).slice();
}

/** Top-level `selector { body }` pairs, stepping into `@media` and friends. */
function rulesOf(css: string): { selector: string; body: string }[] {
	const rules: { selector: string; body: string }[] = [];
	let head = '';
	for (let i = 0; i < css.length; i++) {
		const character = css[i];
		// A bodiless statement — the `@charset` the compiler prepends, an `@import` — ends at its
		// semicolon. Swallowing it into the next selector turned the whole first rule into an
		// at-rule and dropped it, which is how this bench once passed against the very stylesheet
		// it was written to reject.
		if (character === ';') {
			head = '';
			continue;
		}
		if (character !== '{') {
			head += character;
			continue;
		}
		let depth = 1;
		let body = '';
		while (++i < css.length && depth > 0) {
			if (css[i] === '{') depth++;
			else if (css[i] === '}' && --depth === 0) break;
			body += css[i];
		}
		const selector = head.trim();
		head = '';
		if (selector.startsWith('@')) rules.push(...rulesOf(body));
		else rules.push({ selector, body });
	}
	return rules;
}

/**
 * Selectors that reach the host element with nothing else asked of it.
 *
 * Matched against `:host` / `:root` as written, because that is how the styles ship: the
 * `[_nghost-…]` / `[_ngcontent-…]` rewrite happens in the browser at render time, not in the
 * bundle. A variant — `:host(.hub-table--flush)` — is excluded on purpose: that is the
 * component deciding about itself, and it is meant to out-rank the default it replaces.
 */
function isUnconditionalHost(selector: string): boolean {
	return selector.split(',').some((part) => /^\s*(:host|:root|\[_nghost-[^\]]+\])\s*$/.test(part));
}

/** Every `--hub-*` property the rule declares. */
function declaredTokens(body: string): string[] {
	return [...body.matchAll(/(--hub-[a-z0-9-]+)\s*:/g)].map((match) => match[1]);
}

const COMPONENTS: ReadonlyArray<[string, unknown]> = [
	['hub-table', HubTableComponent],
	['hub-list', HubListComponent],
	['hub-paginator', HubPaginatorComponent],
	['menu-filter', MenuFilterComponent],
	['table-dropdown', HubPaginableTableDropdownComponent]
];

describe('token defaults are themeable from :root', () => {
	for (const [name, component] of COMPONENTS) {
		it(`${name} declares no token default on its host`, () => {
			const offenders: string[] = [];
			for (const sheet of stylesOf(component)) {
				for (const rule of rulesOf(sheet)) {
					if (!isUnconditionalHost(rule.selector)) continue;
					for (const token of declaredTokens(rule.body)) offenders.push(`${rule.selector} { ${token} }`);
				}
			}
			expect(offenders).toEqual([]);
		});
	}

	it('keeps the defaults reachable as var() fallbacks', () => {
		const table = stylesOf(HubTableComponent).join('\n');

		// The token the Chrome measurement was taken on, and one derived from another token:
		// the chain has to be inlined too, or the rule resolves it where it was declared.
		expect(table).toContain('var(--hub-table-bottom-bar-gap, var(--hub-ref-space-3, 1rem))');
		expect(table).toContain(
			'var(--hub-table-row-divider-color, var(--hub-table-border-color, var(--hub-sys-border-color-default, #dee2e6)))'
		);
	});

	it('leaves the variant blocks declaring, since a variant is the component deciding about itself', () => {
		const table = stylesOf(HubTableComponent).join('\n');
		// `:host(.hub-table--flush)` reaches the test as `.hub-table--flush[_nghost-…]` and the
		// bundle unshimmed; the class is the part that is the same in both.
		const flush = rulesOf(table).filter((rule) => /hub-table--flush(?![\w-])/.test(rule.selector));

		expect(flush.length).toBe(1);
		expect(declaredTokens(flush[0].body)).toContain('--hub-table-border-width');
	});
});
