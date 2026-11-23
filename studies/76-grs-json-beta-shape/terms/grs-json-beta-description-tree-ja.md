# GRS JSON β のスキーマ —— 説明の木（日本語版）

- 生成物。キー・順・列挙の値は `grs-json-beta.schema.json` から、各行の日本語の名は `grs-json-beta-tree-labels-ja.tsv` から、その下の説明は英語の説明の日本語訳 `grs-json-beta-descriptions-ja.tsv` から作った。作り直し: `python schema_to_review_tree.py japanese-num`。
- 契約はスキーマの英語の説明。英語版は `grs-json-beta-description-tree-en.md`。行番号 R001〜R440 は両方と `grs-json-final-review-tree.md` で同じ。

### 根と帳簿

```text
R001  ScheduleDocument             GRS JSON の 1 ファイル
R002  +- $schema                   スキーマの所（URL）
                                   この値は、最新の GRS スキーマの所（URL）を示す。どの文書も同じ所を持つ。
R003  +- schemaVersionUtc          スキーマの版（形が最後に変わった UTC の時刻）
                                   この値は、GRS JSON の形（キーと規則）が最後に変わった UTC の時刻（YYYY-MM-DDTHH:MM:SSZ）
                                   を示す。
R004  +- buildVersionUtc           書いた GRS のビルドの版（UTC の時刻）
                                   この値は、このファイルを書いた GRS のプログラムを誰かがビルドした UTC の時刻を示す。この
                                   値はデバッグのためだけにある。GRS がファイルを読めるかどうかは、schemaVersionUtc が示す
                                   。
R005  +- documentStamp             文書刻印
                                   このオブジェクトは文書刻印を持つ。文書刻印は、スケジュールデータとスケジュール文書が最後
                                   に変わった時、GRS がファイルを最後に保存した時、スケジュール文書を最後に編集した者を記す
                                   。
R006  |  +- scheduleDataUpdatedAt  データが変わった時（UTC）
                                   この値は、スケジュールデータが最後に変わった時を UTC で示す。documentSettings だけが変わ
                                   っても、この時刻は動かない。
R007  |  +- documentUpdatedAt      文書が変わった時（UTC）
                                   この値は、スケジュール文書が最後に変わった時を UTC で示す。変わった所がスケジュールデー
                                   タでも documentSettings でも、この時刻は動く。
R008  |  +- fileSavedAt            保存した時（UTC。初めて保存するまでは無い）
                                   この値は、GRS がスケジュール文書を最後にファイルへ保存した時を UTC で示す。初めて保存す
                                   るまで、このキーは無い。
R009  |  +- lastEditedBy           最後に編集した者（型 Editor）
                                   このオブジェクトは、スケジュール文書を最後に編集した者を示す。GRS はこのキーを必ず書く。
                                   スケジュール文書が同梱のテンプレートのままでも、GRS はこのキーを書く。
R010  |     +- type                判別子
                                   "user": 人が画面でスケジュール文書を編集した。"agent": AI が Agent API でスケジュール文
                                   書を編集した。"template": まだ誰も編集していないので、スケジュール文書は GRS に付いてく
                                   るテンプレートのままである。
R011  |     |  +- "user"           人が画面で編集した
R012  |     |  +- "template"       まだ誰も編集していない（ひな形のまま）
R013  |     |  +- "agent"          AI が Agent API で編集した
R014  |     +- name                編集した者の名（agent は AI が名乗った名、user は GRS が知るときだけ）
                                   この値は編集者の名を示す。"agent" では、AI が名乗る名を示す。"user" では、GRS が名を知る
                                   ときだけ、その人の名を示す。
R015  +- documentSettings          文書設定（下の「文書設定」）
R016  +- scheduleData              スケジュールデータ（下の 2 つの群）
R017  +- changeLogEntries[]        変更履歴
                                   このリストは変更履歴を持つ。変更履歴は、人や AI がスケジュール文書の変更について書くメモ
                                   で、古いものから並ぶ。GRS は新しい項目を末尾に足す。
R018     +- changedAt              変更の時（UTC）
                                   この値は、変更が起きた時を UTC で示す。GRS は項目を足すときに時刻を入れる。人は後でその
                                   時刻を変えてよい。
R019     +- changedBy              変更した者
                                   このオブジェクトは、変更した者（編集者の種類と名）を示す。
R020     |  +- editorType          書き手の種類（GRS が自動で書く。判別子ではない）
                                   この値は、この項目を書いた編集者の種類を示し、GRS がこの値を入れる。"user": 人が画面でこ
                                   の項目を書いた。"agent": AI が Agent API でこの項目を書いた。
R021     |  |  +- "user"           人が画面で書いた行
R022     |  |  +- "agent"          AI が Agent API で書いた行
R023     |  +- name                人が打った名か、AI が名乗った名
                                   この値は編集者の名を示す。この名は、人が打った名か、AI が名乗った名である。
R024     +- affectedArea           及んだ部分
                                   この自由記述の文は、変更が及んだスケジュール文書の部分を名指す。例えば "tasks" や、1 つ
                                   のタスクの名である。
R025     +- changeDescription      何が変わったか
                                   この自由記述の文は、何が変わったかを書く。
R026     +- reason                 理由
                                   この自由記述の文は、変更の理由を書く。
R027     +- remarks                そのほか
                                   この自由記述の文は、変更についてのそのほかのこと（ほかのキーが持たないこと）を書く。
```

### 文書設定

