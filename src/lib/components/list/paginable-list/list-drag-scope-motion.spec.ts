import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject } from 'rxjs';

import { HubListComponent } from './list.component';

class MockHubTranslationService {
	readonly translationObserver = new Subject<any>().asObservable();
	getTranslation(key: string) {
		return key;
	}
	setTranslations() {}
	initialize() {}
}

interface Row {
	id: number;
	label: string;
}

const rows = (prefix: string): Row[] => [1, 2, 3].map((id) => ({ id, label: `${prefix}${id}` }));

@Component({
	standalone: true,
	imports: [HubListComponent],
	template: `
		<hub-list id="a" [items]="a" bindLabel="label" [sortable]="true" dragGroup="board" />
		<hub-list id="b" [items]="b" bindLabel="label" [sortable]="true" dragGroup="board" />
		<hub-list id="c" [items]="c" bindLabel="label" [sortable]="true" dragGroup="other" />
		<hub-list id="d" [items]="d" bindLabel="label" [sortable]="true" />
	`
})
class Host {
	a = rows('A');
	b = rows('B');
	c = rows('C');
	d = rows('D');
}

/** Dispatches a bubbling event carrying the extra fields the handlers read. */
function fire(target: Element, type: string, extra: Record<string, unknown> = {}): void {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.assign(event, { clientX: 0, clientY: 0, ...extra });
	target.dispatchEvent(event);
}

/**
 * While a card is dragged, only the lists that can receive it light up. Highlighting every list on
 * the page would invite drops the service then refuses, so the host class follows `canDrop`: the
 * list the drag started in and any list sharing its `dragGroup`, and nothing else.
 */
describe('list drag scope', () => {
	let fixture: ComponentFixture<Host>;

	const list = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
	const dragging = (id: string) => list(id).classList.contains('hub-list--dragging');
	const rowOf = (id: string, label: string) =>
		Array.from(list(id).querySelectorAll<HTMLElement>('.hub-list__item')).find((li) => li.textContent?.includes(label))!;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [Host],
			providers: [{ provide: HubTranslationService, useClass: MockHubTranslationService }]
		});
		fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
	});

	it('marks no list while nothing is dragged', () => {
		expect(['a', 'b', 'c', 'd'].map(dragging)).toEqual([false, false, false, false]);
	});

	it('marks the source list and its group, and leaves other groups and ungrouped lists alone', () => {
		const li = rowOf('a', 'A1');
		fire(li, 'pointerdown', { pointerType: 'mouse' });
		fire(li, 'dragstart');
		fixture.detectChanges();

		expect(dragging('a')).toBe(true);
		expect(dragging('b')).toBe(true);
		expect(dragging('c')).toBe(false);
		expect(dragging('d')).toBe(false);
	});

	it('never marks an ungrouped list other than the source, even when the source has no group', () => {
		const li = rowOf('d', 'D1');
		fire(li, 'pointerdown', { pointerType: 'mouse' });
		fire(li, 'dragstart');
		fixture.detectChanges();

		expect(dragging('d')).toBe(true);
		expect(['a', 'b', 'c'].map(dragging)).toEqual([false, false, false]);
	});

	it('clears the mark when the drag ends', () => {
		const li = rowOf('a', 'A1');
		fire(li, 'pointerdown', { pointerType: 'mouse' });
		fire(li, 'dragstart');
		fixture.detectChanges();
		fire(li, 'dragend');
		fixture.detectChanges();

		expect(['a', 'b', 'c', 'd'].map(dragging)).toEqual([false, false, false, false]);
	});
});

/**
 * The slide that eases rows into their new slot is a nicety: it must never break a drag where the
 * Web Animations API is missing (jsdom, old engines), only a render caused by a drag may animate,
 * and the system's reduced-motion preference silences it.
 */
