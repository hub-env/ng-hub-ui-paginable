import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject } from 'rxjs';

import { HubPaginableService } from '../services/paginable.service';
import { PaginableConfigService } from '../services/paginate-config.service';
import { HubListComponent } from './list/paginable-list/list.component';
import { HubTableComponent } from './table/table.component';

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
 * The picker has to be able to say what the list is currently set to.
 *
 * A consumer may pass a `perPage` the offered steps do not contain — a three-row sample
 * against the default `[10, 20, 50]`. The `<select>` then matches no `<option>` and every
 * browser draws that as an empty box: a control showing nothing while the list beneath it
 * is plainly paginated. It went unnoticed for as long as the docs used round numbers.
 */
@Component({
	standalone: true,
	imports: [HubTableComponent, HubListComponent],
	template: `
		<hub-table [headers]="headers" [data]="rows" [page]="1" [perPage]="perPage" [totalItems]="5"></hub-table>
		<hub-list [items]="rows" [paginate]="true" [perPage]="perPage" [totalItems]="5"></hub-list>
	`
})
class Host {
	readonly headers = [{ title: 'Name', property: 'name' }];
	readonly rows = [{ id: 1, name: 'Ada' }];
	perPage = 3;
}

describe('the rows-per-page picker', () => {
	let fixture: ComponentFixture<Host>;

	/** Every step a picker offers, in the order it offers them. */
	const stepsOf = (host: string) =>
		Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(`${host} select.hub-paginator__select option`)).map(
			(option) => option.textContent?.trim() ?? ''
		);

	/** The step a picker is showing, or '' when it matches none and renders blank. */
	const shownBy = (host: string) => {
		const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
			`${host} select.hub-paginator__select`
		);
		return select?.selectedOptions?.[0]?.textContent?.trim() ?? '';
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Host, BrowserAnimationsModule],
			providers: [
				{ provide: HubTranslationService, useClass: MockHubTranslationService },
				{ provide: HubPaginableService, useClass: MockPaginableService },
				{ provide: PaginableConfigService, useValue: { language: 'en', mapping: {} } }
			]
		}).compileComponents();
		fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
	});

	it('offers the page size a table was given, even when it is not one of its steps', () => {
		expect(stepsOf('hub-table')).toContain('3');
	});

	it('offers the page size a list was given, even when it is not one of its steps', () => {
		expect(stepsOf('hub-list')).toContain('3');
	});

	it('shows that page size instead of rendering an empty control', () => {
		expect(shownBy('hub-table')).toBe('3');
		expect(shownBy('hub-list')).toBe('3');
	});

	it('keeps the merged step in numeric order, so the steps do not read as shuffled', () => {
		expect(stepsOf('hub-list')).toEqual(['3', '10', '20', '50']);
	});

	it('leaves the steps alone when the page size is already one of them', async () => {
		fixture.componentInstance.perPage = 20;
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		expect(stepsOf('hub-list')).toEqual(['10', '20', '50']);
		expect(shownBy('hub-list')).toBe('20');
	});
});
