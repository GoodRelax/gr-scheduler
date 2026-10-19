# 利用者の答え（2026-09-14）—— 異常系・準正常系の方針と、辞書の語ごとの注

日付: 2026-09-14。利用者の答えの全文を、1 文字も変えずに下の囲みへ写した。
`docs/development-records/rulings.md` の `JDG-78` / `JDG-79` がここを指す。

```text
以下の通り裁定の回答をする。
・ 異常系、準正常系については、極力発生しないようにしろ。 
・ エラーがあるなら、具体的にどのオブジェクトにエラーがあるのか示せ。
　　・ 対象のIDと行番号を表示すればよい。
・ 自動的に修正できるものは自動修正して、何処をどう自動修正したか示せ
・ 異常系、準正常系のケアは優先度が低い。defects.md などに記載を残して、リファクタ一式が終わったあとに回せ。 
---詳細---
IV-1 text [g1] : proposed | ja="同じ id を持つものが、ファイルの中に 2 つ以上あります" | en="Two or more items in the file share the same id"
IV-1 nextStep [g1] : proposed | ja="重なっている id の一方を別の値に直してから、もう一度開いてください" | en="Change one of the duplicate ids, then open the file again"  // 重なっているidを具体的に示せる
IV-2 text [g1] : proposed | ja="ファイルの中に、指す先が見つからない参照があります" | en="Something in the file refers to an item that is not there"  // 指す先がが見つからない参照って具体的に示せる？
IV-2 nextStep [g1] : proposed | ja="その参照を消すか、指す先を足してから、もう一度開いてください" | en="Remove the reference or add what it points to, then open the file again"  // そのってなに？  選択している参照を... とか具体的に書ける？
IV-3 text [g1] : undecided  // ファイルに無い行は表示しなければいいだけじゃないの？ このエラーが出るケースってある？
IV-3 nextStep [g1] : proposed | ja="その行をピン止めの対象から外してから、もう一度開いてください" | en="Take that row out of the pinned rows, then open the file again"  // その行ってどの行？ 具体的に示せる？
IV-4 text [g1] : alternative | ja="WBS の親子が輪になっているタスクがあります" | en="Some tasks' WBS parents form a loop"  // このケースって実際に発生するの？ 発生する場合どういう状況？  あるなら　親子じゃなくて親子関係が輪になっている とすべきかな。
IV-4 nextStep [g1] : proposed | ja="輪の中のどれか 1 つのタスクの WBS の親を外してから、もう一度開いてください" | en="Clear the WBS parent of one task in the loop, then open the file again"  // 具体的にどのタスクか示せる？
IV-5 text [g1] : proposed | ja="行の入れ子が、深さの上限を超えています" | en="Rows are nested deeper than the depth limit"
IV-5 nextStep [g1] : proposed | ja="入れ子を浅くするか、ファイルの中の深さの上限を上げてから、もう一度開いてください" | en="Nest the rows less deeply, or raise the depth limit in the file, then open it again"
IV-6 text [g1] : proposed | ja="どの行にも載っていないタスクか、2 つ以上の行に載っているタスクがあります" | en="A task sits on no row, or on more than one row"
IV-6 nextStep [g1] : proposed | ja="どのタスクも 1 つの行にだけ載せてから、もう一度開いてください" | en="Put every task on exactly one row, then open the file again"
IV-7 text [g1] : proposed | ja="ファイルに暦が 1 つもありません" | en="The file holds no calendar"
IV-7 nextStep [g1] : proposed | ja="暦を 1 つ以上足してから、もう一度開いてください" | en="Add at least one calendar, then open the file again"  // 具体的にどう暦を足すの？ 自動で暦を足してよ。
IV-17 text [g1] : proposed | ja="この文書が使う暦に、稼働する曜日が 1 つもありません" | en="The calendar this document uses has no working weekday"
IV-17 nextStep [g1] : proposed | ja="その暦に稼働する曜日を 1 つ以上入れてから、もう一度開いてください" | en="Give that calendar at least one working weekday, then open the file again"  // どうやって足すの？ 自動で足してよ。 土日休み平日稼働でいいよ。 元旦も平日なら稼働。
IV-8 text [g1] : proposed | ja="名前も、元にしたタスクも持たない行があります" | en="A row has neither a name nor a task it was made from"  // 名前のないタスクは No nameにするでしょ？ このエラーが出るケースが分からなん。
IV-8 nextStep [g1] : proposed | ja="その行に名前を付けてから、もう一度開いてください" | en="Give that row a name, then open the file again"  // 名前のないタスクは No nameにするでしょ？ このエラーが出るケースが分からなん。
IV-9 text [g1] : proposed | ja="線も塗りも透明で、見えないタスクがあります" | en="A task has both its stroke and its fill transparent, so it cannot be seen"
IV-9 nextStep [g1] : proposed | ja="線か塗りのどちらかに色を付けてから、もう一度開いてください" | en="Give the stroke or the fill a colour, then open the file again"  // 具体的にどのタスク？ あと、ヘッダーから予定と実績の両方を非表示にしたときは、このエラー出ないよね？
IV-10 text [g1] : proposed | ja="終了日が開始日より前になっているタスクがあります" | en="A task finishes before it starts"
IV-10 nextStep [g1] : proposed | ja="終了日を、開始日と同じ日かそれより後の日に直してから、もう一度開いてください" | en="Set the finish to the start day or later, then open the file again"
IV-11 text [g1] : proposed | ja="フェード日数を持つのに、終了日を持たないタスクがあります" | en="A task has fade days but no finish"
IV-11 nextStep [g1] : proposed | ja="終了日を入れるか、フェード日数を消してから、もう一度開いてください" | en="Give it a finish or clear its fade days, then open the file again"
IV-12 text [g1] : proposed | ja="フェード日数の前と後を足すと、期間（暦日）より長くなるタスクがあります" | en="A task's fade-in and fade-out days add up to more than its span in calendar days"
IV-12 nextStep [g1] : proposed | ja="フェード日数を減らすか、期間を延ばしてから、もう一度開いてください" | en="Shorten the fade days or lengthen the task, then open the file again"
IV-13 text [g1] : proposed | ja="デュアルカーソルの 2 つの日付のうち、片方がありません" | en="One of the two dates of the Dual Cursor is missing"  // デュアルカーソルで1つしかない場合は、2つ目も同じ日にすればよい。
IV-13 nextStep [g1] : proposed | ja="2 つとも日付を入れるか、デュアルカーソルを消してから、もう一度開いてください" | en="Fill in both dates or turn the Dual Cursor off, then open the file again"  // このエラーは出ないようにできるだろ？ 2つの日付が無かったら2つ目の日付は1つ目の日付に合わせればいい。
IV-14 text [g1] : proposed | ja="日付として読めない値か、扱える範囲の外の日付があります" | en="A date cannot be read as a day, or lies outside the range that can be handled"
IV-14 nextStep [g1] : proposed | ja="日付を、読める形で範囲の中に直してから、もう一度開いてください。空の日付は空欄でなく値の無い形にします" | en="Correct the date so it reads as a day within the range, then open the file again. An empty date is written as no value, not as blank text"
IV-15 text [g1] : proposed | ja="取り込み元の記録に、取込の連番より先の番号があります" | en="An import record carries a number beyond the document's import sequence"  // これは エラーじゃなくて警告かな？ OKで終了でいいよね？ 
IV-15 nextStep [g1] : undecided  // これが必要なケースが分からない。
IV-16 text [g1] : proposed | ja="ほかの設定値が決める範囲に収まっていない設定値があります" | en="A setting lies outside the bounds another setting sets for it"  // 具体的にどの設定？
IV-16 nextStep [g1] : proposed | ja="その設定値を、もう一方の設定値に合わせて直してから、もう一度開いてください" | en="Bring that setting in line with the other one, then open the file again"  // 具体的にどの設定？
IV-19 text [g1] : undecided  // 具体的にどのハイライトボックス？
IV-19 nextStep [g1] : undecided  // 具体的にどのハイライトボックス？ いれかわったらじどうでなおせ
IV-18 text [g1] : proposed | ja="行の親をたどると、元の行へ戻ってしまいます" | en="Following the row parents leads back to the same row"  // それは元の親へのリンクを切れ
IV-18 nextStep [g1] : proposed | ja="輪の中のどれか 1 つの行の親を付け替えてから、もう一度開いてください" | en="Give one row in the loop a different parent, then open the file again"  // 最低の階層から上の階層につながるリンクを切れ
IV-20 text [g1] : proposed | ja="ファイルに行が 1 つもありません" | en="The file holds no row"  // 自動でNo nameの行を1つだけ作れ
IV-20 nextStep [g1] : proposed | ja="行を 1 つ以上足してから、もう一度開いてください" | en="Add at least one row, then open the file again"  // 自動でNo nameの行を1つだけ作れ
IV-21 text [g1] : proposed | ja="実績の最後の日が、実績開始日より前になっているタスクがあります" | en="A task's actual ends before its actual start"  // 実績の最終日と実績の開始日を自動で入れ替えろ
IV-21 nextStep [g1] : proposed | ja="実績の最後の日を、実績開始日と同じ日かそれより後に直してから、もう一度開いてください" | en="Set the last day of the actual to the actual start or later, then open the file again"  // 実績の最終日と実績の開始日を自動で入れ替えろ
IC-102 hint [g2] : alternative | ja="ホイールを回す操作を示す印" | en="Marks turning the mouse wheel"
basics helpHeadings [g3] : alternative | ja="基本操作" | en="Basic operations"
IC-54 helpNotes [g3] : alternative | ja="構えている間だけ出る" | en="Shown only while armed"
IC-2 label [g4] : alternative | ja="書き出して保存" | en="Save to File"
IC-41 label [g4] : own | ja="透かしを消す（パスワードが必要）" | en="Hide the watermark (password required)"
IC-50 label [g4] : proposed | ja="マイルストーン" | en="Milestone"
IC-61 label [g4] : proposed | ja="依存線を引く" | en="Draw a Dependency Line"
IC-81 label [g4] : alternative | ja="依存線の表示" | en="Show Dependency Lines"
SK-19 text [g4] : proposed | ja="その場の編集を確定する" | en="Commit the edit in place"
P-4 ja (stop) [g5] : proposed | ja="実績最終日" | en="stop"
IC-22 hint [g6] : proposed | ja="ショートカットキーとアイコンの一覧を開く" | en="Open the list of shortcut keys and icons"
IC-41 label [g6] : alternative | ja="透かしを消す・戻す" | en="Hide or show the watermark"
```
