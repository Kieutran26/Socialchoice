/**
 * @typedef {Record<string, any>} EntityRecord
 * @typedef {{value: string, label: string}} Choice
 * @typedef {{key: string, label: string, type?: string, required?: boolean, min?: number, max?: number, options?: Choice[] | ((values: EntityRecord) => Choice[]), reset?: (value: string, previous: EntityRecord) => EntityRecord}} FormField
 * @typedef {{open: boolean, onOpenChange: (open: boolean) => void, initial?: EntityRecord, onSubmit: (values: EntityRecord) => Promise<void> | void}} FormProps
 * @typedef {FormProps & {defaults: EntityRecord, fields: FormField[], title: string, description?: string}} EntityFormProps
 * @typedef {FormProps & {brands: EntityRecord[], defaultBrandId?: string, title?: string, description?: string, submitLabel?: string}} BrandScopedFormProps
 * @typedef {{filters: Record<string, string>, setFilters: (filters: any) => void, pillars?: EntityRecord[], angles?: EntityRecord[], accounts?: EntityRecord[]}} FilterProps
 * @typedef {{posts: EntityRecord[], brands?: EntityRecord[], pillars?: EntityRecord[], angles?: EntityRecord[], accounts?: EntityRecord[], timezone?: string, displayTimezone?: string, selected?: string[], onSelect?: (ids: string[]) => void, onOpen: (post: EntityRecord) => void}} PostTableProps
 */
export {};
