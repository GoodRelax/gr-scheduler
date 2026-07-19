/**
 * UseCase layer: JSON codec for the ScheduleDocument aggregate (IO-L1-001,
 * ARCH-C-017, DATA-JSON-001..013). Pure serialize/deserialize with no DOM or I/O.
 *
 * Export produces the canonical JSON representation of the whole document,
 * including imported icon `assets[]` (DATA-JSON-013), so that a re-import restores
 * the document byte-for-meaning (round-trip fidelity, IO-L1-001).
 *
 * Import is defence-in-depth: it runs the untrusted text through the import
 * sanitizer (prototype-pollution guard + depth/size limits), applies staged
 * schemaVersion migration (DATA-JSON-001), and finally a strict validator that
 * rejects wrong-typed or newer/unknown documents rather than coercing them.
 */

import type {
  AnchorIndex,
  DeclaredCategory,
  Dependency,
  ImportedAsset,
  ScheduleDocument,
  ScheduleItem,
  Section,
  Row,
} from '../model/schedule-model.js';
import {
  ImportRejectedError,
  IMPORT_LIMITS,
  assertJsonDepth,
  assertWithinByteLimit,
  safeJsonParse,
} from './import-sanitizer.js';
import { isValidColorValue } from './color-validator.js';
import { classificationImportError } from './classification-tree.js';
import { toDayNumber } from './time-coordinate-mapper.js';

/** The schema version this build writes and migrates up to (DATA-JSON-001). */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Serialize a ScheduleDocument to canonical JSON text (IO-L1-001). Emits every
 * field, including `assets[]`, so imported icons survive a round-trip.
 *
 * @param document - The document to serialize.
 * @param pretty - When true, indents for human readability (default false).
 * @returns The JSON text.
 */
export function serializeScheduleDocument(document: ScheduleDocument, pretty = false): string {
  const normalized: ScheduleDocument = {
    ...document,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  return JSON.stringify(normalized, null, pretty ? 2 : 0);
}

/** A raw parsed object indexable by string key (post prototype-guard). */
type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * One migration step upgrading a document from `version` to `version + 1`.
 * Registered by the source version index.
 */
type Migrator = (raw: RawRecord) => RawRecord;

/**
 * Staged migrations keyed by source version (DATA-JSON-001). Version 0 predates
 * the imported-asset array and optional collections, so the 0 -> 1 step
 * back-fills them to their empty defaults.
 */
const MIGRATIONS: Readonly<Record<number, Migrator>> = {
  0: (raw) => ({
    ...raw,
    dependencies: Array.isArray(raw['dependencies']) ? raw['dependencies'] : [],
    annotations: Array.isArray(raw['annotations']) ? raw['annotations'] : [],
    assets: Array.isArray(raw['assets']) ? raw['assets'] : [],
  }),
};

/**
 * Apply staged migrations until the document reaches CURRENT_SCHEMA_VERSION
 * (DATA-JSON-001). Rejects unknown/non-integer versions, newer-than-current
 * versions, and versions with no migration path.
 */
function migrateToCurrent(raw: RawRecord): RawRecord {
  const rawVersion = raw['schemaVersion'];
  if (typeof rawVersion !== 'number' || !Number.isInteger(rawVersion) || rawVersion < 0) {
    throw new ImportRejectedError(
      `Unknown or missing schemaVersion; expected an integer up to ${CURRENT_SCHEMA_VERSION}`,
    );
  }
  if (rawVersion > CURRENT_SCHEMA_VERSION) {
    throw new ImportRejectedError(
      `Document schemaVersion ${rawVersion} is newer than this build (${CURRENT_SCHEMA_VERSION}); cannot import`,
    );
  }
  let version = rawVersion;
  let current = raw;
  while (version < CURRENT_SCHEMA_VERSION) {
    const migrator = MIGRATIONS[version];
    if (migrator === undefined) {
      throw new ImportRejectedError(`No migration path from schemaVersion ${version}`);
    }
    current = { ...migrator(current), schemaVersion: version + 1 };
    version += 1;
  }
  return current;
}

// ---------------------------------------------------------------------------
// Strict validation (security-design C-05: reject, never coerce)
// ---------------------------------------------------------------------------

function fail(path: string, expectation: string): never {
  throw new ImportRejectedError(`Invalid schedule document: ${path} ${expectation}`);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    fail(path, 'must be a string');
  }
  return value;
}

