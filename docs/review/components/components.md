# gr-scheduler components

## Nodes

| cluster | name | description | remark |
| --- | --- | --- | --- |
| framework | SingleHtmlShell | Boots the page, wires every part together, holds the embedded-document slot and installs the exposure point. | FR-067 / FR-065 |
| framework | DomSvgSurface | Puts the SVG string on screen. | implements SvgSurface |
| framework | DomInputSource | Delivers pointer and keyboard events. | implements InputSource |
| framework | FileSystemAccessFileStore | Reads and writes files and keeps the handle. | implements FileStore / FR-060 |
| framework | LocalStorageDocumentStore | Stores and restores the autosaved document. | implements DocumentStore / FR-026 |
| framework | BrowserClipboard | Writes to the clipboard. | implements Clipboard / FR-033 |
| framework | CanvasRasterizer | Turns SVG into a raster image. | implements Rasterizer / FR-025 |
| adapter | AgentApiEndpoint | Installs Agent API. Not exposed by default. Seventeen flat members. | FR-028 / FR-065 / T-035 |
| adapter | InputCommandTranslator | Turns pointer and keyboard input into one operation. Declares InputSource. | FR-016 / FR-070 |
| adapter | SvgRenderer | Builds the SVG string from geometry, then hands it over. Declares SvgSurface. | pure core / FR-080 |
| adapter | DocumentCodec | Converts between the document and JSON or MSPDI. | FR-024 / FR-021 / FR-056 / FR-057 |
| adapter | ImageExporter | Produces the image output. Declares Rasterizer. | FR-025 |
| adapter | FileGateway | Opens and overwrites the document file. Declares FileStore. | FR-060 / T-024 |
| adapter | AutosaveGateway | Saves at the idle boundary and offers recovery. Declares DocumentStore. | FR-026 / FR-061 |
| adapter | ClipboardGateway | Sends the document or the picture out. Declares Clipboard. | FR-033 / FR-068 |
| usecase | ApplyDocumentChange | The only write path. Checks the stamp, applies all or nothing, records history, advances the revision, notifies. | MS-1 / FR-028 / AG-2 / AG-3 / FR-031 / FR-063 |
| usecase | EditDocument | One pure operation per aggregate: task, group, dependency, annotation, resource, calendar, project, settings. | T-027 |
| usecase | ImportDocument | Takes in a document and merges it. | FR-087 / FR-022 |
| usecase | UndoEdit | Steps the history back by one. | FR-031 |
| usecase | RedoEdit | Steps the history forward by one. | FR-031 |
| usecase | ValidateImportedDocument | Checks untrusted input. Shared by every intake path. | FR-023 / NFR-009 |
| usecase | ChooseStartupDocument | Picks the document to open at start-up, in the given order. | FR-062 / T-034 |
| usecase | NotifyChangeWatchers | Hands confirmed changes to the watchers. | AG-6 / AG-11 |
| usecase | PostDialogueMessage | Takes a confirmed utterance, appends it to DialogueLog and passes it on. Runtime only, never saved. | FR-066 / AG-11 |
| entity / documentModel | Schedule | The schedule-data group and its invariants. | DR-2 / T-056 |
| entity / documentModel | DocumentSettings | The presentation group: every saved setting with its bounds. | DR-3 / FR-063 |
| entity / documentModel | DocumentStamp | schemaVersion, revisionStamp and changeLog, plus the pure functions that advance them. | DR-4 / FR-063 |
| entity / documentModel | EditHistory | The undo stack as an immutable value, replaced whole. | FR-031 / T-027 |
| entity / layoutEngine | ScheduleLayout | Time axis, label width estimate, row placement, detail level, fit. | FR-017 / FR-093 / FR-003 / FR-018 / FR-055 |
| entity / layoutEngine | ScheduleGeometry | Vertices of everything drawn: bars, dependency routes, progress line, cursors, annotations, watermark. | FR-094 / FR-009 / FR-014 / FR-048 / FR-086 |
| entity / layoutEngine | ItemHitArea | Which item the pointer is over. | SL-1 / PG-9 |
| entity / documentModel | Selection | The set of selected objects and the order they were selected in. Never saved. |  |
| entity / documentModel | DialogueLog | Confirmed utterances, in an order of their own that is independent of the revision. Never saved. |  |

## Edges

