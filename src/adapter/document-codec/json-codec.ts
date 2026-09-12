// DocumentCodec -- the GRS JSON half.
//
// @unit      UF-35   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure
//
// Converts between `GRS JSON` and the document (FR-024). Table T-063 UT-5
// splits the three formats apart because each answers to a different authority:
// this one to FR-024, MSPDI to the exchange partner's schema, and the single
// .html to FR-067.
//
// ⛔ What this file does NOT do: judge the content. FR-023 puts the rules --
// the ceilings, the dates, the counts -- in ValidateImportedDocument (CP-13),
// which the three intake paths share so that one of them cannot be laxer than
// another. This file answers one narrower question: is the text a GRS JSON
// document at all. A caller runs both, in that order, because the validator
// takes a `Document` and cannot be handed a shape that is not one.
// ⭐ One of FR-023's own MUSTs lands HERE rather than there, for the reason
// `mspdi-codec.ts` gives about the same one: a leading byte order mark is
// accepted and dropped before the text is parsed, which nothing downstream of
// the parser could still do.
//
// ⭐ THE GENERATED SCHEMA RUNS HERE, and this is the only place it runs. The
// preamble of table T-220 (Chapter 6.1) excuses that table from every condition
// a single column decides, on the ground that `grs-document.schema.json`
// already enforces them, and then states the MUST that makes the ground true:
// the schema is to be run on the road that reads `GRS JSON`, by the side that
// assembles the document -- `CP-20`, which is this component. ⚠️ It is NOT run
// on the MSPDI road: that codec builds the document itself, so a check there
// would only be inspecting its own output.
// ⛔ The `documentSettings` group is deliberately NOT held to `required` or to
// a closed key set -- see the note on the generated region below.

import type { Document } from '../../entity/document-model/document/document'
import { clampedSettings } from '../../entity/document-model/document-settings/document-settings'
import { withoutLeadingByteOrderMark } from './mspdi-codec'

/** Why a text could not be read as a document. */
export interface JsonFault {
  /**
   * Where, as a JSON pointer. `''` is the text as a whole -- NT-1 of table
   * T-037 requires a notice to say WHICH item is wrong, so a fault that cannot
   * name one says so by naming the whole.
   */
  readonly at: string
  readonly what: string
}

/**
 * The row of table T-233 a refusal from here carries.
 *
 * ⭐ THE ROW ID IS THE KEY, the move the shell's `NoticeReason` already makes:
 * FR-076 has a telling carry a row of that table as its reason and forbids
 * carrying one the table does not hold (MUST NOT), and RS-25 -- 「読んだ
 * `GRS JSON` の列が、決められた形に合わない」, manner `NT-1` -- is the row that
 * table gained for exactly this refusal. Naming it here rather than in the
 * shell keeps the codec from making the shell guess.
 *
 * ⭐ Why a union of one, and why the reason rides on the DECODING rather than
 * on each `JsonFault`: `JsonFault` already answers NT-1's own MUST -- which
 * item, and why, in words -- one item at a time, and a telling shows one
 * reason over the list of items it found. Widening `JsonFault` would have made
 * every entry repeat the same row id. A union of one is where a second row
 * lands if table T-233 ever splits this refusal.
 *
 * ⛔ A text that is not JSON at all comes back under RS-25 too, and that is a
 * stretch worth naming: table T-233 holds no row for "unparseable", and
 * RS-11 / RS-12 / RS-13 belong to OP-12's dispatch, which has already chosen
 * this codec by the time the text arrives here. ⛔ Inventing a row is not this
 * file's to do.
 */
export type JsonRefusalReason = 'RS-25'

/**
 * FR-073's judgement about the format version of the text that was read.
 *
 * ⭐ FR-073 (MUST): 「判別は文字列の大小で行うこと」 and 「この `GRS` が知っている
 * 最大の版より新しい版を読めない版とすること」. The format is a date spelled
 * `YYYY-MM-DD` (or `YYYY-MM-DDTHH:MM` for a second turn on the same day), whose
 * dictionary order IS its time order, so `>` on the two strings is the whole
 * comparison and no comparator is owed.
 *
 * ⛔ `newerThanKnown` IS NOT A REFUSAL, and must never be turned into one. The
 * reader's ruling of 2026-09-05 put three sentences on this case at once:
 * 「受けて開くこと（MUST）」, 「拒んではならない（MUST NOT）」 and 「黙って開いても
 * ならない（MUST NOT）」. So the decoding stays `ok: true` and what is owed is a
 * TELLING -- the columns that could not be read shown on `U-61`
 * (`Difference Review`, table T-103) carrying `RS-48` of table T-233, and the
 * person asked whether to go on.
 * ⭐ THE COLUMNS ARE COUNTED NOW (DFC-357): `unreadColumns` on the decoding below
 * is the list, and this reading is what turns it on. ⚠️ An earlier note here
 * said no member counted them; it was true when it was written and is not now.
 * STOP -- ⛔ THAT TELLING IS STILL NOT DRAWN, and it is not this unit's to
 * draw: this file is pure, and the surface that would lay the list out is
 * `U-61`, which exists but carries only FR-022's merge candidates. ⛔ Nothing
 * here may stand in for it by refusing -- that would meet the first MUST by
 * breaking the MUST NOT beside it.
 *
 * ⛔ `notCompared` IS A HOLE AND SAYS SO. It is what comes back when the caller
 * handed no version to compare against, and it is deliberately NOT spelled as
 * `known`: a document that was never compared must not be reported as one that
 * was found to be readable, or 「黙って開いてもならない」 is broken in silence by
 * the very value that was supposed to answer for it. ⚠️ Nothing in `docs/spec`
 * makes this state legal -- OP-7 of table T-024a sends EVERY open to FR-073 --
 * so a caller that leaves it here owes the version, not a reading of this value.
 */
export type FormatVersionReading = 'notCompared' | 'known' | 'newerThanKnown'

