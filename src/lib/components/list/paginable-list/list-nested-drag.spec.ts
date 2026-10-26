import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { Subject } from 'rxjs';

import { HubListComponent } from './list.component';

/**
 * Drag and drop in a two-level tree: modules holding lessons, as a course outline draws them.
 *
 * Three things broke it. Rows named their children anything but `children` and the list built
 * them but never drew them. A hover over a nested collection's own box — the drop placeholder
 * lets pointer events through to it — reached the parent row, which took the drop for the
 * root level. And a parent with no children drew no collection, so nothing could be dropped
 * into it.
 */

interface Node {
	id: number;
	label: string;
	lessons?: Node[];
}

class MockHubTranslationService {
	readonly translationObserver = new Subject<any>().asObservable();
	getTranslation(key: string) {
		return key;
	}
	setTranslations() {}
	initialize() {}
}

/** Dispatches a bubbling event carrying the extra fields the handlers read. */
function fire(target: Element, type: string, extra: Record<string, unknown> = {}): void {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.assign(event, { clientX: 0, clientY: 0, ...extra });
	target.dispatchEvent(event);
}

describe('list nested drag', () => {
	let fixture: ComponentFixture<HubListComponent<Node>>;
	const sorted: any[] = [];

	const root = (): HTMLElement => fixture.nativeElement;
	const nestedLists = () => Array.from(root().querySelectorAll<HTMLElement>('.hub-list__items:not(.hub-list__items--root)'));
	const rowOf = (label: string) =>
		Array.from(root().querySelectorAll<HTMLElement>('.hub-list__item')).find((li) =>
			li.querySelector(':scope > .hub-list__item-content')?.textContent?.includes(label)
		)!;
	const dragService = () => (fixture.componentInstance as any).dragService;

	/** Arms and starts a native drag of a row the way a mouse does: press, then dragstart. */
	function pickUp(label: string): void {
		const li = rowOf(label);
		fire(li, 'pointerdown', { pointerType: 'mouse' });
		fire(li, 'dragstart');
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HubListComponent],
			providers: [{ provide: HubTranslationService, useClass: MockHubTranslationService }]
		});
		sorted.length = 0;
		fixture = TestBed.createComponent(HubListComponent<Node>);
		fixture.componentRef.setInput('bindLabel', 'label');
		fixture.componentRef.setInput('bindChildren', 'lessons');
		fixture.componentRef.setInput('sortable', true);
		fixture.componentRef.setInput('options', { collapsed: false });
		fixture.componentRef.setInput('items', [
			{
				id: 1,
				label: 'Unit one',
				lessons: [
					{ id: 11, label: 'Lesson A' },
					{ id: 12, label: 'Lesson B' }
				]
			},
			{ id: 2, label: 'Unit two', lessons: [] }
		]);
		fixture.componentInstance.sorted.subscribe((event) => sorted.push(event));
		fixture.detectChanges();
	});

	it('draws the children of a custom bindChildren key', () => {
		expect(rowOf('Lesson A')).toBeTruthy();
		expect(rowOf('Lesson B')).toBeTruthy();
	});

	it('keeps an empty collection under a parent while sortable, and none under a leaf', () => {
		expect(nestedLists().length).toBe(2);
		expect(nestedLists()[1].querySelectorAll('.hub-list__item').length).toBe(0);

		fixture.componentRef.setInput('sortable', false);
		fixture.detectChanges();
		expect(nestedLists().length).toBe(1);
	});

	it('does not let the parent row take a hover over its nested collection', () => {
		pickUp('Lesson B');
		fire(rowOf('Lesson A'), 'dragover');
		expect(dragService().target().container.depth).toBe(1);

		fire(nestedLists()[0], 'dragover');
		expect(dragService().target().container.depth).toBe(1);
	});

	it('refuses a lesson among the modules when canDropInto keeps the levels apart', () => {
		fixture.componentRef.setInput(
			'canDropInto',
			(item: Node, parent: Node | null) => 'lessons' in item === (parent === null)
		);
		fixture.detectChanges();
		pickUp('Lesson B');
		fire(rowOf('Lesson A'), 'dragover');
		expect(dragService().target().container.depth).toBe(1);
		const unitTwo = rowOf('Unit two').querySelector('.hub-list__item-content')!;
		fire(unitTwo, 'dragover');
		fire(unitTwo, 'drop');

		expect(dragService().target()).toBeNull();
		fixture.detectChanges();
		expect(root().querySelectorAll('.hub-list__placeholder').length).toBe(0);
		expect(sorted.length).toBe(0);
	});

	it('lets an outer collection that refuses the item leave a nested drop alone', () => {
		fixture.componentRef.setInput(
			'canDropInto',
			(item: Node, parent: Node | null) => 'lessons' in item === (parent === null)
		);
		fixture.detectChanges();
		pickUp('Lesson B');
		const over = new Event('dragover', { bubbles: true, cancelable: true });
		const dataTransfer = { dropEffect: 'none' };
		Object.assign(over, { clientX: 0, clientY: 0, dataTransfer });
		rowOf('Lesson A').dispatchEvent(over);

		expect(over.defaultPrevented).toBe(true);
		expect(dataTransfer.dropEffect).toBe('move');
		expect(dragService().target().container.depth).toBe(1);
	});

	it('still takes the lesson into another module under the same rule', () => {
		fixture.componentRef.setInput(
			'canDropInto',
			(item: Node, parent: Node | null) => 'lessons' in item === (parent === null)
		);
		fixture.detectChanges();
		pickUp('Lesson A');
		fixture.detectChanges();
		const empty = nestedLists()[1];
		fire(empty, 'dragover');
		fire(empty, 'drop');

		expect(sorted.length).toBe(1);
		expect(sorted[0].parentItem.label).toBe('Unit two');
	});

	it('keeps the drop slot of an empty module closed while a module is dragged', () => {
		fixture.componentRef.setInput(
			'canDropInto',
			(item: Node, parent: Node | null) => 'lessons' in item === (parent === null)
		);
		fixture.detectChanges();

		pickUp('Unit one');
		fixture.detectChanges();
		expect(nestedLists()[1].classList).toContain('hub-list__items--refused');
		fire(rowOf('Unit one'), 'dragend');
		fixture.detectChanges();

		pickUp('Lesson A');
		fixture.detectChanges();
		expect(nestedLists()[1].classList).not.toContain('hub-list__items--refused');
	});

	it('drops a lesson into a module that has none', () => {
		pickUp('Lesson A');
		fixture.detectChanges();
		const empty = nestedLists()[1];
		fire(empty, 'dragover');
		fire(empty, 'drop');

		expect(sorted.length).toBe(1);
		expect(sorted[0].parentItem.label).toBe('Unit two');
		expect(sorted[0].items.map((item: Node) => item.label)).toEqual(['Lesson A']);
		expect(sorted[0].isTransfer).toBe(true);
	});
});