/**
 * Validate a color field against the C-02 allowlist (security-design §3.1, M5a
 * review M-3). Rejects `url(...)` paint references, `expression(...)` and other
 * non-literal color tokens so a shared/exported SVG can never fetch an external
 * paint resource.
 */
function requireColor(value: unknown, path: string): string {
  const text = requireString(value, path);
  if (!isValidColorValue(text)) {
    fail(path, 'must be a hex / rgb() / palette color (external paint refs rejected)');
  }
  return text;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, 'must be a finite number');
  }
  return value;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(path, 'must be an array');
  }
  return value;
}

const ITEM_KINDS = new Set(['milestone', 'task']);

function validateItem(value: unknown, index: number): ScheduleItem {
  if (!isRecord(value)) {
    fail(`items[${index}]`, 'must be an object');
  }
  requireString(value['id'], `items[${index}].id`);
  requireString(value['rowId'], `items[${index}].rowId`);
  const itemKind = requireString(value['itemKind'], `items[${index}].itemKind`);
  if (!ITEM_KINDS.has(itemKind)) {
    fail(`items[${index}].itemKind`, "must be 'milestone' or 'task'");
  }
  requireString(value['startDate'], `items[${index}].startDate`);
  const endDate = value['endDate'];
  if (endDate !== null && typeof endDate !== 'string') {
    fail(`items[${index}].endDate`, 'must be a string or null');
  }
  requireString(value['abbrev'], `items[${index}].abbrev`);
  requireNumber(value['importance'], `items[${index}].importance`);
  requireColor(value['fillColor'], `items[${index}].fillColor`);
  requireColor(value['strokeColor'], `items[${index}].strokeColor`);
  validateFadeFields(value, itemKind, endDate, requireString(value['startDate'], `items[${index}].startDate`), index);
  // Classification integrity (SECT rework): reject a minor without a middle, and
  // any middle/minor without a major, so an imported tree is always well formed.
  const classificationError = classificationImportError(value as unknown as ScheduleItem);
  if (classificationError !== null) {
    fail(`items[${index}]`, classificationError);
  }
  // Deep structure (optional property set) is preserved verbatim after the
  // required-field gate; unknown keys are retained for round-trip fidelity.
  return value as unknown as ScheduleItem;
}

/**
 * Validate a task's optional fade taper fields (ITEM fade cross-fade). Each side
 * must be a finite, non-negative number and their sum must not exceed the task's
 * day length, so an imported bar can never have a self-crossing (inverted) top
 * edge. Milestones must not carry fade at all (tasks-only). Absent fields are
 * valid (a square-edged bar).
 */
function validateFadeFields(
  value: RawRecord,
  itemKind: string,
  endDate: unknown,
  startDate: string,
  index: number,
): void {
  const fadeIn = value['fadeInDays'];
  const fadeOut = value['fadeOutDays'];
  if (fadeIn === undefined && fadeOut === undefined) {
    return;
  }
  if (itemKind !== 'task') {
    fail(`items[${index}]`, 'fadeInDays/fadeOutDays are only valid on a task');
  }
  const resolvedIn = fadeIn === undefined ? 0 : requireNumber(fadeIn, `items[${index}].fadeInDays`);
  const resolvedOut = fadeOut === undefined ? 0 : requireNumber(fadeOut, `items[${index}].fadeOutDays`);
  if (resolvedIn < 0) {
    fail(`items[${index}].fadeInDays`, 'must be >= 0');
  }
  if (resolvedOut < 0) {
    fail(`items[${index}].fadeOutDays`, 'must be >= 0');
  }
  if (typeof endDate !== 'string') {
    fail(`items[${index}]`, 'a faded task must have an endDate');
  }
  const lengthDays = toDayNumber(endDate) - toDayNumber(startDate);
  if (resolvedIn + resolvedOut > lengthDays) {
    fail(
      `items[${index}]`,
      `fadeInDays + fadeOutDays (${resolvedIn + resolvedOut}) must not exceed the task length (${lengthDays} days)`,
    );
  }
}

