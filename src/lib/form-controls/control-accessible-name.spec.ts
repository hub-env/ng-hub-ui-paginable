import { Component, ViewContainerRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject } from 'rxjs';

import { HubTableComponent } from '../components/table/table.component';
import { HubPaginableService } from '../services/paginable.service';
import { PaginableConfigService } from '../services/paginate-config.service';
import { provideHubPaginableFormControls } from './form-controls.provider';
import { HubPaginableControlConfig, HubPaginableControlHandle, HubPaginableFormControlsAdapter } from './form-controls.types';

/**
 * A control the table builds through an adapter still has to have a name.
 *
 * `HubLabelType` offers only variants that paint, so a table had no good answer: a visible
 * label repeated down twenty rows, or a control a screen reader announces as nothing. The
 * label types are the forms library's to fix and it has — `visually-hidden` since 22.33.0 —
 * but the seam this package renders its own search box and rows-per-page select through
 * carried no way to ask for it. It carried `ariaLabel` alone, and the adapter that ships with
 * `ng-hub-ui-forms` reads `kind`, `value`, `placeholder` and `cssClass` and drops the rest, so
 * the name never arrived either way.
 *
 * Two halves. The config has to carry the label and the type, so an adapter that honours them
 * renders a real associated `<label>` — the better outcome, since that survives translation
 * and answers to voice control. And the control has to end up named even when the adapter
 * ignores all of it, because the adapter is structurally typed and optional: the table cannot
 * check that its label was used, so it checks the control instead.
 */

class MockHubTranslationService {
	readonly translationObserver = new Subject<unknown>().asObservable();
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

/** Every config the table handed the adapter during the test, in creation order. */
const received: HubPaginableControlConfig[] = [];

/**
 * An adapter that reads `kind` and nothing else, like the one `ng-hub-ui-forms` ships.
 *
 * Deliberately deaf to `label`, `labelType` and `ariaLabel`: an adapter that honoured them
 * would pass the second half of this bench without the table having done anything.
 */
const deafAdapter: HubPaginableFormControlsAdapter = {
	create(container: ViewContainerRef, config: HubPaginableControlConfig): HubPaginableControlHandle {
		received.push(config);

		const ref = container.createComponent(config.kind === 'select' ? DeafSelectComponent : DeafInputComponent);
		ref.changeDetectorRef.detectChanges();

		return { setValue: () => {}, destroy: () => ref.destroy() };
	}
};

@Component({ selector: 'deaf-input', template: '<input type="text" />' })
class DeafInputComponent {}

@Component({ selector: 'deaf-select', template: '<select><option>10</option></select>' })
class DeafSelectComponent {}

describe('controls built through the adapter carry an accessible name', () => {
	let fixture: ComponentFixture<HubTableComponent>;

	/** The controls the adapter built, in document order. */
	function builtControls(): HTMLElement[] {
		return [...fixture.nativeElement.querySelectorAll('deaf-input input, deaf-select select')] as HTMLElement[];
	}

	beforeEach(async () => {
		received.length = 0;

		await TestBed.configureTestingModule({
			imports: [HubTableComponent, BrowserAnimationsModule],
			providers: [
				provideHubPaginableFormControls(deafAdapter),
				{ provide: HubTranslationService, useClass: MockHubTranslationService },
				{ provide: HubPaginableService, useClass: MockPaginableService },
				{ provide: PaginableConfigService, useValue: { language: 'en', mapping: {} } }
			]
		}).compileComponents();

		fixture = TestBed.createComponent(HubTableComponent);
		fixture.componentRef.setInput('searchable', true);
		fixture.componentInstance.page.set(1);
		fixture.componentInstance.perPage.set(10);
		fixture.componentInstance.totalItems.set(25);
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();
	});

	it('asks the adapter for a label it can hide, not just for an aria string', () => {
		const search = received.find((config) => config.kind === 'input');

		expect(search, 'the search box was never built through the adapter').toBeDefined();
		expect(search!.label).toBeTruthy();
		expect(search!.labelType).toBe('visually-hidden');
	});

	it('names every control the adapter built, however deaf the adapter is', () => {
		const controls = builtControls();

		expect(controls.length).toBeGreaterThan(0);
		for (const control of controls) {
			expect(control.getAttribute('aria-label')?.trim(), `${control.tagName} was left anonymous`).toBeTruthy();
		}
	});

	it('leaves the name alone when the adapter set one itself', () => {
		const control = builtControls()[0];
		control.setAttribute('aria-label', 'named by the adapter');

		fixture.detectChanges();

		expect(control.getAttribute('aria-label')).toBe('named by the adapter');
	});

	it('never points the rows-per-page label at a control the adapter owns', () => {
		const label = fixture.nativeElement.querySelector('.hub-paginator__label') as HTMLElement | null;

		expect(label, 'the rows-per-page label is missing').not.toBeNull();
		expect(label!.getAttribute('for'), 'a `for` that reaches nothing names nothing').toBeNull();
	});
});
