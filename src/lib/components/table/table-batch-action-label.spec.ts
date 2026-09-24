import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject, of } from 'rxjs';

import { PaginableActionButton } from '../../interfaces';
import { HubPaginableService } from '../../services/paginable.service';
import { PaginableConfigService } from '../../services/paginate-config.service';
import { HubListComponent } from '../list/paginable-list/list.component';
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
 * `label` is the visible text of an action and `title` its fallback — that is what the
 * interface says and what the row actions have always drawn. The batch bars read only
 * `title`, so an action declared the documented way came out as a button with an icon and
 * no words, or with nothing at all.
 */
@Component({
	standalone: true,
	imports: [HubTableComponent, HubListComponent],
	template: `
		<hub-table [headers]="headers" [data]="rows" [selectable]="true" [batchActions]="actions"></hub-table>
		<hub-list [items]="rows" [batchActions]="actions"></hub-list>
	`
})
class Host {
	readonly headers = [{ title: 'Name', property: 'name' }];
	readonly rows = [{ id: 1, name: 'Ada' }];
	readonly actions: Array<PaginableActionButton> = [
		{ label: 'Archive' },
		{ title: 'Delete' },
		{ label: 'Export', title: 'Export the selection' },
		{ label: of('Translated') }
	];
}

describe('batch action labels', () => {
	let fixture: ComponentFixture<Host>;
	const textsOf = (selector: string) =>
		Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(selector)).map((button) =>
			(button.textContent ?? '').trim()
		);

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

	it('draws the label of a table batch action, and falls back to its title', () => {
		expect(textsOf('.hub-table__batch-actions-btn')).toEqual(['Archive', 'Delete', 'Export', 'Translated']);
	});

	it('draws the label of a list batch action, and falls back to its title', () => {
		expect(textsOf('.hub-list__batch-action-btn')).toEqual(['Archive', 'Delete', 'Export', 'Translated']);
	});
});