```text
R028  documentSettings                              文書設定（効く範囲の広い順）
R029  +- displayScaleRatio                          表示の倍率（1 が等倍）
                                                    この値は、スケジュールキャンバスの大きさを、通常の大きさに対する倍率で決める。GRS は、名
                                                    前が Px で終わるキーの値に、描くときにこの倍率を掛ける。GRS はそれらの値を、倍率を掛けず
                                                    に保存する。
R030  +- fontSizePreset                             文字の大きさの段
                                                    この値は、スケジュールキャンバスの文字の大きさの段である。GRS は各段のピクセルの大きさを
                                                    持ち、displayScaleRatio がその大きさを拡大・縮小する。
R031  |  +- "small"                                 小
R032  |  +- "medium"                                中
R033  |  +- "large"                                 大
R034  +- isThemeMonochrome                          モノクロか
                                                    この値が true のとき、GRS はすべての色をモノクロで描く: テーマの色、パレットの色、任意の
                                                    色。この値は描き方だけを変える。スケジュール文書に保存した色は変わらない。
R035  +- themeHue                                   テーマの色相の名
                                                    この値は、テーマの色相の名を示す。{"type": "theme"} と書いた色は、すべてこの色相を使う。
                                                    GRS は各名の色相の角度を持つ。
R036  |  +- "blue"                                  青
R037  |  +- "blueGreen"                             青緑
R038  |  +- "green"                                 緑
R039  |  +- "yellowGreen"                           黄緑
R040  |  +- "yellow"                                黄
R041  |  +- "orange"                                橙
R042  |  +- "red"                                   赤
R043  |  +- "redPurple"                             赤紫
R044  |  +- "purple"                                紫
R045  |  +- "indigo"                                藍
R046  +- viewTimeZone                               表示の基準タイムゾーン
                                                    このオブジェクトは、表示の基準タイムゾーンを決める。GRS は、スケジュールキャンバスとタイ
                                                    ムルーラーで、このタイムゾーンで日時を見せる。
R047  |  +- type                                    判別子
                                                    "sameAsScheduleData": GRS は scheduleData.scheduleDataTimeZone のタイムゾーンで日時を見
                                                    せ、そのタイムゾーンが変わればそれに従う。"fixed": GRS は utcOffset の時差で日時を見せる
                                                    。
R048  |  |  +- "sameAsScheduleData"                 データの時差と同じ
R049  |  |  +- "fixed"                              決まった差を使う
R050  |  +- utcOffset                               UTC との差（"+09:00" の形。標準時の行だけ）（fixed）
                                                    このキーは、type が "fixed" のときだけ書く。この値は、GRS が日時を見せるときの UTC との
                                                    差を示す。例えば "+09:00" である。この差は標準時で、GRS は夏時間を決して足さない。
R051  +- additionalTimeZones[]                      追加の時計（4 つまで）
                                                    このリストは追加の時計を持つ。追加の時計は、GRS が表示の基準タイムゾーンのほかに見せる時
                                                    計である。GRS が時刻を見せている間、各時計はタイムルーラーの下に 1 行を足す。
R052  |  +- utcOffset                               UTC との差（"+09:00" の形）
                                                    この値は、この時計の UTC との差を示す。例えば "-04:00" である。この差は夏時間の分をもう
                                                    含み、GRS はこの差を 1 年中使う。
R053  |  +- zoneNameType                            出すゾーンの名の種類（差 utcOffset はもう夏時間の分を含む）
                                                    この値は、GRS がこの時計に出すゾーン名の種類を選ぶ。この値は差を変えない。"standard": 標
                                                    準時の名。"daylight": 夏時間の名。
R054  |     +- "standard"                           標準時の名
R055  |     +- "daylight"                           夏時間の名
R056  +- isTimeOfDayVisible                         時刻を見せるか（文書の全体の時刻の見せ方）
                                                    この値が true のとき、GRS はスケジュール文書の全体で、スケジュールキャンバスに時刻を見せ
                                                    る。どちらの値でも、保存した日時は時刻を保つ。
R057  +- dayWidthPx                                 暦日 1 日の幅
                                                    この値は横のズームである。この値は、タイムルーラー上の暦日 1 日の幅を、displayScaleRatio
                                                     1 のときの CSS ピクセルで示す。「全体を収める」がこの値を決める。
R058  +- fitDayRange                                全体表示期間
                                                    このオブジェクトは、全体表示時の期間を決める。全体表示時の期間は、「全体を収める」と PNG
                                                    ・SVG の画像が見せる日々である。この範囲は、GRS が保存するタスクや MSPDI へ書くタスクを
                                                    限らない。
R059  |  +- type                                    判別子
                                                    "fixed": 全体表示時の期間は firstDay から lastDay まで余白なしで続き、その 2 日まるごと
                                                    がタスクグループレーンズの両端に接する。"automatic": 全体表示時の期間は、GRS が描くもの
                                                    すべてと余白を覆う。GRS は余白を決めるが、保存しない。GRS は firstDay も lastDay も持た
                                                    ない。
R060  |  |  +- "fixed"                              決まった期間
R061  |  |  +- "automatic"                          描ける物すべての範囲（期間を持たない）
R062  |  +- firstDay                                最初の日（fixed）
                                                    このキーは、type が "fixed" のときだけ書く。この値は、全体表示時の期間の最初の日（含む）
                                                    を、表示の基準タイムゾーンでの日として示す。
R063  |  +- lastDay                                 最後の日（fixed）
                                                    このキーは、type が "fixed" のときだけ書く。この値は、全体表示時の期間の最後の日を示す。
                                                    全体表示時の期間は、この日をまるごと含む。
R064  +- verticalZoom                               縦のズーム
                                                    このオブジェクトは、縦のズームの 1 段と「全体を収める」が一緒に変える 2 つの値を持つ。こ
                                                    のキーが無いとき、GRS は「全体を収める」と同じように両方の値を選ぶ。automaticallyShownDe
                                                    pth だけが無いときは、GRS はその値を「全体を収める」と同じように選ぶ。
R065  |  +- ratio                                   縦の倍率（1 が既定）
                                                    この値は、タスク図形の縦の大きさを、既定の大きさに対する倍率で示す。2 のとき、GRS は予定
                                                    バー、実績バー、名称ラベルを 2 倍の高さで描く。
R066  |  +- automaticallyShownDepth                 automatic の帯を、この深さまで出す（1〜maxGroupDepth）
                                                    この値は、showMode が "automatic" のタスクグループを、GRS がどの深さまで見せるかを示す。
                                                    ズームインの 1 段は、この値がスケジュール文書の中のいちばん深いタスクグループの深さに届
                                                    いてから初めて ratio を変える。ratio はこの値を決して変えない。
R067  +- taskGroupPanelWidthPx                      タスクグループパネルの幅（倍率 1 のときの CSS ピクセル）
                                                    この値は、タスクグループパネルの幅を、displayScaleRatio が 1 のときの CSS ピクセルで示す
                                                    。
R068  +- isTaskGroupPanelWidthFixed                 幅を固定するか
                                                    GRS はタスクグループパネルを、いつも taskGroupPanelWidthPx の幅で描く。true: 人が文書の
                                                    設定で taskGroupPanelWidthPx を変え、パネル境界は動かない。false: パネル境界のドラッグが
                                                     taskGroupPanelWidthPx を変える。
R069  +- pinnedTaskGroupIds[]                       ピン止めしたタスクグループの id
                                                    このリストは、ピン止めしたタスクグループの id を持つ。ピン止めしたタスクグループは、縦に
                                                    スクロールしても上端に留まる。ピンは、showMode が "automatic" ならタスクグループをどの深
                                                    さでも見せ、"hidden" なら決して見せない。
R070  +- taskPlacementDirection                     帯の中で、重なるタスクを日付の早い順に置く向き
                                                    この値は積む向きを決める。積む向きは、1 本のタスクグループレーンの中で重なるタスクを、GR
                                                    S が早いタスクから積み段に積む向きである。この値はタスクグループの順を決めない。"bottomT
                                                    oTop": GRS は最も早いタスクを最も下の段に置く。"topToBottom": GRS は最も早いタスクを最も
                                                    上の段に置く。
R071  |  +- "bottomToTop"                           下から上へ
R072  |  +- "topToBottom"                           上から下へ
R073  +- scrollPosition                             開いたときの位置
                                                    このオブジェクトは、GRS がスケジュール文書を開くとき、スケジュールキャンバスの表示がどこ
                                                    から始まるかを示す。
R074  |  +- type                                    判別子
                                                    "automatic": まだ誰も場所を選んでいないので、GRS が開くときに場所を選ぶ。この値は今日や
                                                    基準日を意味しない。"fixed": 下の 4 つのキーが場所を示す。
R075  |  |  +- "automatic"                          位置を決めていない（GRS が決める）
R076  |  |  +- "fixed"                              下の 4 つの値で決める
R077  |  +- leftEdgeDay                             左の端の日（fixed）
                                                    このキーは、type が "fixed" のときだけ書く。この値は、表示の左端の日を、scheduleData.sch
                                                    eduleDataTimeZone のタイムゾーンの日として示す。
R078  |  +- leftEdgeDayOffsetPercent                左の端が、その日の始まりから何 % の所か（fixed）
                                                    type が "fixed" のときだけ書く。この値は、左端が leftEdgeDay の始まりから右へどれだけ離
                                                    れているかを、1 日に対する % で示す。0 はその日の始まりである。
R079  |  +- topEdgeTaskGroupId                      上の端の帯（fixed）
                                                    このキーは、type が "fixed" のときだけ書く。この値は、表示の上端にあるタスクグループの i
                                                    d を示す。そのタスクグループがもう無いとき、GRS はスクロール位置を "automatic" として扱
                                                    う。
R080  |  +- topEdgeTaskGroupOffsetPercent           上の端が、その帯の上から何 % の所か（fixed）
                                                    type が "fixed" のときだけ書く。この値は、上端が、画面の上ではなくそのタスクグループの上
                                                    から、どれだけ下にあるかを示す。単位は、レーンの高さと下の隙間を足した長さに対する % で
                                                    ある。
R081  +- scheduleCanvasElements                     Schedule Canvas に描く物
                                                    このオブジェクトは、GRS がスケジュールキャンバスにどの要素を描くかを選ぶ。true はその要
                                                    素を描き、false はその要素を隠す。GRS はキーを、バー、ラベル、線の順に書く。
R082  |  +- isPlanBarVisible                        予定バーを見せるか
                                                    この値が true のとき、GRS は予定バーを描く。実績バーは、isActualBarVisible が別に決める
                                                    。
R083  |  +- isActualBarVisible                      実績バーを見せるか
                                                    この値が true のとき、GRS は実績バーを描く。予定バーは、isPlanBarVisible が別に決める。
R084  |  +- isBaselineOutlineVisible                前回予定を重ねるか（前回予定輪郭）
                                                    この値が true のとき、GRS は前回予定輪郭を描く。前回予定輪郭は、前回予定（baselineTasks
                                                    ）を今のタスクに重ねて描いたものである。
R085  |  +- isAssigneeLabelVisible                  担当のラベルを見せるか
                                                    この値が true のとき、GRS は各タスクの担当ラベルを描く。
R086  |  +- isPercentCompleteLabelVisible           完了率のラベルを見せるか
                                                    この値が true のとき、GRS は各タスクの完了率ラベルを描く。
R087  |  +- isProgressStatusMarkVisible             進捗ステータスマークと再開マークを見せるか
                                                    この値が true のとき、GRS は再開マークと進捗ステータスマークを描く。これらのマークは、イ
                                                    ナズマ線の上ではなく実績バーの終わりの先で、形によって進捗ステータスを示す。
R088  |  +- isPlanDatesVisible                      予定の日付を見せるか
                                                    この値が true のとき、GRS は各名称ラベルの右に、予定の開始日と終了日を描く。
R089  |  +- isDependencyLineVisible                 依存線を見せるか
                                                    この値が true のとき、GRS は依存線を描く。
R090  |  +- isProgressLineVisible                   イナズマ線を見せるか
                                                    この値が true のとき、GRS はイナズマ線を描く。イナズマ線は、基準日から各タスクのタスク進
                                                    捗点を通る 1 本のジグザグの線である。
R091  |  +- isDateGridLinesVisible                  日の罫線を見せるか
                                                    この値が true のとき、GRS は日付罫線を描く。日付罫線は、日付ごとの縦線である。
R092  |  +- isTaskGroupGridLinesVisible             タスクグループ罫線（タスクグループの境の横線）を見せるか
                                                    この値が true のとき、GRS はタスクグループ罫線を描く。タスクグループ罫線は、タスクグルー
                                                    プレーンズとタスクグループパネルで、タスクグループの間に引く横線である。
R093  +- delayDiagnosisSettings                     遅延診断の設定
                                                    このオブジェクトは、スケジュール文書に属する遅延診断の設定を持つ。
R094  |  +- parentTaskProgressToleranceWorkingDays  遅延診断が親タスクの進み具合に許す幅（稼働日）
                                                    この値は、親の進捗点が配下の進捗点からはみ出してよい稼働日の数を示す。はみ出しがこれを超
                                                    えると、遅延診断は親に疑義を付ける。この値は、どの終了の遅れも許さない。
R095  +- tableWindows                               3 つの表の見せ方
                                                    このオブジェクトは、検索ウィンドウ、遅延診断レポートウィンドウ、担当リストウィンドウの表
                                                    の、チェック、列のフィルタ、並べ替えを持つ。このオブジェクトはウィンドウの位置を持たない
                                                    。
R096     +- searchWindow                            検索ウィンドウ -> TaskTableWindow
                                                    このオブジェクトは、検索ウィンドウの表の設定を持つ。検索ウィンドウは、タスクの表かコメン
                                                    トボックスの表を、一度に 1 つ見せる。columnFilters は両方の表のフィルタを列で分けて持つ
                                                    。columnSort は、どちらかの表の列で並べ替えを 1 つ持ち、そのとき他方の表は既定の並びで見
                                                    せる。チェックはタスクの表だけのものである。
R097     +- delayDiagnosisReportWindow              遅延診断レポート -> TaskTableWindow
                                                    このオブジェクトは、遅延診断レポートウィンドウの表の設定を持つ。
R098     +- resourceListWindow                      担当リスト -> ResourceTableWindow
                                                    このオブジェクトは、担当リストウィンドウの表の設定を持つ。
```

### スケジュールデータ（頭の値と、MSPDI と往復する群）

