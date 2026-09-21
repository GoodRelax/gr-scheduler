// ScreenValues: the screen-values region of the session and its transitions.
// @unit      UF-86   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import type {
  EscapeTarget,
  RememberedActual,
} from '../../entity/document-model/screen-state/screen-state'
import { emptySelection, type Selection } from '../../entity/document-model/selection/selection'
import { assertNever, NO_EFFECTS, unchanged, type Step } from './session-step'

// see FR-072
export interface PropertiesSubject {
  readonly selection: Selection
  readonly groupIds: readonly string[]
}

export type ArmKind = Exclude<ScreenValuesArmed['kind'], 'none'>

type DisplayLanguage = 'ja' | 'en'

type ScaleEnd = 'max' | 'min' | null

export interface ScreenValuesStateCarried {
  readonly language: DisplayLanguage | null
  readonly rememberedActuals: Readonly<Record<number, RememberedActual>>
  readonly shapeKind: string
  readonly glyph: string
  readonly surfaceName: string
  readonly subject: PropertiesSubject
  readonly returnSubject: PropertiesSubject | null
  readonly percent: number
  readonly end: ScaleEnd
}

export interface ScreenValuesEventCarried {
  readonly isFullScreen: boolean
  readonly surfaceName: string
  readonly target: 'surface' | 'panel'
  readonly rung: EscapeTarget
  readonly armKind: ArmKind
  readonly shapeKind: string | null
  readonly glyph: string | null
  readonly isProceeding: boolean
  readonly subject: PropertiesSubject
  readonly noSurfaceNoConfirmation: boolean
  readonly noUnsettledEntry: boolean
  readonly agentApiEnabled: boolean
  readonly date: string
  readonly hasDaysToPlace: boolean
  readonly percent: number
  readonly end: ScaleEnd
  readonly language: DisplayLanguage
  readonly taskUid: number
  readonly rememberedActual: RememberedActual | null
}

type NoPayload = Readonly<Record<never, never>>

interface ScreenValuesEffectPayloads {
  readonly askBrowserForFullScreen: NoPayload
  readonly tellFlowSurfaceClosed: { readonly surfaceName: string }
  readonly matchWatermarkUnlock: NoPayload
  readonly raiseNotice: { readonly reason: 'RS-41' | 'RS-35' }
  readonly clearSelection: NoPayload
  readonly writeFoldAll: NoPayload
  readonly writeOpenLevel: NoPayload
  readonly writePlaceDualCursor: { readonly date: string }
  readonly writeFixDate1: { readonly date: string }
  readonly writeFixDate2: { readonly date: string }
  readonly writeClearDualCursor: NoPayload
  readonly startScaleMessageTimer: NoPayload
  readonly restartScaleMessageTimer: NoPayload
  readonly storeLanguage: { readonly language: DisplayLanguage }
  readonly writeProgressStep: { readonly taskUid: number }
}

export type ScreenValuesEffect = {
  readonly [N in ScreenValuesEffectName]: { readonly type: N } & ScreenValuesEffectPayloads[N]
}[ScreenValuesEffectName]

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region screen (tables T-280 to T-282).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type ScreenValuesKey =
  | 'screen'
  | 'screen.armed.none'
  | 'screen.armed.taskShape'
  | 'screen.armed.milestoneShape'
  | 'screen.armed.dependency'
  | 'screen.armed.commentBox'
  | 'screen.armed.highlightBox'
  | 'screen.palette.shown'
  | 'screen.palette.shown.expanded'
  | 'screen.palette.shown.minimised'
  | 'screen.palette.hidden'
  | 'screen.milestoneList.closed'
  | 'screen.milestoneList.open'
  | 'screen.fullScreen.normal'
  | 'screen.fullScreen.full'
  | 'screen.surface.none'
  | 'screen.surface.open'
  | 'screen.watermark.shown'
  | 'screen.watermark.hidden'
  | 'screen.properties.none'
  | 'screen.properties.selection'
  | 'screen.properties.documentSettings'
  | 'screen.dialogueField.shown'
  | 'screen.dialogueField.hidden'
  | 'screen.levelZero.unfolded'
  | 'screen.levelZero.folded'
  | 'screen.dualCursor.off'
  | 'screen.dualCursor.on'
  | 'screen.dualCursor.on.date1Following'
  | 'screen.dualCursor.on.date2Following'
  | 'screen.scaleMessage.none'
  | 'screen.scaleMessage.shown'
  | 'screen.tooltip.allowed'
  | 'screen.tooltip.dismissed'

export type ScreenValuesPaletteShown =
  | { readonly kind: 'expanded' }
  | { readonly kind: 'minimised' }

export type ScreenValuesDualCursorOn =
  | { readonly kind: 'date1Following' }
  | { readonly kind: 'date2Following' }

export type ScreenValuesArmed =
  | { readonly kind: 'none' }
  | { readonly kind: 'taskShape'; readonly shapeKind: ScreenValuesStateCarried['shapeKind'] }
  | { readonly kind: 'milestoneShape'; readonly glyph: ScreenValuesStateCarried['glyph'] }
  | { readonly kind: 'dependency' }
  | { readonly kind: 'commentBox' }
  | { readonly kind: 'highlightBox' }

export type ScreenValuesPalette =
  | { readonly kind: 'shown'; readonly child: ScreenValuesPaletteShown }
  | { readonly kind: 'hidden' }