export type JsonDecoding =
  | {
      readonly ok: true
      readonly document: Document
      /**
       * How many settings keys `clampedSettings` had to move to bring them
       * inside the bounds their own rows state -- `0` when nothing moved.
       *
       * ⭐ A COUNT AND NOT A LIST, which is the whole of what the person is
       * owed: the manner is `NT-5` (accepted, with a caution), and no surface
       * of the specification shows WHICH keys were moved. ⛔ So nothing here
       * hands the key names on -- a list nobody may draw is a list that would
       * only invite a face the specification does not hold.
       * ⚠️ The raiser is the caller's, not this file's: this unit is pure and
       * `raiseNotice` lives with the loop. Every read road gets the number and
       * decides whether it has anybody to tell.
       */
      readonly clampedCount: number
      /**
       * OP-7 of table T-024a: 「形式の版は `FR-073` に従って判別する」.
       *
       * ⭐ ON THE DECODING AND NOT ON A SEPARATE CALL, for the reason the body
       * of `documentFromJson` already gives about `clampedSettings`: every road
       * that turns `GRS JSON` into a document comes through this one function,
       * so one judgement here is what keeps BT-1, BT-4 and OP-12's import from
       * drifting apart.
       * ⚠️ The raiser is the caller's, exactly as `clampedCount`'s is.
       */
      readonly formatVersion: FormatVersionReading
      /**
       * FR-073 (MUST): 「読めなかった列を具体的に並べて見せ、続けてよいかを
       * 問うこと」 -- the columns, so that the surface that asks has something
       * to lay out.
       *
       * ⭐ ALWAYS EMPTY UNLESS `formatVersion` IS `newerThanKnown`, and that is
       * the requirement rather than a convenience: FR-073 defines 「読めない版」
       * as strictly newer than the greatest version this build knows, and a key
       * this build does not know in a document of a version it DOES know is a
       * writer inventing a column -- RS-25's refusal, which is left exactly as
       * it was.
       *
       * ⭐ NAMES, NOT PLACES, and 「列」 is why: a column of a newer version
       * stands on every row that carries it, so a list of occurrences would
       * name one column nine hundred times over and be unreadable as the
       * 「具体的に並べて見せ」 the requirement asks for. Distinct, in the order
       * the document first carries each.
       * ⛔ NOTHING IS LOST BY LISTING THE NAME ONLY. 「読めなかった列は、解釈
       * せずに持ち回ること（MUST）。落としてはならない（MUST NOT）」 is kept by
       * the DOCUMENT and not by this list: the value handed back below is the
       * parsed root with every unknown key still on it, so a write of it
       * carries them all back out untouched. This list is what the telling
       * reads; the carrying is the document's own.
       *
       * ⛔ NO ROW SPELLS THIS LIST. FR-073 names what has to be shown and table
       * T-103's `U-61` names where, and neither settles a shape for it; the
       * name alone is the narrowest thing that says which column went unread.
       * Searched: FR-073, FR-022, table T-103, table T-233, table T-064.
       * Reported.
       */
      readonly unreadColumns: readonly string[]
    }
  | {
      readonly ok: false
      readonly reason: JsonRefusalReason
      readonly faults: readonly JsonFault[]
    }

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/grs-document.schema.json
//     (itself generated by docs/spec/_source/erd_json_to_schema.py from
//      erd.json and docs/spec/_assets/tbl-settings.md)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * Every `type` the manuscript actually writes.
 *
 * ⭐ Measured, not enumerated: `jsonTypeHolds` below switches over this
 * union with a `never` floor, so a type the manuscript grows is a compile
 * error in the walker rather than a rule that is quietly skipped.
 */
type JsonSchemaKind =
  | 'null'
  | 'boolean'
  | 'integer'
  | 'number'
  | 'string'
  | 'array'
  | 'object'

/**
 * The schema of `GRS JSON`, as the walker below reads it.
 *
 * ⭐ ONE NODE PER SCHEMA NODE. `ref` names a member of SCHEMA_DEFS and
 * stands alone; `closed` is `additionalProperties: false`; `values` is
 * `additionalProperties` given a shape (the `carry` maps).
 */
interface SchemaNode {
  readonly ref?: string
  readonly type?: readonly JsonSchemaKind[]
  readonly enum?: readonly (null | string)[]
  readonly minimum?: number
  readonly maximum?: number
  readonly maxLength?: number
  readonly required?: readonly string[]
  readonly closed?: true
  readonly values?: SchemaNode
  readonly properties?: Readonly<Record<string, SchemaNode>>
  readonly items?: SchemaNode
}

