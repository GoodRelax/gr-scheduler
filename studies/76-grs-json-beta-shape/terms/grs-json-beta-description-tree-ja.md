# GRS JSON β のスキーマ —— 説明の木（日本語版）

- 生成物。キー・順・列挙の値は `grs-json-beta.schema.json` から、各行の日本語の名は `grs-json-beta-tree-labels-ja.tsv` から、その下の説明は英語の説明の日本語訳 `grs-json-beta-descriptions-ja.tsv` から作った。作り直し: `python schema_to_review_tree.py japanese-num`。
- 契約はスキーマの英語の説明。英語版は `grs-json-beta-description-tree-en.md`。行番号 R001〜R440 は両方と `grs-json-final-review-tree.md` で同じ。

### 根と帳簿

```text
R001  ScheduleDocument             GRS JSON の 1 ファイル
R002  +- $schema                   スキーマの所（URL）
                                   最新の GRS スキーマの所（URL）。どの文書も同じ所を持つ。
R003  +- schemaVersionUtc          スキーマの版（形が最後に変わった UTC の時刻）
                                   GRS JSON の形（キーと規則）が最後に変わった UTC の時刻。
R004  +- buildVersionUtc           書いた GRS のビルドの版（UTC の時刻）
                                   この値はデバッグのためだけにある。GRS がファイルを読めるかどうかは、schemaVersionUtc が
                                   示す。
R005  +- documentStamp             文書刻印
R006  |  +- scheduleDataUpdatedAt  データが変わった時（UTC）
                                   documentSettings だけが変わっても、この時刻は動かない。
R007  |  +- documentUpdatedAt      文書が変わった時（UTC）
                                   スケジュール文書の最後の変更。documentSettings の変更も含む。
R008  |  +- fileSavedAt            保存した時（UTC。初めて保存するまでは無い）
                                   最初の保存まで、このキーは無い。
R009  |  +- lastEditedBy           最後に編集した者（型 Editor）
R010  |     +- type                判別子
                                   "template": まだ誰も編集していないので、スケジュール文書は GRS に付いてくるテンプレート
                                   のままである。
R011  |     |  +- "user"
R012  |     |  +- "template"
R013  |     |  +- "agent"
R014  |     +- name                編集した者の名（agent は AI が名乗った名、user は GRS が知るときだけ）
                                   編集者の名。"agent" では、AI が名乗る名を示す。"user" では、GRS が名を知るときだけ、その
                                   人の名を示す。
R015  +- documentSettings          文書設定（下の「文書設定」）
R016  +- scheduleData              スケジュールデータ（下の 2 つの群）
R017  +- changeLogEntries[]        変更履歴
                                   変更履歴。変更履歴は、人や AI がスケジュール文書の変更について書くメモで、古いものから並
                                   ぶ。
R018     +- changedAt              変更の時（UTC）
                                   GRS は項目を足すときに時刻を入れる。人は後でその時刻を変えてよい。
R019     +- changedBy              変更した者
R020     |  +- editorType          書き手の種類（GRS が自動で書く。判別子ではない）
                                   GRS がこの値を入れる。
R021     |  |  +- "user"
R022     |  |  +- "agent"
R023     |  +- name                人が打った名か、AI が名乗った名
                                   編集者の名。この名は、人が打った名か、AI が名乗った名である。
R024     +- affectedArea           及んだ部分
R025     +- changeDescription      何が変わったか
R026     +- reason                 理由
R027     +- remarks                そのほか
```

### 文書設定