export type ScreenValuesMilestoneList =
  | { readonly kind: 'closed' }
  | { readonly kind: 'open' }

export type ScreenValuesFullScreen =
  | { readonly kind: 'normal' }
  | { readonly kind: 'full' }

export type ScreenValuesSurface =
  | { readonly kind: 'none' }
  | { readonly kind: 'open'; readonly surfaceName: ScreenValuesStateCarried['surfaceName'] }

export type ScreenValuesWatermark =
  | { readonly kind: 'shown' }
  | { readonly kind: 'hidden' }

export type ScreenValuesProperties =
  | { readonly kind: 'none' }
  | { readonly kind: 'selection'; readonly subject: ScreenValuesStateCarried['subject'] }
  | { readonly kind: 'documentSettings'; readonly returnSubject: ScreenValuesStateCarried['returnSubject'] }

export type ScreenValuesDialogueField =
  | { readonly kind: 'shown' }
  | { readonly kind: 'hidden' }

export type ScreenValuesLevelZero =
  | { readonly kind: 'unfolded' }
  | { readonly kind: 'folded' }

export type ScreenValuesDualCursor =
  | { readonly kind: 'off' }
  | { readonly kind: 'on'; readonly child: ScreenValuesDualCursorOn }

export type ScreenValuesScaleMessage =
  | { readonly kind: 'none' }
  | { readonly kind: 'shown'; readonly percent: ScreenValuesStateCarried['percent']; readonly end: ScreenValuesStateCarried['end'] }

export type ScreenValuesTooltip =
  | { readonly kind: 'allowed' }
  | { readonly kind: 'dismissed' }

export interface ScreenValues {
  readonly language: ScreenValuesStateCarried['language']
  readonly rememberedActuals: ScreenValuesStateCarried['rememberedActuals']
  readonly armed: ScreenValuesArmed
  readonly palette: ScreenValuesPalette
  readonly milestoneList: ScreenValuesMilestoneList
  readonly fullScreen: ScreenValuesFullScreen
  readonly surface: ScreenValuesSurface
  readonly watermark: ScreenValuesWatermark
  readonly properties: ScreenValuesProperties
  readonly dialogueField: ScreenValuesDialogueField
  readonly levelZero: ScreenValuesLevelZero
  readonly dualCursor: ScreenValuesDualCursor
  readonly scaleMessage: ScreenValuesScaleMessage
  readonly tooltip: ScreenValuesTooltip
}

export type ScreenValuesAxes = Omit<ScreenValues, 'language' | 'rememberedActuals'>

export type ScreenValuesEvent =
  | { readonly type: 'paletteToggled' }
  | { readonly type: 'paletteMinimiseToggled' }
  | { readonly type: 'milestoneListToggled' }
  | { readonly type: 'fullScreenEntryPressed' }
  | { readonly type: 'fullScreenChanged'; readonly isFullScreen: ScreenValuesEventCarried['isFullScreen'] }
  | { readonly type: 'surfaceEntryPressed'; readonly surfaceName: ScreenValuesEventCarried['surfaceName'] }
  | { readonly type: 'surfaceRaisedByFlow'; readonly surfaceName: ScreenValuesEventCarried['surfaceName'] }
  | { readonly type: 'surfaceCloseAsked'; readonly target: ScreenValuesEventCarried['target'] }
  | { readonly type: 'escapePressed'; readonly rung: ScreenValuesEventCarried['rung'] }
  | { readonly type: 'armEntryPressed'; readonly armKind: ScreenValuesEventCarried['armKind']; readonly shapeKind: ScreenValuesEventCarried['shapeKind']; readonly glyph: ScreenValuesEventCarried['glyph'] }
  | { readonly type: 'watermarkEntryPressed' }
  | { readonly type: 'watermarkUnlockAnswered'; readonly isProceeding: ScreenValuesEventCarried['isProceeding'] }
  | { readonly type: 'watermarkUnlockMatched' }
  | { readonly type: 'watermarkUnlockMismatched' }
  | { readonly type: 'settingsEntryPressed' }
  | { readonly type: 'propertiesOfChoiceAsked'; readonly subject: ScreenValuesEventCarried['subject'] }
  | { readonly type: 'selectionMoved'; readonly subject: ScreenValuesEventCarried['subject'] }
  | { readonly type: 'createdNameSettled' }
  | { readonly type: 'settleKeyPressed'; readonly noSurfaceNoConfirmation: ScreenValuesEventCarried['noSurfaceNoConfirmation']; readonly noUnsettledEntry: ScreenValuesEventCarried['noUnsettledEntry'] }
  | { readonly type: 'dialogueFieldEntryPressed'; readonly agentApiEnabled: ScreenValuesEventCarried['agentApiEnabled'] }
  | { readonly type: 'foldAllPressed' }
  | { readonly type: 'levelZeroOpened' }
  | { readonly type: 'dualCursorEntryPressed'; readonly date: ScreenValuesEventCarried['date']; readonly hasDaysToPlace: ScreenValuesEventCarried['hasDaysToPlace'] }
  | { readonly type: 'dualCursorPlaced'; readonly date: ScreenValuesEventCarried['date'] }
  | { readonly type: 'displayScaleStepped'; readonly percent: ScreenValuesEventCarried['percent']; readonly end: ScreenValuesEventCarried['end'] }
  | { readonly type: 'rowZoomEndReached'; readonly percent: ScreenValuesEventCarried['percent']; readonly end: ScreenValuesEventCarried['end'] }
  | { readonly type: 'scaleMessageTimeElapsed' }
  | { readonly type: 'displayLanguageChosen'; readonly language: ScreenValuesEventCarried['language'] }
  | { readonly type: 'progressMarkerPressed'; readonly taskUid: ScreenValuesEventCarried['taskUid']; readonly rememberedActual: ScreenValuesEventCarried['rememberedActual'] }
  | { readonly type: 'pointerRestElapsed' }

