# WCAG 2.1 の正本（入手手順）

**このフォルダの実体は git 管理外である。** `docs/reference/mspdi/` と同じ扱いで、
**第三者の著作物をこのリポジトリで再配布しない**という方針による。
必要になったら下の手順で取り直す。

## 何のためにあるか

`previous-project-result/05-security-a11y/a11y-wcag21-aa-checklist.md` の
**A / AA 全 50 基準の突合**は、この原文を一次資料として作った。
**要約や記憶で基準を書かない**ための置き場である。

## 取得

```bash
mkdir -p docs/reference/wcag
curl -sS -L -o docs/reference/wcag/wcag21-rec.html "https://www.w3.org/TR/WCAG21/"
```

`https://www.w3.org/TR/WCAG21/` は**常に最新の改訂**を指す。
**版を固定したいときは日付入りの URL を使う。**

| 事項 | 値 |
|---|---|
| 取得日 | 2026-08-02 |
| 取得した版 | **W3C Recommendation 2025-05-06** |
| 版を固定する URL | `https://www.w3.org/TR/2025/REC-WCAG21-20250506/` |
| ファイル | `wcag21-rec.html` |
| バイト数 | 476,496 |
| SHA-256 | `233ac31974ce8575c08932ee1bd71c93879cf9b8426b2bc9b961b3ea8afb8ab6` |

> ⚠️ **ハッシュは上の取得日時点のものである。** W3C が改訂すると
> `TR/WCAG21/` の中身は変わり、ハッシュも一致しなくなる。
> **一致しなかったら「改訂された」と読む**（壊れたと読まない）。日付入り URL なら一致する。

## 抽出した数（機械カウント・2026-08-02）

```
達成基準 全 78
  レベル A    30
  レベル AA   20
  レベル AAA  28

AA 適合に要るのは A + AA = 50
```

**抽出方法**: 原文の `<h4><bdi class="secno">Success Criterion x.y.z</bdi>名称</h4>` と、
直後の `<p class="conformance-level">(Level A|AA|AAA)</p>` を対にして読む。

## ライセンス

W3C の文書は **W3C Software and Document License** による。
**再配布はしない**方針なので、このリポジトリには入れない。原典を参照すること。

- 仕様: `https://www.w3.org/TR/WCAG21/`
- ライセンス: `https://www.w3.org/copyright/software-license/`

## 関連

| 文書 | 何が書いてあるか |
|---|---|
| `previous-project-result/05-security-a11y/a11y-wcag21-aa-checklist.md` | **A / AA 全 50 基準の突合表**（適合 / 該当なし / 要対応） |
| `previous-project-result/NEXT-STEPS-ja.md` ステップ 1 | 適合範囲を要求として確定させる作業 |
