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
import type { DocumentCommand } from '../edit-document/edit-document'
import { assertNever, NO_EFFECTS, unchanged, type Step } from './session-step'

// see FR-072
export interface PropertiesSubject {
  readonly selection: Selection
  readonly groupIds: readonly string[]
}

export type ArmKind = Exclude<ArmModeState['kind'], 'notArmed'>

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
  readonly hasNoSurfaceOrConfirmation: boolean
  readonly hasNoUnsettledEntry: boolean
  readonly isAgentApiEnabled: boolean
  readonly date: string
  readonly hasDaysToPlace: boolean
  readonly percent: number
  readonly end: ScaleEnd
  readonly language: DisplayLanguage
  readonly taskUid: number
  readonly rememberedActual: RememberedActual | null
  readonly writes: readonly DocumentCommand[]
}

type NoPayload = Readonly<Record<never, never>>

type Carried = Pick<ScreenValuesEventCarried, 'writes'>

interface ScreenValuesEffectPayloads {
  readonly askBrowserForFullScreen: NoPayload
  readonly tellFlowSurfaceClosed: { readonly surfaceName: string }
  readonly matchWatermarkUnlock: NoPayload
  readonly raiseNotice: { readonly reason: 'RS-41' | 'RS-35' }
  readonly clearSelection: NoPayload
  readonly writeFoldAll: Carried
  readonly writeOpenLevel: Carried
  readonly writePlaceDualCursor: { readonly date: string } & Carried
  readonly writeFixDate1: { readonly date: string } & Carried
  readonly writeFixDate2: { readonly date: string } & Carried
  readonly writeClearDualCursor: NoPayload
  readonly startScaleMessageTimer: NoPayload
  readonly restartScaleMessageTimer: NoPayload
  readonly storeLanguage: { readonly language: DisplayLanguage }
  readonly writeProgressStep: { readonly taskUid: number } & Carried
}

export type ScreenValuesEffect = {
  readonly [N in ScreenValuesEffectName]: { readonly type: N } & ScreenValuesEffectPayloads[N]
}[ScreenValuesEffectName]

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region screen (table T-280).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type ScreenValuesKey =
  | 'screen'
  | 'armModeStateMachine.notArmed'
  | 'armModeStateMachine.taskShapeArmed'
  | 'armModeStateMachine.milestoneShapeArmed'
  | 'armModeStateMachine.dependencyArmed'
  | 'armModeStateMachine.commentBoxArmed'
  | 'armModeStateMachine.highlightBoxArmed'
  | 'paletteDisplayStateMachine.shown'
  | 'paletteDisplayStateMachine.shown.expanded'
  | 'paletteDisplayStateMachine.shown.minimised'
  | 'paletteDisplayStateMachine.hidden'
  | 'milestoneListDisplayStateMachine.closed'
  | 'milestoneListDisplayStateMachine.open'
  | 'fullScreenModeStateMachine.normal'
  | 'fullScreenModeStateMachine.full'
  | 'openSurfaceStateMachine.closed'
  | 'openSurfaceStateMachine.open'
  | 'watermarkDisplayStateMachine.shown'
  | 'watermarkDisplayStateMachine.hidden'
  | 'propertiesPanelContentStateMachine.hidden'
  | 'propertiesPanelContentStateMachine.selectionDisplayed'
  | 'propertiesPanelContentStateMachine.documentSettingsDisplayed'
  | 'dialogueFieldDisplayStateMachine.shown'
  | 'dialogueFieldDisplayStateMachine.hidden'
  | 'levelZeroFoldStateMachine.unfolded'
  | 'levelZeroFoldStateMachine.folded'
  | 'dualCursorModeStateMachine.off'
  | 'dualCursorModeStateMachine.on'
  | 'dualCursorModeStateMachine.on.placingDate1'
  | 'dualCursorModeStateMachine.on.placingDate2'
  | 'scaleMessageDisplayStateMachine.hidden'
  | 'scaleMessageDisplayStateMachine.shown'
  | 'tooltipDisplayStateMachine.allowed'
  | 'tooltipDisplayStateMachine.dismissed'

export type PaletteDisplayShownState =
  | { readonly kind: 'expanded' }
  | { readonly kind: 'minimised' }

export type DualCursorModeOnState =
  | { readonly kind: 'placingDate1' }
  | { readonly kind: 'placingDate2' }

export type ArmModeState =
  | { readonly kind: 'notArmed' }
  | { readonly kind: 'taskShapeArmed'; readonly shapeKind: ScreenValuesStateCarried['shapeKind'] }
  | { readonly kind: 'milestoneShapeArmed'; readonly glyph: ScreenValuesStateCarried['glyph'] }
  | { readonly kind: 'dependencyArmed' }
  | { readonly kind: 'commentBoxArmed' }
  | { readonly kind: 'highlightBoxArmed' }

export type PaletteDisplayState =
  | { readonly kind: 'shown'; readonly child: PaletteDisplayShownState }
  | { readonly kind: 'hidden' }

export type MilestoneListDisplayState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'open' }

export type FullScreenModeState =
  | { readonly kind: 'normal' }
  | { readonly kind: 'full' }