/** The `$defs` of the manuscript, by the name a `ref` gives. */
const SCHEMA_DEFS: Readonly<Record<string, SchemaNode>> = {
  Project: {
    type: ['object'],
    required: ['id', 'name', 'title', 'subject', 'category', 'company', 'manager', 'author', 'created', 'revision', 'lastSaved', 'startDate', 'statusDate', 'minutesPerDay', 'minutesPerWeek', 'daysPerMonth', 'weekStartDay', 'calendarUid', 'themeHue', 'uidHighWaterMark', 'importSeq', 'carry', 'carryElements', 'outlineBase'],
    closed: true,
    properties: {
      id: {
        type: ['string', 'null'],
        maxLength: 16,
      },
      name: {
        type: ['string', 'null'],
      },
      title: {
        type: ['string', 'null'],
      },
      subject: {
        type: ['string', 'null'],
      },
      category: {
        type: ['string', 'null'],
      },
      company: {
        type: ['string', 'null'],
      },
      manager: {
        type: ['string', 'null'],
      },
      author: {
        type: ['string', 'null'],
      },
      created: {
        type: ['string', 'null'],
      },
      revision: {
        type: ['integer', 'null'],
      },
      lastSaved: {
        type: ['string', 'null'],
      },
      startDate: {
        type: ['string', 'null'],
      },
      statusDate: {
        type: ['string', 'null'],
      },
      minutesPerDay: {
        type: ['integer', 'null'],
      },
      minutesPerWeek: {
        type: ['integer', 'null'],
      },
      daysPerMonth: {
        type: ['integer', 'null'],
      },
      weekStartDay: {
        type: ['integer', 'null'],
        minimum: 0,
        maximum: 6,
      },
      calendarUid: {
        type: ['integer', 'null'],
      },
      themeHue: {
        type: ['integer'],
        minimum: 0,
        maximum: 359,
      },
      uidHighWaterMark: {
        type: ['integer'],
      },
      importSeq: {
        type: ['integer'],
      },
      carry: {
        type: ['object'],
        values: {
          type: ['string'],
        },
      },
      carryElements: {
        type: ['array'],
        items: {
          ref: 'CarryElement',
        },
      },
      outlineBase: {
        type: ['integer'],
      },
    },
  },
  Task: {
    type: ['object'],
    required: ['uid', 'wbsParentUid', 'wbsOrder', 'name', 'start', 'finish', 'milestone', 'deadline', 'notes', 'calendarUid', 'actualStart', 'actualDuration', 'actualFinish', 'resume', 'resumeValid', 'percentComplete', 'fadeInDays', 'fadeOutDays', 'dependencies', 'carry', 'carryElements'],
    closed: true,
    properties: {
      uid: {
        type: ['integer'],
      },
      wbsParentUid: {
        type: ['integer', 'null'],
      },
      wbsOrder: {
        type: ['integer', 'null'],
      },
      name: {
        type: ['string', 'null'],
      },
      start: {
        type: ['string', 'null'],
      },
      finish: {
        type: ['string', 'null'],
      },
      milestone: {
        type: ['boolean', 'null'],
      },
      deadline: {
        type: ['string', 'null'],
      },
      notes: {
        type: ['string', 'null'],
      },
      calendarUid: {
        type: ['integer', 'null'],
      },
      actualStart: {
        type: ['string', 'null'],
      },
      actualDuration: {
        type: ['integer', 'null'],
      },
      actualFinish: {
        type: ['string', 'null'],
      },
      resume: {
        type: ['string', 'null'],
      },
      resumeValid: {
        type: ['boolean', 'null'],
      },
      percentComplete: {
        type: ['integer', 'null'],
        minimum: 0,
      },
      fadeInDays: {
        type: ['integer', 'null'],
        minimum: 0,
      },
      fadeOutDays: {
        type: ['integer', 'null'],
        minimum: 0,
      },
      dependencies: {
        type: ['array'],
        items: {
          ref: 'Dependency',
        },
      },
      carry: {
        type: ['object'],
        values: {
          type: ['string'],
        },
      },
      carryElements: {
        type: ['array'],
        items: {
          ref: 'CarryElement',
        },
      },
    },
  },
  Dependency: {
    type: ['object'],
    required: ['predecessorUid', 'linkType', 'lag', 'lagFormat', 'carry', 'carryElements'],
    closed: true,
    properties: {
      predecessorUid: {
        type: ['integer'],
      },
      linkType: {
        type: ['integer'],
        minimum: 0,
        maximum: 3,
      },
      lag: {
        type: ['integer', 'null'],
      },
      lagFormat: {
        type: ['integer', 'null'],
      },
      carry: {
        type: ['object'],
        values: {
          type: ['string'],
        },
      },
      carryElements: {
        type: ['array'],
        items: {
          ref: 'CarryElement',
        },
      },
    },
  },
  TaskGroup: {
    type: ['object'],
    required: ['id', 'parentId', 'label', 'derivedFromTaskUid', 'order', 'isCollapsed', 'isHidden', 'color', 'height'],
    closed: true,
    properties: {
      id: {
        type: ['string'],
      },
      parentId: {
        type: ['string', 'null'],
      },
      label: {
        type: ['string', 'null'],
      },
      derivedFromTaskUid: {
        type: ['integer', 'null'],
      },
      order: {
        type: ['integer'],
      },
      isCollapsed: {
        type: ['boolean', 'null'],
      },
      isHidden: {
        type: ['boolean', 'null'],
      },
      color: {
        type: ['string', 'null'],
      },
      height: {
        type: ['integer', 'null'],
      },
    },
  },
  TaskGroupMember: {
    type: ['object'],
    required: ['taskUid', 'groupId', 'stackOrder'],
    closed: true,
    properties: {
      taskUid: {
        type: ['integer'],
      },
      groupId: {
        type: ['string'],
      },
      stackOrder: {
        type: ['integer', 'null'],
      },
    },
  },
  Calendar: {
    type: ['object'],
    required: ['uid', 'name', 'isBaseCalendar', 'baseCalendarUid', 'ordinal', 'carry', 'carryElements', 'weekDays', 'exceptions'],
    closed: true,
    properties: {
      uid: {
        type: ['integer'],
      },
      name: {
        type: ['string', 'null'],
      },
      isBaseCalendar: {
        type: ['boolean', 'null'],
      },
      baseCalendarUid: {
        type: ['integer', 'null'],
      },
      ordinal: {
        type: ['integer'],
      },
      carry: {
        type: ['object'],
        values: {
          type: ['string'],
        },
      },
      carryElements: {
        type: ['array'],
        items: {
          ref: 'CarryElement',
        },
      },
      weekDays: {
        type: ['array'],
        items: {
          ref: 'WeekDay',
        },
      },
      exceptions: {
        type: ['array'],
        items: {
          ref: 'Exception',
        },
      },
    },
  },
  WeekDay: {
    type: ['object'],
    required: ['ordinal', 'dayType', 'dayWorking', 'carry', 'carryElements'],
    closed: true,
    properties: {
      ordinal: {
        type: ['integer'],
      },
      dayType: {
        type: ['integer', 'null'],
        minimum: 1,
        maximum: 7,
      },
      dayWorking: {
        type: ['boolean', 'null'],
      },
      carry: {
        type: ['object'],
        values: {
          type: ['string'],
        },
      },
      carryElements: {
        type: ['array'],
        items: {
          ref: 'CarryElement',
        },
      },
    },
  },
  Exception: {
    type: ['object'],
    required: ['ordinal', 'name', 'fromDate', 'toDate', 'dayWorking', 'recurrenceKind', 'carry', 'carryElements'],
    closed: true,
    properties: {
      ordinal: {
        type: ['integer'],
      },
      name: {
        type: ['string', 'null'],
      },
      fromDate: {
        type: ['string', 'null'],
      },
      toDate: {
        type: ['string', 'null'],
      },
      dayWorking: {
        type: ['boolean', 'null'],
      },
      recurrenceKind: {
        type: ['integer', 'null'],
        minimum: 1,
        maximum: 9,
      },
      carry: {
        type: ['object'],
        values: {
          type: ['string'],
        },
      },
      carryElements: {
        type: ['array'],
        items: {
          ref: 'CarryElement',
        },
      },
    },
  },
  Resource: {
    type: ['object'],
    required: ['uid', 'name', 'resourceKind', 'isCostResource', 'calendarUid', 'carry', 'carryElements'],
    closed: true,
    properties: {
      uid: {
        type: ['integer'],
      },
      name: {
        type: ['string', 'null'],
      },
      resourceKind: {
        type: ['integer', 'null'],
      },
      isCostResource: {
        type: ['boolean', 'null'],
      },
      calendarUid: {
        type: ['integer', 'null'],
      },
      carry: {
        type: ['object'],
        values: {
          type: ['string'],
        },
      },
      carryElements: {
        type: ['array'],
        items: {
          ref: 'CarryElement',
        },
      },
    },
  },
  Assignment: {
    type: ['object'],
    required: ['uid', 'taskUid', 'resourceUid', 'carry', 'carryElements'],
    closed: true,
    properties: {
      uid: {
        type: ['integer'],
      },
      taskUid: {
        type: ['integer', 'null'],
      },
      resourceUid: {
        type: ['integer', 'null'],
      },
      carry: {
        type: ['object'],
        values: {
          type: ['string'],
        },
      },
      carryElements: {
        type: ['array'],
        items: {
          ref: 'CarryElement',
        },
      },
    },
  },
  TaskVisual: {
    type: ['object'],
    required: ['taskUid', 'nameAnchor', 'nameAlign', 'shapeKind', 'milestoneGlyph', 'fillColor', 'strokeColor', 'lineWeight'],
    closed: true,
    properties: {
      taskUid: {
        type: ['integer'],
      },
      nameAnchor: {
        type: ['integer', 'null'],
        minimum: 0,
        maximum: 8,
      },
      nameAlign: {
        enum: ['left', 'center', 'right', null],
      },
      shapeKind: {
        enum: ['rectangle', 'chevron', 'arrow', 'endpointSpan', 'milestone', null],
      },
      milestoneGlyph: {
        enum: ['circle', 'hexagon', 'pentagon', 'diamond', 'square', 'star', 'triangleUp', 'triangleDown', 'file', 'box', 'floppyDisk', 'cylinder', 'person', 'smile', 'beerMug', null],
      },
      fillColor: {
        type: ['string', 'null'],
      },
      strokeColor: {
        type: ['string', 'null'],
      },
      lineWeight: {
        enum: ['thin', 'medium', 'thick', null],
      },
    },
  },
  TaskOrigin: {
    type: ['object'],
    required: ['taskUid', 'sourceProjectUid', 'sourceUid', 'lastSeenImportSeq', 'importSessionId'],
    closed: true,
    properties: {
      taskUid: {
        type: ['integer'],
      },
      sourceProjectUid: {
        type: ['string', 'null'],
      },
      sourceUid: {
        type: ['integer'],
      },
      lastSeenImportSeq: {
        type: ['integer'],
      },
      importSessionId: {
        type: ['string', 'null'],
      },
    },
  },
  CommentBox: {
    type: ['object'],
    required: ['id', 'leaderShapeKind', 'text', 'anchorDate', 'anchorGroupId', 'bodyOffsetPx'],
    closed: true,
    properties: {
      id: {
        type: ['string'],
      },
      leaderShapeKind: {
        enum: ['calloutBox', 'polyline', null],
      },
      text: {
        type: ['string', 'null'],
      },
      anchorDate: {
        type: ['string', 'null'],
      },
      anchorGroupId: {
        type: ['string', 'null'],
      },
      bodyOffsetPx: {
        type: ['object', 'null'],
        required: ['dx', 'dy'],
        closed: true,
        properties: {
          dx: {
            type: ['number'],
          },
          dy: {
            type: ['number'],
          },
        },
      },
    },
  },
  HighlightBox: {
    type: ['object'],
    required: ['id', 'startDate', 'endDate', 'topGroupId', 'bottomGroupId', 'strokeColor', 'cornerRadiusPx'],
    closed: true,
    properties: {
      id: {
        type: ['string'],
      },
      startDate: {
        type: ['string', 'null'],
      },
      endDate: {
        type: ['string', 'null'],
      },
      topGroupId: {
        type: ['string', 'null'],
      },
      bottomGroupId: {
        type: ['string', 'null'],
      },
      strokeColor: {
        type: ['string', 'null'],
      },
      cornerRadiusPx: {
        type: ['number', 'null'],
      },
    },
  },
  CarryElement: {
    type: ['object'],
    required: ['ordinal', 'name', 'fields', 'children'],
    closed: true,
    properties: {
      ordinal: {
        type: ['integer'],
      },
      name: {
        type: ['string'],
      },
      fields: {
        type: ['object'],
        values: {
          type: ['string'],
        },
      },
      children: {
        type: ['array'],
        items: {
          ref: 'CarryElement',
        },
      },
    },
  },
  documentStamp: {
    type: ['object'],
    required: ['scheduleUpdatedUtc', 'lastEditedBy', 'settingsUpdatedUtc', 'fileSavedUtc'],
    closed: true,
    properties: {
      scheduleUpdatedUtc: {
        type: ['string'],
      },
      lastEditedBy: {
        type: ['string'],
      },
      settingsUpdatedUtc: {
        type: ['string'],
      },
      fileSavedUtc: {
        type: ['string', 'null'],
      },
    },
  },
  changeLog: {
    type: ['object'],
    required: ['ordinal', 'editedBy', 'explanation', 'changedUtc'],
    closed: true,
    properties: {
      ordinal: {
        type: ['integer'],
      },
      editedBy: {
        type: ['string'],
      },
      explanation: {
        type: ['string'],
      },
      changedUtc: {
        type: ['string'],
      },
    },
  },
  BaselineTask: {
    type: ['object'],
    required: ['uid', 'name', 'start', 'finish', 'milestone'],
    closed: true,
    properties: {
      uid: {
        type: ['integer'],
      },
      name: {
        type: ['string', 'null'],
      },
      start: {
        type: ['string', 'null'],
      },
      finish: {
        type: ['string', 'null'],
      },
      milestone: {
        type: ['boolean', 'null'],
      },
    },
  },
}