```text
R099  scheduleData                                    スケジュールデータ（頭の値と、MSPDI と往復する群）
R100  +- scheduleDataTimeZone                         データの日時の時差
                                                      このオブジェクトは、scheduleData の日時のタイムゾーンを示す。scheduleData の日時は時差を
                                                      持たない。GRS はこのゾーンを MSPDI へ書かない。documentStamp などの記録の時刻は UTC を使
                                                      う。
R101  |  +- utcOffset                                 UTC との差（"+09:00" の形。標準時の行だけ）
                                                      この値は、標準時での UTC からの決まった差を示す。GRS は夏時間に決して切り替えない。GRS 
                                                      は、この一覧にない差を持つファイルを開くのを断る。
R102  +- sourceFormat                                 元の形式
                                                      この値は、このスケジュール文書がどの形式から来たかを示す。GRS はこの値を MSPDI へ書かな
                                                      い。"grs": GRS で作った。"mspdi12" と "mspdi15": MS Project の版 12 か 15 の形の MSPDI 
                                                      ファイルから来た。
R103  |  +- "grs"                                     GRS JSON
R104  |  +- "mspdi12"                                 MSPDI（Project の版 12 の形）
R105  |  +- "mspdi15"                                 MSPDI（Project の版 15 の形）
R106  +- importedTopTaskOutlineLevel                  取り込んだファイルの、最上位のタスクの OutlineLevel
                                                      この値は、取り込んだファイルの最上位のタスクの MSPDI OutlineLevel を示す。この値はプロジ
                                                      ェクトの要約タスクを数えない。GRS は MSPDI を書くとき、WBS の最上位のタスクにこの Outlin
                                                      eLevel を付ける。
R107  +- mspdiImportCount                             MSPDI を取り込んだ回数
                                                      この値は、このスケジュール文書への MSPDI の取り込みの回数を数える。GRS は取り込むたびに 
                                                      1 を足し、新しい値を、取り込んだ各タスクの grs.importOrigin.mspdiImportCountWhenLastIncl
                                                      uded へ写す。
R108  +- lastMspdiImport                              最後の MSPDI の取り込み（取り込むたびに上書き。一度も取り込んでいなければ無い）
                                                      このオブジェクトは、GRS が最後に MSPDI ファイルを取り込んだ時とファイル名を記す。初めて
                                                      取り込むまで、このオブジェクトは無い。人と AI エージェントがこのオブジェクトを読む。GRS 
                                                      は代わりに mspdiImportCount を比べる。
R109  |  +- importedAt                                取り込んだ時（UTC）
                                                      この値は、GRS が MSPDI ファイルを取り込んだ UTC の時刻（YYYY-MM-DDTHH:MM:SSZ）を示す。
R110  |  +- fileName                                  取り込んだファイルの名（フォルダーを除く）
                                                      この値は、取り込んだ MSPDI ファイルの名を示す。例えば "plan-v3.xml" である。GRS はファイ
                                                      ル名だけを書き、フォルダーを決して書かない。こうして、ファイルは個人のパスを持たない。
R111  +- highestIssuedUid                             uid の数え手（GRS が出した最も大きい uid）
                                                      この値は、GRS が出した最も大きい uid である。タスク、担当、割当、暦が、1 つの数え手を共
                                                      にする。GRS は新しい実体に、この値に 1 を足した値を付ける。GRS は uid を決して使い回さな
                                                      い。
R112  +- project [M]                                  プロジェクト（1 件）
                                                      MSPDI の Project と同じ。scheduleData.project は、プロジェクト全体の値だけを持つ。MSPDI 
                                                      のリスト（calendars, tasks, resources, assignments）は、MSPDI のように project の中に入
                                                      らず、scheduleData の中で project と並ぶ。
R113  |  +- uid [M]                                   一意な識別子（文字列）
                                                      MSPDI の UID と同じ。GRS は別のファイルに上書きする前に、project.uid、project.name、ファ
                                                      イル名がすべて一致するときだけ、そのファイルを同じスケジュール文書とみなす。無い値は決し
                                                      て一致しない。
R114  |  +- name [M]                                  プロジェクト名
                                                      MSPDI の Name と同じ。GRS はこの値も、project.uid とファイル名と共に使い、既にあるファイ
                                                      ルが同じスケジュール文書を持つかを見分ける。
R115  |  +- title [M]                                 タイトル
                                                      MSPDI の Title と同じ。GRS はこの値を、アプリヘッダーのプロジェクトタイトルとして見せる
                                                      。GRS は、別名保存ダイアログの既定のファイル名をこの値から作る。
R116  |  +- subject [M]                               件名
                                                      MSPDI の Subject と同じ。
R117  |  +- category [M]                              分類
                                                      MSPDI の Category と同じ。
R118  |  +- company [M]                               会社
                                                      MSPDI の Company と同じ。
R119  |  +- manager [M]                               管理者
                                                      MSPDI の Manager と同じ。
R120  |  +- author [M]                                作成者
                                                      MSPDI の Author と同じ。作成者は、スケジュール文書を最後に書いた者ではない。最後に書いた
                                                      者は、documentStamp.lastEditedBy が持つ。
R121  |  +- creationDate [M]                          作った日時
                                                      MSPDI の CreationDate と同じ。GRS は新しいスケジュール文書を作るとき、作った瞬間を書く。
R122  |  +- revision [M]                              保存した回数
                                                      MSPDI の Revision と同じ。この値は、MSPDI ファイルを作ったツールがプロジェクトを保存した
                                                      回数を数える。この値は、GRS JSON の版でも documentStamp の時刻でもない。
R123  |  +- startDate [M]                             開始の日時
                                                      MSPDI の StartDate と同じ。
R124  |  +- calendarUid [M]                           稼働日を数える暦
                                                      MSPDI の CalendarUID と同じ。GRS はすべての稼働日をこの暦で数える。有効な値が無いとき、G
                                                      RS は isBaseCalendar が true の最初の暦を使い、それも無ければ組み込みの月曜〜金曜の暦を
                                                      使う。
R125  |  +- defaultStartTime [M]                      既定の開始時刻
                                                      MSPDI の DefaultStartTime と同じ。GRS は、GRS が日単位で決める開始に、この時刻を付ける。
                                                      キーが無いとき、GRS は 08:00:00 を使う。マイルストーンの開始は、代わりに defaultFinishTi
                                                      me を使う。
R126  |  +- defaultFinishTime [M]                     既定の終了時刻
                                                      MSPDI の DefaultFinishTime と同じ。GRS は、GRS が日単位で決める終了とマイルストーンの開
                                                      始に、この時刻を付ける。キーが無いとき、GRS は 17:00:00 を使う。
R127  |  +- minutesPerDay [M]                         1 日の稼働の分
                                                      MSPDI の MinutesPerDay と同じ。この値は、稼働日 1 日（1d）の分の数を示す。キーが無いとき
                                                      、GRS は 480 を使う。1 日の稼働時間の合計がこの値と違うとき、GRS は開くときに警告する。
R128  |  +- minutesPerWeek [M]                        1 週の稼働の分
                                                      MSPDI の MinutesPerWeek と同じ。この値は、稼働の 1 週の長さを分で示す。
R129  |  +- daysPerMonth [M]                          1 か月の稼働日
                                                      MSPDI の DaysPerMonth と同じ。この値は、1 か月の稼働日の数を示す。
R130  |  +- weekStartDay [M]                          週の始まりの曜日
                                                      MSPDI の WeekStartDay と同じ。曜日の番号: 0=日曜、1=月曜、2=火曜、3=水曜、4=木曜、5=金曜
                                                      、6=土曜。日曜はここでは 0 だが、calendars[].weekDays[].dayType では 1 である。GRS はタ
                                                      イムルーラーの各週を、この曜日から始める。
R131  |  |  +- 0                                      日曜
R132  |  |  +- 1                                      月曜
R133  |  |  +- 2                                      火曜
R134  |  |  +- 3                                      水曜
R135  |  |  +- 4                                      木曜
R136  |  |  +- 5                                      金曜
R137  |  |  +- 6                                      土曜
R138  |  +- statusDate [M]                            基準日
                                                      MSPDI の StatusDate と同じ。GRS はこの日時に基準日線を描き、この日について遅延診断を行う
                                                      。statusDate が無いとき、GRS は基準日線を描かず、遅延診断は動かない。
R139  |  +- grs [G]                                   GRS の値
                                                      このオブジェクトは、このプロジェクトの GRS の部である。grs の下のキーは GRS の名で、MSPD
                                                      I の要素名ではない。ここでは、grs は passthrough だけを持つ。
R140  |     +- passthrough                            持ち越した MSPDI の値（MSPDI の構造と名のまま）
                                                      このオブジェクトは、このプロジェクトの MSPDI の値のうち、GRS が使わず、MSPDI へそのまま
                                                      書き戻す値を持つ。
R141  +- calendars[] [M]                              暦
                                                      MSPDI の Calendars と同じ。GRS はすべての稼働日を、project.calendarUid が指す 1 つの暦で
                                                      数える。GRS はほかの暦を、MSPDI へ書き戻すためだけに持つ。
R142  |  +- uid [M]                                   一意な識別子
                                                      MSPDI の UID と同じ。
R143  |  +- name [M]                                  暦の名
                                                      MSPDI の Name と同じ。
R144  |  +- isBaseCalendar [M]                        基本の暦か
                                                      MSPDI の IsBaseCalendar と同じ。true は基本の暦を示す。false かキーが無いときは、基本の
                                                      暦でない暦を示す。MSPDI は 1 か 0 を書く。
R145  |  +- baseCalendarUid [M]                       受け継ぐ元の暦
                                                      MSPDI の BaseCalendarUID と同じ。この値は、MSPDI でこの暦が受け継ぐ元の暦を指す。GRS は
                                                      この値を書き戻すが、受け継がない。GRS は、この暦が並べる日だけを数える。
R146  |  +- grs [G]                                   GRS の値
                                                      このオブジェクトは、この暦の GRS の部である。grs の下のキーは GRS の名で、MSPDI の要素名
                                                      ではない。ここでは、grs は passthrough だけを持つ。
R147  |  |  +- passthrough                            持ち越した MSPDI の値
                                                      このオブジェクトは、この暦の MSPDI の値のうち、GRS が使わず、そのまま書き戻す値を持つ。c
                                                      alendars[] の外にある Calendar 要素まるごとは、passthroughCalendars[] へ入る。
R148  |  +- weekDays[] [M]                            曜日ごとの稼働
                                                      MSPDI の WeekDays と同じ。各項目は、dayType が指す曜日を述べる。
R149  |  |  +- dayType [M]                            曜日（MSPDI の 0 例外は GRS では使わない）
                                                      MSPDI の DayType と同じ。曜日の番号: 1=日曜、2=月曜、3=火曜、4=水曜、5=木曜、6=金曜、7=
                                                      土曜。日曜はここでは 1 だが、project.weekStartDay では 0 である。GRS は MSPDI の番号 0（
                                                      例外）を決して使わない。例外の日は calendars[].exceptions[] が持つ。
R150  |  |  |  +- 1                                   日曜
R151  |  |  |  +- 2                                   月曜
R152  |  |  |  +- 3                                   火曜
R153  |  |  |  +- 4                                   水曜
R154  |  |  |  +- 5                                   木曜
R155  |  |  |  +- 6                                   金曜
R156  |  |  |  +- 7                                   土曜
R157  |  |  +- dayWorking [M]                         稼働日か
                                                      MSPDI の DayWorking と同じ。true は、その曜日が稼働日であることを示す。false かキーが無
                                                      いときは、非稼働日を示す。MSPDI は 1 か 0 を書く。
R158  |  |  +- grs [G]                                GRS の値
                                                      このオブジェクトは、この曜日の GRS の部である。grs の下のキーは GRS の名で、MSPDI の要素
                                                      名ではない。ここでは、grs は passthrough だけを持つ。
R159  |  |  |  +- passthrough                         持ち越した MSPDI の値
                                                      このオブジェクトは、この曜日の MSPDI の値のうち、GRS が使わず、MSPDI へそのまま書き戻す
                                                      値を持つ。
R160  |  |  +- workingTimes[] [M]                     稼働の時間帯
                                                      MSPDI の WorkingTimes と同じ。workingTimes の無い稼働日では、GRS は 08:00-12:00 と 13:00
                                                      -17:00 を使う。
R161  |  |     +- fromTime [M]                        始まりの時刻
                                                      MSPDI の FromTime と同じ。
R162  |  |     +- toTime [M]                          終わりの時刻
                                                      MSPDI の ToTime と同じ。00:00:00 は 24:00、つまりその日の終わりを示す。
R163  |  +- exceptions[] [M]                          例外の日
                                                      MSPDI の Exceptions と同じ。各項目は 1 つの例外である。例外は、休日のように、曜日の決ま
                                                      りと違う働き方をする 1 日か、日の範囲である。
R164  |     +- name [M]                               例外の名
                                                      MSPDI の Name と同じ。
R165  |     +- fromDate [M] (TimePeriod/FromDate)     最初の日
                                                      MSPDI の TimePeriod/FromDate と同じ。この値は、例外の最初の日を示す。GRS は日付だけを読
                                                      む。GRS が日付を決めるときは、GRS は T00:00:00 を書く。
R166  |     +- toDate [M] (TimePeriod/ToDate)         最後の日
                                                      MSPDI の TimePeriod/ToDate と同じ。この値は例外の最後の日を示し、例外はその日を含む。GRS
                                                       は日付だけを読むので、T00:00:00 でもその日をまるごと数える。GRS は T23:59:00 を書く。
R167  |     +- dayWorking [M]                         稼働日か
                                                      MSPDI の DayWorking と同じ。true は、例外の日々を稼働日にする。false かキーが無いときは
                                                      、休日のように、その日々を非稼働日にする。MSPDI は 1 か 0 を書く。
R168  |     +- type [M]                               例外の繰り返し方（判別子ではない）
                                                      MSPDI の Type と同じ。この値は繰り返しの番号を示す: 1=毎日、2=毎年・月の何日、3=毎年・月
                                                      の第何何曜日、4=毎月・何日、5=毎月・第何何曜日、6=毎週、7=日数ごと、8=曜日の数ごと、9=繰
                                                      り返さない。GRS は一度きりの例外だけで稼働日を数える。一度きりの例外は fromDate から toD
                                                      ate までの毎日に効く: type 9、type なし、または period が 1 か period なしの type 1（毎
                                                      日）。新しい例外は 1 を取る。GRS はほかの例外をそのまま保ち、数えるときには使わない。
R169  |     |  +- 1                                   毎日
R170  |     |  +- 2                                   毎年、月の何日
R171  |     |  +- 3                                   毎年、月の第何何曜日
R172  |     |  +- 4                                   毎月、何日
R173  |     |  +- 5                                   毎月、第何何曜日
R174  |     |  +- 6                                   毎週
R175  |     |  +- 7                                   何日ごと
R176  |     |  +- 8                                   何稼働日ごと
R177  |     |  +- 9                                   繰り返さない
R178  |     +- period [M]                             繰り返しの間隔
                                                      MSPDI の Period と同じ。この値は、type の繰り返しの間隔を示す。例えば type 6 で 2 なら、
                                                      2 週ごとである。GRS は、type 1 の例外が一度きりかどうかを見分けるためだけに、period を使
                                                      う。
R179  |     +- grs [G]                                GRS の値
                                                      このオブジェクトは、この例外の GRS の部である。grs の下のキーは GRS の名で、MSPDI の要素
                                                      名ではない。ここでは、grs は passthrough だけを持つ。
R180  |     |  +- passthrough                         持ち越した MSPDI の値
                                                      このオブジェクトは、この例外の MSPDI の値のうち、GRS が使わず、MSPDI へそのまま書き戻す
                                                      値を持つ。
R181  |     +- workingTimes[] [M]                     稼働の時間帯
                                                      MSPDI の WorkingTimes と同じ。稼働する例外では、これらの時間帯が曜日の時間帯に代わる。wo
                                                      rkingTimes の無い稼働する例外は、08:00-12:00 と 13:00-17:00 を使う。
R182  |        +- fromTime [M]                        始まりの時刻
                                                      MSPDI の FromTime と同じ。
R183  |        +- toTime [M]                          終わりの時刻
                                                      MSPDI の ToTime と同じ。00:00:00 は 24:00、つまりその日の終わりを示す。
R184  +- passthroughCalendars[]                       GRS が暦にしない MSPDI の要素
                                                      このリストは、calendars[] の外にある MSPDI の Calendar 要素まるごとを持つ。GRS は各要素
                                                      を、precedingCalendarUid が指す暦のすぐ後ろに、MSPDI へ書き戻す。
R185  |  +- precedingCalendarUid                      前にある、いちばん近い暦の uid（先頭では書かない）
                                                      この値は、MSPDI でこの要素より前にある、calendars[] の中のいちばん近い暦の uid である。
                                                      キーが無いと、その要素は先頭に来る。値が等しいときは、配列の順を保つ。
R186  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
                                                      このオブジェクトは、MSPDI の要素まるごとを持つ。キーは、MSPDI と同じく子要素の名である。
                                                      GRS はその要素をそのまま書き戻す。
R187  +- tasks[] [M]                                  タスク
                                                      MSPDI の Tasks と同じ。このリストの順は意味を持たない。parentTaskUid と siblingIndex が 
                                                      WBS の木を決める。GRS は MSPDI のタスクをその木に沿って深さ優先で書き、ID、OutlineLevel
                                                      、OutlineNumber、Summary を作り直す。
R188  |  +- uid [M]                                   一意な識別子
                                                      MSPDI の UID と同じ。
R189  |  +- name [M]                                  タスク名
                                                      MSPDI の Name と同じ。
R190  |  +- start [M]                                 予定の開始
                                                      MSPDI の Start と同じ。この値は予定の開始を示す。GRS は、start の無いタスクを持つスケジ
                                                      ュール文書を開かない。
R191  |  +- finish [M]                                予定の終了
                                                      MSPDI の Finish と同じ。この値は予定の終了を示す。マイルストーンの開始と終了は同じである
                                                      。GRS は、finish の無いタスクを持つスケジュール文書を開かない。
R192  |  +- stop [M]                                  作業が止まった時
                                                      MSPDI の Stop と同じ。この値は、進行中か中断のタスクで、ここまでの作業が止まる日時を示す
                                                      。GRS はタスクを完了にするとき、stop を消す。そのあとは、actualFinish が終わりを持つ。
R193  |  +- resume [M]                                再開の予定
                                                      MSPDI の Resume と同じ。中断のタスクで、この値は、残りの作業が再び始まる予定の日時を示す
                                                      （作業が 2 つに分かれる）。
R194  |  +- resumeValid [M]                           再開日が有効か
                                                      MSPDI の ResumeValid と同じ。actualStart があって actualFinish の無いタスクでは、false 
                                                      は再開日の無い中断を示し、GRS は resume を無視する。キーが無いことは、false と同じではな
                                                      い。GRS は再開日を書くたびに true も書く。
R195  |  +- milestone [M]                             マイルストーンか
                                                      MSPDI の Milestone と同じ。この値は、マイルストーンなら true、作業の期間を持つタスクなら
                                                       false か無しである。ただし MSPDI は 1 か 0 を書く。
R196  |  +- percentComplete [M]                       完了率
                                                      MSPDI の PercentComplete と同じ。GRS は開くときにこの値を数え直す: 実績の稼働時間（actua
                                                      lStart から actualFinish か stop まで）を予定の稼働時間で割り、100 を掛けて丸める。GRS 
                                                      は上限で抑えない。予定の稼働時間が無いとき、この値は actualFinish があれば 100、なければ
                                                       0 である。
R197  |  +- actualStart [M]                           実績の開始
                                                      MSPDI の ActualStart と同じ。actualStart の無いタスクは、まだ始まっていない。
R198  |  +- actualFinish [M]                          実績の終了
                                                      MSPDI の ActualFinish と同じ。完了したタスクだけが actualFinish を持つ。percentComplete 
                                                      が 100 でも、完了を意味しない。
R199  |  +- calendarUid [M]                           タスクの暦
                                                      MSPDI の CalendarUID と同じ。この値は、このタスクだけの暦を指す。GRS はこの値を保って書
                                                      き戻すが、稼働日は project.calendarUid だけで数える。
R200  |  +- deadline [M]                              期限
                                                      MSPDI の Deadline と同じ。
R201  |  +- hyperlink [M]                             リンクのタイトル
                                                      MSPDI の Hyperlink と同じ。この値はリンクのタイトル（見せる文字）で、アドレスではない。U
                                                      RL は hyperlinkAddress が持つ。
R202  |  +- hyperlinkAddress [M]                      リンク先の URL
                                                      MSPDI の HyperlinkAddress と同じ。この値はリンクの URL である。タイトルは hyperlink が持
                                                      つ。
R203  |  +- notes [M]                                 メモ
                                                      MSPDI の Notes と同じ。
R204  |  +- parentTaskUid [G]                         WBS の親タスク（最上位では書かない）
                                                      この値は、WBS の親タスクの uid である。このキーの無いタスクは、最上位にある。MSPDI にこ
                                                      の要素は無い。
R205  |  +- siblingIndex [G]                          兄弟の中で何番目か（0 から）
                                                      この値は、同じ親を持つタスクの中での、このタスクの位置を 0 から数えて示す。GRS は 0, 1, 
                                                      2 と隙間なく書き、小さい値から先に読み、同じ値なら配列の順を保つ。
R206  |  +- grs [G]                                   タスクに付く GRS の値
                                                      このオブジェクトは、このタスクの GRS の値を持つ。grs の下のキーは GRS の名で、MSPDI の要
                                                      素名ではない。
R207  |  |  +- startSlopeCalendarDays                 開始の傾き（開始の端を斜めに落とす暦日。確定していない日付）
                                                      この値は、開始の傾きを暦日で示す。GRS は予定バーの開始の端を内側へ（開始から終了の向きへ
                                                      ）斜めにして、確定していない開始を示す。GRS はスケジュールを変えない。
R208  |  |  +- finishSlopeCalendarDays                終了の傾き（終了の端を斜めに落とす暦日。確定していない日付）
                                                      この値は、終了の傾きを暦日で示す。GRS は予定バーの終了の端を内側へ（終了から開始の向きへ
                                                      ）斜めにして、確定していない終了を示す。GRS はスケジュールを変えない。
R209  |  |  +- style                                  見た目（型 TaskStyle）
                                                      このオブジェクトは、GRS がこのタスクのタスク図形をどう描くか（形、塗り、線）を示す。
R210  |  |  |  +- taskShape                           バーの形（マイルストーンでないときだけ）
                                                      この値は、マイルストーンでないタスクの予定バーと実績バーの形を示す。"rectangle"、"chevro
                                                      n"（開始に切り欠きがあり、終了がとがったバー）、"arrow"、"dumbbell"（両端に点のある細い
                                                      線）。
R211  |  |  |  |  +- "rectangle"                      矩形
R212  |  |  |  |  +- "chevron"                        矢羽根
R213  |  |  |  |  +- "arrow"                          矢印
R214  |  |  |  |  +- "dumbbell"                       ダンベル（両端に点のある細い線）
R215  |  |  |  +- milestoneShape                      マイルストーンマークの形（マイルストーンのときだけ）
                                                      この値は、マイルストーンマークの形を示す。各値は、GRS が描く絵を名指す。例えば diamond（
                                                      ダイヤ）や star（星）である。マイルストーンだけが milestoneShape を持つ。
R216  |  |  |  |  +- "circle"                         円
R217  |  |  |  |  +- "hexagon"                        六角形
R218  |  |  |  |  +- "pentagon"                       五角形
R219  |  |  |  |  +- "diamond"                        ひし形
R220  |  |  |  |  +- "square"                         正方形
R221  |  |  |  |  +- "star"                           星
R222  |  |  |  |  +- "triangleUp"                     上向きの三角
R223  |  |  |  |  +- "triangleDown"                   下向きの三角
R224  |  |  |  |  +- "file"                           書類
R225  |  |  |  |  +- "box"                            箱
R226  |  |  |  |  +- "floppyDisk"                     フロッピーディスク
R227  |  |  |  |  +- "cylinder"                       円柱
R228  |  |  |  |  +- "meetingPeople"                  会議の人々
R229  |  |  |  |  +- "smilingFace"                    笑顔
R230  |  |  |  |  +- "beerMug"                        ビールジョッキ
R231  |  |  |  +- fill                                塗り -> Paint
                                                      このオブジェクトは、予定バー（マイルストーンではマイルストーンマーク）の塗りを決める。GR
                                                      S は実績バーも同じ色から塗る。キーが無いと塗りは無い。
R232  |  |  |  +- stroke                              縁 -> Stroke
                                                      このオブジェクトは、予定バーと実績バー（マイルストーンではマイルストーンマーク）の枠線を
                                                      決める。キーが無いと枠線は無い。
R233  |  |  +- taskGroupId                            載せるタスクグループ
                                                      この値は、GRS がこのタスクを描くタスクグループレーンの、タスクグループの id である。タス
                                                      クグループは、WBS の親（parentTaskUid）とは関わりが無い。
R234  |  |  +- importOrigin                           取り込み元の控え（型 ImportOrigin。取り込んだタスクだけ）
                                                      このオブジェクトは、このタスクがどの MSPDI ファイルのどのタスクから来たかを記す。GRS は
                                                      後の取り込みで、このオブジェクトを照合に使う。GRS で作ったタスクは importOrigin を持たな
                                                      い。
R235  |  |  |  +- sourceProjectUid                    元のファイルの Project の UID
                                                      この値は、GRS がこのタスクを取り込んだ MSPDI ファイルの Project UID である。そのファイル
                                                      に Project UID が無かったとき、このキーは無く、importSessionId がファイルを見分ける。
R236  |  |  |  +- sourceTaskUid                       元のファイルでの、このタスクの UID
                                                      この値は、その MSPDI ファイルでのこのタスクの UID である。GRS が取り込んだタスクに新しい
                                                       uid を付けることがあるので、この値は uid と違うことがある。
R237  |  |  |  +- importSessionId                     取り込みの id（取り込みのたびに GRS が作る）
                                                      この値は、このタスクを持ち込んだ取り込みのために、GRS が作った id である。MSPDI ファイル
                                                      に Project UID が無かったとき、この id が sourceProjectUid の代わりをする。
R238  |  |  |  +- mspdiImportCountWhenLastIncluded    このタスクを最後に含んでいた取り込みが何回目か
                                                      この値は、このタスクを含むファイルを取り込んだ最後の時の scheduleData.mspdiImportCount 
                                                      を写す。値が今の回数より小さいとき、最新の取り込みはこのタスクを含まなかった。
R239  |  |  +- passthrough                            持ち越した MSPDI の値
                                                      このオブジェクトは、このタスクの MSPDI の値のうち、GRS が使わない値を持ち、GRS はそれら
                                                      をそのまま書き戻す。GRS が作ったタスクと、人が日付を変えたタスクに限り、GRS は Duration 
                                                      と ManualStart・ManualFinish・ManualDuration を作り直し、ConstraintType と ConstraintDat
                                                      e を書き、FreeSlack・TotalSlack・StartSlack・FinishSlack を書かない。人が実績の日付を変
                                                      えた後は、GRS は ActualDuration を作り直す。tasks[] の外にある Task 要素まるごとは、pass
                                                      throughTasks[] へ入る。
R240  |  +- predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
                                                      MSPDI の PredecessorLink と同じ。各項目は 1 つの依存である: このタスクは、先行タスクの一
                                                      方の端を待つ。
R241  |     +- predecessorUid [M]                     先行タスク
                                                      MSPDI の PredecessorUID と同じ。この値は、tasks[] の中の先行タスクの uid である。
R242  |     +- type [M]                               依存の種類（判別子ではない）
                                                      MSPDI の Type と同じ。この値は依存の種類の番号を示す: 0=FF（終了-終了）、1=FS（終了-開始
                                                      ）、2=SF（開始-終了）、3=SS（開始-開始）。1 文字目は先行タスクの端を指し、2 文字目はこの
                                                      タスクの端を指す。
R243  |     |  +- 0                                   FF 終了から終了
R244  |     |  +- 1                                   FS 終了から開始
R245  |     |  +- 2                                   SF 開始から終了
R246  |     |  +- 3                                   SS 開始から開始
R247  |     +- linkLag [M]                            ラグ（0.1 分単位）
                                                      MSPDI の LinkLag と同じ。この値は、lagFormat に関わらず、ラグを 0.1 分単位で示す。4800 
                                                      は 480 分で、project.minutesPerDay が 480 なら稼働日 1 日である。キーが無いとラグは無い
                                                      。
R248  |     +- lagFormat [M]                          ラグを見せる単位（e は経過時間、? は見積り）
                                                      MSPDI の LagFormat と同じ。この値は、ラグを見せる単位の番号を示す: 3=m, 4=em, 5=h, 6=eh,
                                                       7=d, 8=ed, 9=w, 10=ew, 11=mo, 12=emo, 19=%, 20=e%, 35=m?, 36=em?, 37=h?, 38=eh?, 39=d?,
                                                       40=ed?, 41=w?, 42=ew?, 43=mo?, 44=emo?, 51=%?, 52=e%?（m は分、h は時間、d は日、w は週
                                                      、mo は月、% はパーセント、e は経過時間、? は見積り）。単位は linkLag を決して変えない。
                                                      GRS は 3、5、7 のときだけラグを数え、ほかの番号ではラグを見せるだけである。lagFormat が
                                                      無いとき、GRS はラグを 2880m のように分で見せ、数えには入れない。
R249  |     |  +- 3                                   m 分
R250  |     |  +- 4                                   em
R251  |     |  +- 5                                   h 時間
R252  |     |  +- 6                                   eh
R253  |     |  +- 7                                   d 日
R254  |     |  +- 8                                   ed
R255  |     |  +- 9                                   w 週
R256  |     |  +- 10                                  ew
R257  |     |  +- 11                                  mo 月
R258  |     |  +- 12                                  emo
R259  |     |  +- 19                                  % 割合
R260  |     |  +- 20                                  e%
R261  |     |  +- 35..44                              m? .. emo?（見積り）
R262  |     |  +- 51                                  %?
R263  |     |  +- 52                                  e%?
R264  |     +- grs [G]                                GRS の値
                                                      このオブジェクトは、この依存の GRS の部を持つ。grs の下のキーは GRS の名で、MSPDI の要素
                                                      名ではない。ここでは、grs は passthrough だけを持つ。
R265  |        +- passthrough                         持ち越した MSPDI の値
                                                      このオブジェクトは、この依存の MSPDI の値のうち、GRS が使わず、MSPDI へそのまま書き戻す
                                                      値を持つ。
R266  +- passthroughTasks[]                           GRS がタスクにしない MSPDI の要素
                                                      このリストは、tasks[] の外にある MSPDI の Task 要素まるごとを持つ。例えばプロジェクトの
                                                      要約タスクで、GRS はこれを最初に書く。GRS はほかの各要素を、precedingTaskUid が指すタス
                                                      クのすぐ後ろに書く。
R267  |  +- precedingTaskUid                          前にある、いちばん近いタスクの uid（先頭では書かない）
                                                      この値は、MSPDI でこの要素より前にある、tasks[] の中のいちばん近いタスクの uid である。
                                                      この値は、依存の先行タスクでは決してない。キーが無いと、その要素は先頭に来る。値が等しい
                                                      ときは、配列の順を保つ。
R268  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
                                                      この値は MSPDI の要素まるごとで、キーは MSPDI と同じく子要素の名である。GRS はその要素を
                                                      そのまま書き戻す。
R269  +- resources[] [M]                              担当
                                                      MSPDI の Resources と同じ。GRS は担当を担当リストウィンドウに並べ、各タスクの担当を担当
                                                      ラベルに見せる。
R270  |  +- uid [M]                                   一意な識別子
                                                      MSPDI の UID と同じ。
R271  |  +- name [M]                                  担当の名
                                                      MSPDI の Name と同じ。
R272  |  +- type [M]                                  資材か作業か（判別子ではない）
                                                      MSPDI の Type と同じ。担当の種類の番号: 0=資材、1=作業。番号に関わらず、どの担当も同じキ
                                                      ーを持つ。
R273  |  |  +- 0                                      資材
R274  |  |  +- 1                                      作業
R275  |  +- isCostResource [M]                        コストの担当か
                                                      MSPDI の IsCostResource と同じ。true はコストの担当を示す。false かキーが無いときは、コ
                                                      ストの担当でないことを示す。MSPDI は 1 か 0 を書く。
R276  |  +- calendarUid [M]                           担当の暦
                                                      MSPDI の CalendarUID と同じ。この値は、この担当だけの暦を指す。GRS はこの値を保って書き
                                                      戻すが、稼働日は project.calendarUid だけで数える。
R277  |  +- grs [G]                                   GRS の値
                                                      このオブジェクトは、この担当の GRS の部を持つ。grs の下のキーは GRS の名で、MSPDI の要素
                                                      名ではない。ここでは、grs は passthrough だけを持つ。
R278  |     +- passthrough                            持ち越した MSPDI の値
                                                      このオブジェクトは、この担当の MSPDI の値のうち、GRS が使わず、そのまま書き戻す値を持つ
                                                      。resources[] の外にある Resource 要素まるごとは、passthroughResources[] へ入る。
R279  +- passthroughResources[]                       GRS が担当にしない MSPDI の要素
                                                      このリストは、resources[] の外にある MSPDI の Resource 要素まるごとを持つ。GRS は各要素
                                                      を、precedingResourceUid が指す担当のすぐ後ろに、MSPDI へ書き戻す。
R280  |  +- precedingResourceUid                      前にある、いちばん近い担当の uid（先頭では書かない）
                                                      この値は、MSPDI でこの要素より前にある、resources[] の中のいちばん近い担当の uid である
                                                      。キーが無いと、その要素は先頭に来る。値が等しいときは、配列の順を保つ。
R281  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
                                                      この値は MSPDI の要素まるごとで、キーは MSPDI と同じく子要素の名である。GRS はその要素を
                                                      そのまま書き戻す。
R282  +- assignments[] [M]                            割当
                                                      MSPDI の Assignments と同じ。各項目は、1 つの担当を 1 つのタスクに就ける。
R283  |  +- uid [M]                                   一意な識別子
                                                      MSPDI の UID と同じ。
R284  |  +- taskUid [M]                               就くタスク
                                                      MSPDI の TaskUID と同じ。この値は、tasks[] の中のタスクの uid である。
R285  |  +- resourceUid [M]                           就く担当
                                                      MSPDI の ResourceUID と同じ。この値は、resources[] の中の担当の uid である。
R286  |  +- grs [G]                                   GRS の値
                                                      このオブジェクトは、この割当の GRS の部を持つ。grs の下のキーは GRS の名で、MSPDI の要素
                                                      名ではない。ここでは、grs は passthrough だけを持つ。
R287  |     +- passthrough                            持ち越した MSPDI の値
                                                      このオブジェクトは、この割当の MSPDI の値のうち、GRS が使わず、そのまま書き戻す値を持つ
                                                      。assignments[] の外にある Assignment 要素まるごとは、passthroughAssignments[] へ入る。
R288  +- passthroughAssignments[]                     GRS が割当にしない MSPDI の要素
                                                      このリストは、assignments[] の外にある MSPDI の Assignment 要素まるごとを持つ。GRS は各
                                                      要素を、precedingAssignmentUid が指す割当のすぐ後ろに、MSPDI へ書き戻す。
R289     +- precedingAssignmentUid                    前にある、いちばん近い割当の uid（先頭では書かない）
                                                      この値は、MSPDI でこの要素より前にある、assignments[] の中のいちばん近い割当の uid であ
                                                      る。キーが無いと、その要素は先頭に来る。値が等しいときは、配列の順を保つ。
R290     +- mspdiElement                              MSPDI の要素（構造と名のまま）
                                                      この値は MSPDI の要素まるごとで、キーは MSPDI と同じく子要素の名である。GRS はその要素を
                                                      そのまま書き戻す。
```

