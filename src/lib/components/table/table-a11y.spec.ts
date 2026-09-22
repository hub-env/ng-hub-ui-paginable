import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject } from 'rxjs';

import { HubPaginableService } from '../../services/paginable.service';
import { PaginableConfigService } from '../../services/paginate-config.service';
import { HubPaginableTableExpandingRowDirective } from '../../directives/paginable-table-expanding-row.directive';
import { HubTableComponent } from './table.component';

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

/**
 * A table is read column by column, and everything this host declares is something a screen
 * reader has to be able to name: a sorted column, a column that only filters, a checkbox that
 * marks a row, a control that opens the detail underneath it.
 */
@Component({
	standalone: true,
	imports: [HubTableComponent, FormsModule, HubPaginableTableExpandingRowDirective],
	template: `
		<hub-table [headers]="headers" [data]="rows" [selectable]="true" [multiple]="true" [loading]="loading">
			<ng-template expandingRowTpt let-item="item">
				<tr>
					<td>{{ item.name }}</td>
				</tr>
			</ng-template>
		</hub-table>
	`
})
class Host {
	loading = false;
	readonly headers = [
		{ title: 'Name', property: 'name', sortable: true, filter: { type: 'text' as const } },
		{ title: 'City', property: 'city', filter: { type: 'text' as const, mode: 'menu' as const } },
		{ title: 'Role', property: 'role' }
	];
	readonly rows = Array.from({ length: 12 }, (_, i) => ({
		id: i + 1,
		name: `Person ${i + 1}`,
		city: 'London',
		role: 'User'
	}));
}

describe('table accessibility', () => {
	let fixture: ComponentFixture<Host>;
	const el = () => fixture.nativeElement as HTMLElement;
	const headCells = () => Array.from(el().querySelectorAll('.hub-table__head-row > th')) as HTMLElement[];
	const columnCell = (property: string) =>
		el().querySelector(`.hub-table__head-row > th[data-col="${property}"]`) as HTMLElement;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Host, BrowserAnimationsModule, FormsModule],
			providers: [
				{ provide: HubTranslationService, useClass: MockHubTranslationService },
				{ provide: HubPaginableService, useClass: MockPaginableService },
				{ provide: PaginableConfigService, useValue: { language: 'en', mapping: {} } }
			]
		}).compileComponents();
		fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
	});

	it('marks every head cell as a column header', () => {
		expect(headCells().length).toBeGreaterThan(0);
		expect(headCells().every((th) => th.getAttribute('scope') === 'col')).toBe(true);
	});

	it('says a sortable column is sortable, and in which direction', () => {
		const th = columnCell('name');
		expect(th.getAttribute('aria-sort')).toBe('none');

		(th.querySelector('.hub-table__sort-btn') as HTMLElement).click();
		fixture.detectChanges();
		expect(columnCell('name').getAttribute('aria-sort')).toBe('ascending');

		(columnCell('name').querySelector('.hub-table__sort-btn') as HTMLElement).click();
		fixture.detectChanges();
		expect(columnCell('name').getAttribute('aria-sort')).toBe('descending');
	});

	it('leaves a column that cannot be sorted without the attribute', () => {
		expect(columnCell('role').hasAttribute('aria-sort')).toBe(false);
		expect(columnCell('city').hasAttribute('aria-sort')).toBe(false);
	});

	it('gives the sort control a name and a type', () => {
		const button = columnCell('name').querySelector('.hub-table__sort-btn') as HTMLButtonElement;

		expect(button.getAttribute('type')).toBe('button');
		expect(button.getAttribute('aria-label')?.trim()).toBeTruthy();
	});

	// The button used to be drawn for any column carrying a menu filter, where it does nothing:
	// a tab stop with no name and no effect.
	it('draws no sort control on a column that only filters', () => {
		expect(columnCell('city').querySelector('.hub-table__sort-btn')).toBeNull();
	});

	it('names the select-all box and the row boxes', () => {
		const all = el().querySelector('.hub-table__header-cell--actions input') as HTMLElement;
		const row = el().querySelector('.hub-table__cell--select input') as HTMLElement;

		expect(all.getAttribute('aria-label')?.trim()).toBeTruthy();
		expect(row.getAttribute('aria-label')?.trim()).toBeTruthy();
	});

	it('names the control that opens a row, and says whether it is open', () => {
		const button = el().querySelector('.hub-table__expander-btn') as HTMLButtonElement;

		expect(button.getAttribute('aria-label')?.trim()).toBeTruthy();
		expect(button.getAttribute('aria-expanded')).toBe('false');

		button.click();
		fixture.detectChanges();

		expect((el().querySelector('.hub-table__expander-btn') as HTMLElement).getAttribute('aria-expanded')).toBe('true');
	});

	it('names the filter control of each column', () => {
		const input = el().querySelector('.hub-table__filter-row .hub-table__filter-control') as HTMLElement;

		expect(input.getAttribute('aria-label')?.trim()).toBeTruthy();
	});

	it('names the page-size control', () => {
		const select = el().querySelector('.hub-paginator__select') as HTMLElement;
		const labelled = select.getAttribute('aria-label')?.trim() || labelFor(select.id);

		expect(labelled).toBeTruthy();
	});

	it('says it is busy while it loads', () => {
		const table = () => el().querySelector('table.hub-table__element') as HTMLElement;
		expect(table().getAttribute('aria-busy')).toBe('false');

		fixture.componentInstance.loading = true;
		fixture.detectChanges();

		expect(table().getAttribute('aria-busy')).toBe('true');
	});

	it('announces the row count when it changes', () => {
		const info = el().querySelector('.hub-table__bottom-bar-info') as HTMLElement;

		expect(info.getAttribute('role')).toBe('status');
	});

	it('marks the page the reader is on', () => {
		const current = el().querySelector('.hub-paginator [aria-current="page"]');

		expect(current).toBeTruthy();
	});

	function labelFor(id: string): string {
		if (!id) {
			return '';
		}
		const label = el().querySelector(`label[for="${id}"]`);
		return label?.textContent?.trim() ?? '';
	}
});