/**
 * The document root.
 *
 * ⛔ `documentSettings` carries neither `required` nor `closed`, here or
 * anywhere below it: the preamble of table T-220 forbids both on that
 * group (MUST NOT) because `OP-6` of table T-024a has the reader fill a
 * missing setting with its default and KEEP a key it does not know.
 *
 * ⛔ It carries no bound either -- no `minimum`, `maximum` or `maxLength`.
 * The same preamble allows that group the type and the enumeration only
 * (MUST) and forbids refusing a value for being out of bounds (MUST NOT),
 * because the range is the work of `clampedSettings` (`PI-2` of table
 * T-064), which moves such a value into range rather than rejecting it.
 * ⚠️ Refusing here would shut a whole document out over one display key.
 *
 * ⛔ AND NOBODY CALLS `clampedSettings` YET. It is exported from
 * entity/document-model/document-settings, and outside its own unit tests
 * the call sites in src/ number ZERO -- so an out-of-bounds setting is
 * now neither refused here nor clamped anywhere. ⚠️ The manuscript does
 * not say on which road the call belongs, so the wiring is deliberately
 * NOT guessed at here; it needs a ruling before it can be written.
 */
const GRS_DOCUMENT_SCHEMA: SchemaNode = {
  type: ['object'],
  required: ['schemaVersion', 'schedule', 'documentSettings', 'documentStamp', 'changeLog'],
  closed: true,
  properties: {
    schemaVersion: {
      type: ['string'],
    },
    schedule: {
      type: ['object'],
      required: ['project', 'calendars', 'tasks', 'resources', 'assignments', 'taskGroups', 'taskGroupMembers', 'taskVisuals', 'commentBoxes', 'highlightBoxes', 'taskOrigins', 'baselineTasks'],
      closed: true,
      properties: {
        project: {
          ref: 'Project',
        },
        calendars: {
          type: ['array'],
          items: {
            ref: 'Calendar',
          },
        },
        tasks: {
          type: ['array'],
          items: {
            ref: 'Task',
          },
        },
        resources: {
          type: ['array'],
          items: {
            ref: 'Resource',
          },
        },
        assignments: {
          type: ['array'],
          items: {
            ref: 'Assignment',
          },
        },
        taskGroups: {
          type: ['array'],
          items: {
            ref: 'TaskGroup',
          },
        },
        taskGroupMembers: {
          type: ['array'],
          items: {
            ref: 'TaskGroupMember',
          },
        },
        taskVisuals: {
          type: ['array'],
          items: {
            ref: 'TaskVisual',
          },
        },
        commentBoxes: {
          type: ['array'],
          items: {
            ref: 'CommentBox',
          },
        },
        highlightBoxes: {
          type: ['array'],
          items: {
            ref: 'HighlightBox',
          },
        },
        taskOrigins: {
          type: ['array'],
          items: {
            ref: 'TaskOrigin',
          },
        },
        baselineTasks: {
          type: ['array'],
          items: {
            ref: 'BaselineTask',
          },
        },
      },
    },
    documentSettings: {
      type: ['object'],
      properties: {
        actualGap: {
          type: ['integer'],
        },
        actualInitialDuration: {
          type: ['integer'],
        },
        actualMin: {
          type: ['integer'],
        },
        actualOfPlan: {
          type: ['number'],
        },
        actualVisible: {
          type: ['boolean'],
        },
        appHeaderMaxHeight: {
          type: ['integer'],
        },
        arrowHeadOfSpan: {
          type: ['number'],
        },
        arrowHeadOfStroke: {
          type: ['number'],
        },
        assigneeVisible: {
          type: ['boolean'],
        },
        basePlanHeight: {
          type: ['integer'],
        },
        baselineVisible: {
          type: ['boolean'],
        },
        canvasPadding: {
          type: ['integer'],
        },
        carryMaxDepth: {
          type: ['integer'],
        },
        chevronNotchOfHeight: {
          type: ['number'],
        },
        chevronNotchOfWidth: {
          type: ['number'],
        },
        commentBoxPad: {
          type: ['integer'],
        },
        commentBoxWrapUnits: {
          type: ['integer'],
        },
        dateGridLinesVisible: {
          type: ['boolean'],
        },
        dependencyArrowLength: {
          type: ['integer'],
        },
        dependencyLagDefault: {
          type: ['integer'],
        },
        dependencyRunOfArrow: {
          type: ['integer'],
        },
        dependencyVisible: {
          type: ['boolean'],
        },
        dependencyWidth: {
          type: ['number'],
        },
        dualCursor: {
          type: ['object', 'null'],
          properties: {
            date1: {
              type: ['string'],
            },
            date2: {
              type: ['string'],
            },
          },
        },
        dummyOpacity: {
          type: ['number'],
        },
        exportCanvas: {
          type: ['object'],
          properties: {
            width: {
              type: ['integer'],
            },
            height: {
              type: ['integer'],
            },
          },
        },
        exportCanvasHeightCap: {
          type: ['number'],
        },
        fadeHandleHalfPx: {
          type: ['number'],
        },
        fadeHandleStrokePx: {
          type: ['number'],
        },
        fontMin: {
          type: ['integer'],
        },
        fontOfActual: {
          type: ['number'],
        },
        fontScale: {
          enum: ['S', 'M', 'L'],
        },
        fontScaleSizes: {
          type: ['object'],
          properties: {
            L: {
              type: ['integer'],
            },
            M: {
              type: ['integer'],
            },
            S: {
              type: ['integer'],
            },
          },
        },
        groupGridLinesVisible: {
          type: ['boolean'],
        },
        groupLevelOfDetailBase: {
          type: ['number'],
        },
        groupLevelOfDetailRatio: {
          type: ['number'],
        },
        guideCursorMode: {
          enum: ['none', 'crosshair', 'single-vertical'],
        },
        iconHintDelayMs: {
          type: ['integer'],
        },
        importMaxBytes: {
          type: ['integer'],
        },
        importMaxDate: {
          type: ['string'],
        },
        importMaxDepth: {
          type: ['integer'],
        },
        importMaxItems: {
          type: ['integer'],
        },
        importMinDate: {
          type: ['string'],
        },
        labelBaseline: {
          type: ['number'],
        },
        labelCoef: {
          type: ['number'],
        },
        labelGap: {
          type: ['integer'],
        },
        labelHaloOfFont: {
          type: ['number'],
        },
        labelPad: {
          type: ['integer'],
        },
        markerGap: {
          type: ['integer'],
        },
        markerSize: {
          type: ['integer'],
        },
        markerStroke: {
          type: ['number'],
        },
        maxGroupDepth: {
          type: ['integer'],
        },
        milestoneActualDuration: {
          type: ['integer'],
        },
        minShapeWidth: {
          type: ['integer'],
        },
        percentCompleteVisible: {
          type: ['boolean'],
        },
        pinnedGroupIds: {
          type: ['array'],
          items: {
            type: ['string'],
          },
        },
        pinnedRowMax: {
          type: ['integer'],
        },
        planActualGuidePattern: {
          type: ['object'],
          properties: {
            off: {
              type: ['number'],
            },
            on: {
              type: ['number'],
            },
          },
        },
        planActualGuideWeight: {
          type: ['number'],
        },
        planStroke: {
          type: ['integer'],
        },
        planVisible: {
          type: ['boolean'],
        },
        progressLineOverhang: {
          type: ['integer'],
        },
        progressLineVisible: {
          type: ['boolean'],
        },
        progressLineWidth: {
          type: ['number'],
        },
        progressMarkerVisible: {
          type: ['boolean'],
        },
        propertyPanelWidth: {
          type: ['number'],
        },
        pxPerDayAt1x: {
          type: ['number'],
        },
        resumeArmOfMarker: {
          type: ['number'],
        },
        resumeDashOff: {
          type: ['integer'],
        },
        resumeDashOn: {
          type: ['integer'],
        },
        resumeHeadOfMarker: {
          type: ['number'],
        },
        resumeScaleInvalid: {
          type: ['number'],
        },
        rowGap: {
          type: ['integer'],
        },
        rowTitleFont: {
          type: ['integer'],
        },
        rowTitleIndent: {
          type: ['integer'],
        },
        rowTitlePanelWidth: {
          type: ['number'],
        },
        rowTitleTopScale: {
          type: ['number'],
        },
        rulerFont: {
          type: ['number'],
        },
        rulerHeight: {
          type: ['number'],
        },
        rulerLabelBottomPad: {
          type: ['integer'],
        },
        rulerLabelGap: {
          type: ['integer'],
        },
        rulerLabelPad: {
          type: ['integer'],
        },
        rulerTierPxPerDayDay: {
          type: ['number'],
        },
        rulerTierPxPerDayMonth: {
          type: ['number'],
        },
        rulerTierPxPerDayWeek: {
          type: ['number'],
        },
        scrollDate: {
          type: ['string', 'null'],
        },
        scrollDayOffset: {
          type: ['number'],
        },
        scrollGroupId: {
          type: ['string', 'null'],
        },
        scrollGroupOffset: {
          type: ['number'],
        },
        shapeHeightOf: {
          type: ['object'],
          properties: {
            arrow: {
              type: ['number'],
            },
            chevron: {
              type: ['number'],
            },
            endpointSpan: {
              type: ['number'],
            },
            milestone: {
              type: ['number'],
            },
            rectangle: {
              type: ['number'],
            },
          },
        },
        spanDotOfStroke: {
          type: ['number'],
        },
        stackDirection: {
          enum: ['up', 'down'],
        },
        stackGap: {
          type: ['integer'],
        },
        stackSafetyCap: {
          type: ['integer'],
        },
        starInnerOfOuter: {
          type: ['number'],
        },
        taskLevelOfDetailReadablePx: {
          type: ['integer'],
        },
        themeMonochrome: {
          type: ['boolean'],
        },
        themePreference: {
          enum: ['light', 'dark'],
        },
        thinFontScale: {
          type: ['number'],
        },
        thinStrokeMax: {
          type: ['integer'],
        },
        thinStrokeMin: {
          type: ['number'],
        },
        thinStrokeOfPlan: {
          type: ['number'],
        },
        truncateUnits: {
          type: ['integer'],
        },
        zoomX: {
          type: ['number'],
        },
        zoomY: {
          type: ['number'],
        },
      },
    },
    documentStamp: {
      ref: 'documentStamp',
    },
    changeLog: {
      type: ['array'],
      items: {
        ref: 'changeLog',
      },
    },
  },
}