### スケジュールデータ（GRS だけが持つ配列）

```text
R291  scheduleData                        スケジュールデータ（GRS だけが持つ配列。MSPDI の群の後に続く）
R292  +- taskGroups[]                     タスクグループ
                                          このリストは、タスクグループを深さ優先で持つ。タスクグループは、WBS とは別の、描く行の木
                                          である。GRS は MSPDI を読むとき、WBS からこのリストを作る。
R293  |  +- id                            一意な UUID
                                          この値はタスクグループの id で、ランダムな UUID である。
R294  |  +- name                          タスクグループ名
                                          この値は、タスクグループパネルが見せるタスクグループ名である。キーが無いとき、タスクグル
                                          ープは名を持たず、GRS は空のタイトルを見せる。
R295  |  +- parentTaskGroupId             親のタスクグループ（最上位では書かない）
                                          この値は、親のタスクグループの id である。キーが無いとき、そのタスクグループは最上位のタ
                                          スクグループ（深さ 1）である。
R296  |  +- siblingIndex                  兄弟の中で何番目か（0 から）
                                          この値は、同じ親を持つタスクグループの中での、このタスクグループの位置を 0 から数えて示
                                          す。GRS は、値の小さいタスクグループから上に並べる。
R297  |  +- style                         見た目（型 TaskGroupStyle）
                                          このオブジェクトは、GRS がタスクグループをどう描くかを示す（型 TaskGroupStyle）。style 
                                          が無いとき、GRS はタスクグループレーンに色を付けない。
R298  |  |  +- color                      帯の色 -> TaskGroupColor
                                          この値は、タスクグループレーンの色である。{"type": "theme"} はテーマ色で描く。
R299  |  +- minHeightPx                   帯の最も低い高さ
                                          この値は、タスクグループレーンの最小の高さを、displayScaleRatio 1 のときの CSS ピクセル
                                          で示す。縦のズームはこの高さを変えない。キーが無いと、最小の高さは無い。
R300  |  +- representativeTaskUid         この帯を代表する WBS のタスク
                                          この値は、このタスクグループが代表する WBS のタスクの uid である。人がこのタスクグループ
                                          を別のタスクグループの下に入れると、GRS はそれに合わせて、そのタスクを WBS の中で動かす
                                          。
R301  |  +- hyperlinkAddress              リンク先の URL
                                          この値は、タスクグループのリンク先の URL である。キーが無いとき、タスクグループはリンク
                                          を持たない。
R302  |  +- hyperlink                     リンクのタイトル
                                          この値はタスクグループのリンクのタイトルで、アドレスではない。キーが無いとき、リンクはタ
                                          イトルを持たない。
R303  |  +- showMode                      この帯を出すかの意図（書かなければ automatic。hidden と hiddenUntilZoomIn は配下も隠す）
                                          この値は、このタスクグループについて人が望むことを記す。"shown": 祖先がこのタスクグルー
                                          プを隠さない限り、GRS はどの深さでもこのタスクグループを描く。"hidden": 人が再び見せるま
                                          で、GRS はこのタスクグループと配下のすべてのタスクグループを隠し、ズームでも「全体を収め
                                          る」でも隠したままにする。"automatic": GRS は、automaticallyShownDepth、ピン、見えている
                                          配下のタスクグループへの道から決める。"hiddenUntilZoomIn": 次の縦のズームインまで、GRS 
                                          はこのタスクグループと配下のすべてのタスクグループを隠し、そのあと値を "automatic" に変
                                          える。
R304  |  |  +- "shown"                    出す（人が出すと選んだ。深さに依らず描く。祖先が隠していれば隠れる）
R305  |  |  +- "hidden"                   しまう（人がしまうと選んだ。配下も隠れ、ズームでも全体表示でも隠れたまま）
R306  |  |  +- "automatic"                規則に任せる（深さ・ピン・出ている配下への道で決まる）
R307  |  |  +- "hiddenUntilZoomIn"        拡大まで隠す（配下も隠れる。次の縦のズームインで automatic に変わる）
R308  |  +- allowedEditorGroupName        編集してよい組の名
                                          この値は、このタスクグループのタスクを編集してよい人の組の名を示す。GRS はそれらのタスク
                                          を、どの人にもどの AI エージェントにも読み取り専用として扱う。GRS は単体では自分の組を持
                                          たないからである。GRS は、値の違うタスクグループへの移動も断る。
R309  +- baselineTasks[]                  前回予定
                                          このリストは前回予定を持つ。前回予定は、前のタスクの日付を保存した写しである。前回予定の
                                          タスクは形を持たない。各前回予定輪郭は、同じ uid を持つ今のタスクの形を使う。
R310  |  +- uid                           今のタスクの uid
                                          この値は、この前回予定のタスクが属する、今のタスクの uid である。
R311  |  +- name                          タスク名
                                          この値は、前回予定を取った時のタスク名である。
R312  |  +- start                         前回予定の開始
                                          この値は、前回予定を取った時の予定の開始である。
R313  |  +- finish                        前回予定の終了
                                          この値は、前回予定を取った時の予定の終了である。
R314  |  +- milestone                     マイルストーンか
                                          この値は、前回予定を取った時にそのタスクがマイルストーンだったかを記す。GRS はそれでも、
                                          今のタスクの形で輪郭を描く。
R315  +- highlightBoxes[]                 ハイライトボックス
                                          この配列はハイライトボックスを持つ。ハイライトボックスは、タスクグループレーンズの中で、
                                          タスクグループの範囲にわたって日の範囲を示す矩形である。
R316  |  +- id                            一意な UUID
                                          この値はハイライトボックスの id で、ランダムな UUID である。
R317  |  +- style                         見た目（型 HighlightBoxStyle）
                                          このオブジェクトは、GRS がハイライトボックスをどう描くかを示す（型 HighlightBoxStyle）。
R318  |  |  +- cornerRadiusPx             角の丸みの半径
                                          この値は、ハイライトボックスの角の半径を、displayScaleRatio 1 のときの CSS ピクセルで示
                                          す。0 のとき、角は四角になる。
R319  |  |  +- fill                       塗り -> Paint
                                          この値は、ハイライトボックスの塗りである（型 Paint）。塗りは必ず色を持つ。opacityPercent
                                           0 のとき、塗りは見えない。
R320  |  |  +- stroke                     枠 -> Stroke
                                          この値は、ハイライトボックスの枠線である（型 Stroke）。キーが無いとき、GRS は枠線を描か
                                          ない。
R321  |  +- firstDay                      最初の日
                                          この値は、ハイライトボックスが覆う最初の日（含む）を、scheduleData.scheduleDataTimeZone 
                                          のタイムゾーンでの日として示す。
R322  |  +- lastDay                       最後の日
                                          この値は、ハイライトボックスが覆う最後の日（含む）である。
R323  |  +- firstTaskGroupId              覆う最初の帯（両端を含む）
                                          この値は、ハイライトボックスが覆う最初のタスクグループの id である。ハイライトボックスは
                                          、タスクグループの木の順で lastTaskGroupId までのすべてのタスクグループを覆い、両端を含
                                          む。
R324  |  +- lastTaskGroupId               覆う最後の帯（両端を含む）
                                          この値は、ハイライトボックスが覆う最後のタスクグループ（含む）の id である。
R325  +- commentBoxes[]                   コメントボックス
                                          この配列は、タスクグループレーンズの中のコメントボックスを持つ。各コメントボックスの引出
                                          し線は、タスク、ハイライトボックス、または何にも付かない点を指す。
R326     +- id                            一意な UUID
                                          この値はコメントボックスの id で、ランダムな UUID である。
R327     +- text                          文
                                          この値は、コメントボックスの文である。キーが無いとき、コメントボックスの箱の中身は空であ
                                          る。
R328     +- style                         見た目（型 CommentBoxStyle）
                                          このオブジェクトは、GRS がコメントボックスをどう描くかを示す（型 CommentBoxStyle）。
R329     |  +- fill                       箱の塗り -> Paint
                                          この値は、コメントボックスの箱の塗りである（型 Paint）。塗りは必ず色を持つ。opacityPerce
                                          nt 0 のとき、塗りは見えない。
R330     |  +- stroke                     枠と引出し線 -> Stroke
                                          この値は、コメントボックスの枠線と引出し線の線である（型 Stroke）。キーが無いとき、GRS 
                                          は枠線も引出し線も描かない。
R331     |  +- font                       文字の見た目
                                          このオブジェクトは、コメントボックスの文字の見た目（色と大きさ）を持つ。
R332     |     +- color                   文字の色 -> Color
                                          この値は、コメントボックスの文字の色である（型 Color）。
R333     |     +- sizePx                  文字の大きさ
                                          この値は、コメントボックスの文字の大きさを、displayScaleRatio 1 のときの CSS ピクセルで
                                          示す。ズームはこの大きさを変えない。
R334     +- leaderTarget                  引出し線の先
                                          このオブジェクトは、コメントボックスの引出し線がどこを指すかを示す。GRS の中で先を消すと
                                          、GRS はこのオブジェクトを何にも付かない点に変える。スケジュールデータに無い先をファイル
                                          が指すとき、GRS は引出し線を描かない。
R335     |  +- type                       判別子
                                          "freePoint": 線先は、何にも付かない場所に立つ。"task": 線先は、タスクの予定バー、実績バ
                                          ー、マイルストーンマークのどれかの 8 点の 1 つに立つ。"highlightBox": 線先は、ハイライト
                                          ボックスの 8 点の 1 つに立つ。
R336     |  |  +- "freePoint"             何にも付かない点
R337     |  |  +- "task"                  タスクの図形
R338     |  |  +- "highlightBox"          ハイライトボックス
R339     |  +- dateTime                   時点（freePoint）
                                          type が "freePoint" のときだけ書く。この値は、線先が立つ時点を、scheduleData.scheduleDat
                                          aTimeZone のタイムゾーンでの日時として示す。
R340     |  +- taskGroupId                帯（freePoint）
                                          type が "freePoint" のときだけ書く。この値は、線先を持つタスクグループレーンの、タスクグ
                                          ループの id である。
R341     |  +- taskGroupTopOffsetPercent  帯の中の高さ（上の縁から %）（freePoint）
                                          type が "freePoint" のときだけ書く。この値は、線先がそのタスクグループレーンの上の縁から
                                          どれだけ下にあるかを、レーンの高さに対する % で示す。100 は下の縁である。
R342     |  +- taskUid                    タスク（task）
                                          type が "task" のときだけ書く。この値は、線先が吸着するタスクの uid である。
R343     |  +- snapPart                   吸着する図形の部分（task）
                                          type が "task" のときだけ書く。この値は、線先が吸着するタスク図形の部分を名指す: "planBa
                                          r"（予定バー）、"actualBar"（実績バー）、"milestoneMark"（マイルストーンマーク）。
R344     |  |  +- "planBar"               予定バー
R345     |  |  +- "actualBar"             実績バー
R346     |  |  +- "milestoneMark"         マイルストーンマーク
R347     |  +- highlightBoxId             箱（highlightBox）
                                          type が "highlightBox" のときだけ書く。この値は、線先が吸着するハイライトボックスの id 
                                          である。
R348     |  +- snapPoint                  吸着する 8 点の 1 つ（task・highlightBox）
                                          type が "task" か "highlightBox" のときだけ書く。この値は、線先が吸着する先の点を名指す
                                          。その点は、角か辺の中点である。
R349     |     +- "topLeftCorner"         左上の角
R350     |     +- "topMiddle"             上の辺の中点
R351     |     +- "topRightCorner"        右上の角
R352     |     +- "rightMiddle"           右の辺の中点
R353     |     +- "bottomRightCorner"     右下の角
R354     |     +- "bottomMiddle"          下の辺の中点
R355     |     +- "bottomLeftCorner"      左下の角
R356     |     +- "leftMiddle"            左の辺の中点
R357     +- bodyOffsetPx                  線先から箱へのずれ
                                          このオブジェクトは、線先からコメントボックスの箱の左下の角までのずれを、displayScaleRati
                                          o 1 のときの CSS ピクセルで示す。横と縦のズームは、このずれを変えない。
R358     |  +- dx                         横のずれ
                                          この値は、ずれの横の成分である。正の値は箱を右へ動かす。
R359     |  +- dy                         縦のずれ
                                          この値は、ずれの縦の成分である。正の値は箱を下へ動かす。
R360     +- hyperlinkAddress              リンク先の URL
                                          この値は、コメントボックスのリンク先の URL である。キーが無いとき、コメントボックスはリ
                                          ンクを持たない。
R361     +- hyperlink                     リンクのタイトル
                                          この値はコメントボックスのリンクのタイトルで、アドレスではない。キーが無いとき、リンクは
                                          タイトルを持たない。
```

