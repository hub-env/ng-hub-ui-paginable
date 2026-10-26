import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, DestroyRef, Directive, ElementRef, inject, PLATFORM_ID } from '@angular/core';

/**
 * Positions sticky table columns with cumulative offsets so that **multiple**
 * columns can pin to the same side (start or end) without overlapping.
 *
 * `position: sticky` on its own pins every `.sticky-start` cell to `left: 0` and
 * every `.sticky-end` cell to `right: 0`, so two columns on the same side collapse
 * on top of each other. This directive measures the real rendered width of each
 * sticky column from the header row and gives each one an offset equal to the
 * combined width of the sticky columns that precede it on that side, writing that
 * offset onto every cell of the column (header, filter and body) matched by its
 * `data-col` key. One column per side keeps its `0` offset, so existing tables are
 * unchanged.
 *
 * Robust by design: it re-syncs on viewport / column resize (`ResizeObserver`) and
 * on row / column add-remove (`MutationObserver`), and is a no-op on the server.
 */
@Directive({
	selector: '[hubStickyColumns]',
	standalone: true
})
export class HubStickyColumnsDirective {
	private readonly _el = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly _platformId = inject(PLATFORM_ID);
	private readonly _destroyRef = inject(DestroyRef);

	private _resizeObserver?: ResizeObserver;
	private _mutationObserver?: MutationObserver;
	private _scheduled = false;

	constructor() {
		if (!isPlatformBrowser(this._platformId)) {
			return;
		}

		afterNextRender(() => {
			this._sync();

			const table = this._el.nativeElement;
			this._resizeObserver = new ResizeObserver(() => this._schedule());
			this._resizeObserver.observe(table);

			const headRow = table.querySelector('.hub-table__head-row');
			if (headRow) {
				this._resizeObserver.observe(headRow);
			}

			// Row / column additions and removals change the geometry too.
			this._mutationObserver = new MutationObserver(() => this._schedule());
			this._mutationObserver.observe(table, { childList: true, subtree: true });
		});

		this._destroyRef.onDestroy(() => {
			this._resizeObserver?.disconnect();
			this._mutationObserver?.disconnect();
		});
	}

	/** Coalesces bursts of observer callbacks into a single sync per animation frame. */
	private _schedule(): void {
		if (this._scheduled) {
			return;
		}

		this._scheduled = true;
		requestAnimationFrame(() => {
			this._scheduled = false;
			this._sync();
		});
	}

	/**
	 * Measures the sticky columns from the header row and writes each column's
	 * cumulative `left` / `right` offset onto every cell sharing its `data-col`.
	 */
	private _sync(): void {
		const table = this._el.nativeElement;
		const headRow = table.querySelector('.hub-table__head-row');

		if (!headRow) {
			return;
		}

		const cells = Array.from(headRow.children) as HTMLElement[];

		// A resized column changes the offsets of the sticky ones after it without changing the table's size.
		for (const cell of cells) {
			this._resizeObserver?.observe(cell);
		}

		// Start side — accumulate widths left → right.
		let leftOffset = 0;
		for (const cell of cells) {
			if (cell.classList.contains('sticky-start')) {
				this._applyOffset(table, cell.dataset['col'], 'left', leftOffset);
				leftOffset += cell.getBoundingClientRect().width;
			}
		}

		// End side — accumulate widths right → left.
		let rightOffset = 0;
		for (let index = cells.length - 1; index >= 0; index--) {
			const cell = cells[index];
			if (cell.classList.contains('sticky-end')) {
				this._applyOffset(table, cell.dataset['col'], 'right', rightOffset);
				rightOffset += cell.getBoundingClientRect().width;
			}
		}
	}

	/** Writes `<side>: <px>px` on every cell (header / filter / body) with the given `data-col`. */
	private _applyOffset(table: HTMLElement, col: string | undefined, side: 'left' | 'right', px: number): void {
		if (!col) {
			return;
		}

		const value = `${px}px`;
		const targets = table.querySelectorAll<HTMLElement>(`[data-col="${CSS.escape(col)}"]`);

		for (const cell of Array.from(targets)) {
			cell.style[side] = value;
		}
	}
}