// </generated>

/**
 * What a fault says when the only thing wrong with a key is that this build
 * does not know it.
 *
 * ⭐ NAMED RATHER THAN SPELLED TWICE. `documentFromJson` has to tell this one
 * finding apart from every other in order to keep FR-073's 「受けて開くこと
 * （MUST）」, and two copies of a sentence are two things to keep in step.
 */
const NOT_A_KEY_THIS_SHAPE_CARRIES = 'is not a key this shape carries'

/** @purity pure */
function fault(at: string, what: string): JsonFault {
  return { at, what }
}

/**
 * Whether a fault is only 「this build does not know this key」.
 *
 * @purity pure
 */
function isUnknownKeyFault(one: JsonFault): boolean {
  return one.what === NOT_A_KEY_THIS_SHAPE_CARRIES
}

/**
 * The column a fault about an unknown key names -- the last step of its JSON
 * pointer, with RFC 6901's two escapes undone.
 *
 * @purity pure
 */
function columnOf(at: string): string {
  const last = at.slice(at.lastIndexOf('/') + 1)
  return last.replace(/~1/g, '/').replace(/~0/g, '~')
}

/** @purity pure */
function refusal(faults: readonly JsonFault[]): JsonDecoding {
  return { ok: false, reason: 'RS-25', faults }
}

