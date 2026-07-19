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
