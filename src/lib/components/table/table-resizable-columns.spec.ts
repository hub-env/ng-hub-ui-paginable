import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject } from 'rxjs';

import { PaginableColumnResizeEvent, PaginableTableHeader } from '../../interfaces/paginable-table-header';
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

const ROWS = [
	{ id: 1, name: 'Ada', city: 'London' },
	{ id: 2, name: 'Grace', city: 'New York' }
];

@Component({
	standalone: true,
	imports: [HubTableComponent],
	template: `
		<hub-table
			[(headers)]="headers"
			[data]="rows"
			[resizableColumns]="resizable()"
			[options]="options()"
			(columnResize)="events.push($event)"
		/>
	`
})
class Host {
	readonly rows = ROWS;
	readonly resizable = signal(true);
	readonly options = signal<any>({});
	readonly events: PaginableColumnResizeEvent[] = [];
	headers: (string | PaginableTableHeader)[] = [
		{ title: 'Name', property: 'name', width: 200, minWidth: 100, maxWidth: 400 },
		{ title: 'City', property: 'city', width: 150 }
	];
}

/**
 * Resizable columns: the handle, the fixed layout it needs and the way each step is written back
 * into the `headers` model. Widths live in the model, not in the painted cell, so a held key
 * keeps accumulating before the next render and the host always receives the definition it can persist.
 */