```text
R028  documentSettings                              文書設定（効く範囲の広い順）
R029  +- displayScaleRatio                          表示の倍率（1 が等倍）
                                                    GRS は、名前が Px で終わるキーの値（CSS ピクセル）に、描くときにこの倍率を掛ける。GRS は
                                                    それらの値を、倍率を掛けずに保存する。
R030  +- fontSizePreset                             文字の大きさの段
                                                    GRS は各段のピクセルの大きさを持ち、displayScaleRatio がその大きさを拡大・縮小する。
R031  |  +- "small"
R032  |  +- "medium"
R033  |  +- "large"
R034  +- isThemeMonochrome                          モノクロか
                                                    この値は描き方だけを変える。スケジュール文書に保存した色は変わらない。
R035  +- themeHue                                   テーマの色相の名
                                                    GRS は各名の色相の角度を持つ。
R036  |  +- "blue"
R037  |  +- "blueGreen"
R038  |  +- "green"
R039  |  +- "yellowGreen"
R040  |  +- "yellow"
R041  |  +- "orange"
R042  |  +- "red"
R043  |  +- "redPurple"
R044  |  +- "purple"
R045  |  +- "indigo"
R046  +- viewTimeZone                               表示の基準タイムゾーン
                                                    表示の基準タイムゾーン。GRS は、スケジュールキャンバスとタイムルーラーで、このタイムゾー
                                                    ンで日時を見せる。
R047  |  +- type                                    判別子
                                                    "sameAsScheduleData": GRS は scheduleData.scheduleDataTimeZone のタイムゾーンで日時を見
                                                    せ、そのタイムゾーンが変わればそれに従う。
R048  |  |  +- "sameAsScheduleData"
R049  |  |  +- "fixed"
R050  |  +- utcOffset                               UTC との差（"+09:00" の形。標準時の行だけ）（fixed）
R051  +- additionalTimeZones[]                      追加の時計（4 つまで）
R052  |  +- utcOffset                               UTC との差（"+09:00" の形）
                                                    この差は夏時間の分をもう含み、GRS はこの差を 1 年中使う。
R053  |  +- zoneNameType                            出すゾーンの名の種類（差 utcOffset はもう夏時間の分を含む）
                                                    GRS がこの時計に見せるゾーンの名: 標準時の名か夏時間の名。この値は時差を変えない。
R054  |     +- "standard"
R055  |     +- "daylight"
R056  +- isTimeOfDayVisible                         時刻を見せるか（文書の全体の時刻の見せ方）
R057  +- dayWidthPx                                 暦日 1 日の幅
                                                    日の幅（横のズーム）: タイムルーラー上の暦日 1 日の幅。
R058  +- fitDayRange                                全体表示期間
                                                    全体表示時の期間。全体表示時の期間は、「全体を収める」と PNG・SVG の画像が見せる日々であ
                                                    る。
R059  |  +- type                                    判別子
                                                    "fixed": 全体表示時の期間は firstDay から lastDay まで余白なしで続く。"automatic": 全体
                                                    表示時の期間は、GRS が描くものすべてと余白を覆う。GRS は余白を決めるが、保存しない。
R060  |  |  +- "fixed"
R061  |  |  +- "automatic"
R062  |  +- firstDay                                最初の日（fixed）
                                                    このキーは、type が "fixed" のときだけ書く。表示の基準タイムゾーンでの、全体表示時の期間
                                                    の最初の日。
R063  |  +- lastDay                                 最後の日（fixed）
R064  +- verticalZoom                               縦のズーム
                                                    このキーが無いとき、GRS は「全体を収める」と同じように両方の値を選ぶ。automaticallyShown
                                                    Depth だけが無いときは、GRS はその値を「全体を収める」と同じように選ぶ。
R065  |  +- ratio                                   縦の倍率（1 が既定）
                                                    タスク図形の縦の大きさの、既定の大きさに対する倍率。
R066  |  +- automaticallyShownDepth                 automatic の帯を、この深さまで出す（1〜maxGroupDepth）
                                                    showMode が "automatic" のタスクグループを、GRS がどの深さまで見せるか。
R067  +- taskGroupPanelWidthPx                      タスクグループパネルの幅（倍率 1 のときの CSS ピクセル）
R068  +- isTaskGroupPanelWidthFixed                 幅を固定するか
                                                    true: taskGroupPanelWidthPx がタスクグループパネルの幅を決め、パネル境界は動かない。fals
                                                    e: パネル境界のドラッグが taskGroupPanelWidthPx を変える。
R069  +- pinnedTaskGroupIds[]                       ピン止めしたタスクグループの id
                                                    ピン止めしたタスクグループの id。
R070  +- taskPlacementDirection                     帯の中で、重なるタスクを日付の早い順に置く向き
                                                    積む向き。積む向きは、1 本のタスクグループレーンの中で重なるタスクを、GRS が積み段に積む
                                                    向きである。この値はタスクグループの順を決めない。
R071  |  +- "bottomToTop"
R072  |  +- "topToBottom"
R073  +- scrollPosition                             開いたときの位置
R074  |  +- type                                    判別子
                                                    "automatic": まだ誰も場所を選んでいないので、GRS が開くときに場所を選ぶ。この値は今日や
                                                    基準日を意味しない。
R075  |  |  +- "automatic"
R076  |  |  +- "fixed"
R077  |  +- leftEdgeDay                             左の端の日（fixed）
                                                    このキーは、type が "fixed" のときだけ書く。scheduleData.scheduleDataTimeZone のタイムゾ
                                                    ーンでの、表示の左端の日。
R078  |  +- leftEdgeDayOffsetPercent                左の端が、その日の始まりから何 % の所か（fixed）
                                                    type が "fixed" のときだけ書く。左端が leftEdgeDay の始まりから右へどれだけ離れているか
                                                    （1 日に対する %）。
R079  |  +- topEdgeTaskGroupId                      上の端の帯（fixed）
                                                    このキーは、type が "fixed" のときだけ書く。表示の上端にあるタスクグループの id。そのタ
                                                    スクグループがもう無いとき、GRS はスクロール位置を "automatic" として扱う。
R080  |  +- topEdgeTaskGroupOffsetPercent           上の端が、その帯の上から何 % の所か（fixed）
                                                    type が "fixed" のときだけ書く。上端が、画面の上ではなくそのタスクグループの上から、どれ
                                                    だけ下にあるか。単位は、レーンの高さと下の隙間を足した長さに対する % である。
R081  +- scheduleCanvasElements                     Schedule Canvas に描く物
                                                    GRS はキーを、バー、ラベル、線の順に書く。
R082  |  +- isPlanBarVisible                        予定バーを見せるか
R083  |  +- isActualBarVisible                      実績バーを見せるか
R084  |  +- isBaselineOutlineVisible                前回予定を重ねるか（前回予定輪郭）
R085  |  +- isAssigneeLabelVisible                  担当のラベルを見せるか
R086  |  +- isPercentCompleteLabelVisible           完了率のラベルを見せるか
R087  |  +- isProgressStatusMarkVisible             進捗ステータスマークと再開マークを見せるか
                                                    この値が true のとき、GRS は再開マークと進捗ステータスマークを描く。
R088  |  +- isPlanDatesVisible                      予定の日付を見せるか
R089  |  +- isDependencyLineVisible                 依存線を見せるか
R090  |  +- isProgressLineVisible                   イナズマ線を見せるか
                                                    この値が true のとき、GRS はイナズマ線を描く。
R091  |  +- isDateGridLinesVisible                  日の罫線を見せるか
R092  |  +- isTaskGroupGridLinesVisible             タスクグループ罫線（タスクグループの境の横線）を見せるか
R093  +- delayDiagnosisSettings                     遅延診断の設定
R094  |  +- parentTaskProgressToleranceWorkingDays  遅延診断が親タスクの進み具合に許す幅（稼働日）
                                                    親の進捗点が配下の進捗点からはみ出してよい稼働日の数。はみ出しがこれを超えると、遅延診断
                                                    は親に疑義を付ける。
R095  +- tableWindows                               3 つの表の見せ方
                                                    検索ウィンドウ、遅延診断レポートウィンドウ、担当リストウィンドウの表の、チェック、列のフ
                                                    ィルタ、並べ替え。このオブジェクトはウィンドウの位置を持たない。
R096     +- searchWindow                            検索ウィンドウ -> TaskTableWindow
                                                    検索ウィンドウの表の設定。検索ウィンドウは、タスクの表かコメントボックスの表を、一度に 1
                                                     つ見せる。columnFilters は両方の表のフィルタを列で分けて持つ。columnSort は、どちらかの
                                                    表の列で並べ替えを 1 つ持つ。チェックはタスクの表だけのものである。
R097     +- delayDiagnosisReportWindow              遅延診断レポート -> TaskTableWindow
R098     +- resourceListWindow                      担当リスト -> ResourceTableWindow
```