export type ScreenValuesEffectName =
  | 'askBrowserForFullScreen'
  | 'tellFlowSurfaceClosed'
  | 'matchWatermarkUnlock'
  | 'raiseNotice'
  | 'clearSelection'
  | 'writeFoldAll'
  | 'writeOpenLevel'
  | 'writePlaceDualCursor'
  | 'writeFixDate1'
  | 'writeFixDate2'
  | 'writeClearDualCursor'
  | 'startScaleMessageTimer'
  | 'restartScaleMessageTimer'
  | 'storeLanguage'
  | 'writeProgressStep'

export interface ScreenValuesTransition {
  readonly id: string
  readonly from: readonly (readonly ScreenValuesKey[])[]
  readonly event: ScreenValuesEvent['type']
  readonly guard: string | null
  readonly to: readonly string[] | 'self'
  readonly effect: ScreenValuesEffectName | null
  readonly effectArgument: string | null
}

const SCREEN_VALUES_INITIAL_CHILDREN: {
  readonly 'screen.palette.shown': ScreenValuesPaletteShown
  readonly 'screen.dualCursor.on': ScreenValuesDualCursorOn
} = {
  'screen.palette.shown': { kind: 'expanded' },
  'screen.dualCursor.on': { kind: 'date1Following' },
}

const SCREEN_VALUES_INITIAL_AXES: ScreenValuesAxes = {
  armed: { kind: 'none' },
  palette: { kind: 'shown', child: SCREEN_VALUES_INITIAL_CHILDREN['screen.palette.shown'] },
  milestoneList: { kind: 'closed' },
  fullScreen: { kind: 'normal' },
  surface: { kind: 'none' },
  watermark: { kind: 'shown' },
  properties: { kind: 'none' },
  dialogueField: { kind: 'shown' },
  levelZero: { kind: 'unfolded' },
  dualCursor: { kind: 'off' },
  scaleMessage: { kind: 'none' },
  tooltip: { kind: 'allowed' },
}