export type OpenSurfaceState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'open'; readonly surfaceName: ScreenValuesStateCarried['surfaceName'] }

export type WatermarkDisplayState =
  | { readonly kind: 'shown' }
  | { readonly kind: 'hidden' }

export type PropertiesPanelContentState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'selectionDisplayed'; readonly subject: ScreenValuesStateCarried['subject'] }
  | { readonly kind: 'documentSettingsDisplayed'; readonly returnSubject: ScreenValuesStateCarried['returnSubject'] }

export type DialogueFieldDisplayState =
  | { readonly kind: 'shown' }
  | { readonly kind: 'hidden' }

export type LevelZeroFoldState =
  | { readonly kind: 'unfolded' }
  | { readonly kind: 'folded' }

export type DualCursorModeState =
  | { readonly kind: 'off' }
  | { readonly kind: 'on'; readonly child: DualCursorModeOnState }

export type ScaleMessageDisplayState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'shown'; readonly percent: ScreenValuesStateCarried['percent']; readonly end: ScreenValuesStateCarried['end'] }

export type TooltipDisplayState =
  | { readonly kind: 'allowed' }
  | { readonly kind: 'dismissed' }

export interface ScreenValues {
  readonly language: ScreenValuesStateCarried['language']
  readonly rememberedActuals: ScreenValuesStateCarried['rememberedActuals']
  readonly armModeState: ArmModeState
  readonly paletteDisplayState: PaletteDisplayState
  readonly milestoneListDisplayState: MilestoneListDisplayState
  readonly fullScreenModeState: FullScreenModeState
  readonly openSurfaceState: OpenSurfaceState
  readonly watermarkDisplayState: WatermarkDisplayState
  readonly propertiesPanelContentState: PropertiesPanelContentState
  readonly dialogueFieldDisplayState: DialogueFieldDisplayState
  readonly levelZeroFoldState: LevelZeroFoldState
  readonly dualCursorModeState: DualCursorModeState
  readonly scaleMessageDisplayState: ScaleMessageDisplayState
  readonly tooltipDisplayState: TooltipDisplayState
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
  | { readonly type: 'flowSurfaceAnswered'; readonly surfaceName: ScreenValuesEventCarried['surfaceName'] }
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
  | { readonly type: 'settleKeyPressed'; readonly hasNoSurfaceOrConfirmation: ScreenValuesEventCarried['hasNoSurfaceOrConfirmation']; readonly hasNoUnsettledEntry: ScreenValuesEventCarried['hasNoUnsettledEntry'] }
  | { readonly type: 'dialogueFieldEntryPressed'; readonly isAgentApiEnabled: ScreenValuesEventCarried['isAgentApiEnabled'] }
  | { readonly type: 'foldAllPressed'; readonly writes: ScreenValuesEventCarried['writes'] }
  | { readonly type: 'levelZeroOpened'; readonly writes: ScreenValuesEventCarried['writes'] }
  | { readonly type: 'dualCursorEntryPressed'; readonly date: ScreenValuesEventCarried['date']; readonly hasDaysToPlace: ScreenValuesEventCarried['hasDaysToPlace']; readonly writes: ScreenValuesEventCarried['writes'] }
  | { readonly type: 'guideCursorEntryPressed'; readonly guideCursor: ScreenValuesEventCarried['guideCursor'] }
  | { readonly type: 'dualCursorPlaced'; readonly date: ScreenValuesEventCarried['date']; readonly writes: ScreenValuesEventCarried['writes'] }
  | { readonly type: 'displayScaleStepped'; readonly percent: ScreenValuesEventCarried['percent']; readonly end: ScreenValuesEventCarried['end'] }
  | { readonly type: 'rowZoomEndReached'; readonly percent: ScreenValuesEventCarried['percent']; readonly end: ScreenValuesEventCarried['end'] }
  | { readonly type: 'scaleMessageTimeElapsed' }
  | { readonly type: 'displayLanguageChosen'; readonly language: ScreenValuesEventCarried['language'] }
  | { readonly type: 'progressMarkerPressed'; readonly taskUid: ScreenValuesEventCarried['taskUid']; readonly rememberedActual: ScreenValuesEventCarried['rememberedActual']; readonly writes: ScreenValuesEventCarried['writes'] }
  | { readonly type: 'pointerRestElapsed' }

export type ScreenValuesEffectName =
  | 'storeLanguage'
  | 'writeProgressStep'
  | 'askBrowserForFullScreen'
  | 'tellFlowSurfaceClosed'
  | 'matchWatermarkUnlock'
  | 'raiseNotice'
  | 'clearSelection'
  | 'writeFoldAll'
  | 'writeOpenLevel'
  | 'writeClearDualCursor'
  | 'writePlaceDualCursorClearingGuide'
  | 'writeClearDualCursorSettingGuide'
  | 'writeFixDate1'
  | 'writeFixDate2'
  | 'startScaleMessageTimer'
  | 'restartScaleMessageTimer'

export interface ScreenValuesTransition {
  readonly state: ScreenValuesKey
  readonly event: ScreenValuesEvent['type']
  readonly guard: string | null
  readonly to: string
  readonly effect: ScreenValuesEffectName | null
  readonly effectArgument: string | null
}

const SCREEN_VALUES_INITIAL_CHILDREN: {
  readonly 'paletteDisplayStateMachine.shown': PaletteDisplayShownState
  readonly 'dualCursorModeStateMachine.on': DualCursorModeOnState
} = {
  'paletteDisplayStateMachine.shown': { kind: 'expanded' },
  'dualCursorModeStateMachine.on': { kind: 'placingDate1' },
}

const SCREEN_VALUES_INITIAL_AXES: ScreenValuesAxes = {
  armModeState: { kind: 'notArmed' },
  paletteDisplayState: { kind: 'shown', child: SCREEN_VALUES_INITIAL_CHILDREN['paletteDisplayStateMachine.shown'] },
  milestoneListDisplayState: { kind: 'closed' },
  fullScreenModeState: { kind: 'normal' },
  openSurfaceState: { kind: 'closed' },
  watermarkDisplayState: { kind: 'shown' },
  propertiesPanelContentState: { kind: 'hidden' },
  dialogueFieldDisplayState: { kind: 'shown' },
  levelZeroFoldState: { kind: 'unfolded' },
  dualCursorModeState: { kind: 'off' },
  scaleMessageDisplayState: { kind: 'hidden' },
  tooltipDisplayState: { kind: 'allowed' },
}

export const SCREEN_VALUES_TRANSITIONS: readonly ScreenValuesTransition[] = [
  {
    state: 'screen',
    event: 'displayLanguageChosen',
    guard: null,
    to: 'screen',
    effect: 'storeLanguage',
    effectArgument: null,
  },
  {
    state: 'screen',
    event: 'progressMarkerPressed',
    guard: null,
    to: 'screen',
    effect: 'writeProgressStep',
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.taskShapeArmed',
    event: 'escapePressed',
    guard: 'isRungArmed',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.milestoneShapeArmed',
    event: 'escapePressed',
    guard: 'isRungArmed',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.dependencyArmed',
    event: 'escapePressed',
    guard: 'isRungArmed',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.commentBoxArmed',
    event: 'escapePressed',
    guard: 'isRungArmed',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.highlightBoxArmed',
    event: 'escapePressed',
    guard: 'isRungArmed',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.notArmed',
    event: 'armEntryPressed',
    guard: null,
    to: 'armModeStateMachine.{armKind}',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.taskShapeArmed',
    event: 'armEntryPressed',
    guard: 'isSameArm',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.taskShapeArmed',
    event: 'armEntryPressed',
    guard: 'not isSameArm',
    to: 'armModeStateMachine.{armKind}',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.milestoneShapeArmed',
    event: 'armEntryPressed',
    guard: 'isSameArm',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.milestoneShapeArmed',
    event: 'armEntryPressed',
    guard: 'not isSameArm',
    to: 'armModeStateMachine.{armKind}',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.dependencyArmed',
    event: 'armEntryPressed',
    guard: 'isSameArm',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.dependencyArmed',
    event: 'armEntryPressed',
    guard: 'not isSameArm',
    to: 'armModeStateMachine.{armKind}',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.commentBoxArmed',
    event: 'armEntryPressed',
    guard: 'isSameArm',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.commentBoxArmed',
    event: 'armEntryPressed',
    guard: 'not isSameArm',
    to: 'armModeStateMachine.{armKind}',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.highlightBoxArmed',
    event: 'armEntryPressed',
    guard: 'isSameArm',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.highlightBoxArmed',
    event: 'armEntryPressed',
    guard: 'not isSameArm',
    to: 'armModeStateMachine.{armKind}',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.taskShapeArmed',
    event: 'dualCursorEntryPressed',
    guard: 'canEnterDualCursor',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.milestoneShapeArmed',
    event: 'dualCursorEntryPressed',
    guard: 'canEnterDualCursor',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.dependencyArmed',
    event: 'dualCursorEntryPressed',
    guard: 'canEnterDualCursor',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.commentBoxArmed',
    event: 'dualCursorEntryPressed',
    guard: 'canEnterDualCursor',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'armModeStateMachine.highlightBoxArmed',
    event: 'dualCursorEntryPressed',
    guard: 'canEnterDualCursor',
    to: 'armModeStateMachine.notArmed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'paletteDisplayStateMachine.shown',
    event: 'paletteToggled',
    guard: null,
    to: 'paletteDisplayStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'paletteDisplayStateMachine.hidden',
    event: 'paletteToggled',
    guard: null,
    to: 'paletteDisplayStateMachine.shown',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'paletteDisplayStateMachine.shown.expanded',
    event: 'paletteMinimiseToggled',
    guard: null,
    to: 'paletteDisplayStateMachine.shown.minimised',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'paletteDisplayStateMachine.shown.minimised',
    event: 'paletteMinimiseToggled',
    guard: null,
    to: 'paletteDisplayStateMachine.shown.expanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'milestoneListDisplayStateMachine.closed',
    event: 'milestoneListToggled',
    guard: null,
    to: 'milestoneListDisplayStateMachine.open',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'milestoneListDisplayStateMachine.open',
    event: 'milestoneListToggled',
    guard: null,
    to: 'milestoneListDisplayStateMachine.closed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fullScreenModeStateMachine.normal',
    event: 'fullScreenEntryPressed',
    guard: null,
    to: 'fullScreenModeStateMachine.normal',
    effect: 'askBrowserForFullScreen',
    effectArgument: null,
  },
  {
    state: 'fullScreenModeStateMachine.full',
    event: 'fullScreenEntryPressed',
    guard: null,
    to: 'fullScreenModeStateMachine.full',
    effect: 'askBrowserForFullScreen',
    effectArgument: null,
  },
  {
    state: 'fullScreenModeStateMachine.normal',
    event: 'fullScreenChanged',
    guard: 'isFullScreen',
    to: 'fullScreenModeStateMachine.full',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fullScreenModeStateMachine.full',
    event: 'fullScreenChanged',
    guard: 'not isFullScreen',
    to: 'fullScreenModeStateMachine.normal',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'openSurfaceStateMachine.closed',
    event: 'surfaceEntryPressed',
    guard: null,
    to: 'openSurfaceStateMachine.open',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'openSurfaceStateMachine.closed',
    event: 'surfaceRaisedByFlow',
    guard: null,
    to: 'openSurfaceStateMachine.open',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'openSurfaceStateMachine.open',
    event: 'flowSurfaceAnswered',
    guard: null,
    to: 'openSurfaceStateMachine.closed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'openSurfaceStateMachine.open',
    event: 'surfaceCloseAsked',
    guard: 'isSurfaceTarget',
    to: 'openSurfaceStateMachine.closed',
    effect: 'tellFlowSurfaceClosed',
    effectArgument: null,
  },
  {
    state: 'openSurfaceStateMachine.open',
    event: 'escapePressed',
    guard: 'isRungSurface',
    to: 'openSurfaceStateMachine.closed',
    effect: 'tellFlowSurfaceClosed',
    effectArgument: null,
  },
  {
    state: 'openSurfaceStateMachine.closed',
    event: 'watermarkEntryPressed',
    guard: 'in watermarkDisplayStateMachine.shown',
    to: 'openSurfaceStateMachine.open',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'openSurfaceStateMachine.open',
    event: 'watermarkUnlockAnswered',
    guard: 'isWatermarkUnlockSurface & isProceeding',
    to: 'openSurfaceStateMachine.open',
    effect: 'matchWatermarkUnlock',
    effectArgument: null,
  },
  {
    state: 'openSurfaceStateMachine.open',
    event: 'watermarkUnlockAnswered',
    guard: 'isWatermarkUnlockSurface & not isProceeding',
    to: 'openSurfaceStateMachine.closed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'openSurfaceStateMachine.open',
    event: 'watermarkUnlockMatched',
    guard: 'in watermarkDisplayStateMachine.shown & isWatermarkUnlockSurface',
    to: 'openSurfaceStateMachine.closed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'openSurfaceStateMachine.open',
    event: 'watermarkUnlockMismatched',
    guard: 'isWatermarkUnlockSurface',
    to: 'openSurfaceStateMachine.open',
    effect: 'raiseNotice',
    effectArgument: 'RS-41',
  },
  {
    state: 'watermarkDisplayStateMachine.hidden',
    event: 'watermarkEntryPressed',
    guard: null,
    to: 'watermarkDisplayStateMachine.shown',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'watermarkDisplayStateMachine.shown',
    event: 'watermarkUnlockMatched',
    guard: 'in openSurfaceStateMachine.open & isWatermarkUnlockSurface',
    to: 'watermarkDisplayStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.selectionDisplayed',
    event: 'surfaceCloseAsked',
    guard: 'isPanelTarget',
    to: 'propertiesPanelContentStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.documentSettingsDisplayed',
    event: 'surfaceCloseAsked',
    guard: 'isPanelTarget',
    to: 'propertiesPanelContentStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.selectionDisplayed',
    event: 'escapePressed',
    guard: 'isRungSurface & isPanelTopmost',
    to: 'propertiesPanelContentStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.documentSettingsDisplayed',
    event: 'escapePressed',
    guard: 'isRungSurface & isPanelTopmost',
    to: 'propertiesPanelContentStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.hidden',
    event: 'settingsEntryPressed',
    guard: null,
    to: 'propertiesPanelContentStateMachine.documentSettingsDisplayed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.selectionDisplayed',
    event: 'settingsEntryPressed',
    guard: null,
    to: 'propertiesPanelContentStateMachine.documentSettingsDisplayed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.documentSettingsDisplayed',
    event: 'settingsEntryPressed',
    guard: null,
    to: 'propertiesPanelContentStateMachine.selectionDisplayed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.hidden',
    event: 'propertiesOfChoiceAsked',
    guard: null,
    to: 'propertiesPanelContentStateMachine.selectionDisplayed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.selectionDisplayed',
    event: 'propertiesOfChoiceAsked',
    guard: null,
    to: 'propertiesPanelContentStateMachine.selectionDisplayed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.documentSettingsDisplayed',
    event: 'propertiesOfChoiceAsked',
    guard: null,
    to: 'propertiesPanelContentStateMachine.selectionDisplayed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.selectionDisplayed',
    event: 'selectionMoved',
    guard: 'hasChoice',
    to: 'propertiesPanelContentStateMachine.selectionDisplayed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.hidden',
    event: 'createdNameSettled',
    guard: null,
    to: 'propertiesPanelContentStateMachine.hidden',
    effect: 'clearSelection',
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.selectionDisplayed',
    event: 'createdNameSettled',
    guard: null,
    to: 'propertiesPanelContentStateMachine.hidden',
    effect: 'clearSelection',
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.documentSettingsDisplayed',
    event: 'createdNameSettled',
    guard: null,
    to: 'propertiesPanelContentStateMachine.hidden',
    effect: 'clearSelection',
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.selectionDisplayed',
    event: 'settleKeyPressed',
    guard: 'hasNoSurfaceOrConfirmation & hasNoUnsettledEntry',
    to: 'propertiesPanelContentStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'propertiesPanelContentStateMachine.documentSettingsDisplayed',
    event: 'settleKeyPressed',
    guard: 'hasNoSurfaceOrConfirmation & hasNoUnsettledEntry',
    to: 'propertiesPanelContentStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'dialogueFieldDisplayStateMachine.shown',
    event: 'dialogueFieldEntryPressed',
    guard: 'isAgentApiEnabled',
    to: 'dialogueFieldDisplayStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'dialogueFieldDisplayStateMachine.shown',
    event: 'dialogueFieldEntryPressed',
    guard: 'not isAgentApiEnabled',
    to: 'dialogueFieldDisplayStateMachine.shown',
    effect: 'raiseNotice',
    effectArgument: 'RS-35',
  },
  {
    state: 'dialogueFieldDisplayStateMachine.hidden',
    event: 'dialogueFieldEntryPressed',
    guard: 'isAgentApiEnabled',
    to: 'dialogueFieldDisplayStateMachine.shown',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'dialogueFieldDisplayStateMachine.hidden',
    event: 'dialogueFieldEntryPressed',
    guard: 'not isAgentApiEnabled',
    to: 'dialogueFieldDisplayStateMachine.hidden',
    effect: 'raiseNotice',
    effectArgument: 'RS-35',
  },
  {
    state: 'levelZeroFoldStateMachine.unfolded',
    event: 'foldAllPressed',
    guard: null,
    to: 'levelZeroFoldStateMachine.folded',
    effect: 'writeFoldAll',
    effectArgument: null,
  },
  {
    state: 'levelZeroFoldStateMachine.folded',
    event: 'levelZeroOpened',
    guard: null,
    to: 'levelZeroFoldStateMachine.unfolded',
    effect: 'writeOpenLevel',
    effectArgument: null,
  },
  {
    state: 'dualCursorModeStateMachine.on',
    event: 'escapePressed',
    guard: 'isRungDualCursor',
    to: 'dualCursorModeStateMachine.off',
    effect: 'writeClearDualCursor',
    effectArgument: null,
  },
  {
    state: 'dualCursorModeStateMachine.off',
    event: 'dualCursorEntryPressed',
    guard: 'hasDaysToPlace',
    to: 'dualCursorModeStateMachine.on',
    effect: 'writePlaceDualCursorClearingGuide',
    effectArgument: null,
  },
  {
    state: 'dualCursorModeStateMachine.on',
    event: 'dualCursorEntryPressed',
    guard: null,
    to: 'dualCursorModeStateMachine.off',
    effect: 'writeClearDualCursor',
    effectArgument: null,
  },
  {
    state: 'dualCursorModeStateMachine.on',
    event: 'guideCursorEntryPressed',
    guard: null,
    to: 'dualCursorModeStateMachine.off',
    effect: 'writeClearDualCursorSettingGuide',
    effectArgument: null,
  },
  {
    state: 'dualCursorModeStateMachine.on.placingDate1',
    event: 'dualCursorPlaced',
    guard: null,
    to: 'dualCursorModeStateMachine.on.placingDate2',
    effect: 'writeFixDate1',
    effectArgument: null,
  },
  {
    state: 'dualCursorModeStateMachine.on.placingDate2',
    event: 'dualCursorPlaced',
    guard: null,
    to: 'dualCursorModeStateMachine.on.placingDate1',
    effect: 'writeFixDate2',
    effectArgument: null,
  },
  {
    state: 'scaleMessageDisplayStateMachine.hidden',
    event: 'displayScaleStepped',
    guard: null,
    to: 'scaleMessageDisplayStateMachine.shown',
    effect: 'startScaleMessageTimer',
    effectArgument: null,
  },
  {
    state: 'scaleMessageDisplayStateMachine.shown',
    event: 'displayScaleStepped',
    guard: null,
    to: 'scaleMessageDisplayStateMachine.shown',
    effect: 'restartScaleMessageTimer',
    effectArgument: null,
  },
  {
    state: 'scaleMessageDisplayStateMachine.hidden',
    event: 'rowZoomEndReached',
    guard: null,
    to: 'scaleMessageDisplayStateMachine.shown',
    effect: 'startScaleMessageTimer',
    effectArgument: null,
  },
  {
    state: 'scaleMessageDisplayStateMachine.shown',
    event: 'rowZoomEndReached',
    guard: null,
    to: 'scaleMessageDisplayStateMachine.shown',
    effect: 'restartScaleMessageTimer',
    effectArgument: null,
  },
  {
    state: 'scaleMessageDisplayStateMachine.shown',
    event: 'scaleMessageTimeElapsed',
    guard: null,
    to: 'scaleMessageDisplayStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'tooltipDisplayStateMachine.allowed',
    event: 'escapePressed',
    guard: 'isRungTooltip',
    to: 'tooltipDisplayStateMachine.dismissed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'tooltipDisplayStateMachine.dismissed',
    event: 'pointerRestElapsed',
    guard: null,
    to: 'tooltipDisplayStateMachine.allowed',
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

// see T-280
/** @purity pure */
function onPaletteToggled(values: ScreenValues): ScreenStep {
  if (values.paletteDisplayState.kind === 'hidden') {
    const child = SCREEN_VALUES_INITIAL_CHILDREN['paletteDisplayStateMachine.shown']
    return moved(values, { paletteDisplayState: { kind: 'shown', child } })
  }
  return moved(values, { paletteDisplayState: { kind: 'hidden' } })
}

// see T-280
/** @purity pure */
function onPaletteMinimiseToggled(values: ScreenValues): ScreenStep {
  const palette = values.paletteDisplayState
  if (palette.kind === 'hidden') return unchanged(values)
  const kind = palette.child.kind === 'expanded' ? 'minimised' : 'expanded'
  return moved(values, { paletteDisplayState: { kind: 'shown', child: { kind } } })
}

// see T-280
/** @purity pure */
function onMilestoneListToggled(values: ScreenValues): ScreenStep {
  const kind = values.milestoneListDisplayState.kind === 'closed' ? 'open' : 'closed'
  return moved(values, { milestoneListDisplayState: { kind } })
}

// see T-280
/** @purity pure */
function onFullScreenEntryPressed(values: ScreenValues): ScreenStep {
  return stayed(values, [{ type: 'askBrowserForFullScreen' }])
}

// see T-280
/** @purity pure */
function onFullScreenChanged(values: ScreenValues, event: EventOf<'fullScreenChanged'>): ScreenStep {
  const isFull = values.fullScreenModeState.kind === 'full'
  if (isFull === event.isFullScreen) return unchanged(values)
  return moved(values, { fullScreenModeState: { kind: event.isFullScreen ? 'full' : 'normal' } })
}

// see T-280
/** @purity pure */
function onSurfaceOpened(
  values: ScreenValues,
  event: EventOf<'surfaceEntryPressed'> | EventOf<'surfaceRaisedByFlow'>,
): ScreenStep {
  if (values.openSurfaceState.kind === 'open') return unchanged(values)
  return moved(values, { openSurfaceState: { kind: 'open', surfaceName: event.surfaceName } })
}

// WHY: no tellFlowSurfaceClosed; the answer already reached the file-flow region (OP-3, FR-022).
/** @purity pure */
function onFlowSurfaceAnswered(values: ScreenValues): ScreenStep {
  if (values.openSurfaceState.kind === 'closed') return unchanged(values)
  return moved(values, { openSurfaceState: { kind: 'closed' } })
}

// see T-280
/** @purity pure */
function surfaceClosed(values: ScreenValues): ScreenStep {
  const surface = values.openSurfaceState
  if (surface.kind === 'closed') return unchanged(values)
  return moved(values, { openSurfaceState: { kind: 'closed' } }, [
    { type: 'tellFlowSurfaceClosed', surfaceName: surface.surfaceName },
  ])
}

// see T-280
/** @purity pure */
function propertiesPutAway(values: ScreenValues): ScreenStep {
  if (values.propertiesPanelContentState.kind === 'hidden') return unchanged(values)
  return moved(values, { propertiesPanelContentState: { kind: 'hidden' } })
}

/** @purity pure */
function onSurfaceCloseAsked(values: ScreenValues, event: EventOf<'surfaceCloseAsked'>): ScreenStep {
  if (values.openSurfaceState.kind === 'closed' && values.propertiesPanelContentState.kind === 'hidden') return unchanged(values)
  return event.target === 'surface' ? surfaceClosed(values) : propertiesPutAway(values)
}

/** @purity pure */
function surfaceRungConsumed(values: ScreenValues): ScreenStep {
  const isPanelTopmost = values.openSurfaceState.kind === 'closed'
  return isPanelTopmost ? propertiesPutAway(values) : surfaceClosed(values)
}

/** @purity pure */
function disarmed(values: ScreenValues): ScreenStep {
  if (values.armModeState.kind === 'notArmed') return unchanged(values)
  return moved(values, { armModeState: { kind: 'notArmed' } })
}

// see T-280
/** @purity pure */
function dualCursorCleared(values: ScreenValues): ScreenStep {
  if (values.dualCursorModeState.kind === 'off') return unchanged(values)
  return moved(values, { dualCursorModeState: { kind: 'off' } }, [{ type: 'writeClearDualCursor' }])
}

/** @purity pure */
function tooltipDismissed(values: ScreenValues): ScreenStep {
  if (values.tooltipDisplayState.kind === 'dismissed') return unchanged(values)
  return moved(values, { tooltipDisplayState: { kind: 'dismissed' } })
}

// see T-280, IN-4
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
  readonly [K in ArmKind]: (event: EventOf<'armEntryPressed'>) => ArmModeState
} = {
  taskShapeArmed: (event) => ({ kind: 'taskShapeArmed', shapeKind: required(event.shapeKind, 'shapeKind') }),
  milestoneShapeArmed: (event) => ({ kind: 'milestoneShapeArmed', glyph: required(event.glyph, 'glyph') }),
  dependencyArmed: () => ({ kind: 'dependencyArmed' }),
  commentBoxArmed: () => ({ kind: 'commentBoxArmed' }),
  highlightBoxArmed: () => ({ kind: 'highlightBoxArmed' }),
}

/** @purity pure */
function carriedArmOf(armed: ArmModeState): string | null {
  switch (armed.kind) {
    case 'taskShapeArmed':
      return armed.shapeKind
    case 'milestoneShapeArmed':
      return armed.glyph
    case 'notArmed':
    case 'dependencyArmed':
    case 'commentBoxArmed':
    case 'highlightBoxArmed':
      return null
    default:
      return assertNever(armed)
  }
}

// see T-280, FR-016
/** @purity pure */
function onArmEntryPressed(values: ScreenValues, event: EventOf<'armEntryPressed'>): ScreenStep {
  const entered = ARMED_BY_KIND[event.armKind](event)
  const current = values.armModeState
  const isSameArm = current.kind === entered.kind && carriedArmOf(current) === carriedArmOf(entered)
  return moved(values, { armModeState: isSameArm ? { kind: 'notArmed' } : entered })
}

// see T-280
/** @purity pure */
function onWatermarkEntryPressed(values: ScreenValues): ScreenStep {
  if (values.watermarkDisplayState.kind === 'hidden') return moved(values, { watermarkDisplayState: { kind: 'shown' } })
  if (values.openSurfaceState.kind === 'open') return unchanged(values)
  return moved(values, { openSurfaceState: { kind: 'open', surfaceName: WATERMARK_UNLOCK_SURFACE } })
}

/** @purity pure */
function isWatermarkUnlockSurface(values: ScreenValues): boolean {
  return values.openSurfaceState.kind === 'open' && values.openSurfaceState.surfaceName === WATERMARK_UNLOCK_SURFACE
}

// see T-280
/** @purity pure */
function onWatermarkUnlockAnswered(
  values: ScreenValues,
  event: EventOf<'watermarkUnlockAnswered'>,
): ScreenStep {
  if (!isWatermarkUnlockSurface(values)) return unchanged(values)
  if (event.isProceeding) return stayed(values, [{ type: 'matchWatermarkUnlock' }])
  return moved(values, { openSurfaceState: { kind: 'closed' } })
}

// see T-280
/** @purity pure */
function onWatermarkUnlockMatched(values: ScreenValues): ScreenStep {
  if (values.watermarkDisplayState.kind === 'hidden' || !isWatermarkUnlockSurface(values)) {
    return unchanged(values)
  }
  return moved(values, { watermarkDisplayState: { kind: 'hidden' }, openSurfaceState: { kind: 'closed' } })
}

// see T-280
/** @purity pure */
function onWatermarkUnlockMismatched(values: ScreenValues): ScreenStep {
  if (!isWatermarkUnlockSurface(values)) return unchanged(values)
  return stayed(values, [{ type: 'raiseNotice', reason: 'RS-41' }])
}

// see T-280
/** @purity pure */
function onSettingsEntryPressed(values: ScreenValues): ScreenStep {
  const properties = values.propertiesPanelContentState
  if (properties.kind === 'documentSettingsDisplayed') {
    const subject = properties.returnSubject ?? { selection: emptySelection(), groupIds: [] }
    return moved(values, { propertiesPanelContentState: { kind: 'selectionDisplayed', subject } })
  }
  const returnSubject = properties.kind === 'selectionDisplayed' ? properties.subject : null
  return moved(values, { propertiesPanelContentState: { kind: 'documentSettingsDisplayed', returnSubject } })
}

// see T-280
/** @purity pure */
function onPropertiesOfChoiceAsked(
  values: ScreenValues,
  event: EventOf<'propertiesOfChoiceAsked'>,
): ScreenStep {
  return moved(values, { propertiesPanelContentState: { kind: 'selectionDisplayed', subject: event.subject } })
}

// see T-280
/** @purity pure */
function onSelectionMoved(values: ScreenValues, event: EventOf<'selectionMoved'>): ScreenStep {
  if (values.propertiesPanelContentState.kind !== 'selectionDisplayed') return unchanged(values)
  const subject = event.subject
  const hasChoice = subject.selection.items.length > 0 || subject.groupIds.length > 0
  if (!hasChoice) return unchanged(values)
  return moved(values, { propertiesPanelContentState: { kind: 'selectionDisplayed', subject } })
}

// see T-280
/** @purity pure */
function onCreatedNameSettled(values: ScreenValues): ScreenStep {
  const effects: readonly ScreenValuesEffect[] = [{ type: 'clearSelection' }]
  if (values.propertiesPanelContentState.kind === 'hidden') return stayed(values, effects)
  return moved(values, { propertiesPanelContentState: { kind: 'hidden' } }, effects)
}

// see T-280
/** @purity pure */
function onSettleKeyPressed(values: ScreenValues, event: EventOf<'settleKeyPressed'>): ScreenStep {
  if (values.propertiesPanelContentState.kind === 'hidden') return unchanged(values)
  if (!event.hasNoSurfaceOrConfirmation || !event.hasNoUnsettledEntry) return unchanged(values)
  return propertiesPutAway(values)
}

// see T-280
/** @purity pure */
function onDialogueFieldEntryPressed(
  values: ScreenValues,
  event: EventOf<'dialogueFieldEntryPressed'>,
): ScreenStep {
  if (!event.isAgentApiEnabled) return stayed(values, [{ type: 'raiseNotice', reason: 'RS-35' }])
  const kind = values.dialogueFieldDisplayState.kind === 'shown' ? 'hidden' : 'shown'
  return moved(values, { dialogueFieldDisplayState: { kind } })
}

// see T-280
/** @purity pure */
function onFoldAllPressed(values: ScreenValues, event: EventOf<'foldAllPressed'>): ScreenStep {
  if (values.levelZeroFoldState.kind === 'folded') return unchanged(values)
  return moved(values, { levelZeroFoldState: { kind: 'folded' } }, [
    { type: 'writeFoldAll', writes: event.writes },
  ])
}

// see T-280
/** @purity pure */
function onLevelZeroOpened(values: ScreenValues, event: EventOf<'levelZeroOpened'>): ScreenStep {
  if (values.levelZeroFoldState.kind === 'unfolded') return unchanged(values)
  return moved(values, { levelZeroFoldState: { kind: 'unfolded' } }, [
    { type: 'writeOpenLevel', writes: event.writes },
  ])
}

// see T-280, FR-016
/** @purity pure */
function onDualCursorEntryPressed(
  values: ScreenValues,
  event: EventOf<'dualCursorEntryPressed'>,
): ScreenStep {
  if (values.dualCursorModeState.kind === 'on') return dualCursorCleared(values)
  if (!event.hasDaysToPlace) return unchanged(values)
  const child = SCREEN_VALUES_INITIAL_CHILDREN['dualCursorModeStateMachine.on']
  const armed = values.armModeState.kind === 'notArmed' ? values.armModeState : ({ kind: 'notArmed' } as const)
  return moved(values, { dualCursorModeState: { kind: 'on', child }, armModeState: armed }, [
    { type: 'writePlaceDualCursor', date: event.date, writes: event.writes },
  ])
}

// see T-280
/** @purity pure */
function onDualCursorPlaced(values: ScreenValues, event: EventOf<'dualCursorPlaced'>): ScreenStep {
  const dualCursor = values.dualCursorModeState
  if (dualCursor.kind === 'off') return unchanged(values)
  if (dualCursor.child.kind === 'placingDate1') {
    const child = { kind: 'placingDate2' } as const
    return moved(values, { dualCursorModeState: { kind: 'on', child } }, [
      { type: 'writeFixDate1', date: event.date, writes: event.writes },
    ])
  }
  const child = { kind: 'placingDate1' } as const
  return moved(values, { dualCursorModeState: { kind: 'on', child } }, [
    { type: 'writeFixDate2', date: event.date, writes: event.writes },
  ])
}

// see T-280
/** @purity pure */
function onScaleMessageRaised(
  values: ScreenValues,
  event: EventOf<'displayScaleStepped'> | EventOf<'rowZoomEndReached'>,
): ScreenStep {
  const timer = values.scaleMessageDisplayState.kind === 'hidden' ? 'startScaleMessageTimer' : 'restartScaleMessageTimer'
  const scaleMessage = { kind: 'shown', percent: event.percent, end: event.end } as const
  return moved(values, { scaleMessageDisplayState: scaleMessage }, [{ type: timer }])
}

// see T-280
/** @purity pure */
function onScaleMessageTimeElapsed(values: ScreenValues): ScreenStep {
  if (values.scaleMessageDisplayState.kind === 'hidden') return unchanged(values)
  return moved(values, { scaleMessageDisplayState: { kind: 'hidden' } })
}

// see T-280
/** @purity pure */
function onDisplayLanguageChosen(
  values: ScreenValues,
  event: EventOf<'displayLanguageChosen'>,
): ScreenStep {
  return moved(values, { language: event.language }, [
    { type: 'storeLanguage', language: event.language },
  ])
}

// see T-280, PV-4
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
  return moved(values, { rememberedActuals }, [
    { type: 'writeProgressStep', taskUid: event.taskUid, writes: event.writes },
  ])
}

// see T-280
/** @purity pure */
function onPointerRestElapsed(values: ScreenValues): ScreenStep {
  if (values.tooltipDisplayState.kind === 'allowed') return unchanged(values)
  return moved(values, { tooltipDisplayState: { kind: 'allowed' } })
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
  flowSurfaceAnswered: onFlowSurfaceAnswered,
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

// see SF-2, SF-8, T-280
/** @purity pure */
export function stepScreenValues(values: ScreenValues, event: ScreenValuesEvent): ScreenStep {
  const handler = HANDLERS[event.type] as (values: ScreenValues, event: ScreenValuesEvent) => ScreenStep
  return handler(values, event)
}
