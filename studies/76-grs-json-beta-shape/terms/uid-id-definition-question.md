# 質問状: JSON のキー `uid` と `id` の定義文をどう書くか

2026-11-11。GoodRelax Scheduler（GRS）の名の辞書の作業から。ご意見をください。

## 1. 何を決めたいか

GRS はスケジュールを 1 つの JSON ファイル（GRS JSON）に保存します。その中の多くの物が、自分を見分けるキーとして `uid` か `id` を持ちます。名の辞書には、この 2 つのキーの定義文を英語と日本語で 1 つずつ置きます。この定義文は、JSON スキーマの説明にもそのまま入り、外の人（JSON を読み書きする道具の作り手）が読みます。

決めたいのは、この 2 つの定義文の書き方です。

## 2. 事実

| キー | 持つ物 | 値 |
|:---|:---|:---|
| `uid` | Microsoft Project の XML 形式（MSPDI）から来た物: Project・Calendar・Task・Resource・Assignment・BaselineTask | MSPDI の `UID` 要素と同じ値（Project だけは文字列、ほかは数） |
| `id` | GRS だけが持つ物: TaskGroup・CommentBox・HighlightBox | GRS が作る UUID |

- 1 つのキー（たとえば `uid`）を、いくつもの種類の物が持ちます。
- けれども 1 つの値は、それを持つ 1 つの物だけを見分けます。
- 辞書には持ち主ごとでなく、`uid` と `id` を 1 語ずつ置きます（1 つの定義が、すべての持ち主に効く）。
- JSON の中では、これらの物は配列の要素（オブジェクト）として並びます。配列の順が変わっても、同じ物は同じ `uid` / `id` を持ちます。

## 3. これまでの案と、持ち主の引っかかり

| 案 | 英語の頭 | 持ち主の引っかかり |
|:---|:---|:---|
| 1 | The identifier of a row that comes from MSPDI … | 「行」に付くのか？ id は行でなく物に付く |
| 2 | The identifier of an entity that comes from MSPDI … | 単数でよいのか？ 1 つのキーをいろいろな物が持つ |
| 3 | The identifier for entities that come from MSPDI … | 「of」と「for」、単数と複数のどれが正しいか分からない |
| 4 | Identifies the entity that holds it. Entities that come from MSPDI … carry uid … | どれもしっくりこない |

案 4 の全文（日本語）: 「それを持つ実体を見分ける値。MSPDI から来た実体（Project・Calendar・Task・Resource・Assignment・BaselineTask）は uid を持ち、値は MSPDI の UID と同じ。GRS だけが持つ実体は、代わりに id を持つ。」

物を何と呼ぶかは「実体（entity）」に決めました（データベースの慣例。要素・オブジェクトは別の意味と紛れる）。

## 4. 聞きたいこと

1. あなたなら、`uid` と `id` の定義文（英語・日本語）をどう書きますか。1〜2 文で書いてください。
2. 定義文は、値 1 つを言う形（単数）と、どの種類の物が持つかを言う形（複数）の、どちらから始めるのがよいと思いますか。理由もください。
3. 有名な仕様や API（JSON Schema、HTML の `id` 属性、データベースの主キー、ほかの JSON 形式など）で、手本になる定義文を知っていたら教えてください。
4. 「uid は MSPDI から来た物、id は GRS だけの物」という使い分けを、定義文の中で言うべきでしょうか。それとも別の場所（スキーマの説明の頭など）で言うべきでしょうか。

## 5. 答え方

番号ごとに、自由に書いてください。短くてかまいません。