### 共通の型（-> で指す物）

```text
R362  Color                                      色
R363  +- type                                    判別子
                                                 "theme": GRS は、この色を持つ所のテーマ色を、documentSettings.themeHue の色相で使う。"pa
                                                 lette": この色はパレットの 10 色の 1 つで、name がその色を名指す。"custom": light と dar
                                                 k が、明るいテーマと暗いテーマの色を持つ。
R364  |  +- "theme"                              テーマの色に従う
R365  |  +- "palette"                            パレットの 10 色の 1 つ
R366  |  +- "custom"                             人が選んだ色
R367  +- name                                    パレットの色の名（palette。明るいテーマでの見え方の名）
                                                 type が "palette" のときだけ書く。この値は、パレットの色を名指す。各名は、明るいテーマで
                                                 の色の見え方を表す。暗いテーマでは、GRS は色相を保ち、明るさを反転する。
R368  |  +- "white"                              白
R369  |  +- "black"                              黒
R370  |  +- "dimGray"                            濃い灰色
R371  |  +- "lightGray"                          薄い灰色
R372  |  +- "red"                                赤
R373  |  +- "blue"                               青
R374  |  +- "yellow"                             黄
R375  |  +- "green"                              緑
R376  |  +- "orange"                             橙
R377  |  +- "purple"                             紫
R378  +- light                                   明るいテーマの側（custom）
                                                 type が "custom" のときだけ書く。このオブジェクトは、明るいテーマの色である。
R379  |  +- hexColor                             色の値（#rrggbb）
                                                 この値は、# と小文字の 16 進数 6 桁（#rrggbb）で色を表す。
R380  |  +- isCalculatedFromOppositeColorScheme  GRS が反対の側の色から計算した側だけ true
                                                 この値は、GRS が反対の側から計算した側に印を付ける。この値は出どころの記録で、切り替えで
                                                 はない。人が選んだ側は、このキーを持たない。
R381  +- dark                                    暗いテーマの側（custom）
                                                 type が "custom" のときだけ書く。このオブジェクトは暗いテーマの色で、light と同じ形を持
                                                 つ。
R382     +- hexColor                             色の値（#rrggbb）
                                                 この値は、# と小文字の 16 進数 6 桁（#rrggbb）で色を表す。
R383     +- isCalculatedFromOppositeColorScheme  GRS が反対の側の色から計算した側だけ true
                                                 この値は、GRS が反対の側から計算した側に印を付ける。この値は出どころの記録で、切り替えで
                                                 はない。人が選んだ側は、このキーを持たない。
R384  TaskGroupColor                             帯の色（Color と同じ形。palette の black を除く）
R385  Paint                                      塗り
R386  +- color                                   色 -> Color
                                                 この値は、塗りの色である（型 Color）。
R387  +- opacityPercent                          不透明度（%）
                                                 この値は、塗りの不透明度を % で示す。100 は透けない塗りで、0 のとき GRS は塗りを描かない
                                                 。
R388  Stroke                                     線（描かないときは書かない）
R389  +- color                                   色 -> Color
                                                 この値は、線の色である（型 Color）。
R390  +- opacityPercent                          不透明度（%）
                                                 この値は、線の不透明度を % で示す。100 は透けない線で、0 のとき GRS は線を描かない。
R391  +- widthPx                                 太さ
                                                 この値は、線の太さを、displayScaleRatio 1 のときの CSS ピクセルで示す。ズームはこの太さ
                                                 を変えない。
R392  ShapeStyle                                 形の見た目（TaskStyle・CommentBoxStyle・HighlightBoxStyle が共にする）
R393  +- fill                                    塗り -> Paint
                                                 この値は、形の塗りである（型 Paint）。キーが無いとき、GRS は塗りを描かない。
R394  +- stroke                                  線 -> Stroke
                                                 この値は、形の枠線である（型 Stroke）。キーが無いとき、GRS は枠線を描かない。
R395  ColumnFilter                               列のフィルタ
R396  +- type                                    判別子
                                                 "values": GRS は、hiddenValues のどれかを見せる行を隠す。isBlankHidden が true なら、GRS
                                                  は空の行も隠す。"dateRange": GRS は、日付が firstDay から lastDay の外にある行を隠す。f
                                                 irstDay か lastDay が無いと、その端は限らない。
R397  |  +- "values"                             値で絞る
R398  |  +- "dateRange"                          日の範囲で絞る
R399  +- column                                  列（列が見せる値の名）
                                                 この値は列を、その列が見せる中身で名指す。同じ名は、どの表でも同じ中身を指す。検索ウィン
                                                 ドウのタスクの表: "progressStatus", "percentComplete", "taskType", "taskName", "resource
                                                 Names", "start", "finish", "actualStart", "actualFinish", "taskGroupPath"（最上位からの
                                                 道筋）。検索ウィンドウのコメントボックスの表: "text", "taskGroupName"（線先のタスクグル
                                                 ープ）, "leaderTargetDay"（線先の日）。遅延診断レポートウィンドウ: "diagnosisStatus", "p
                                                 ercentComplete", "taskType", "taskName", "resourceNames", "planDates", "actualDates", "d
                                                 iagnosisReason"。担当リストウィンドウ: "resourceSelectionStatus", "resourceName", "assig
                                                 nedTaskCount", "assignedTaskNames"。
R400  |  +- "progressStatus"                     検索・タスク: ステータス（進捗ステータス）
R401  |  +- "percentComplete"                    検索・タスク、遅延診断: 進捗
R402  |  +- "taskType"                           検索・タスク、遅延診断: タスク種別（タスクかマイルストーンか）
R403  |  +- "taskName"                           検索・タスク、遅延診断: タスク（マイルストーン）
R404  |  +- "resourceNames"                      検索・タスク、遅延診断: 担当名（そのタスクのすべての担当）
R405  |  +- "start"                              検索・タスク: 予定開始
R406  |  +- "finish"                             検索・タスク: 予定終了
R407  |  +- "actualStart"                        検索・タスク: 実績開始
R408  |  +- "actualFinish"                       検索・タスク: 実績終了
R409  |  +- "taskGroupPath"                      検索・タスク: 最上位までの階層
R410  |  +- "text"                               検索・コメントボックス: 本文
R411  |  +- "taskGroupName"                      検索・コメントボックス: 線先が立つタスクグループの名
R412  |  +- "leaderTargetDay"                    検索・コメントボックス: 線先が立つ日
R413  |  +- "diagnosisStatus"                    遅延診断: ステータス（診断の結果）
R414  |  +- "planDates"                          遅延診断: 予定日（開始〜終了）
R415  |  +- "actualDates"                        遅延診断: 実績日（開始〜終了）
R416  |  +- "diagnosisReason"                    遅延診断: 理由
R417  |  +- "resourceSelectionStatus"            担当リスト: 選択（その担当を選んでいるか）
R418  |  +- "resourceName"                       担当リスト: 担当名
R419  |  +- "assignedTaskCount"                  担当リスト: 担当タスク数
R420  |  +- "assignedTaskNames"                  担当リスト: 担当タスク
R421  +- hiddenValues[]                          隠す値（values）。状態の列は用語集の英語の名（例 finished・delay・task・selected、JDG-3735）、ほかの列はセルの値
                                                 type が "values" のときだけ書く。このリストは、フィルタが行を隠す値を持つ。状態の列では
                                                 英語の状態名を持ち、ほかの列では表が見せるとおりのセルの文字を持つ。"progressStatus": "n
                                                 otStarted", "inProgress", "suspendedWithResumeDate", "suspendedWithoutResumeDate", "fini
                                                 shed", "delay"、そして GRS が遅延診断の結果を見せている間は診断の印 "unreliable", "bottl
                                                 eneck", "bottleneckPath"。"diagnosisStatus": "unreliable", "suspicion", "omission", "bot
                                                 tleneck", "bottleneckPath", "delay", "finishedDelayContribution"。"taskType": "task", "m
                                                 ilestone"。"resourceSelectionStatus": "selected", "notSelected"。
R422  +- isBlankHidden                           空の行を隠すか（values）
                                                 type が "values" のときだけ書く。この値は、この列のセルが空の行を、フィルタが隠すかどう
                                                 かを示す。
R423  +- firstDay                                最初の日（dateRange）
                                                 type が "dateRange" のときだけ書く。この値は、フィルタが残す最初の日（含む）を、schedule
                                                 Data.scheduleDataTimeZone のタイムゾーンでの日として示す。
R424  +- lastDay                                 最後の日（dateRange）
                                                 type が "dateRange" のときだけ書く。この値は、フィルタが残す最後の日（含む）である。
R425  ColumnSort                                 並べ替え
R426  +- column                                  列（ColumnFilter.column と同じ値）
                                                 この値は、GRS が表を並べ替える列を名指す。名は ColumnFilter.column と同じである。
R427  +- direction                               向き
                                                 "ascending": GRS は小さい値から大きい値へ並べる。"descending": GRS は大きい値から小さい
                                                 値へ並べる。
R428     +- "ascending"                          小さい順
R429     +- "descending"                         大きい順
R430  TaskTableWindow                            タスクの表の見せ方（検索ウィンドウ・遅延診断レポート）
R431  +- isScheduleFilteredByChecks              チェックで日程表を絞るか（チェックしたタスクだけを描く）
                                                 この値は、「チェックで日程表を絞る」を入れたり切ったりする。true のとき、GRS はスケジュ
                                                 ールキャンバスに、この表でチェックしたタスクだけを描く。表そのものは、すべての行を残す。
R432  +- checkedTaskUids[]                       チェックしたタスク
                                                 この配列は、この表の表示の列でチェックがある行の、タスクの uid を並べる。キーが無いとき
                                                 、どの行にもチェックは無い。
R433  +- columnFilters[]                         列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
                                                 この配列は、この表の列のフィルタを、フィルタを掛けた列ごとに 1 つずつ持つ。キーが無いと
                                                 き、どの列にもフィルタは無い。
R434  +- columnSort                              表の並べ方（列と向き）-> ColumnSort
                                                 このオブジェクトは、この表の並べ替え（列と向き）である。キーが無いとき、GRS は既定の順で
                                                 行を見せる。
R435  ResourceTableWindow                        担当の表の見せ方（担当リスト）
R436  +- isScheduleFilteredByChecks              チェックで日程表を絞るか（チェックした担当のタスクだけを描く）
                                                 この値は、「チェックで日程表を絞る」を入れたり切ったりする。true のとき、GRS はスケジュ
                                                 ールキャンバスに、チェックした担当のタスクだけを描く。isUnassignedChecked が true なら、
                                                 GRS は担当の無いタスクも描く。
R437  +- isUnassignedChecked                     （担当なし）の行をチェックしたか
                                                 この値は、担当リストウィンドウの "(no assignee)" の行にチェックがあるかを示す。
R438  +- checkedResourceUids[]                   チェックした担当
                                                 このリストは、担当リストウィンドウの表示の列でチェックがある行の、担当の uid を持つ。
R439  +- columnFilters[]                         列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
                                                 この配列は、この表の列のフィルタを、フィルタを掛けた列ごとに 1 つずつ持つ。キーが無いと
                                                 き、どの列にもフィルタは無い。
R440  +- columnSort                              表の並べ方（列と向き）-> ColumnSort
                                                 このオブジェクトは、この表の並べ替え（列と向き）である。キーが無いとき、GRS は既定の順で
                                                 行を見せる。
```

