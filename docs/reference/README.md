# 外部一次資料の棚

**このリポジトリは第三者の著作物を 1 つも再配布しない。**
本フォルダに置くのは「主張を突き合わせる相手」であって、成果物ではない。
**追跡しているのは `README.md` だけ**で、実体は各自がローカルへ取得する（`.gitignore`）。

CC-BY のように帰属表示を付ければ再配布できるものも、**同じ 1 つの規則で扱う**。
例外を作らなければ、どれが再配布可能かを毎回判断せずに済む。

## 何が置かれるか

| フォルダ | 中身 | 取得手順の所在 |
|---|---|---|
| `mspdi/` | `mspdi_pj12.xsd`（MS Project 2007 MSPDI スキーマ）／ `learn-docs/`（MS Learn 要素リファレンス 390 本）／ `LICENSE`（learn-docs の CC-BY-4.0） | **`previous-project-result/01-mspdi/mspdi/README.md`** — 入手手順・照合ハッシュ・ライセンスの正 |
| `wcag/` | `wcag21-rec.html`（WCAG 2.1 原文） | `wcag/README.md` |
| `w3c/` | `xml-c14n.html`（Canonical XML 原文）。⛔ **未取得** | `w3c/README.md` |

> **MSPDI の手順を本フォルダに複製しないこと。**
> `previous-project-result/` の 12 文書が `01-mspdi/mspdi/README.md` を相対パスで
> 名指ししている。手順が 2 か所にあると、片方だけ古くなる。

## 規律

**MSPDI の事実はローカル複製で確かめ、出典には公式 URL を書く。**
複製は公式とバイト単位で同一なので、見る先と書く先が違っても主張は同じである。

⚠️ **手元に無く、Web にも出られないときは「未検証」と書く。**
日本語の要約（`previous-project-result/01-mspdi/mspdi-*.md`）は参考であって正ではない。
実際に誤りが複数あり、XSD と突き合わせて直した経緯がある。

## StrictDoc を回すときの注意

**`strictdoc export` の対象は `docs/spec` であって `docs` ではない。**
StrictDoc はフォルダ内の `.md` を置き場所に関係なく全て文書として解析するので、
`docs` を指すと `mspdi/learn-docs/` の 378 本を仕様書として読もうとして止まる。

```bash
strictdoc export docs/spec --output-dir docs/spec/output
```