| arrow | source | target | label | description | remark |
| --- | --- | --- | --- | --- | --- |
| dependency | SingleHtmlShell | AgentApiEndpoint | installs / implements SnapshotSource | installs the exposure point and implements the frozen-snapshot source it declares |  |
| dependency | SingleHtmlShell | ChooseStartupDocument | four candidates | hands over the four candidates |  |
| realization | DomSvgSurface | SvgRenderer | implements SvgSurface |  |  |
| realization | DomInputSource | InputCommandTranslator | implements InputSource |  |  |
| realization | FileSystemAccessFileStore | FileGateway | implements FileStore |  |  |
| realization | LocalStorageDocumentStore | AutosaveGateway | implements DocumentStore |  |  |
| realization | BrowserClipboard | ClipboardGateway | implements Clipboard |  |  |
| realization | CanvasRasterizer | ImageExporter | implements Rasterizer |  |  |
| dependency | InputCommandTranslator | ApplyDocumentChange | one operation | hands over one operation |  |
| dependency | AgentApiEndpoint | ApplyDocumentChange | same operation | hands over the same operation |  |
| dependency | AgentApiEndpoint | NotifyChangeWatchers | watch / unwatch | starts and stops watching |  |
| dependency | AgentApiEndpoint | PostDialogueMessage | utterance | hands over an utterance |  |
| dependency | FileGateway | ApplyDocumentChange | intake | asks for an intake |  |
| dependency | AutosaveGateway | ApplyDocumentChange | restore | asks for a restore |  |
| dependency | ImageExporter | SvgRenderer | SVG string | takes the SVG string |  |
| dependency | FileGateway | DocumentCodec | format | gets the exchange format |  |
| dependency | AutosaveGateway | DocumentCodec | string to store | gets the string to store |  |
| dependency | ClipboardGateway | DocumentCodec | text out | gets the text to send out |  |
| dependency | ClipboardGateway | SvgRenderer | picture out | gets the picture to send out |  |
| dependency | InputCommandTranslator | ItemHitArea | item under pointer | asks which item is under the pointer |  |
| dependency | SvgRenderer | ScheduleGeometry | geometry | reads geometry only, never the write path |  |
| dependency | SvgRenderer | ScheduleLayout | ruler and rows | reads the ruler and the row placement |  |
| dependency | SvgRenderer | DocumentSettings | presentation values | reads the presentation values |  |
| dependency | DocumentCodec | Schedule | schedule data | converts the whole document |  |
| dependency | DocumentCodec | DocumentSettings | presentation values | converts the whole document |  |
| dependency | DocumentCodec | DocumentStamp | stamp | converts the whole document |  |
| dependency | ApplyDocumentChange | EditDocument | validate + update | asks for validation and an immutable update |  |
| dependency | ApplyDocumentChange | ImportDocument | intake | asks for an intake |  |
| dependency | ApplyDocumentChange | UndoEdit | step back | asks to step back |  |
| dependency | ApplyDocumentChange | RedoEdit | step forward | asks to step forward |  |
| dependency | ApplyDocumentChange | NotifyChangeWatchers | what was confirmed | hands over what was confirmed |  |
| dependency | ApplyDocumentChange | DocumentStamp | advance + stamp | advances the revision and writes the stamp |  |
| dependency | ApplyDocumentChange | EditHistory | push one step | pushes one step |  |
| dependency | ImportDocument | ValidateImportedDocument | untrusted input | checks untrusted input |  |
| dependency | ChooseStartupDocument | ValidateImportedDocument | each candidate | checks each candidate |  |
| dependency | ChooseStartupDocument | DocumentStamp | revision + time | compares revision and time |  |
| dependency | UndoEdit | EditHistory | previous step | takes the previous step |  |
| dependency | RedoEdit | EditHistory | next step | takes the next step |  |
| dependency | EditDocument | Schedule | invariants + update | checks invariants, updates immutably |  |
| dependency | EditDocument | DocumentSettings | clamp + update | clamps to bounds and updates |  |
| dependency | EditDocument | ScheduleLayout | pure calculation | calls the pure calculation |  |
| dependency | ImportDocument | Schedule | taken-in content | puts the taken-in content in |  |
| dependency | ScheduleLayout | Schedule | schedule data | reads the schedule data |  |
| dependency | ScheduleLayout | DocumentSettings | sizes + thresholds | reads sizes and thresholds |  |
| dependency | ScheduleGeometry | ScheduleLayout | coordinates | takes the coordinates |  |
| dependency | ScheduleGeometry | Schedule | tasks + annotations | reads tasks and annotations |  |
| dependency | ItemHitArea | ScheduleGeometry | vertices | reads the vertices |  |
| dependency | AgentApiEndpoint | Schedule | schedule data | reads the schedule data for readDocument |  |
| dependency | AgentApiEndpoint | DocumentSettings | presentation values | reads the presentation values for readDocument |  |
| dependency | AgentApiEndpoint | DocumentStamp | stamp | reads the stamp for readStamp |  |
| dependency | AgentApiEndpoint | Selection | what is selected | reads the selection for readSelection |  |
| dependency | AgentApiEndpoint | DialogueLog | confirmed utterances | reads the utterances for readDialogueMessages |  |
| dependency | AgentApiEndpoint | DocumentCodec | exchange formats | gets JSON, MSPDI and the single .html |  |
| dependency | AgentApiEndpoint | SvgRenderer | picture out | gets the SVG string |  |
| dependency | AgentApiEndpoint | ImageExporter | image out | gets the raster image |  |
| dependency | AgentApiEndpoint | ScheduleLayout | where a task sits | asks where a task sits, to focus it |  |
| dependency | SvgRenderer | Selection | what is selected | shows the selection by more than colour |  |
| dependency | ScheduleGeometry | Selection | what is selected | puts handles on selected tasks only |  |
| dependency | InputCommandTranslator | Selection | make and clear | makes, widens and clears the selection |  |
| dependency | PostDialogueMessage | DialogueLog | append one | appends one confirmed utterance |  |
| dependency | NotifyChangeWatchers | DialogueLog | utterance order | picks utterances by their own order |  |
| dependency | SingleHtmlShell | DocumentCodec | implements AppShellSource |  |  |

## Clusters

| cluster | label | description | remark |
| --- | --- | --- | --- |
| entity | Entity | The document and the pure calculation over it. |  |
| entity / documentModel | documentModel | Every one of the three root groups of table T-052, plus the undo history. |  |
| entity / layoutEngine | layoutEngine | Pure calculation. Needs no browser. |  |
| usecase | UseCase | Operations on the document and the path to confirming them. |  |
| adapter | Adapter | Declares the interfaces for outside tools, and converts. |  |
| framework | Framework | The browser facilities and the single-html shell. |  |