/** @purity pure */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * One step down a JSON pointer (RFC 6901).
 *
 * ⚠️ The two escapes are not decoration: the `carry` maps of table T-058 take
 * whatever key the exchange partner wrote, and a `/` left unescaped would name
 * a place that is not the one that is wrong.
 *
 * @purity pure
 */
function pointer(at: string, key: string): string {
  return `${at}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`
}

/**
 * Whether a value is of one of the schema's kinds.
 *
 * ⛔ The `never` floor is the point of the switch: `JsonSchemaKind` is measured
 * from the manuscript by the generator, so a kind the manuscript grows fails to
 * compile HERE instead of being quietly skipped at run time.
 *
 * @purity pure
 */
function jsonTypeHolds(value: unknown, kind: JsonSchemaKind): boolean {
  switch (kind) {
    case 'null':
      return value === null
    case 'boolean':
      return typeof value === 'boolean'
    case 'integer':
      // ⚠️ JSON has one number type; "integer" is a condition on the value.
      return typeof value === 'number' && Number.isInteger(value)
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'string':
      return typeof value === 'string'
    case 'array':
      return Array.isArray(value)
    case 'object':
      return isObject(value)
    default: {
      const unreached: never = kind
      return unreached
    }
  }
}

/**
 * What a value is, in the words a fault says it in (NT-1: 文字で示すこと).
 *
 * @purity pure
 */
function jsonTypeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'an integer' : 'a number'
  if (typeof value === 'string') return 'a string'
  if (typeof value === 'boolean') return 'a boolean'
  if (isObject(value)) return 'an object'
  return typeof value
}

/**
 * Walks one value against one node of the generated schema, collecting faults.
 *
 * ⭐ It COLLECTS rather than stops at the first: NT-1 asks which item is wrong,
 * and a reader handed one fault at a time would have to fix and re-read once
 * per column.
 * ⚠️ Recursion is bounded by the schema, not by the data -- the manuscript's
 * `$defs` do not refer to themselves -- so a hostile document cannot deepen it.
 *
 * @purity pure
 */
function collectFaults(
  value: unknown,
  node: SchemaNode,
  at: string,
  out: JsonFault[],
): void {
  if (node.ref !== undefined) {
    const target = SCHEMA_DEFS[node.ref]
    if (target !== undefined) collectFaults(value, target, at, out)
    return
  }

  const kinds = node.type
  if (kinds !== undefined && !kinds.some((kind) => jsonTypeHolds(value, kind))) {
    // ⭐ Stops here for this node: the keys and items below it are judged
    // against a shape this value does not have, so they would each report a
    // second time on the one thing that is wrong.
    out.push(fault(at, `expected ${kinds.join(' or ')}, was ${jsonTypeOf(value)}`))
    return
  }

  const members = node.enum
  if (members !== undefined && !(members as readonly unknown[]).includes(value)) {
    out.push(
      fault(at, `is not one of ${members.map((one) => JSON.stringify(one)).join(', ')}`),
    )
    return
  }

  if (typeof value === 'number') {
    if (node.minimum !== undefined && value < node.minimum) {
      out.push(fault(at, `is below the least value allowed, ${node.minimum}`))
    }
    if (node.maximum !== undefined && value > node.maximum) {
      out.push(fault(at, `is above the greatest value allowed, ${node.maximum}`))
    }
  }
  if (
    typeof value === 'string' &&
    node.maxLength !== undefined &&
    value.length > node.maxLength
  ) {
    out.push(fault(at, `is longer than the ${node.maxLength} characters allowed`))
  }

  if (isObject(value)) {
    for (const key of node.required ?? []) {
      if (!(key in value)) out.push(fault(pointer(at, key), 'is missing'))
    }
    for (const [key, inner] of Object.entries(value)) {
      const child = node.properties?.[key] ?? node.values
      if (child !== undefined) {
        collectFaults(inner, child, pointer(at, key), out)
      } else if (node.closed === true) {
        out.push(fault(pointer(at, key), NOT_A_KEY_THIS_SHAPE_CARRIES))
      }
    }
  }

  const items = node.items
  if (items !== undefined && Array.isArray(value)) {
    value.forEach((element, index) => collectFaults(element, items, `${at}/${index}`, out))
  }
}

/**
 * FR-073's comparison, in one expression.
 *
 * ⭐ 「判別は文字列の大小で行うこと（MUST）」 -- so `>` and not a parsed date.
 * FR-073 gives the reason in as many words: the spelling makes dictionary order
 * the time order, and a shorter string sorts before a longer one that starts
 * the same way, so `YYYY-MM-DD` and `YYYY-MM-DDTHH:MM` may be mixed without
 * breaking the order.
 *
 * ⛔ EQUAL AND OLDER ARE THE SAME ANSWER HERE. FR-073 defines 「読めない版」 as
 * strictly newer than the greatest known one, and (MUST NOT) forbids the
 * version carrying whether a change breaks anything -- so an OLDER version is
 * not a finding this unit may report, and inventing a third outcome for it
 * would give the date the second meaning that sentence refuses.
 *
 * @purity pure
 */
function formatVersionReading(
  schemaVersion: string,
  greatestKnownSchemaVersion: string | undefined,
): FormatVersionReading {
  if (greatestKnownSchemaVersion === undefined) return 'notCompared'
  return schemaVersion > greatestKnownSchemaVersion ? 'newerThanKnown' : 'known'
}

/**
 * Reads one `GRS JSON` text.
 *
 * ⭐ Pure, and it takes the TEXT rather than a parsed value: parsing is where a
 * malformed input announces itself, and a caller that had already parsed would
 * have swallowed that. FR-023 calls every intake untrusted.
 *
 * ⛔ The leading byte order mark goes before `JSON.parse` sees the text. FR-023
 * states it as a MUST ("accept it and drop it") and a MUST NOT ("never refuse a
 * file for having one"), and RFC 8259 does not admit one, so a BOM left in
 * front comes back as "not JSON" -- a spreadsheet tool's export refused for the
 * one reason FR-023 forbids refusing it for. ⚠️ The drop is `mspdi-codec.ts`'s
 * one helper rather than a copy: two intake paths that each carry their own
 * would eventually disagree about a rule that is stated once.
 *
 * ⭐ The shape is judged by the GENERATED schema and by nothing hand-written.
 * The five root keys of table T-052, the twelve of DR-2, the type of every
 * column of table T-058 and the range of every setting are all values the
 * manuscript already holds; a second copy typed out here would go stale the
 * day one of them moved, and nothing would say so.
 *
 * ⚠️ The shape is checked, not the content. See the block at the top.
 *
 * ⭐ `greatestKnownSchemaVersion` IS OP-7's SECOND SIDE, and it has to arrive
 * as an argument. FR-073 compares the document's version against the greatest
 * version this build knows of, and that version is not this unit's to hold: it is the
 * one the build's own generator wrote into the bundled startup template, so
 * naming it here would be a second copy of a generated value (rule 03) and
 * reading it here would be an Adapter reaching into the Framework (`LR-6`).
 * ⛔ Leaving it out leaves FR-073 unanswered on that road, which is what
 * `formatVersion` reports as `notCompared` rather than hiding.
 *
 * @purity pure
 */