### スケジュールデータ（頭の値と、MSPDI と往復する群）

```text
R099  scheduleData                                    スケジュールデータ（頭の値と、MSPDI と往復する群）
R100  +- scheduleDataTimeZone                         データの日時の時差
R101  |  +- utcOffset                                 UTC との差（"+09:00" の形。標準時の行だけ）
R102  +- sourceFormat                                 元の形式
R103  |  +- "grs"
R104  |  +- "mspdi12"
R105  |  +- "mspdi15"
R106  +- importedTopTaskOutlineLevel                  取り込んだファイルの、最上位のタスクの OutlineLevel
                                                      取り込んだファイルの最上位のタスクの MSPDI OutlineLevel。この値はプロジェクトの要約タス
                                                      クを数えない。GRS は MSPDI を書くとき、WBS の最上位のタスクにこの OutlineLevel を付ける
                                                      。
R107  +- mspdiImportCount                             MSPDI を取り込んだ回数
R108  +- lastMspdiImport                              最後の MSPDI の取り込み（取り込むたびに上書き。一度も取り込んでいなければ無い）
                                                      人と AI エージェントがこのオブジェクトを読む。GRS は代わりに mspdiImportCount を比べる。
R109  |  +- importedAt                                取り込んだ時（UTC）
R110  |  +- fileName                                  取り込んだファイルの名（フォルダーを除く）
                                                      GRS はファイル名だけを書き、フォルダーを決して書かない。こうして、ファイルは個人のパスを
                                                      持たない。
R111  +- highestIssuedUid                             uid の数え手（GRS が出した最も大きい uid）
                                                      GRS が出した最も大きい uid。タスク、担当、割当、暦が、1 つの数え手を共にする。キーが無い
                                                      とき、GRS は開くときに 4 つの一覧の uid の最大を数えてこの値にする。
R112  +- project [M]                                  プロジェクト（1 件）
                                                      scheduleData.project は、プロジェクト全体の値だけを持つ。MSPDI のリスト（calendars, task
                                                      s, resources, assignments）は、MSPDI のように project の中に入らず、scheduleData の中で 
                                                      project と並ぶ。
R113  |  +- uid [M]                                   一意な識別子（文字列）
R114  |  +- name [M]                                  プロジェクト名
R115  |  +- title [M]                                 タイトル
R116  |  +- subject [M]                               件名
R117  |  +- category [M]                              分類
R118  |  +- company [M]                               会社
R119  |  +- manager [M]                               管理者
R120  |  +- author [M]                                作成者
R121  |  +- creationDate [M]                          作った日時
                                                      GRS は新しいスケジュール文書を作るとき、作った瞬間を書く。
R122  |  +- revision [M]                              保存した回数
R123  |  +- startDate [M]                             開始の日時
R124  |  +- calendarUid [M]                           稼働日を数える暦
                                                      このキーが無いか、calendars[] のどの uid にも当たらないとき、GRS は isBaseCalendar が tr
                                                      ue の最初の暦を使い、それも無ければ組み込みの月曜〜金曜の暦を使う。
R125  |  +- defaultStartTime [M]                      既定の開始時刻
                                                      GRS は、GRS が日単位で決める開始に、この時刻を付ける。キーが無いとき、GRS は 08:00:00 を
                                                      使う。
R126  |  +- defaultFinishTime [M]                     既定の終了時刻
                                                      GRS は、GRS が日単位で決める終了とマイルストーンの開始に、この時刻を付ける。キーが無いと
                                                      き、GRS は 17:00:00 を使う。
R127  |  +- minutesPerDay [M]                         1 日の稼働の分
                                                      キーが無いとき、GRS は 480 を使う。1 日の稼働時間の合計がこの値と違うとき、GRS は開くと
                                                      きに警告する。
R128  |  +- minutesPerWeek [M]                        1 週の稼働の分
R129  |  +- daysPerMonth [M]                          1 か月の稼働日
R130  |  +- weekStartDay [M]                          週の始まりの曜日
                                                      日曜はここでは 0 だが、calendars[].weekDays[].dayType では 1 である。
R131  |  |  +- 0                                      日曜
R132  |  |  +- 1                                      月曜
R133  |  |  +- 2                                      火曜
R134  |  |  +- 3                                      水曜
R135  |  |  +- 4                                      木曜
R136  |  |  +- 5                                      金曜
R137  |  |  +- 6                                      土曜
R138  |  +- statusDate [M]                            基準日
R139  |  +- grs [G]                                   GRS の値
R140  |     +- passthrough                            持ち越した MSPDI の値（MSPDI の構造と名のまま）
R141  +- calendars[] [M]                              暦
                                                      GRS は、project.calendarUid が指す暦のほかの暦を、MSPDI へ書き戻すためだけに持つ。
R142  |  +- uid [M]                                   一意な識別子
R143  |  +- name [M]                                  暦の名
R144  |  +- isBaseCalendar [M]                        基本の暦か
R145  |  +- baseCalendarUid [M]                       受け継ぐ元の暦
                                                      GRS はこの値を書き戻すが、受け継がない。GRS は、この暦が並べる日だけを数える。
R146  |  +- grs [G]                                   GRS の値
R147  |  |  +- passthrough                            持ち越した MSPDI の値
R148  |  +- weekDays[] [M]                            曜日ごとの稼働
R149  |  |  +- dayType [M]                            曜日（MSPDI の 0 例外は GRS では使わない）
R150  |  |  |  +- 1                                   日曜
R151  |  |  |  +- 2                                   月曜
R152  |  |  |  +- 3                                   火曜
R153  |  |  |  +- 4                                   水曜
R154  |  |  |  +- 5                                   木曜
R155  |  |  |  +- 6                                   金曜
R156  |  |  |  +- 7                                   土曜
R157  |  |  +- dayWorking [M]                         稼働日か
R158  |  |  +- grs [G]                                GRS の値
R159  |  |  |  +- passthrough                         持ち越した MSPDI の値
R160  |  |  +- workingTimes[] [M]                     稼働の時間帯
                                                      workingTimes の無い稼働日では、GRS は 08:00-12:00 と 13:00-17:00 を使う。稼働しない日で
                                                      は、GRS は workingTimes を MSPDI のために保ち、稼働時間を数えない。
R161  |  |     +- fromTime [M]                        始まりの時刻
R162  |  |     +- toTime [M]                          終わりの時刻
                                                      00:00:00 は 24:00、つまりその日の終わりを示す。
R163  |  +- exceptions[] [M]                          例外の日
R164  |     +- name [M]                               例外の名
R165  |     +- fromDate [M] (TimePeriod/FromDate)     最初の日
                                                      GRS は日付だけを読む。GRS が日付を決めるときは、GRS は T00:00:00 を書く。
R166  |     +- toDate [M] (TimePeriod/ToDate)         最後の日
                                                      GRS は日付だけを読むので、T00:00:00 でもその日をまるごと数える。GRS は T23:59:00 を書く
                                                      。
R167  |     +- dayWorking [M]                         稼働日か
R168  |     +- type [M]                               例外の繰り返し方（判別子ではない）
                                                      GRS は一度きりの例外だけで稼働日を数える。一度きりの例外は fromDate から toDate までの毎
                                                      日に効く: type 9、type なし、または period が 1 か period なしの type 1（毎日）。GRS は
                                                      ほかの例外をそのまま保ち、数えるときには使わない。
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
R179  |     +- grs [G]                                GRS の値
R180  |     |  +- passthrough                         持ち越した MSPDI の値
R181  |     +- workingTimes[] [M]                     稼働の時間帯
                                                      稼働する例外では、これらの時間帯が曜日の時間帯に代わる。workingTimes の無い稼働する例外
                                                      は、08:00-12:00 と 13:00-17:00 を使う。稼働しない例外では、GRS は workingTimes を MSPDI 
                                                      のために保ち、稼働時間を数えない。
R182  |        +- fromTime [M]                        始まりの時刻
R183  |        +- toTime [M]                          終わりの時刻
                                                      00:00:00 は 24:00、つまりその日の終わりを示す。
R184  +- passthroughCalendars[]                       GRS が暦にしない MSPDI の要素
R185  |  +- precedingCalendarUid                      前にある、いちばん近い暦の uid（先頭では書かない）
                                                      MSPDI でこの要素より前にある、calendars[] の中のいちばん近い暦の uid。キーが無いと、その
                                                      要素は先頭に来る。値が等しいときは、配列の順を保つ。
R186  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
R187  +- tasks[] [M]                                  タスク
                                                      このリストの順は意味を持たない。parentTaskUid と siblingIndex が WBS の木を決める。
R188  |  +- uid [M]                                   一意な識別子
R189  |  +- name [M]                                  タスク名
R190  |  +- start [M]                                 予定の開始
R191  |  +- finish [M]                                予定の終了
                                                      マイルストーンの開始と終了は同じである。
R192  |  +- stop [M]                                  作業が止まった時
R193  |  +- resume [M]                                再開の予定
R194  |  +- resumeValid [M]                           再開日が有効か
                                                      書いた false だけが、再開日のない中断を示す。GRS は再開日を書くたびに true も書く。
R195  |  +- milestone [M]                             マイルストーンか
R196  |  +- percentComplete [M]                       完了率
                                                      実績の稼働時間（actualStart から actualFinish か stop まで）を予定の稼働時間で割り、100 
                                                      を掛けて丸める。GRS は上限で抑えない。予定の稼働時間が無いとき、この値は actualFinish が
                                                      あれば 100、なければ 0 である。actualStart があり、actualFinish も stop も無いタスクは、
                                                      実績の稼働時間を 0 と数える。
R197  |  +- actualStart [M]                           実績の開始
R198  |  +- actualFinish [M]                          実績の終了
                                                      percentComplete が 100 でも、完了を意味しない。
R199  |  +- calendarUid [M]                           タスクの暦
                                                      GRS はこの値を、MSPDI へ書き戻すためだけに持つ。
R200  |  +- deadline [M]                              期限
R201  |  +- hyperlink [M]                             リンクのタイトル
R202  |  +- hyperlinkAddress [M]                      リンク先の URL
R203  |  +- notes [M]                                 メモ
R204  |  +- parentTaskUid [G]                         WBS の親タスク（最上位では書かない）
R205  |  +- siblingIndex [G]                          兄弟の中で何番目か（0 から）
                                                      GRS は 0, 1, 2 と隙間なく書き、小さい値から先に読み、同じ値なら配列の順を保つ。siblingIn
                                                      dex の無い兄弟は、その後ろに配列の順で並ぶ。
R206  |  +- grs [G]                                   タスクに付く GRS の値
R207  |  |  +- startSlopeCalendarDays                 開始の傾き（開始の端を斜めに落とす暦日。確定していない日付）
                                                      開始の傾き（暦日）。GRS は予定バーの開始の端を内側へ（開始から終了の向きへ）斜めにして、
                                                      確定していない開始を示す。GRS はスケジュールを変えない。
R208  |  |  +- finishSlopeCalendarDays                終了の傾き（終了の端を斜めに落とす暦日。確定していない日付）
                                                      終了の傾き（暦日）。GRS は予定バーの終了の端を内側へ（終了から開始の向きへ）斜めにして、
                                                      確定していない終了を示す。GRS はスケジュールを変えない。
R209  |  |  +- style                                  見た目（型 TaskStyle）
R210  |  |  |  +- taskShape                           バーの形（マイルストーンでないときだけ）
                                                      マイルストーンでないタスクの予定バーと実績バーの形。"dumbbell"（両端に点のある細い線）。
R211  |  |  |  |  +- "rectangle"
R212  |  |  |  |  +- "chevron"
R213  |  |  |  |  +- "arrow"
R214  |  |  |  |  +- "dumbbell"
R215  |  |  |  +- milestoneShape                      マイルストーンマークの形（マイルストーンのときだけ）
R216  |  |  |  |  +- "circle"
R217  |  |  |  |  +- "hexagon"
R218  |  |  |  |  +- "pentagon"
R219  |  |  |  |  +- "diamond"
R220  |  |  |  |  +- "square"
R221  |  |  |  |  +- "star"
R222  |  |  |  |  +- "triangleUp"
R223  |  |  |  |  +- "triangleDown"
R224  |  |  |  |  +- "file"
R225  |  |  |  |  +- "box"
R226  |  |  |  |  +- "floppyDisk"
R227  |  |  |  |  +- "cylinder"
R228  |  |  |  |  +- "meetingPeople"
R229  |  |  |  |  +- "smilingFace"
R230  |  |  |  |  +- "beerMug"
R231  |  |  |  +- fill                                塗り -> Paint
                                                      予定バー（マイルストーンではマイルストーンマーク）の塗り。キーが無いと塗りは無い。
R232  |  |  |  +- stroke                              縁 -> Stroke
                                                      予定バーと実績バー（マイルストーンではマイルストーンマーク）の枠線。
R233  |  |  +- taskGroupId                            載せるタスクグループ
R234  |  |  +- importOrigin                           取り込み元の控え（型 ImportOrigin。取り込んだタスクだけ）
                                                      GRS で作ったタスクは importOrigin を持たない。
R235  |  |  |  +- sourceProjectUid                    元のファイルの Project の UID
R236  |  |  |  +- sourceTaskUid                       元のファイルでの、このタスクの UID
                                                      GRS が取り込んだタスクに新しい uid を付けることがあるので、この値は uid と違うことがある
                                                      。
R237  |  |  |  +- importSessionId                     取り込みの id（取り込みのたびに GRS が作る）
                                                      MSPDI ファイルに Project UID が無かったとき、この id が sourceProjectUid の代わりをする
                                                      。
R238  |  |  |  +- mspdiImportCountWhenLastIncluded    このタスクを最後に含んでいた取り込みが何回目か
                                                      このタスクを含むファイルを取り込んだ最後の時の scheduleData.mspdiImportCount の写し。値
                                                      が今の回数より小さいとき、最新の取り込みはこのタスクを含まなかった。
R239  |  |  +- passthrough                            持ち越した MSPDI の値
R240  |  +- predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
R241  |     +- predecessorUid [M]                     先行タスク
R242  |     +- type [M]                               依存の種類（判別子ではない）
R243  |     |  +- 0                                   FF 終了から終了
R244  |     |  +- 1                                   FS 終了から開始
R245  |     |  +- 2                                   SF 開始から終了
R246  |     |  +- 3                                   SS 開始から開始
R247  |     +- linkLag [M]                            ラグ（0.1 分単位）
                                                      lagFormat に関わらず、0.1 分単位で表したラグ。4800 は 480 分で、project.minutesPerDay が
                                                       480 なら稼働日 1 日である。
R248  |     +- lagFormat [M]                          ラグを見せる単位（e は経過時間、? は見積り）
                                                      GRS は 3、5、7 のときだけラグを数える。lagFormat が無いとき、GRS はラグを数えには入れな
                                                      い。
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
R265  |        +- passthrough                         持ち越した MSPDI の値
R266  +- passthroughTasks[]                           GRS がタスクにしない MSPDI の要素
                                                      tasks[] の外にある MSPDI の Task 要素まるごと。例えばプロジェクトの要約タスク。
R267  |  +- precedingTaskUid                          前にある、いちばん近いタスクの uid（先頭では書かない）
                                                      MSPDI でこの要素より前にある、tasks[] の中のいちばん近いタスクの uid。キーが無いと、その
                                                      要素は先頭に来る。値が等しいときは、配列の順を保つ。
R268  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
R269  +- resources[] [M]                              担当
R270  |  +- uid [M]                                   一意な識別子
R271  |  +- name [M]                                  担当の名
R272  |  +- type [M]                                  資材か作業か（判別子ではない）
                                                      番号に関わらず、どの担当も同じキーを持つ。
R273  |  |  +- 0                                      資材
R274  |  |  +- 1                                      作業
R275  |  +- isCostResource [M]                        コストの担当か
R276  |  +- calendarUid [M]                           担当の暦
                                                      GRS はこの値を、MSPDI へ書き戻すためだけに持つ。
R277  |  +- grs [G]                                   GRS の値
R278  |     +- passthrough                            持ち越した MSPDI の値
R279  +- passthroughResources[]                       GRS が担当にしない MSPDI の要素
R280  |  +- precedingResourceUid                      前にある、いちばん近い担当の uid（先頭では書かない）
                                                      MSPDI でこの要素より前にある、resources[] の中のいちばん近い担当の uid。キーが無いと、そ
                                                      の要素は先頭に来る。値が等しいときは、配列の順を保つ。
R281  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
R282  +- assignments[] [M]                            割当
R283  |  +- uid [M]                                   一意な識別子
R284  |  +- taskUid [M]                               就くタスク
R285  |  +- resourceUid [M]                           就く担当
R286  |  +- grs [G]                                   GRS の値
R287  |     +- passthrough                            持ち越した MSPDI の値
R288  +- passthroughAssignments[]                     GRS が割当にしない MSPDI の要素
R289     +- precedingAssignmentUid                    前にある、いちばん近い割当の uid（先頭では書かない）
                                                      MSPDI でこの要素より前にある、assignments[] の中のいちばん近い割当の uid。キーが無いと、
                                                      その要素は先頭に来る。値が等しいときは、配列の順を保つ。
R290     +- mspdiElement                              MSPDI の要素（構造と名のまま）
```

