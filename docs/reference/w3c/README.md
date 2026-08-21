# Canonical XML の正本（入手手順）

**このフォルダの実体は git 管理外である。** `docs/reference/mspdi/` と `docs/reference/wcag/` と
同じ扱いで、**第三者の著作物をこのリポジトリで再配布しない**という方針による。
必要になったら下の手順で取り直す。

## 何のためにあるか

`docs/spec/05-07-design.md` の `SWS-6`（Chapter 6.1）が、**MSPDI を比べる前の正規化を
「W3C の Canonical XML に従う」と定めている。** その一次資料の置き場である。

⛔ **要約や記憶で規格を書かない。** `FR-021`（`docs/spec/01-04-requirements.md:2824`）が
挙げる 4 つの揺れは、**この原文と 1 つずつ突き合わせて確かめること。**

```
1. 属性の並び
2. 要素の間の空白と改行
3. 自己終了タグの綴り方
4. 名前空間の接頭辞
```

> ⛔ **その突き合わせは、まだ済んでいない。** ⚠️ **`SWS-6` は利用者の裁定（2026-08-21）を
> そのまま書いたものであり、「Canonical XML が上の 4 つを全部覆う」ことの確認ではない。**
> **原文を取得した者が最初にやることは、4 つを 1 つずつ照合し、覆っていない項目があれば
> 変更要求で `SWS-6` を狭めることである。**

## 取得

```bash
mkdir -p docs/reference/w3c
curl -sS -L -o docs/reference/w3c/xml-c14n.html "https://www.w3.org/TR/xml-c14n/"
curl -sS -L -o docs/reference/w3c/xml-c14n11.html "https://www.w3.org/TR/xml-c14n11/"
```

`https://www.w3.org/TR/xml-c14n/` は**常に最新の改訂**を指す。
**版を固定したいときは日付入りの URL を使う。**

| 事項 | 値 |
|---|---|
| 取得日 | ⛔ **未取得** |
| 取得した版 | ⛔ **未取得** |
| 版を固定する URL | ⛔ **取得した版のものを書くこと** |
| ファイル | `xml-c14n.html` ／ `xml-c14n11.html` |
| バイト数 | ⛔ **未取得** |
| SHA-256 | ⛔ **未取得** |

> ⚠️ **上の表は、取得した者が埋める。** `docs/reference/wcag/README.md` が同じ表を
> 埋めた形で持っているので、書式はそちらに揃えること。
> ⚠️ **ハッシュが一致しなくなったら「改訂された」と読む**（壊れたと読まない）。

## どちらの版を採るか

⛔ **決めていない。** Canonical XML には 1.0（`xml-c14n`）と 1.1（`xml-c14n11`）があり、
**どちらを採るかは `SWS-6` が言っていない。** 原文を取得したうえで、
`FR-021` の 4 つに対する差が出るかを見てから決めること。
⚠️ **差が出るなら、それは仕様の裁定であって実装の選択ではない。**

## ライセンス

W3C の文書は **W3C Software and Document License** による。
**再配布はしない**方針なので、このリポジトリには入れない。原典を参照すること。

- 仕様: `https://www.w3.org/TR/xml-c14n/`
- ライセンス: `https://www.w3.org/copyright/software-license/`

## 関連

| 文書 | 何が書いてあるか |
|---|---|
| `docs/spec/05-07-design.md` の `SWS-6` | 正規化の規則そのもの（`FR-021` を親に取る）|
| `docs/spec/01-04-requirements.md` の `FR-021` | 往復の要求と、揺れる 4 つの列挙 |
| `change-request/CR-198-the-boundaries-a-hand-runs-into.md` | この置き場を作った変更要求 |