export const SCREEN_VALUES_TRANSITIONS: readonly ScreenValuesTransition[] = [
  {
    id: 'TN-1',
    from: [['screen.palette.shown']],
    event: 'paletteToggled',
    guard: null,
    to: ['screen.palette.hidden'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-2',
    from: [['screen.palette.hidden']],
    event: 'paletteToggled',
    guard: null,
    to: ['screen.palette.shown'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-3',
    from: [['screen.palette.shown.expanded']],
    event: 'paletteMinimiseToggled',
    guard: null,
    to: ['screen.palette.shown.minimised'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-4',
    from: [['screen.palette.shown.minimised']],
    event: 'paletteMinimiseToggled',
    guard: null,
    to: ['screen.palette.shown.expanded'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-5',
    from: [['screen.milestoneList.closed']],
    event: 'milestoneListToggled',
    guard: null,
    to: ['screen.milestoneList.open'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-6',
    from: [['screen.milestoneList.open']],
    event: 'milestoneListToggled',
    guard: null,
    to: ['screen.milestoneList.closed'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-7',
    from: [['screen.fullScreen.normal'], ['screen.fullScreen.full']],
    event: 'fullScreenEntryPressed',
    guard: null,
    to: 'self',
    effect: 'askBrowserForFullScreen',
    effectArgument: null,
  },
  {
    id: 'TN-8',
    from: [['screen.fullScreen.normal']],
    event: 'fullScreenChanged',
    guard: 'isFullScreen',
    to: ['screen.fullScreen.full'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-9',
    from: [['screen.fullScreen.full']],
    event: 'fullScreenChanged',
    guard: 'not isFullScreen',
    to: ['screen.fullScreen.normal'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-10',
    from: [['screen.surface.none']],
    event: 'surfaceEntryPressed',
    guard: null,
    to: ['screen.surface.open'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-11',
    from: [['screen.surface.none']],
    event: 'surfaceRaisedByFlow',
    guard: null,
    to: ['screen.surface.open'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-12',
    from: [['screen.surface.open']],
    event: 'surfaceCloseAsked',
    guard: 'isSurfaceTarget',
    to: ['screen.surface.none'],
    effect: 'tellFlowSurfaceClosed',
    effectArgument: null,
  },
  {
    id: 'TN-13',
    from: [['screen.surface.open']],
    event: 'escapePressed',
    guard: 'rungIsSurface',
    to: ['screen.surface.none'],
    effect: 'tellFlowSurfaceClosed',
    effectArgument: null,
  },
  {
    id: 'TN-14',
    from: [['screen.armed.none']],
    event: 'armEntryPressed',
    guard: null,
    to: ['screen.armed.{armKind}'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-15',
    from: [['screen.armed.taskShape'], ['screen.armed.milestoneShape'], ['screen.armed.dependency'], ['screen.armed.commentBox'], ['screen.armed.highlightBox']],
    event: 'armEntryPressed',
    guard: 'isSameArm',
    to: ['screen.armed.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-16',
    from: [['screen.armed.taskShape'], ['screen.armed.milestoneShape'], ['screen.armed.dependency'], ['screen.armed.commentBox'], ['screen.armed.highlightBox']],
    event: 'armEntryPressed',
    guard: 'not isSameArm',
    to: ['screen.armed.{armKind}'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-17',
    from: [['screen.armed.taskShape'], ['screen.armed.milestoneShape'], ['screen.armed.dependency'], ['screen.armed.commentBox'], ['screen.armed.highlightBox']],
    event: 'escapePressed',
    guard: 'rungIsArmed',
    to: ['screen.armed.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-18',
    from: [['screen.armed.taskShape'], ['screen.armed.milestoneShape'], ['screen.armed.dependency'], ['screen.armed.commentBox'], ['screen.armed.highlightBox']],
    event: 'dualCursorEntryPressed',
    guard: 'entersDualCursor',
    to: ['screen.armed.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-19',
    from: [['screen.watermark.shown', 'screen.surface.none']],
    event: 'watermarkEntryPressed',
    guard: null,
    to: ['screen.surface.open'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-20',
    from: [['screen.watermark.hidden']],
    event: 'watermarkEntryPressed',
    guard: null,
    to: ['screen.watermark.shown'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-21',
    from: [['screen.surface.open']],
    event: 'watermarkUnlockAnswered',
    guard: 'isWatermarkUnlockSurface & isProceeding',
    to: 'self',
    effect: 'matchWatermarkUnlock',
    effectArgument: null,
  },
  {
    id: 'TN-22',
    from: [['screen.surface.open']],
    event: 'watermarkUnlockAnswered',
    guard: 'isWatermarkUnlockSurface & not isProceeding',
    to: ['screen.surface.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-23',
    from: [['screen.watermark.shown', 'screen.surface.open']],
    event: 'watermarkUnlockMatched',
    guard: 'isWatermarkUnlockSurface',
    to: ['screen.watermark.hidden', 'screen.surface.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-24',
    from: [['screen.surface.open']],
    event: 'watermarkUnlockMismatched',
    guard: 'isWatermarkUnlockSurface',
    to: 'self',
    effect: 'raiseNotice',
    effectArgument: 'RS-41',
  },
  {
    id: 'TN-25',
    from: [['screen.properties.none']],
    event: 'settingsEntryPressed',
    guard: null,
    to: ['screen.properties.documentSettings'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-26',
    from: [['screen.properties.selection']],
    event: 'settingsEntryPressed',
    guard: null,
    to: ['screen.properties.documentSettings'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-27',
    from: [['screen.properties.documentSettings']],
    event: 'settingsEntryPressed',
    guard: null,
    to: ['screen.properties.selection'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-28',
    from: [['screen.properties.none'], ['screen.properties.documentSettings']],
    event: 'propertiesOfChoiceAsked',
    guard: null,
    to: ['screen.properties.selection'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-29',
    from: [['screen.properties.selection']],
    event: 'propertiesOfChoiceAsked',
    guard: null,
    to: 'self',
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-30',
    from: [['screen.properties.selection']],
    event: 'selectionMoved',
    guard: 'hasChoice',
    to: 'self',
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-31',
    from: [['screen.properties.selection'], ['screen.properties.documentSettings']],
    event: 'surfaceCloseAsked',
    guard: 'isPanelTarget',
    to: ['screen.properties.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-32',
    from: [['screen.properties.selection'], ['screen.properties.documentSettings']],
    event: 'escapePressed',
    guard: 'rungIsSurface & isPanelTopmost',
    to: ['screen.properties.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-33',
    from: [['screen.properties.none'], ['screen.properties.selection'], ['screen.properties.documentSettings']],
    event: 'createdNameSettled',
    guard: null,
    to: ['screen.properties.none'],
    effect: 'clearSelection',
    effectArgument: null,
  },
  {
    id: 'TN-34',
    from: [['screen.properties.selection'], ['screen.properties.documentSettings']],
    event: 'settleKeyPressed',
    guard: 'noSurfaceNoConfirmation & noUnsettledEntry',
    to: ['screen.properties.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-35',
    from: [['screen.dialogueField.shown']],
    event: 'dialogueFieldEntryPressed',
    guard: 'agentApiEnabled',
    to: ['screen.dialogueField.hidden'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-36',
    from: [['screen.dialogueField.hidden']],
    event: 'dialogueFieldEntryPressed',
    guard: 'agentApiEnabled',
    to: ['screen.dialogueField.shown'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-37',
    from: [['screen.dialogueField.shown'], ['screen.dialogueField.hidden']],
    event: 'dialogueFieldEntryPressed',
    guard: 'not agentApiEnabled',
    to: 'self',
    effect: 'raiseNotice',
    effectArgument: 'RS-35',
  },
  {
    id: 'TN-38',
    from: [['screen.levelZero.unfolded']],
    event: 'foldAllPressed',
    guard: null,
    to: ['screen.levelZero.folded'],
    effect: 'writeFoldAll',
    effectArgument: null,
  },
  {
    id: 'TN-39',
    from: [['screen.levelZero.folded']],
    event: 'levelZeroOpened',
    guard: null,
    to: ['screen.levelZero.unfolded'],
    effect: 'writeOpenLevel',
    effectArgument: null,
  },
  {
    id: 'TN-40',
    from: [['screen.dualCursor.off']],
    event: 'dualCursorEntryPressed',
    guard: 'hasDaysToPlace',
    to: ['screen.dualCursor.on'],
    effect: 'writePlaceDualCursor',
    effectArgument: null,
  },
  {
    id: 'TN-41',
    from: [['screen.dualCursor.on.date1Following']],
    event: 'dualCursorPlaced',
    guard: null,
    to: ['screen.dualCursor.on.date2Following'],
    effect: 'writeFixDate1',
    effectArgument: null,
  },
  {
    id: 'TN-42',
    from: [['screen.dualCursor.on.date2Following']],
    event: 'dualCursorPlaced',
    guard: null,
    to: ['screen.dualCursor.on.date1Following'],
    effect: 'writeFixDate2',
    effectArgument: null,
  },
  {
    id: 'TN-43',
    from: [['screen.dualCursor.on']],
    event: 'dualCursorEntryPressed',
    guard: null,
    to: ['screen.dualCursor.off'],
    effect: 'writeClearDualCursor',
    effectArgument: null,
  },
  {
    id: 'TN-44',
    from: [['screen.dualCursor.on']],
    event: 'escapePressed',
    guard: 'rungIsDualCursor',
    to: ['screen.dualCursor.off'],
    effect: 'writeClearDualCursor',
    effectArgument: null,
  },
  {
    id: 'TN-45',
    from: [['screen.scaleMessage.none']],
    event: 'displayScaleStepped',
    guard: null,
    to: ['screen.scaleMessage.shown'],
    effect: 'startScaleMessageTimer',
    effectArgument: null,
  },
  {
    id: 'TN-46',
    from: [['screen.scaleMessage.none']],
    event: 'rowZoomEndReached',
    guard: null,
    to: ['screen.scaleMessage.shown'],
    effect: 'startScaleMessageTimer',
    effectArgument: null,
  },
  {
    id: 'TN-47',
    from: [['screen.scaleMessage.shown']],
    event: 'displayScaleStepped',
    guard: null,
    to: 'self',
    effect: 'restartScaleMessageTimer',
    effectArgument: null,
  },
  {
    id: 'TN-48',
    from: [['screen.scaleMessage.shown']],
    event: 'rowZoomEndReached',
    guard: null,
    to: 'self',
    effect: 'restartScaleMessageTimer',
    effectArgument: null,
  },
  {
    id: 'TN-49',
    from: [['screen.scaleMessage.shown']],
    event: 'scaleMessageTimeElapsed',
    guard: null,
    to: ['screen.scaleMessage.none'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-50',
    from: [['screen']],
    event: 'displayLanguageChosen',
    guard: null,
    to: 'self',
    effect: 'storeLanguage',
    effectArgument: null,
  },
  {
    id: 'TN-51',
    from: [['screen']],
    event: 'progressMarkerPressed',
    guard: null,
    to: 'self',
    effect: 'writeProgressStep',
    effectArgument: null,
  },
  {
    id: 'TN-52',
    from: [['screen.tooltip.allowed']],
    event: 'escapePressed',
    guard: 'rungIsTooltip',
    to: ['screen.tooltip.dismissed'],
    effect: null,
    effectArgument: null,
  },
  {
    id: 'TN-53',
    from: [['screen.tooltip.dismissed']],
    event: 'pointerRestElapsed',
    guard: null,
    to: ['screen.tooltip.allowed'],
    effect: null,
    effectArgument: null,
  },
]
// </generated>

type ScreenStep = Step<ScreenValues, ScreenValuesEffect>

type EventOf<T extends ScreenValuesEvent['type']> = Extract<ScreenValuesEvent, { readonly type: T }>

const WATERMARK_UNLOCK_SURFACE = 'U-60'

const NO_REMEMBERED_ACTUALS: Readonly<Record<number, RememberedActual>> = Object.freeze({})

export const emptyScreenValues: ScreenValues = {
  ...SCREEN_VALUES_INITIAL_AXES,
  language: null,
  rememberedActuals: NO_REMEMBERED_ACTUALS,
}

/** @purity pure */
function moved(
  values: ScreenValues,
  patch: Partial<ScreenValues>,
  effects: readonly ScreenValuesEffect[] = NO_EFFECTS,
): ScreenStep {
  return { state: { ...values, ...patch }, effects }
}

/** @purity pure */
function stayed(values: ScreenValues, effects: readonly ScreenValuesEffect[]): ScreenStep {
  return { state: values, effects }
}

// see TN-1, TN-2
/** @purity pure */
function onPaletteToggled(values: ScreenValues): ScreenStep {
  if (values.palette.kind === 'hidden') {
    const child = SCREEN_VALUES_INITIAL_CHILDREN['screen.palette.shown']
    return moved(values, { palette: { kind: 'shown', child } })
  }
  return moved(values, { palette: { kind: 'hidden' } })
}

// see TN-3, TN-4
/** @purity pure */
function onPaletteMinimiseToggled(values: ScreenValues): ScreenStep {
  const palette = values.palette
  if (palette.kind === 'hidden') return unchanged(values)
  const kind = palette.child.kind === 'expanded' ? 'minimised' : 'expanded'
  return moved(values, { palette: { kind: 'shown', child: { kind } } })
}

// see TN-5, TN-6
/** @purity pure */
function onMilestoneListToggled(values: ScreenValues): ScreenStep {
  const kind = values.milestoneList.kind === 'closed' ? 'open' : 'closed'
  return moved(values, { milestoneList: { kind } })
}

// see TN-7
/** @purity pure */
function onFullScreenEntryPressed(values: ScreenValues): ScreenStep {
  return stayed(values, [{ type: 'askBrowserForFullScreen' }])
}

// see TN-8, TN-9
/** @purity pure */
function onFullScreenChanged(values: ScreenValues, event: EventOf<'fullScreenChanged'>): ScreenStep {
  const isFull = values.fullScreen.kind === 'full'
  if (isFull === event.isFullScreen) return unchanged(values)
  return moved(values, { fullScreen: { kind: event.isFullScreen ? 'full' : 'normal' } })
}

// see TN-10, TN-11
/** @purity pure */
function onSurfaceOpened(
  values: ScreenValues,
  event: EventOf<'surfaceEntryPressed'> | EventOf<'surfaceRaisedByFlow'>,
): ScreenStep {
  if (values.surface.kind === 'open') return unchanged(values)
  return moved(values, { surface: { kind: 'open', surfaceName: event.surfaceName } })
}

// see TN-12, TN-13
/** @purity pure */
function surfaceClosed(values: ScreenValues): ScreenStep {
  const surface = values.surface
  if (surface.kind === 'none') return unchanged(values)
  return moved(values, { surface: { kind: 'none' } }, [
    { type: 'tellFlowSurfaceClosed', surfaceName: surface.surfaceName },
  ])
}

// see TN-31, TN-32, TN-34
/** @purity pure */
function propertiesPutAway(values: ScreenValues): ScreenStep {
  if (values.properties.kind === 'none') return unchanged(values)
  return moved(values, { properties: { kind: 'none' } })
}

/** @purity pure */
function onSurfaceCloseAsked(values: ScreenValues, event: EventOf<'surfaceCloseAsked'>): ScreenStep {
  if (values.surface.kind === 'none' && values.properties.kind === 'none') return unchanged(values)
  return event.target === 'surface' ? surfaceClosed(values) : propertiesPutAway(values)
}

/** @purity pure */
function surfaceRungConsumed(values: ScreenValues): ScreenStep {
  const isPanelTopmost = values.surface.kind === 'none'
  return isPanelTopmost ? propertiesPutAway(values) : surfaceClosed(values)
}

/** @purity pure */
function disarmed(values: ScreenValues): ScreenStep {
  if (values.armed.kind === 'none') return unchanged(values)
  return moved(values, { armed: { kind: 'none' } })
}

// see TN-43, TN-44
/** @purity pure */
function dualCursorCleared(values: ScreenValues): ScreenStep {
  if (values.dualCursor.kind === 'off') return unchanged(values)
  return moved(values, { dualCursor: { kind: 'off' } }, [{ type: 'writeClearDualCursor' }])
}

/** @purity pure */
function tooltipDismissed(values: ScreenValues): ScreenStep {
  if (values.tooltip.kind === 'dismissed') return unchanged(values)
  return moved(values, { tooltip: { kind: 'dismissed' } })
}

// see TN-13, TN-17, TN-32, TN-44, TN-52, IN-4
/** @purity pure */
function onEscapePressed(values: ScreenValues, event: EventOf<'escapePressed'>): ScreenStep {
  if (event.rung === 'surface') return surfaceRungConsumed(values)
  if (event.rung === 'armed') return disarmed(values)
  if (event.rung === 'dualCursorMode') return dualCursorCleared(values)
  if (event.rung === 'tooltip') return tooltipDismissed(values)
  return unchanged(values)
}

/** @purity pure */
function required<T>(value: T | null, name: string): T {
  if (value === null) throw new RangeError(`armEntryPressed carries no ${name}`)
  return value
}

const ARMED_BY_KIND: {
  readonly [K in ArmKind]: (event: EventOf<'armEntryPressed'>) => ScreenValuesArmed
} = {
  taskShape: (event) => ({ kind: 'taskShape', shapeKind: required(event.shapeKind, 'shapeKind') }),
  milestoneShape: (event) => ({ kind: 'milestoneShape', glyph: required(event.glyph, 'glyph') }),
  dependency: () => ({ kind: 'dependency' }),
  commentBox: () => ({ kind: 'commentBox' }),
  highlightBox: () => ({ kind: 'highlightBox' }),
}

/** @purity pure */
function carriedArmOf(armed: ScreenValuesArmed): string | null {
  switch (armed.kind) {
    case 'taskShape':
      return armed.shapeKind
    case 'milestoneShape':
      return armed.glyph
    case 'none':
    case 'dependency':
    case 'commentBox':
    case 'highlightBox':
      return null
    default:
      return assertNever(armed)
  }
}

// see TN-14, TN-15, TN-16, FR-016
/** @purity pure */
function onArmEntryPressed(values: ScreenValues, event: EventOf<'armEntryPressed'>): ScreenStep {
  const entered = ARMED_BY_KIND[event.armKind](event)
  const current = values.armed
  const isSameArm = current.kind === entered.kind && carriedArmOf(current) === carriedArmOf(entered)
  return moved(values, { armed: isSameArm ? { kind: 'none' } : entered })
}

// see TN-19, TN-20
/** @purity pure */
function onWatermarkEntryPressed(values: ScreenValues): ScreenStep {
  if (values.watermark.kind === 'hidden') return moved(values, { watermark: { kind: 'shown' } })
  if (values.surface.kind === 'open') return unchanged(values)
  return moved(values, { surface: { kind: 'open', surfaceName: WATERMARK_UNLOCK_SURFACE } })
}

/** @purity pure */
function isWatermarkUnlockSurface(values: ScreenValues): boolean {
  return values.surface.kind === 'open' && values.surface.surfaceName === WATERMARK_UNLOCK_SURFACE
}

// see TN-21, TN-22
/** @purity pure */
function onWatermarkUnlockAnswered(
  values: ScreenValues,
  event: EventOf<'watermarkUnlockAnswered'>,
): ScreenStep {
  if (!isWatermarkUnlockSurface(values)) return unchanged(values)
  if (event.isProceeding) return stayed(values, [{ type: 'matchWatermarkUnlock' }])
  return moved(values, { surface: { kind: 'none' } })
}

// see TN-23
/** @purity pure */
function onWatermarkUnlockMatched(values: ScreenValues): ScreenStep {
  if (values.watermark.kind === 'hidden' || !isWatermarkUnlockSurface(values)) {
    return unchanged(values)
  }
  return moved(values, { watermark: { kind: 'hidden' }, surface: { kind: 'none' } })
}

// see TN-24
/** @purity pure */
function onWatermarkUnlockMismatched(values: ScreenValues): ScreenStep {
  if (!isWatermarkUnlockSurface(values)) return unchanged(values)
  return stayed(values, [{ type: 'raiseNotice', reason: 'RS-41' }])
}

// see TN-25, TN-26, TN-27
/** @purity pure */
function onSettingsEntryPressed(values: ScreenValues): ScreenStep {
  const properties = values.properties
  if (properties.kind === 'documentSettings') {
    const subject = properties.returnSubject ?? { selection: emptySelection(), groupIds: [] }
    return moved(values, { properties: { kind: 'selection', subject } })
  }
  const returnSubject = properties.kind === 'selection' ? properties.subject : null
  return moved(values, { properties: { kind: 'documentSettings', returnSubject } })
}

// see TN-28, TN-29
/** @purity pure */
function onPropertiesOfChoiceAsked(
  values: ScreenValues,
  event: EventOf<'propertiesOfChoiceAsked'>,
): ScreenStep {
  return moved(values, { properties: { kind: 'selection', subject: event.subject } })
}

// see TN-30
/** @purity pure */
function onSelectionMoved(values: ScreenValues, event: EventOf<'selectionMoved'>): ScreenStep {
  if (values.properties.kind !== 'selection') return unchanged(values)
  const subject = event.subject
  const hasChoice = subject.selection.items.length > 0 || subject.groupIds.length > 0
  if (!hasChoice) return unchanged(values)
  return moved(values, { properties: { kind: 'selection', subject } })
}

// see TN-33
/** @purity pure */
function onCreatedNameSettled(values: ScreenValues): ScreenStep {
  const effects: readonly ScreenValuesEffect[] = [{ type: 'clearSelection' }]
  if (values.properties.kind === 'none') return stayed(values, effects)
  return moved(values, { properties: { kind: 'none' } }, effects)
}

// see TN-34
/** @purity pure */
function onSettleKeyPressed(values: ScreenValues, event: EventOf<'settleKeyPressed'>): ScreenStep {
  if (values.properties.kind === 'none') return unchanged(values)
  if (!event.noSurfaceNoConfirmation || !event.noUnsettledEntry) return unchanged(values)
  return propertiesPutAway(values)
}

// see TN-35, TN-36, TN-37
/** @purity pure */
function onDialogueFieldEntryPressed(
  values: ScreenValues,
  event: EventOf<'dialogueFieldEntryPressed'>,
): ScreenStep {
  if (!event.agentApiEnabled) return stayed(values, [{ type: 'raiseNotice', reason: 'RS-35' }])
  const kind = values.dialogueField.kind === 'shown' ? 'hidden' : 'shown'
  return moved(values, { dialogueField: { kind } })
}

// see TN-38
/** @purity pure */
function onFoldAllPressed(values: ScreenValues): ScreenStep {
  if (values.levelZero.kind === 'folded') return unchanged(values)
  return moved(values, { levelZero: { kind: 'folded' } }, [{ type: 'writeFoldAll' }])
}

// see TN-39
/** @purity pure */
function onLevelZeroOpened(values: ScreenValues): ScreenStep {
  if (values.levelZero.kind === 'unfolded') return unchanged(values)
  return moved(values, { levelZero: { kind: 'unfolded' } }, [{ type: 'writeOpenLevel' }])
}

// see TN-18, TN-40, TN-43, FR-016
/** @purity pure */
function onDualCursorEntryPressed(
  values: ScreenValues,
  event: EventOf<'dualCursorEntryPressed'>,
): ScreenStep {
  if (values.dualCursor.kind === 'on') return dualCursorCleared(values)
  if (!event.hasDaysToPlace) return unchanged(values)
  const child = SCREEN_VALUES_INITIAL_CHILDREN['screen.dualCursor.on']
  const armed = values.armed.kind === 'none' ? values.armed : ({ kind: 'none' } as const)
  return moved(values, { dualCursor: { kind: 'on', child }, armed }, [
    { type: 'writePlaceDualCursor', date: event.date },
  ])
}

// see TN-41, TN-42
/** @purity pure */
function onDualCursorPlaced(values: ScreenValues, event: EventOf<'dualCursorPlaced'>): ScreenStep {
  const dualCursor = values.dualCursor
  if (dualCursor.kind === 'off') return unchanged(values)
  if (dualCursor.child.kind === 'date1Following') {
    const child = { kind: 'date2Following' } as const
    return moved(values, { dualCursor: { kind: 'on', child } }, [
      { type: 'writeFixDate1', date: event.date },
    ])
  }
  const child = { kind: 'date1Following' } as const
  return moved(values, { dualCursor: { kind: 'on', child } }, [
    { type: 'writeFixDate2', date: event.date },
  ])
}

// see TN-45, TN-46, TN-47, TN-48
/** @purity pure */
function onScaleMessageRaised(
  values: ScreenValues,
  event: EventOf<'displayScaleStepped'> | EventOf<'rowZoomEndReached'>,
): ScreenStep {
  const timer = values.scaleMessage.kind === 'none' ? 'startScaleMessageTimer' : 'restartScaleMessageTimer'
  const scaleMessage = { kind: 'shown', percent: event.percent, end: event.end } as const
  return moved(values, { scaleMessage }, [{ type: timer }])
}

// see TN-49
/** @purity pure */
function onScaleMessageTimeElapsed(values: ScreenValues): ScreenStep {
  if (values.scaleMessage.kind === 'none') return unchanged(values)
  return moved(values, { scaleMessage: { kind: 'none' } })
}

// see TN-50
/** @purity pure */
function onDisplayLanguageChosen(
  values: ScreenValues,
  event: EventOf<'displayLanguageChosen'>,
): ScreenStep {
  return moved(values, { language: event.language }, [
    { type: 'storeLanguage', language: event.language },
  ])
}

// see TN-51, PV-4
/** @purity pure */
function onProgressMarkerPressed(
  values: ScreenValues,
  event: EventOf<'progressMarkerPressed'>,
): ScreenStep {
  const held = values.rememberedActuals
  const kept = Object.entries(held).filter(([uid]) => Number(uid) !== event.taskUid)
  const remembered = event.rememberedActual
  const rememberedActuals =
    remembered === null ? Object.fromEntries(kept) : { ...held, [event.taskUid]: remembered }
  return moved(values, { rememberedActuals }, [{ type: 'writeProgressStep', taskUid: event.taskUid }])
}

// see TN-53
/** @purity pure */
function onPointerRestElapsed(values: ScreenValues): ScreenStep {
  if (values.tooltip.kind === 'allowed') return unchanged(values)
  return moved(values, { tooltip: { kind: 'allowed' } })
}

// WHY: a table from event type to function, not one switch: thirty cases would cross the
// function-size band, and the mapped type still refuses a missing event as `never` would.
const HANDLERS: {
  readonly [T in ScreenValuesEvent['type']]: (values: ScreenValues, event: EventOf<T>) => ScreenStep
} = {
  paletteToggled: onPaletteToggled,
  paletteMinimiseToggled: onPaletteMinimiseToggled,
  milestoneListToggled: onMilestoneListToggled,
  fullScreenEntryPressed: onFullScreenEntryPressed,
  fullScreenChanged: onFullScreenChanged,
  surfaceEntryPressed: onSurfaceOpened,
  surfaceRaisedByFlow: onSurfaceOpened,
  surfaceCloseAsked: onSurfaceCloseAsked,
  escapePressed: onEscapePressed,
  armEntryPressed: onArmEntryPressed,
  watermarkEntryPressed: onWatermarkEntryPressed,
  watermarkUnlockAnswered: onWatermarkUnlockAnswered,
  watermarkUnlockMatched: onWatermarkUnlockMatched,
  watermarkUnlockMismatched: onWatermarkUnlockMismatched,
  settingsEntryPressed: onSettingsEntryPressed,
  propertiesOfChoiceAsked: onPropertiesOfChoiceAsked,
  selectionMoved: onSelectionMoved,
  createdNameSettled: onCreatedNameSettled,
  settleKeyPressed: onSettleKeyPressed,
  dialogueFieldEntryPressed: onDialogueFieldEntryPressed,
  foldAllPressed: onFoldAllPressed,
  levelZeroOpened: onLevelZeroOpened,
  dualCursorEntryPressed: onDualCursorEntryPressed,
  dualCursorPlaced: onDualCursorPlaced,
  displayScaleStepped: onScaleMessageRaised,
  rowZoomEndReached: onScaleMessageRaised,
  scaleMessageTimeElapsed: onScaleMessageTimeElapsed,
  displayLanguageChosen: onDisplayLanguageChosen,
  progressMarkerPressed: onProgressMarkerPressed,
  pointerRestElapsed: onPointerRestElapsed,
}

// see SF-2, SF-8, T-282
/** @purity pure */
export function stepScreenValues(values: ScreenValues, event: ScreenValuesEvent): ScreenStep {
  const handler = HANDLERS[event.type] as (values: ScreenValues, event: ScreenValuesEvent) => ScreenStep
  return handler(values, event)
}