### スケジュールデータ（GRS だけが持つ配列）

```text
R291  scheduleData                        スケジュールデータ（GRS だけが持つ配列。MSPDI の群の後に続く）
R292  +- taskGroups[]                     タスクグループ
                                          タスクグループ（深さ優先）。タスクグループは、WBS とは別の、描く行の木である。
R293  |  +- id                            一意な UUID
R294  |  +- name                          タスクグループ名
                                          キーが無いとき、GRS は空の題を見せる。
R295  |  +- parentTaskGroupId             親のタスクグループ（最上位では書かない）
                                          キーが無いとき、そのタスクグループは最上位のタスクグループ（深さ 1）である。
R296  |  +- siblingIndex                  兄弟の中で何番目か（0 から）
                                          GRS は、値の小さいタスクグループから上に並べる。siblingIndex の無いタスクグループは、そ
                                          の後ろに配列の順で並ぶ。
R297  |  +- style                         見た目（型 TaskGroupStyle）
                                          style が無いとき、GRS はタスクグループレーンに色を付けない。
R298  |  |  +- color                      帯の色 -> TaskGroupColor
R299  |  +- minHeightPx                   帯の最も低い高さ
                                          縦のズームは、この最小の高さを変えない。
R300  |  +- representativeTaskUid         この帯を代表する WBS のタスク
                                          このタスクグループが代表する WBS のタスクの uid。
R301  |  +- hyperlinkAddress              リンク先の URL
R302  |  +- hyperlink                     リンクのタイトル
                                          タスクグループのリンクのタイトルで、アドレスではない。
R303  |  +- showMode                      この帯を出すかの意図（書かなければ automatic。hidden と hiddenUntilZoomIn は配下も隠す）
                                          このタスクグループについて人が望むこと。"shown": 祖先がこのタスクグループを隠さない限り
                                          、GRS はどの深さでもこのタスクグループを描く。"hidden": GRS はこのタスクグループと配下の
                                          すべてのタスクグループを隠す。"automatic": GRS は、automaticallyShownDepth、ピン、見えて
                                          いる配下のタスクグループへの道から決める。"hiddenUntilZoomIn": 次の縦のズームインまで、G
                                          RS はこのタスクグループと配下のすべてのタスクグループを隠す。
R304  |  |  +- "shown"
R305  |  |  +- "hidden"
R306  |  |  +- "automatic"
R307  |  |  +- "hiddenUntilZoomIn"
R308  |  +- allowedEditorGroupName        編集してよい組の名
                                          このタスクグループのタスクを編集してよい人の組の名。GRS はそれらのタスクを、どの人にもど
                                          の AI エージェントにも読み取り専用として扱う。GRS は単体では自分の組を持たないからである
                                          。
R309  +- baselineTasks[]                  前回予定
                                          前回予定。前回予定は、前のタスクの日付を保存した写しである。前回予定のタスクは形を持たな
                                          い。各前回予定輪郭は、同じ uid を持つ今のタスクの形を使う。
R310  |  +- uid                           今のタスクの uid
R311  |  +- name                          タスク名
R312  |  +- start                         前回予定の開始
R313  |  +- finish                        前回予定の終了
R314  |  +- milestone                     マイルストーンか
R315  +- highlightBoxes[]                 ハイライトボックス
                                          ハイライトボックス。ハイライトボックスは、タスクグループレーンズの中で、タスクグループの
                                          範囲にわたって日の範囲を示す矩形である。
R316  |  +- id                            一意な UUID
R317  |  +- style                         見た目（型 HighlightBoxStyle）
R318  |  |  +- cornerRadiusPx             角の丸みの半径
R319  |  |  +- fill                       塗り -> Paint
R320  |  |  +- stroke                     枠 -> Stroke
R321  |  +- firstDay                      最初の日
                                          scheduleData.scheduleDataTimeZone のタイムゾーンでの、ハイライトボックスが覆う最初の日。
R322  |  +- lastDay                       最後の日
R323  |  +- firstTaskGroupId              覆う最初の帯（両端を含む）
                                          ハイライトボックスは、タスクグループの木の順で lastTaskGroupId までのすべてのタスクグル
                                          ープを覆い、両端を含む。
R324  |  +- lastTaskGroupId               覆う最後の帯（両端を含む）
R325  +- commentBoxes[]                   コメントボックス
                                          タスクグループレーンズの中のコメントボックス。各コメントボックスの引出し線は、タスク、ハ
                                          イライトボックス、または何にも付かない点を指す。
R326     +- id                            一意な UUID
R327     +- text                          文
R328     +- style                         見た目（型 CommentBoxStyle）
R329     |  +- fill                       箱の塗り -> Paint
R330     |  +- stroke                     枠と引出し線 -> Stroke
                                          キーが無いとき、GRS は枠線も引出し線も描かない。
R331     |  +- font                       文字の見た目
R332     |     +- color                   文字の色 -> Color
R333     |     +- sizePx                  文字の大きさ
                                          横と縦のズームは、この大きさを変えない。
R334     +- leaderTarget                  引出し線の先
                                          スケジュールデータに無い先をファイルが指すとき、GRS は引出し線を描かない。
R335     |  +- type                       判別子
R336     |  |  +- "freePoint"
R337     |  |  +- "task"
R338     |  |  +- "highlightBox"
R339     |  +- dateTime                   時点（freePoint）
R340     |  +- taskGroupId                帯（freePoint）
R341     |  +- taskGroupTopOffsetPercent  帯の中の高さ（上の縁から %）（freePoint）
                                          type が "freePoint" のときだけ書く。線先がそのタスクグループレーンの上の縁からどれだけ下
                                          にあるか（レーンの高さに対する %）。
R342     |  +- taskUid                    タスク（task）
R343     |  +- snapPart                   吸着する図形の部分（task）
                                          type が "task" のときだけ書く。マイルストーンでは "milestoneMark"、ほかのタスクでは "pla
                                          nBar" か "actualBar"。
R344     |  |  +- "planBar"
R345     |  |  +- "actualBar"
R346     |  |  +- "milestoneMark"
R347     |  +- highlightBoxId             箱（highlightBox）
R348     |  +- snapPoint                  吸着する 8 点の 1 つ（task・highlightBox）
R349     |     +- "topLeftCorner"
R350     |     +- "topMiddle"
R351     |     +- "topRightCorner"
R352     |     +- "rightMiddle"
R353     |     +- "bottomRightCorner"
R354     |     +- "bottomMiddle"
R355     |     +- "bottomLeftCorner"
R356     |     +- "leftMiddle"
R357     +- bodyOffsetPx                  線先から箱へのずれ
                                          線先からコメントボックスの箱の左下の角までのずれ。横と縦のズームは、このずれを変えない。
R358     |  +- dx                         横のずれ
R359     |  +- dy                         縦のずれ
                                          正の値は箱を下へ動かす。
R360     +- hyperlinkAddress              リンク先の URL
R361     +- hyperlink                     リンクのタイトル
                                          コメントボックスのリンクのタイトルで、アドレスではない。
```

