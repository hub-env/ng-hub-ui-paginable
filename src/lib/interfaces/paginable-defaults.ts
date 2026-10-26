/**
 * Application-wide default values for the paginable components.
 *
 * Every field maps to a component `@Input` and is applied unless that instance
 * overrides it locally. Register these through the library provider:
 *
 * ```ts
 * import { providePaginable } from 'ng-hub-ui-paginable';
 *
 * providers: [
 *   providePaginable({
 *     defaults: {
 *       paginate: true,
 *       perPage: 25,
 *       perPageOptions: [25, 50, 100]
 *     }
 *   })
 * ];
 * ```
 */
export interface PaginableDefaults {
	/**
	 * Default for the `paginate` input. When unset, the table falls back to `true`
	 * (automatic client-side pagination for plain arrays) and the list to `false`.
	 */
	paginate?: boolean;

	/** Default page size (`perPage`). */
	perPage?: number;

	/** Default selectable page sizes (`perPageOptions`). */
	perPageOptions?: number[];

	/** Default position of the table's pagination controls (`paginationPosition`). */
	paginationPosition?: 'bottom' | 'top' | 'both';

	/** Whether the table's "showing X of Y" info line is shown (`paginationInfo`). */
	paginationInfo?: boolean;

	/** Whether the table renders its global search box (`searchable`). */
	searchable?: boolean;

	/** Debounce in milliseconds for the table's search / filter changes (`debounce`). */
	debounce?: number;

	/** Whether the table's columns can be resized by default (`resizableColumns`). */
	resizableColumns?: boolean;
}
