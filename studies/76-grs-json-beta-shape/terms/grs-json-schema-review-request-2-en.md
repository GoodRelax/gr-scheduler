# 送る人へ（AI には送らない）

- GRS JSON の β のスキーマを、外の AI にもう一度見てもらう質問状です（2026-11-23、GRS JSON のスキーマ 2 の席。持ち主の指示 `JDG-3801`）。1 回目（`grs-json-schema-review-request-en.md`）の指摘を当て、自明な説明と重複を消した後の版を見ます。見るのは 4 点: 矛盾、誤解、冗長、それに消しすぎて説明の要るキーが説明を失っていないか。
- 新しい会話で、ファイル `grs-json-beta.schema.json`（同じフォルダー）を添えて、「ここから下を AI へ送る」より下を 1 回で貼ってください。添えられない AI には、このファイルの中身を質問状の後に貼ってください。
- 1 回目の質問状を見た会話は使わないでください。
- 答えは席に貼ってください。席が写し（AI の名を役割の名に替えた版）を `ai-answers/` に置きます。

---- ここから下を AI へ送る ----

# Review request: is this JSON Schema free of contradictions, easy to understand correctly, free of needless words, and does every key that needs a description have one?

**Answer in English, inside one code block (start with ```markdown and end with ```), in the answer form of section 4.**

## 1. What we ask

A scheduling app (a Gantt chart tool called GRS) saves one schedule document as one JSON file. The attached file `grs-json-beta.schema.json` is the JSON Schema (draft 2020-12) of that file. The schema is an external contract: other programs and AI agents will read and write files by this schema alone, so the schema must not contradict itself, and every description must have one meaning.

We have cut the descriptions hard: a key whose name and constraints say enough has no description at all. Please read the whole schema, the root `description` first, and check four things:

1. **Contradictions** — places where the schema says two things that cannot both be true.
2. **Misreadings** — places where a first-time reader would likely understand something other than what the text means, or could read the text in two ways.
3. **Redundancy** — words that a reader still does not need: explanations of the obvious, and text that repeats what the key name, the constraints or another description already say.
4. **Missing descriptions** — keys without a description (or with too short a one) whose meaning you cannot tell from the key name, the constraints and the root description: for example a unit, a time zone, a counting base (0 or 1), what absence means, or what GRS does with the value.

Judge from the schema alone. Do not look up the app or similar products, and do not guess our intent from other material. When the schema does not say something, say that it does not say it. For keys inside MSPDI objects (see the notes below), you may use what you know of the Microsoft Project XML format (MSPDI).

## 2. What counts

Contradictions include, for example:

- a description against the constraints of the same key (type, `enum`, `minimum`/`maximum`/`exclusiveMaximum`, `pattern`, `required`, `default`, the `allOf`/`if`/`then` rules);
- two descriptions that say different things about the same value (for example, the root description against a key's description, or a key against the type it refers to with `$ref`);
- a rule in prose that the constraints break, or a constraint that the prose does not allow;
- the same thing named with two different words, or two different things named with one word.

Misreadings include, for example:

- a key name or description that suggests a different unit, range, time zone, counting base (0 or 1), or meaning of absence than the schema intends;
- a sentence with two readings;
- a term that the schema uses without saying what the term means.

Redundancy includes, for example:

- a description that only restates the key name;
- a description that repeats a constraint the schema already states (a range, an `enum` list, a pattern, a default);
- the same rule written in several descriptions, where one place would do;
- a copy of a code table that MSPDI already defines;
- a sentence that guards against a misreading nobody would make.

A missing description is, for example:

- a key whose name allows two readings and that has no description to choose one;
- a number without a unit in its name or description;
- a date or time without a time zone;
- a GRS-only key whose effect on the app you cannot tell.

Before you ask for a description, check that the key name, the constraints and the root description really leave the question open: we do not want the obvious back.

Notes on how the schema is written (these are intended, not findings):

- A key without a description is intended: its name and constraints are meant to say enough.
- A key inside an MSPDI object (project, calendars, tasks, resources, assignments and their parts) has the meaning and values of the MSPDI element of the same name; only `grs`, `parentTaskUid` and `siblingIndex` there are GRS's own. A description there notes only what GRS does differently.
- A description that starts "Only when type is X." repeats the `if`/`then` rule on purpose, so that the condition stands next to the key.
- A key that has no value is left out; `null` and empty arrays are never written.
- `x-grsChanges` at the root is the change ledger of the format (an annotation that validators ignore).
- Shared types live under `$defs`; a key refers to a type with `$ref`.

## 3. Limits

- Up to 20 contradictions, up to 20 misreadings, up to 20 redundant places and up to 20 missing descriptions, the most serious first.
- Point at each place with its JSON Pointer inside the schema (for example `/$defs/Task/properties/siblingIndex` or `/properties/documentSettings/properties/fitDayRange`).
- Quote the words you mean (at most 25 words per quote).

## 4. Answer form

```markdown
## 1. Contradictions

| # | Where (JSON Pointer) | Quote | What contradicts what | Severity (high / medium / low) | Suggested fix (one sentence) |
|---|---|---|---|---|---|

## 2. Misreadings

| # | Where (JSON Pointer) | Quote | How you first read it | What the text seems to mean (or the second reading) | Suggested fix (one sentence) |
|---|---|---|---|---|---|

## 3. Redundancy

| # | Where (JSON Pointer) | Words to cut (quote) | Why the reader does not need them (obvious / repeats the name / repeats a constraint / repeats another description / copies MSPDI) | The shorter text (or "delete") |
|---|---|---|---|---|

## 4. Missing descriptions

| # | Where (JSON Pointer) | What a reader cannot tell | The shortest description that would answer it (one sentence) |
|---|---|---|---|

Also: in one line, are the descriptions as a whole too long, about right, or too short?

## 5. Overall

- Would you, given only this schema, be able to write a valid document for a small schedule (two tasks, one dependency, one task group)? (yes / partly / no, and why in one line)
- The one change that would help a first-time reader most (one sentence).
```