describe('list row slide', () => {
	let fixture: ComponentFixture<HubListComponent<Row>>;
	let animate: ReturnType<typeof vi.fn>;
	/** Extra vertical offset per row label, read by the stubbed layout. */
	const shift = new Map<string, number>();
	const originalRect = Element.prototype.getBoundingClientRect;
	const originalMatchMedia = window.matchMedia;

	const root = () => fixture.nativeElement as HTMLElement;
	const rowOf = (label: string) =>
		Array.from(root().querySelectorAll<HTMLElement>('.hub-list__item')).find((li) => li.textContent?.includes(label))!;

	/** jsdom has no layout: rows sit 40px apart, plus whatever the test shifted. */
	function stubLayout(): void {
		Element.prototype.getBoundingClientRect = function (this: Element) {
			const label = this.classList?.contains('hub-list__item') ? (this.textContent ?? '').trim() : '';
			const siblings = this.parentElement ? Array.from(this.parentElement.children) : [];
			const top = this.classList?.contains('hub-list__item') ? siblings.indexOf(this) * 40 + (shift.get(label) ?? 0) : 0;
			return { left: 0, top, right: 0, bottom: top, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
		};
	}

	function stubAnimations(): void {
		animate = vi.fn(() => ({ id: '', cancel: () => {} }));
		(HTMLElement.prototype as any).animate = animate;
		(HTMLElement.prototype as any).getAnimations = () => [];
	}

	function create(): void {
		TestBed.configureTestingModule({
			imports: [HubListComponent],
			providers: [{ provide: HubTranslationService, useClass: MockHubTranslationService }]
		});
		fixture = TestBed.createComponent(HubListComponent<Row>);
		fixture.componentRef.setInput('bindLabel', 'label');
		fixture.componentRef.setInput('sortable', true);
		fixture.componentRef.setInput('items', rows('R'));
		fixture.detectChanges();
	}

	/** Starts a drag, lets the first render measure, then moves a row and renders again mid-drag. */
	function dragAndMoveRow(): void {
		const li = rowOf('R1');
		fire(li, 'pointerdown', { pointerType: 'mouse' });
		fire(li, 'dragstart');
		fixture.detectChanges();
		shift.set('R3', 40);
		fire(rowOf('R2'), 'dragover');
		fixture.detectChanges();
	}

	afterEach(() => {
		Element.prototype.getBoundingClientRect = originalRect;
		window.matchMedia = originalMatchMedia;
		delete (HTMLElement.prototype as any).animate;
		delete (HTMLElement.prototype as any).getAnimations;
		shift.clear();
	});

	it('does not throw where Element.animate does not exist', () => {
		create();
		expect(typeof (rowOf('R1') as any).animate).not.toBe('function');

		const li = rowOf('R1');
		expect(() => {
			fire(li, 'pointerdown', { pointerType: 'mouse' });
			fire(li, 'dragstart');
			fixture.detectChanges();
			fire(rowOf('R2'), 'dragover');
			fixture.detectChanges();
			fire(li, 'dragend');
			fixture.detectChanges();
		}).not.toThrow();
	});

	it('slides a row a drag has moved, under the shared animation id', () => {
		stubLayout();
		stubAnimations();
		create();

		dragAndMoveRow();

		expect(animate).toHaveBeenCalled();
		const [keyframes, options] = animate.mock.calls[0];
		expect(options.id).toBe('hub-list-row-slide');
		expect(keyframes[0].transform).toBe('translate(0px, -40px)');
		expect(keyframes[1].transform).toBe('none');
	});

	it('does not slide on the render that starts a drag, only measure', () => {
		stubLayout();
		stubAnimations();
		create();
		shift.set('R3', 40);

		const li = rowOf('R1');
		fire(li, 'pointerdown', { pointerType: 'mouse' });
		fire(li, 'dragstart');
		fixture.detectChanges();

		expect(animate).not.toHaveBeenCalled();
	});

	it('does not slide when the items change outside a drag', () => {
		stubLayout();
		stubAnimations();
		create();

		shift.set('R3', 40);
		fixture.componentRef.setInput('items', [...rows('R')].reverse());
		fixture.detectChanges();

		expect(animate).not.toHaveBeenCalled();
	});

	it('creates no animation when the user prefers reduced motion', () => {
		stubLayout();
		stubAnimations();
		window.matchMedia = ((query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query })) as any;
		create();

		dragAndMoveRow();

		expect(animate).not.toHaveBeenCalled();
	});
});