### スキーマの冒頭の説明（ルート）

```text
用語:
GRS は GoodRelax Scheduler である。GRS はスケジュール文書を開いて編集し、GRS JSON ファイルを読み書きする。GRS JSON は、この GRS JSON Schema が定める形式である。
MSPDI（Microsoft Project XML Data Interchange）は、Microsoft Project が使う XML のファイル形式である。GRS は MSPDI（.xml）ファイルも読み書きできる。
「MSPDI の X と同じ」は、そのプロパティが MSPDI の要素 X と同じ意味と値を持つことを示す。GRS だけの違いがあれば、そのプロパティの説明がその違いを書く。
考え方:
WBS は、MSPDI と同じく、親タスクと子タスクの木である。
タスクグループは GRS 独自のオブジェクトである。GRS はタスクグループを使って、複数のタスクを 1 本のタスクグループレーンに描く。各タスクは grs.taskGroupId で、ちょうど 1 つのタスクグループを指す。
MSPDI のオブジェクトは、GRS だけが使う値を、そのオブジェクトのキー grs の下に持つ。
GRS は 1 つの暦で稼働日を数える。その暦は、project.calendarUid が指す暦である。
passthrough: GRS は、使わない MSPDI の値を各オブジェクトの grs.passthrough に、オブジェクトにしない MSPDI の要素を passthrough… の配列に持ち、どちらも MSPDI へそのまま書き戻す。
実績の日付が、タスクの進捗の正本である。GRS はタスクの実績の日付と resume・resumeValid から、そのタスクが未着手か、進行中か、中断か、完了かを決める。GRS は GRS JSON ファイルを開くとき、その日付から percentComplete を計算し直す。
遅延診断: GRS は遅延診断の結果を GRS JSON ファイルに保存しない。保存した結果は、スケジュール文書が変わるとすぐに古くなるからである。
人が遅延診断を始めるとき、または AI エージェントが遅延診断を求めるとき、GRS は今のスケジュールデータと project.statusDate から結果を計算する。
GRS は遅延診断の結果を見せている間、その結果を保ち、計算し直さない。
GRS JSON の形:
$schema           このスキーマの所
schemaVersionUtc  形の版
buildVersionUtc   ファイルを書いた GRS のビルド
documentStamp     最後の変更、最後の保存、最後の編集者
documentSettings  開くときに GRS がスケジュールをどう見せるか
scheduleData      スケジュールデータ
  +- 頭の値: scheduleDataTimeZone, sourceFormat, importedTopTaskOutlineLevel, mspdiImportCount, lastMspdiImport, highestIssuedUid
  +- MSPDI と同じ: project, calendars, passthroughCalendars, tasks, passthroughTasks, resources, passthroughResources, assignments, passthroughAssignments
  +- GRS だけ: taskGroups, baselineTasks, highlightBoxes, commentBoxes
changeLogEntries  変更についてのメモ
値の無いプロパティは書かない。null や [] を決して書かない。
```
