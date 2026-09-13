import { DOCUMENT } from '@angular/common';
import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HubResizableDirective } from './resizable.directive';

/**
 * Test component for HubResizableDirective
 */
@Component({
	template: `
		<table>
			<thead>
				<tr>
					<th>
						<div resizable data-test="resizable-handle"></div>
						Column 1
					</th>
				</tr>
			</thead>
		</table>
	`,
	imports: [HubResizableDirective]
})
class TestResizableComponent {}

/**
 * Lets the drag stream react before the next step. Every step is awaited, so the
 * assertions run inside their test. They used to sit in nested `setTimeout` callbacks the
 * test never waited for: the test finished, the next one tore the fixture down, and a late
 * assertion on a destroyed directive failed as an unhandled error that broke the whole run
 * at random (it stopped the deploy of 2026-09-11 while CI on the same commit passed).
 */
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Test suite for HubResizableDirective
 * Tests column resizing functionality via mouse drag interactions
 */
describe('HubResizableDirective', () => {
	let component: TestResizableComponent;
	let fixture: ComponentFixture<TestResizableComponent>;
	let resizableElement: DebugElement;
	let directive: HubResizableDirective;
	let documentRef: Document;

	/** Presses the mouse on the handle at the given horizontal position. */
	const mouseDown = (clientX: number) =>
		resizableElement.nativeElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX }));

	/** Moves the mouse over the document to the given horizontal position. */
	const mouseMove = (clientX: number) =>
		documentRef.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX }));

	/** Releases the mouse, which ends the drag. */
	const mouseUp = () => documentRef.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [TestResizableComponent, HubResizableDirective]
		});

		fixture = TestBed.createComponent(TestResizableComponent);
		component = fixture.componentInstance;
		resizableElement = fixture.debugElement.query(By.css('[data-test="resizable-handle"]'));
		directive = resizableElement.injector.get(HubResizableDirective);
		documentRef = TestBed.inject(DOCUMENT);
		fixture.detectChanges();
	});

	it('should create an instance', () => {
		expect(directive).toBeTruthy();
	});

	it('should have resizable output observable', () => {
		expect(directive.resizable).toBeDefined();
		expect(directive.resizable.subscribe).toBeDefined();
	});

	describe('mousedown interaction', () => {
		it('should emit on mousedown and mousemove', async () => {
			let emittedValue: number | null = null;
			directive.resizable.subscribe((width) => {
				emittedValue = width;
			});

			mouseDown(100);
			await wait(50);
			mouseMove(150);
			await wait(50);

			expect(emittedValue).not.toBeNull();
			mouseUp();
		});

		it('should prevent default on mousedown', async () => {
			directive.resizable.subscribe(() => {});

			const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 100 });
			resizableElement.nativeElement.dispatchEvent(mouseDownEvent);
			await wait(10);

			// The directive calls preventDefault on the mousedown it starts a drag from.
			expect(mouseDownEvent.defaultPrevented).toBe(true);
			mouseUp();
		});

		it('should stop emitting after mouseup', async () => {
			let emissionCount = 0;
			directive.resizable.subscribe(() => {
				emissionCount++;
			});

			mouseDown(100);
			await wait(50);
			mouseMove(120);
			await wait(50);

			const beforeUpCount = emissionCount;
			mouseUp();
			await wait(50);
			mouseMove(150);
			await wait(50);

			expect(emissionCount).toBe(beforeUpCount);
		});

		it('should calculate width based on mouse movement', async () => {
			let calculatedWidth: number | null = null;
			directive.resizable.subscribe((width) => {
				calculatedWidth = width;
			});

			mouseDown(100);
			await wait(50);
			mouseMove(200);
			await wait(50);

			expect(typeof calculatedWidth).toBe('number');
			mouseUp();
		});

		it('should only emit distinct width values', async () => {
			const emittedValues: number[] = [];
			directive.resizable.subscribe((width) => {
				emittedValues.push(width);
			});

			mouseDown(100);
			await wait(50);
			// The same position three times: one width, emitted once.
			mouseMove(150);
			mouseMove(150);
			mouseMove(150);
			await wait(100);

			expect(emittedValues.length).toBe(new Set(emittedValues).size);
			mouseUp();
		});
	});

	describe('edge cases', () => {
		it('should handle rapid mousedown events', async () => {
			directive.resizable.subscribe(() => {});

			expect(() => {
				mouseDown(100);
				mouseDown(110);
				mouseDown(120);
			}).not.toThrow();

			await wait(100);
			mouseUp();
		});
	});
});
