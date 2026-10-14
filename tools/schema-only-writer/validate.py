"""Validate one GRS JSON file against a JSON Schema (draft 2020-12).

Usage: python -I validate.py <schema.json> <file.json>

Prints one ASCII-only JSON object on stdout (python -I ignores PYTHONIOENCODING):
  {"count": N, "messages": ["<path>: <message>", ...], "formatsUnchecked": [...]}
`messages` holds at most the first 20 violations, in document order.
`formatsUnchecked` names the "format" keywords the installed jsonschema cannot
check (for example date-time without rfc3339-validator): those pass silently.
"""
import json
import sys

from jsonschema import Draft202012Validator, FormatChecker

FIRST_MESSAGES = 20


def main(schema_path, file_path):
    with open(schema_path, encoding="utf-8") as handle:
        schema = json.load(handle)
    with open(file_path, encoding="utf-8") as handle:
        document = json.load(handle)
    checker = FormatChecker()
    validator = Draft202012Validator(schema, format_checker=checker)
    errors = sorted(validator.iter_errors(document), key=lambda e: list(map(str, e.absolute_path)))
    used = set()

    def collect(node):
        if isinstance(node, dict):
            if isinstance(node.get("format"), str):
                used.add(node["format"])
            for value in node.values():
                collect(value)
        elif isinstance(node, list):
            for value in node:
                collect(value)

    collect(schema)
    # A format with no registered checker, or whose checker is a no-op because
    # its optional dependency is missing, passes everything; probe with junk.
    unchecked = sorted(f for f in used if checker.conforms("not-a-valid-value-x", f))
    print(json.dumps({
        "count": len(errors),
        "messages": [
            "/" + "/".join(map(str, e.absolute_path)) + ": " + e.message[:300]
            for e in errors[:FIRST_MESSAGES]
        ],
        "formatsUnchecked": unchecked,
    }))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: python -I validate.py <schema.json> <file.json>")
    main(sys.argv[1], sys.argv[2])