function isAnchorIndex(value: unknown): value is AnchorIndex {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 8;
}

function validateDependency(value: unknown, index: number): Dependency {
  if (!isRecord(value)) {
    fail(`dependencies[${index}]`, 'must be an object');
  }
  requireString(value['id'], `dependencies[${index}].id`);
  requireString(value['fromItemId'], `dependencies[${index}].fromItemId`);
  requireString(value['toItemId'], `dependencies[${index}].toItemId`);
  if (!isAnchorIndex(value['fromAnchor'])) {
    fail(`dependencies[${index}].fromAnchor`, 'must be an integer 0..8');
  }
  if (!isAnchorIndex(value['toAnchor'])) {
    fail(`dependencies[${index}].toAnchor`, 'must be an integer 0..8');
  }
  return value as unknown as Dependency;
}

const ASSET_FORMATS = new Set(['svg', 'png']);

function validateAsset(value: unknown, index: number): ImportedAsset {
  if (!isRecord(value)) {
    fail(`assets[${index}]`, 'must be an object');
  }
  requireString(value['id'], `assets[${index}].id`);
  const assetFormat = requireString(value['assetFormat'], `assets[${index}].assetFormat`);
  if (!ASSET_FORMATS.has(assetFormat)) {
    fail(`assets[${index}].assetFormat`, "must be 'svg' or 'png'");
  }
  const dataUri = requireString(value['sanitizedDataUri'], `assets[${index}].sanitizedDataUri`);
  if (!dataUri.startsWith('data:')) {
    fail(`assets[${index}].sanitizedDataUri`, 'must be a self-contained data: URI');
  }
  return value as unknown as ImportedAsset;
}

function validateSection(value: unknown, index: number): Section {
  if (!isRecord(value)) {
    fail(`sections[${index}]`, 'must be an object');
  }
  requireString(value['id'], `sections[${index}].id`);
  requireString(value['name'], `sections[${index}].name`);
  requireNumber(value['order'], `sections[${index}].order`);
  requireArray(value['rowIds'], `sections[${index}].rowIds`);
  return value as unknown as Section;
}

function validateDeclaredCategory(value: unknown, index: number): DeclaredCategory {
  if (!isRecord(value)) {
    fail(`declaredCategories[${index}]`, 'must be an object');
  }
  requireString(value['major'], `declaredCategories[${index}].major`);
  if (value['middle'] !== undefined) {
    requireString(value['middle'], `declaredCategories[${index}].middle`);
  }
  if (value['minor'] !== undefined) {
    requireString(value['minor'], `declaredCategories[${index}].minor`);
  }
  return value as unknown as DeclaredCategory;
}

function validateRow(value: unknown, index: number): Row {
  if (!isRecord(value)) {
    fail(`rows[${index}]`, 'must be an object');
  }
  requireString(value['id'], `rows[${index}].id`);
  requireString(value['sectionId'], `rows[${index}].sectionId`);
  requireString(value['classificationLabel'], `rows[${index}].classificationLabel`);
  requireNumber(value['order'], `rows[${index}].order`);
  return value as unknown as Row;
}

const FONT_SCALES = new Set(['S', 'M', 'L']);

