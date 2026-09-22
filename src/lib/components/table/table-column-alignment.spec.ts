import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject } from 'rxjs';

import { HubPaginableService } from '../../services/paginable.service';
import { PaginableConfigService } from '../../services/paginate-config.service';
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

const HEADERS = [
	{ title: 'Name', property: 'name', filter: { type: 'text' as const } },
	{ title: 'City', property: 'city', filter: { type: 'text' as const } }
];

const ROWS = [
	{ id: 1, name: 'Ada', city: 'London' },
	{ id: 2, name: 'Grace', city: 'New York' }
];

const BATCH = [{ label: 'Archive', handler: () => {} }];

@Component({
	standalone: true,
	imports: [HubTableComponent],
	template: ` <hub-table [headers]="headers" [data]="rows" [selectable]="true" [multiple]="true" [batchActions]="batch" /> `
})
class SelectableHost {
	readonly headers = HEADERS;
	readonly rows = ROWS;
	readonly batch = BATCH;
}

@Component({
	standalone: true,
	imports: [HubTableComponent],
	template: ` <hub-table [headers]="headers" [data]="rows" [batchActions]="batch" /> `
})
class BatchOnlyHost {
	readonly headers = HEADERS;
	readonly rows = ROWS;
	readonly batch = BATCH;
}

const providers = [
	{ provide: HubTranslationService, useClass: MockHubTranslationService },
	{ provide: HubPaginableService, useClass: MockPaginableService },
	{ provide: PaginableConfigService, useValue: { language: 'en', mapping: {} } }
];

/**
 * The head row, the filter row and the body row each decide on their own whether to open with a
 * selection cell. While those three conditions were written differently the table could render a
 * head one cell narrower than its body, which no amount of CSS puts back into line.
 */
describe('table column alignment', () => {
	const counts = (fixture: ComponentFixture<unknown>) => {
		const el = fixture.nativeElement as HTMLElement;
		return {
			head: el.querySelectorAll('.hub-table__head-row > th').length,
			filter: el.querySelectorAll('.hub-table__filter-row > th').length,
			body: el.querySelectorAll('.hub-table__body-row:first-of-type > td').length
		};
	};

	it('keeps head, filters and body the same width when rows are selectable', async () => {
		await TestBed.configureTestingModule({
			imports: [SelectableHost, BrowserAnimationsModule],
			providers
		}).compileComponents();
		const fixture = TestBed.createComponent(SelectableHost);
		fixture.detectChanges();

		const { head, filter, body } = counts(fixture);

		expect(head).toBe(HEADERS.length + 1);
		expect(filter).toBe(head);
		expect(body).toBe(head);
	});

	it('keeps them the same width when there are batch actions but nothing is selectable', async () => {
		await TestBed.configureTestingModule({
			imports: [BatchOnlyHost, BrowserAnimationsModule],
			providers
		}).compileComponents();
		const fixture = TestBed.createComponent(BatchOnlyHost);
		fixture.detectChanges();

		const { head, filter, body } = counts(fixture);

		expect(head).toBe(HEADERS.length);
		expect(filter).toBe(head);
		expect(body).toBe(head);
	});
});
