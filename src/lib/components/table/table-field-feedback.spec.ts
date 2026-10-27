import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HUB_FIELD_FEEDBACK, HubTranslationService } from 'ng-hub-ui-utils';
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

@Component({
	standalone: true,
	imports: [HubTableComponent],
	template: `<hub-table [headers]="headers" [data]="rows" [flushFields]="flush()" />`
})
class FlushHost {
	readonly flush = signal(false);
	readonly headers = [{ title: 'Name', property: 'name' }];
	readonly rows = [{ id: 1, name: 'Ada' }];
}

/** A table carries field errors in a tooltip only when its fields sit flush against the cell. */
describe('table field feedback placement', () => {
	function setup() {
		TestBed.configureTestingModule({
			imports: [FlushHost, BrowserAnimationsModule],
			providers: [
				{ provide: HubTranslationService, useClass: MockHubTranslationService },
				{ provide: HubPaginableService, useClass: MockPaginableService },
				{ provide: PaginableConfigService, useValue: { language: 'en', mapping: {} } }
			]
		});
		const fixture = TestBed.createComponent(FlushHost);
		fixture.detectChanges();
		const placement = fixture.debugElement.query(By.directive(HubTableComponent)).injector.get(HUB_FIELD_FEEDBACK);

		return { fixture, placement };
	}

	it('asks for the message below the control by default', () => {
		expect(setup().placement()).toBe('bottom');
	});

	it('asks for a tooltip when the fields are flush, and follows the input', async () => {
		const { fixture, placement } = setup();

		fixture.componentInstance.flush.set(true);
		fixture.detectChanges();
		expect(placement()).toBe('tooltip');

		fixture.componentInstance.flush.set(false);
		fixture.detectChanges();
		expect(placement()).toBe('bottom');
	});
});