### 共通の型（-> で指す物）

```text
R362  Color                                      色
R363  +- type                                    判別子
                                                 "theme": GRS は、この色を持つ所のテーマ色を、documentSettings.themeHue の色相で使う。"cu
                                                 stom" では、light か dark の無い側を、GRS がもう一方の側から計算する。
R364  |  +- "theme"
R365  |  +- "palette"
R366  |  +- "custom"
R367  +- name                                    パレットの色の名（palette。明るいテーマでの見え方の名）
                                                 type が "palette" のときだけ書く。各名は、明るいテーマでの色の見え方を表す。暗いテーマで
                                                 は、GRS は色相を保ち、明るさを反転する。
R368  |  +- "white"
R369  |  +- "black"
R370  |  +- "dimGray"
R371  |  +- "lightGray"
R372  |  +- "red"
R373  |  +- "blue"
R374  |  +- "yellow"
R375  |  +- "green"
R376  |  +- "orange"
R377  |  +- "purple"
R378  +- light                                   明るいテーマの側（custom）
R379  |  +- hexColor                             色の値（#rrggbb）
R380  |  +- isCalculatedFromOppositeColorScheme  GRS が反対の側の色から計算した側だけ true
                                                 GRS が反対の側から計算した側に付ける印。この値は出どころの記録で、切り替えではない。
R381  +- dark                                    暗いテーマの側（custom）
R382     +- hexColor                             色の値（#rrggbb）
R383     +- isCalculatedFromOppositeColorScheme  GRS が反対の側の色から計算した側だけ true
                                                 GRS が反対の側から計算した側に付ける印。この値は出どころの記録で、切り替えではない。
R384  TaskGroupColor                             帯の色（Color と同じ形。palette の black を除く）
R385  Paint                                      塗り
R386  +- color                                   色 -> Color
R387  +- opacityPercent                          不透明度（%）
R388  Stroke                                     線（描かないときは書かない）
R389  +- color                                   色 -> Color
R390  +- opacityPercent                          不透明度（%）
R391  +- widthPx                                 太さ
                                                 横と縦のズームは、この太さを変えない。
R392  ShapeStyle                                 形の見た目（TaskStyle・CommentBoxStyle・HighlightBoxStyle が共にする）
R393  +- fill                                    塗り -> Paint
R394  +- stroke                                  線 -> Stroke
                                                 キーが無いとき、GRS は枠線を描かない。
R395  ColumnFilter                               列のフィルタ
R396  +- type                                    判別子
                                                 firstDay か lastDay が無いと、その端は限らない。
R397  |  +- "values"
R398  |  +- "dateRange"
R399  +- column                                  列（列が見せる値の名）
                                                 同じ名は、どの表でも同じ中身を指す。検索ウィンドウのタスクの表: "progressStatus", "perce
                                                 ntComplete", "taskType", "taskName", "resourceNames", "start", "finish", "actualStart", 
                                                 "actualFinish", "taskGroupPath"（最上位からの道筋）。検索ウィンドウのコメントボックスの
                                                 表: "text", "taskGroupName"（線先のタスクグループ）, "leaderTargetDay"（線先の日）。
R400  |  +- "progressStatus"
R401  |  +- "percentComplete"
R402  |  +- "taskType"
R403  |  +- "taskName"
R404  |  +- "resourceNames"
R405  |  +- "start"
R406  |  +- "finish"
R407  |  +- "actualStart"
R408  |  +- "actualFinish"
R409  |  +- "taskGroupPath"
R410  |  +- "text"
R411  |  +- "taskGroupName"
R412  |  +- "leaderTargetDay"
R413  |  +- "diagnosisStatus"
R414  |  +- "planDates"
R415  |  +- "actualDates"
R416  |  +- "diagnosisReason"
R417  |  +- "resourceSelectionStatus"
R418  |  +- "resourceName"
R419  |  +- "assignedTaskCount"
R420  |  +- "assignedTaskNames"
R421  +- hiddenValues[]                          隠す値（values）。状態の列は用語集の英語の名（例 finished・delay・task・selected、JDG-3735）、ほかの列はセルの値
                                                 type が "values" のときだけ書く。フィルタが行を隠す値。状態の列では下に挙げる状態のキー
                                                 を持ち、ほかの列では表が見せるとおりのセルの文字を持つ。"progressStatus": "notStarted", 
                                                 "inProgress", "suspendedWithResumeDate", "suspendedWithoutResumeDate", "finished", "dela
                                                 y"、そして GRS が遅延診断の結果を見せている間は診断の印 "unreliable", "bottleneck", "bot
                                                 tleneckPath"。"diagnosisStatus": "unreliable", "suspicion", "omission", "bottleneck", "b
                                                 ottleneckPath", "delay", "finishedDelayContribution"。"taskType": "task", "milestone"。"
                                                 resourceSelectionStatus": "selected", "notSelected"。
R422  +- isBlankHidden                           空の行を隠すか（values）
R423  +- firstDay                                最初の日（dateRange）
                                                 type が "dateRange" のときだけ書く。scheduleData.scheduleDataTimeZone のタイムゾーンでの
                                                 、フィルタが残す最初の日。
R424  +- lastDay                                 最後の日（dateRange）
R425  ColumnSort                                 並べ替え
R426  +- column                                  列（ColumnFilter.column と同じ値）
R427  +- direction                               向き
R428     +- "ascending"
R429     +- "descending"
R430  TaskTableWindow                            タスクの表の見せ方（検索ウィンドウ・遅延診断レポート）
R431  +- isScheduleFilteredByChecks              チェックで日程表を絞るか（チェックしたタスクだけを描く）
                                                 チェックでスケジュールを絞るかどうか: true のとき、GRS はスケジュールキャンバスに、この
                                                 表でチェックしたタスクだけを描く。
R432  +- checkedTaskUids[]                       チェックしたタスク
R433  +- columnFilters[]                         列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
                                                 この表の列のフィルタ（フィルタを掛けた列ごとに 1 つ）。
R434  +- columnSort                              表の並べ方（列と向き）-> ColumnSort
R435  ResourceTableWindow                        担当の表の見せ方（担当リスト）
R436  +- isScheduleFilteredByChecks              チェックで日程表を絞るか（チェックした担当のタスクだけを描く）
                                                 「チェックで日程表を絞る」を入れるか切るか。true のとき、GRS はスケジュールキャンバスに
                                                 、チェックした担当のタスクだけを描く。isUnassignedChecked が true なら、GRS は担当の無い
                                                 タスクも描く。
R437  +- isUnassignedChecked                     （担当なし）の行をチェックしたか
R438  +- checkedResourceUids[]                   チェックした担当
R439  +- columnFilters[]                         列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
                                                 この表の列のフィルタ（フィルタを掛けた列ごとに 1 つ）。
R440  +- columnSort                              表の並べ方（列と向き）-> ColumnSort
```

