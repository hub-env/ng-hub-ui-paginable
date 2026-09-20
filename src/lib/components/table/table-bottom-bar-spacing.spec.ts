import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { HubTableComponent } from './table.component';

/** Minimal translation service stand-in so the standalone component can render. */
class MockHubTranslationService {
	private source = new Subject<unknown>();
	translationObserver = this.source.asObservable();
	getTranslation(key: string) {
		return key;
	}
	setTranslations() {}
	initialize() {}
}

/**
 * The paging bar used to sit flush against the grid and against its own edges: the paginator
 * touched the left border, the row count the right one, and nothing separated the band from the
 * last row. `space-around` distributes the free space between the items and leaves none outside
 * them, so the gutter has to be padding.
 *
 * jsdom performs no layout, but it resolves the cascade, which is what is under test. The declared
 * value is asserted rather than a pixel count — these are variable slots, and a number would only
 * pin today's default.
 */
describe('HubTableComponent bottom bar spacing', () => {
	let fixture: ComponentFixture<HubTableComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HubTableComponent, BrowserAnimationsModule],
			providers: [{ provide: HubTranslationService, useClass: MockHubTranslationService }]
		}).compileComponents();

		fixture = TestBed.createComponent(HubTableComponent);
		fixture.componentInstance.page.set(1);
		fixture.componentInstance.perPage.set(10);
		fixture.componentInstance.totalItems.set(25);
	});

	it('keeps a gutter at the sides, so nothing sits against the edge', () => {
		fixture.detectChanges();

		const bar = fixture.nativeElement.querySelector('.hub-table__bottom-bar')!;
		const style = getComputedStyle(bar);

		expect(style.paddingInline).toBe('var(--hub-table-bottom-bar-padding-inline)');
		expect(style.paddingBlock).toBe('var(--hub-table-bottom-bar-padding-block)');
	});

	it('pushes each bar away from the grid it belongs to, whichever side it is on', () => {
		fixture.componentRef.setInput('paginationPosition', 'both');
		fixture.detectChanges();

		const top = fixture.nativeElement.querySelector('.hub-table__bottom-bar--top')!;
		const bottom = fixture.nativeElement.querySelector('.hub-table__bottom-bar--bottom')!;

		// The bar above separates itself downwards and the one below upwards: a single
		// margin-top would leave the top bar glued to the header row.
		expect(getComputedStyle(top).marginBlockEnd).toBe('var(--hub-table-bottom-bar-spacing)');
		expect(getComputedStyle(bottom).marginBlockStart).toBe('var(--hub-table-bottom-bar-spacing)');
	});
});