describe('table resizable columns', () => {
	let fixture: ComponentFixture<Host>;

	const el = (): HTMLElement => fixture.nativeElement;
	const handles = () => Array.from(el().querySelectorAll<HTMLElement>('.hub-table__resize-handle'));
	const cols = () => Array.from(el().querySelectorAll<HTMLElement>('colgroup > col'));
	const table = () => el().querySelector('table.hub-table__element, .hub-table__element') as HTMLElement;
	const press = (target: HTMLElement, key: string, init: KeyboardEventInit = {}) =>
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
	const widths = () => (fixture.componentInstance.headers as PaginableTableHeader[]).map((header) => header.width);

	async function create(setup?: (host: Host) => void): Promise<void> {
		await TestBed.configureTestingModule({
			imports: [Host, BrowserAnimationsModule],
			providers: [
				{ provide: HubTranslationService, useClass: MockHubTranslationService },
				{ provide: HubPaginableService, useClass: MockPaginableService },
				{ provide: PaginableConfigService, useValue: { language: 'en', mapping: {} } }
			]
		}).compileComponents();
		fixture = TestBed.createComponent(Host);
		setup?.(fixture.componentInstance);
		fixture.detectChanges();
	}

	describe('layout and handles', () => {
		it('draws a colgroup, the fixed layout class and one handle per column', async () => {
			await create();

			expect(table().classList).toContain('hub-table__element--fixed-layout');
			expect(cols().length).toBe(2);
			expect(handles().length).toBe(2);
		});

		it('exposes the separator semantics and a named, bounded value', async () => {
			await create();
			const [name, city] = handles();

			expect(name.getAttribute('role')).toBe('separator');
			expect(name.getAttribute('aria-orientation')).toBe('vertical');
			expect(name.getAttribute('aria-valuenow')).toBe('200');
			expect(name.getAttribute('aria-valuemin')).toBe('100');
			expect(name.getAttribute('aria-valuemax')).toBe('400');
			expect(name.getAttribute('aria-label')?.toLowerCase()).toContain('resize_column');
			expect(city.getAttribute('aria-valuemin')).toBe('48');
			expect(city.hasAttribute('aria-valuemax')).toBe(false);
		});

		it('draws no handle and no fixed layout when resizing is off and no width is declared', async () => {
			await create((host) => {
				host.resizable.set(false);
				host.headers = [{ title: 'Name', property: 'name' }, 'city'];
			});

			expect(handles().length).toBe(0);
			expect(cols().length).toBe(0);
			expect(table().classList).not.toContain('hub-table__element--fixed-layout');
		});

		it('keeps the fixed layout but no handle when only a width is declared', async () => {
			await create((host) => {
				host.resizable.set(false);
			});

			expect(table().classList).toContain('hub-table__element--fixed-layout');
			expect(cols().length).toBe(2);
			expect(handles().length).toBe(0);
		});

		it('lets a column opt out, and never gives one to a buttons-only column', async () => {
			await create((host) => {
				host.headers = [
					{ title: 'Name', property: 'name', resizable: false },
					{ title: 'City', property: 'city' },
					{ title: '', property: 'actions', onlyButtons: true }
				];
			});

			expect(handles().length).toBe(1);
		});

		it('lets a column opt in while the table is off', async () => {
			await create((host) => {
				host.resizable.set(false);
				host.headers = [
					{ title: 'Name', property: 'name', resizable: true },
					{ title: 'City', property: 'city' }
				];
			});

			expect(handles().length).toBe(1);
		});

		it('writes numeric widths clamped to their bounds and passes CSS strings through', async () => {
			await create((host) => {
				host.headers = [
					{ title: 'Name', property: 'name', width: 20, minWidth: 100 },
					{ title: 'City', property: 'city', width: 900, maxWidth: 300 },
					{ title: 'Id', property: 'id', width: '12rem' }
				];
			});

			expect(cols().map((col) => col.style.width)).toEqual(['100px', '300px', '12rem']);
		});

		it('does not sort when the handle is pressed', async () => {
			await create((host) => {
				host.headers = [{ title: 'Name', property: 'name', width: 200, sortable: true } as PaginableTableHeader];
			});
			const handle = handles()[0];
			handle.setPointerCapture = () => {};
			const down = new Event('pointerdown', { bubbles: true, cancelable: true });
			Object.assign(down, { button: 0, pointerId: 1, clientX: 0 });
			handle.getBoundingClientRect = () => ({ width: 200 }) as DOMRect;
			handle.closest('th')!.getBoundingClientRect = () => ({ width: 200 }) as DOMRect;
			const clicks: Event[] = [];
			handle.closest('th')!.addEventListener('click', (event) => clicks.push(event));

			handle.dispatchEvent(down);
			handle.click();
			fixture.detectChanges();

			expect(down.defaultPrevented).toBe(true);
			expect(clicks.length).toBe(0);
			expect(el().querySelector('.hub-table__sort-icon--active, [aria-sort="ascending"]')).toBeNull();
		});
	});

	describe('pointer', () => {
		const pointer = (target: HTMLElement, type: string, clientX: number) => {
			const event = new Event(type, { bubbles: true, cancelable: true });
			Object.assign(event, { button: 0, pointerId: 1, clientX });
			target.dispatchEvent(event);
		};

		function arm(): HTMLElement {
			const handle = handles()[0];
			handle.setPointerCapture = () => {};
			handle.closest('th')!.getBoundingClientRect = () => ({ width: 200 }) as DOMRect;
			return handle;
		}

		it('previews while dragging and emits once on release', async () => {
			await create();
			const handle = arm();

			pointer(handle, 'pointerdown', 100);
			pointer(handle, 'pointermove', 130);
			fixture.detectChanges();
			expect(cols()[0].style.width).toBe('230px');
			expect(widths()[0]).toBe(200);
			expect(fixture.componentInstance.events.length).toBe(0);

			pointer(handle, 'pointerup', 130);
			fixture.detectChanges();
			expect(widths()[0]).toBe(230);
			expect(fixture.componentInstance.events.length).toBe(1);
			expect(fixture.componentInstance.events[0]).toEqual(expect.objectContaining({ width: 230, previousWidth: 200 }));
		});

		it('clamps the drag to the bounds and abandons a cancelled gesture', async () => {
			await create();
			const handle = arm();

			pointer(handle, 'pointerdown', 100);
			pointer(handle, 'pointermove', 1000);
			fixture.detectChanges();
			expect(cols()[0].style.width).toBe('400px');

			pointer(handle, 'pointercancel', 1000);
			fixture.detectChanges();
			expect(widths()[0]).toBe(200);
			expect(cols()[0].style.width).toBe('200px');
			expect(fixture.componentInstance.events.length).toBe(0);
		});
	});

	describe('keyboard', () => {
		it('moves 10px with the arrows, 50px with Shift, and emits one event per step', async () => {
			await create();
			const handle = handles()[0];

			press(handle, 'ArrowRight');
			expect(widths()[0]).toBe(210);
			press(handle, 'ArrowLeft', { shiftKey: true });
			expect(widths()[0]).toBe(160);

			const events = fixture.componentInstance.events;
			expect(events.length).toBe(2);
			expect(events[0]).toEqual(expect.objectContaining({ property: 'name', width: 210, previousWidth: 200 }));
			expect(events[0].header.width).toBe(210);
			expect(events[1]).toEqual(expect.objectContaining({ width: 160, previousWidth: 210 }));
		});

		it('accumulates presses made without a render in between', async () => {
			await create();
			const handle = handles()[0];

			press(handle, 'ArrowRight');
			press(handle, 'ArrowRight');
			press(handle, 'ArrowRight');

			expect(widths()[0]).toBe(230);
			expect(fixture.componentInstance.events.map((event) => event.width)).toEqual([210, 220, 230]);
		});

		it('jumps to the bounds with Home and End and stops at them', async () => {
			await create();
			const handle = handles()[0];

			press(handle, 'Home');
			expect(widths()[0]).toBe(100);
			press(handle, 'ArrowLeft');
			expect(widths()[0]).toBe(100);
			press(handle, 'End');
			expect(widths()[0]).toBe(400);
			press(handle, 'ArrowRight', { shiftKey: true });
			expect(widths()[0]).toBe(400);

			expect(fixture.componentInstance.events.map((event) => event.width)).toEqual([100, 400]);
		});

		it('does not emit or swallow keys it does not handle', async () => {
			await create();
			const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
			handles()[0].dispatchEvent(event);

			expect(event.defaultPrevented).toBe(false);
			expect(fixture.componentInstance.events.length).toBe(0);
		});

		it('mirrors the arrows when the table is right to left', async () => {
			await create((host) => host.options.set({ rtl: true }));
			const handle = handles()[0];

			press(handle, 'ArrowRight');
			expect(widths()[0]).toBe(190);
			press(handle, 'ArrowLeft');
			press(handle, 'ArrowLeft');
			expect(widths()[0]).toBe(210);
		});

		it('turns a string header into an object carrying the new width', async () => {
			await create((host) => {
				host.headers = ['name', { title: 'City', property: 'city', width: 150 }];
			});
			const handle = handles()[0];
			handle.closest('th')!.getBoundingClientRect = () => ({ width: 120 }) as DOMRect;

			press(handle, 'ArrowRight');

			expect(fixture.componentInstance.headers[0]).toEqual({ title: 'name', property: 'name', width: 130 });
			expect(fixture.componentInstance.events[0]).toEqual(
				expect.objectContaining({ property: 'name', width: 130, previousWidth: 120 })
			);
		});

		it('measures the cell when the header declares no width', async () => {
			await create((host) => {
				host.headers = [{ title: 'Name', property: 'name' }];
			});
			const handle = handles()[0];
			handle.closest('th')!.getBoundingClientRect = () => ({ width: 90 }) as DOMRect;

			press(handle, 'ArrowRight');
			press(handle, 'ArrowRight');

			expect(widths()[0]).toBe(110);
		});
	});
});
