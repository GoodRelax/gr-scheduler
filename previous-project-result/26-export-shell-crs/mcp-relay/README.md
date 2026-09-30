# MCP の取次の図（`CR-613` の下書き）

`change-request/CR-613-the-local-mcp-relay-has-a-design-document.md` が仕様へ足す 図 F-045（MCP の取次の置き場所）の原稿と生成物である。
まだ仕様には入っていない。
`CR-613` を当てるとき、3 つのファイルを次へ移す。

| ここにあるファイル | 当てるときの行き先 | 役割 |
|---|---|---|
| `fig-mcp-relay.json` | `docs/spec/_source/fig-mcp-relay.json` | 原稿（唯一の正）。頭の `$comment` が役割を名乗る（検査 21） |
| `fig-mcp-relay.drawio` | `docs/spec/_source/fig-mcp-relay.drawio` | 生成物。`<mxGraphModel>` の `generatedBy` 属性が、原稿と作り直し方を名乗る（検査 21） |
| `fig-mcp-relay.svg` | `docs/spec/_assets/fig-mcp-relay.svg` | 仕様が載せる絵。`_assets/design-mcp-relay.md` が 図 F-045 として引く |

置き方は、いまの `docs/spec/_source/fig-components.drawio`（`_source`）と `docs/spec/_assets/fig-components.svg`（`_assets`）に揃えた。

## 作り直し方

drawio-uml の技能（`build.py` が使うものと同じ）で、原稿から `.drawio` を作り、draw.io で `.svg` を書き出す。

```text
python <drawio-uml skill>/scripts/draw.py fig-mcp-relay.json fig-mcp-relay.drawio
# put the generatedBy attribute back on <mxGraphModel> (see the current file), then:
draw.io -x --embed-svg-fonts false -f svg -b 12 -o fig-mcp-relay.svg fig-mcp-relay.drawio
```

⚠️ `generatedBy` の属性は `draw.py` が書かない。作り直したら付け直す（`build.py` の `stamp_drawio` と同じ形）。
⭐ `CR-613` の 9 節は、`build.py` にこの図も作らせることを勧めている —— そうすれば `python docs/spec/_source/build.py` の 1 つで全部の図が作り直せる。

## 見たこと

- 書き出した絵を PNG でも書き出して目で見た。箱を横切る線は無い。
- `--embed-svg-fonts false` を付けた。付けないと字が画像になり、390 KB になる（付けて 30 KB）。