### スキーマの冒頭の説明（ルート）

```text
用語:
GRS は GoodRelax Scheduler である。GRS はスケジュール文書を開いて編集し、GRS JSON ファイルを読み書きする。GRS JSON は、この GRS JSON Schema が定める形式である。
MSPDI（Microsoft Project XML Data Interchange）は、Microsoft Project が使う XML のファイル形式である。GRS は MSPDI（.xml）ファイルも読み書きできる。
MSPDI のオブジェクト（project、calendars、tasks、resources、assignments とその部分）の中のキーは、同じ名の MSPDI の要素と同じ意味と値を持つ。grs、parentTaskUid、siblingIndex だけが GRS のキーで、GRS の違いは説明が書く。
考え方:
WBS は、MSPDI と同じく、親タスクと子タスクの木である。
タスクグループは GRS 独自のオブジェクトである。GRS はタスクグループを使って、複数のタスクを 1 本のタスクグループレーンに描く。各タスクは grs.taskGroupId で、ちょうど 1 つのタスクグループを指す。
MSPDI のオブジェクトは、GRS だけが使う値を、そのオブジェクトのキー grs の下に持つ。
GRS は 1 つの暦で稼働日を数える。その暦は、project.calendarUid が指す暦である。
passthrough: GRS は、使わない MSPDI の値を各オブジェクトの grs.passthrough に、オブジェクトにしない MSPDI の要素を passthrough… の配列に持ち、どちらも MSPDI へ書き戻す。
実績の日付が、タスクの進捗の正本である。GRS はタスクの実績の日付と resume・resumeValid から、そのタスクが未着手か、進行中か、中断か、完了かを決める。GRS は GRS JSON ファイルを開くとき、その日付から percentComplete を計算し直す。
遅延診断: GRS は遅延診断の結果を GRS JSON ファイルに保存しない。保存した結果は、スケジュール文書が変わるとすぐに古くなるからである。
GRS JSON の形:
$schema           このスキーマの所
schemaVersionUtc  形の版
buildVersionUtc   ファイルを書いた GRS のビルド
documentStamp     最後の変更、最後の保存、最後の編集者
documentSettings  開くときに GRS がスケジュールをどう見せるか
scheduleData      スケジュールデータ
  +- 頭の値: scheduleDataTimeZone, sourceFormat, importedTopTaskOutlineLevel, mspdiImportCount, lastMspdiImport, highestIssuedUid
  +- MSPDI と同じ: project, calendars, tasks, resources, assignments
  +- passthrough の配列: passthroughCalendars, passthroughTasks, passthroughResources, passthroughAssignments
  +- GRS だけ: taskGroups, baselineTasks, highlightBoxes, commentBoxes
changeLogEntries  変更についてのメモ
値の無いプロパティは書かない。null や [] を決して書かない。
```