export function documentFromJson(
  text: string,
  greatestKnownSchemaVersion?: string,
): JsonDecoding {
  let parsed: unknown
  try {
    parsed = JSON.parse(withoutLeadingByteOrderMark(text))
  } catch (why) {
    return refusal([
      fault('', `not JSON: ${why instanceof Error ? why.message : String(why)}`),
    ])
  }

  // ⭐⭐ FR-073 / OP-7 IS JUDGED BEFORE THE FAULTS ARE, AND THAT ORDER IS THE
  // REQUIREMENT (DFC-357). A document of a version this build does not know is
  // one 「受けて開くこと（MUST）」 and 「拒んではならない（MUST NOT）」, so the
  // reading has to be in hand at the moment the faults are weighed -- weighing
  // them first is what refused every newer document outright.
  // ⚠️ Read off the parsed value rather than off `read` below, because `read`
  // is only assumed to be a document AFTER the faults have been weighed. A text
  // carrying no `schemaVersion` at all reads as `''`, which orders before every
  // version and so is never 「newer」.
  const declared = isObject(parsed) ? parsed['schemaVersion'] : undefined
  const formatVersion = formatVersionReading(
    typeof declared === 'string' ? declared : '',
    greatestKnownSchemaVersion,
  )

  const faults: JsonFault[] = []
  collectFaults(parsed, GRS_DOCUMENT_SCHEMA, '', faults)
  // ⭐ THE ONE FINDING A NEWER VERSION IS FORGIVEN, AND ONLY THAT ONE. FR-073
  // (MUST) has the columns this build could not read laid out and carried, so
  // an unknown KEY in a newer document is the finding rather than a fault; a
  // wrong type, a missing column or an out-of-range value is not excused by the
  // version and still refuses. ⛔ In a document of a version this build knows,
  // an unknown key stays RS-25's refusal exactly as before -- there the writer
  // invented a column, which is what that row is for.
  const isNewer = formatVersion === 'newerThanKnown'
  const refusing = isNewer ? faults.filter((one) => !isUnknownKeyFault(one)) : faults
  if (refusing.length > 0) return refusal(refusing)
  const unreadColumns = isNewer
    ? [...new Set(faults.filter(isUnknownKeyFault).map((one) => columnOf(one.at)))]
    : []

  // ⛔ THE ASSERTION OVER-CLAIMS IN ONE PLACE, and it has to. `Document` gives
  // the presentation group every key, while the schema run above deliberately
  // does not require them: OP-6 of table T-024a has the reading side fill a
  // missing setting with its default and keep a key it does not know, and the
  // preamble of table T-220 forbids this codec from refusing either (MUST NOT).
  // ⭐ The filling belongs to ImportDocument (CP-10), which FR-087 hangs from
  // and which every intake reaches; what this unit owes is to let it through.
  const read = parsed as unknown as Document

  // ⭐⭐ `clampedSettings` (PI-2 of table T-064) RUNS HERE, AND THIS IS THE ONE
  // PLACE IT RUNS. The note on `GRS_DOCUMENT_SCHEMA` above states the standing
  // rule it answers: the preamble of table T-220 forbids this codec to refuse a
  // display setting for being out of bounds (MUST NOT), because the range is
  // that function's work -- it moves the value into range rather than shutting a
  // whole document out over one display key. Until now nothing called it, so an
  // out-of-bounds setting was neither refused nor clamped.
  // ⭐ WHY THE READ ROAD AND NOT EACH CALLER. Every road that turns `GRS JSON`
  // into a document comes through here -- BT-1's embedded container, BT-4's
  // bundled template, and OP-12's import -- so one call is what keeps the three
  // from drifting apart, and a fourth road gets it for free.
  // ⛔ NOT ON THE MERGE ROAD. `OP-6` of table T-024a keeps a merged document's
  // presentation group out of the restore altogether, so a merge that took this
  // road's clamping would be moving values the row says are not restored at all;
  // FR-056's merge builds its document from the current one and never through
  // this function.
  // ⭐ FR-073 / OP-7's reading was taken above, before the faults were weighed.
  // ⛔ It does NOT gate the return: 「受けて開くこと（MUST）」「拒んではならない
  // （MUST NOT）」 leave the reading as a value the caller acts on.

  const clamp = clampedSettings(read.documentSettings)
  if (clamp.clamped.length === 0) {
    return { ok: true, document: read, clampedCount: 0, formatVersion, unreadColumns }
  }
  // ⚠️ A NEW ROOT AND NOT A WRITE. `clampedSettings` is pure and hands a fresh
  // settings group back, keys it knows nothing about included (OP-6 MUST), so
  // the document is rebuilt around it rather than the parsed value being edited.
  return {
    ok: true,
    document: { ...read, documentSettings: clamp.settings },
    clampedCount: clamp.clamped.length,
    formatVersion,
    unreadColumns,
  }
}

/**
 * Writes one `GRS JSON` text.
 *
 * ⛔ Writes every key of the presentation group even when it equals the
 * default, and every `null` column of the schedule-data group with its key
 * still there -- FR-024 states both as MUST. ⭐ Which is what `JSON.stringify`
 * of the document already does: the document type has no optional key, so
 * there is nothing here to leave out. ⚠️ Do not "tidy" this by dropping
 * defaults; the requirement's reason is that changing a default later must not
 * move the picture of a document written today.
 *
 * @purity pure
 */
export function jsonFromDocument(document: Document): string {
  return JSON.stringify(document, null, 1) + '\n'
}
