# StrictDoc project configuration for gr-scheduler.
#
# IMPORTANT: this file MUST live in the folder passed to
# `strictdoc export <path>` / `strictdoc server <path>` -- that is, next to the
# specification documents. StrictDoc reads the config in the input folder
# ITSELF and does not look in parent folders.
#
#   strictdoc export docs/spec --formats=json --output-dir docs/spec/output
#
# Always pass docs/spec, never docs. StrictDoc parses EVERY .md under the export
# path, so pointing it at docs/ would drag in docs/reference/mspdi/learn-docs/
# (378 upstream Microsoft pages with no H1) and stop on the first one.
#
# Docs: https://strictdoc.readthedocs.io/en/stable/stable/docs/strictdoc_01_user_guide.html
from strictdoc.core.project_config import ProjectConfig


def create_config() -> ProjectConfig:
    return ProjectConfig(
        project_title="gr-scheduler Specification",
        # No exclude_doc_paths on purpose. Everything under docs/spec is a
        # StrictDoc document; the third-party copies live on the reference shelf
        # at docs/reference/, outside the export path. Keep it that way -- an
        # exclusion list is a thing to forget to update. If a .md that is not a
        # document has to live here, name it here by file name; never exclude a
        # folder such as _assets/**, because that also stops assets from being
        # copied and the HTML export then serves 404s while reporting success.
        project_features=[
            # Stable features.
            "TABLE_SCREEN",
            "TRACEABILITY_SCREEN",
            "DEEP_TRACEABILITY_SCREEN",
            "SEARCH",
            # Stable. Math in RST .. math:: / :math:`...` form.
            "MATHJAX",
            # Experimental. Mermaid diagrams; Markdown ```mermaid fences work on
            # strictdoc 0.23.0+. Chapters 2.1, 5.1, 5.2, 5.4 and 5.5 need this.
            "MERMAID",
            # Experimental. Requirement x design/test coverage matrix screen.
            "TRACEABILITY_MATRIX_SCREEN",
        ],
    )