/**
 * Strictly validate a migrated raw object into a ScheduleDocument, rejecting on
 * any type mismatch (security-design C-05). Preserves the full nested structure
 * for round-trip fidelity; only the shape of required fields is enforced.
 */
export function validateScheduleDocument(raw: unknown): ScheduleDocument {
  if (!isRecord(raw)) {
    fail('$', 'must be an object');
  }
  requireNumber(raw['schemaVersion'], 'schemaVersion');
  requireString(raw['title'], 'title');
  requireString(raw['epochDate'], 'epochDate');

  const viewState = raw['viewState'];
  if (!isRecord(viewState)) {
    fail('viewState', 'must be an object');
  }
  requireNumber(viewState['zoomX'], 'viewState.zoomX');
  requireNumber(viewState['zoomY'], 'viewState.zoomY');
  requireNumber(viewState['scrollX'], 'viewState.scrollX');
  requireNumber(viewState['scrollY'], 'viewState.scrollY');
  if (!FONT_SCALES.has(requireString(viewState['fontScale'], 'viewState.fontScale'))) {
    fail('viewState.fontScale', "must be 'S', 'M' or 'L'");
  }

  requireArray(raw['sections'], 'sections').forEach(validateSection);
  requireArray(raw['rows'], 'rows').forEach(validateRow);
  const items = requireArray(raw['items'], 'items');
  if (items.length > IMPORT_LIMITS.maxItemCount) {
    throw new ImportRejectedError(
      `Document has ${items.length} items, exceeding the ${IMPORT_LIMITS.maxItemCount} import limit`,
    );
  }
  items.forEach(validateItem);

  if (raw['dependencies'] !== undefined) {
    requireArray(raw['dependencies'], 'dependencies').forEach(validateDependency);
  }
  if (raw['annotations'] !== undefined) {
    // Annotations are validated structurally as objects; their variant shape is
    // enforced by the model's discriminated union at the consumer.
    requireArray(raw['annotations'], 'annotations').forEach((value, index) => {
      if (!isRecord(value)) {
        fail(`annotations[${index}]`, 'must be an object');
      }
      requireString(value['annotationKind'], `annotations[${index}].annotationKind`);
      // Rounded-box annotations carry a stroke color that reaches exported SVG;
      // validate it against the same C-02 allowlist (M5a review M-3).
      if (value['strokeColor'] !== undefined) {
        requireColor(value['strokeColor'], `annotations[${index}].strokeColor`);
      }
    });
  }
  if (raw['assets'] !== undefined) {
    requireArray(raw['assets'], 'assets').forEach(validateAsset);
  }
  if (raw['declaredCategories'] !== undefined) {
    requireArray(raw['declaredCategories'], 'declaredCategories').forEach(validateDeclaredCategory);
  }

  return raw as unknown as ScheduleDocument;
}

/**
 * Deserialize untrusted JSON text into a validated ScheduleDocument (IO-L1-001,
 * DATA-JSON-001). Applies, in order: byte-limit guard, prototype-pollution-safe
 * parse, depth guard, schemaVersion migration, strict validation.
 *
 * @param jsonText - The untrusted JSON text.
 * @returns A validated ScheduleDocument at CURRENT_SCHEMA_VERSION.
 * @throws {ImportRejectedError} On any size/parse/schema/version violation.
 */
export function deserializeScheduleDocument(jsonText: string): ScheduleDocument {
  assertWithinByteLimit(jsonText, IMPORT_LIMITS.maxJsonBytes, 'JSON');
  const parsed = safeJsonParse(jsonText);
  assertJsonDepth(parsed);
  if (!isRecord(parsed)) {
    throw new ImportRejectedError('Top-level JSON value must be an object');
  }
  const migrated = migrateToCurrent(parsed);
  return validateScheduleDocument(migrated);
}

// Re-export so callers importing the codec can surface a single error type.
export { ImportRejectedError } from './import-sanitizer.js';
