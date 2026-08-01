# StrictDoc project configuration for gr-scheduler.
#
# IMPORTANT: this file MUST live in the folder passed to
# `strictdoc server <path>` / `strictdoc export <path>` -- i.e. the folder that
# holds the .sdoc files (docs/spec/). StrictDoc reads the config in the input
# folder ITSELF and does NOT look in parent folders. That is why this config
# lives next to the .sdoc files.
#
# Modeled on the StrictDocStarter "sovd-automotive" sample. MERMAID and MATHJAX
# are enabled for diagrams and math in the spec; TRACEABILITY_MATRIX_SCREEN
# surfaces requirement x design/test coverage across the V-model
# (Implements / Satisfies / Verifies / ResultOf).
#
# Docs: https://strictdoc.readthedocs.io/en/stable/stable/docs/strictdoc_01_user_guide.html
from strictdoc.core.project_config import ProjectConfig


def create_config() -> ProjectConfig:
    return ProjectConfig(
        project_title="gr-scheduler Requirements Specification",
        # Exclude Markdown that is not a StrictDoc document. StrictDoc parses
        # EVERY .md under the export path and fails the whole export on the
        # first one it cannot read, so anything here that is a note or a
        # third-party copy has to be named.
        #
        #   vendor/**            the vendored MSPDI reference (.md/.xsd copies
        #                        from upstream, e.g. Learn docs lacking an H1)
        #   gur-components.md    a 2026-07 scratch note of the old GUI tree,
        #                        superseded by handover/03-ui-naming/
        #                        handover-ui-parts-ja.md 3. Not written as a
        #                        StrictDoc document: no H1, blank-line runs.
        #                        Reshaping it to satisfy the parser would edit a
        #                        historical record to fit a tool, so it is
        #                        excluded instead.
        #
        # This is what broke the Pages deploy on every run from 2026-07-26 to
        # 2026-08-01: gur-components.md was also saved as cp932, and StrictDoc
        # died decoding it before it ever reached the H1 check.
        exclude_doc_paths=["**/vendor/**", "vendor/**", "gur-components.md"],
        project_features=[
            # Stable features (strictdoc defaults).
            "TABLE_SCREEN",
            "TRACEABILITY_SCREEN",
            "DEEP_TRACEABILITY_SCREEN",
            "SEARCH",
            # Stable. TeX/LaTeX math via RST .. math:: / :math:`...`.
            "MATHJAX",
            # Experimental. Mermaid diagrams (RST raw-html <pre class="mermaid">
            # and Markdown ```mermaid fences on strictdoc 0.23.0+).
            "MERMAID",
            # Experimental. Requirement x design/test coverage matrix screen.
            "TRACEABILITY_MATRIX_SCREEN",
        ],
    )
