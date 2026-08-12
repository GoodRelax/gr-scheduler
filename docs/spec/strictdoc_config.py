# StrictDoc project configuration scaffolded by StrictDocStarter (launch-strictdoc).
# StrictDocStarter scaffold version: 4
#
# Placed in this project folder so `strictdoc server <this folder>` enables the features
# below. StrictDoc reads the config from the input folder itself, not parent folders
# (verified on strictdoc 0.27.1). Shape follows the official `strictdoc new` output
# (create_config() returning a ProjectConfig). MATHJAX and MERMAID are deliberately NOT
# listed: strictdoc 0.27 and newer enable both by default and print a DEPRECATION warning
# if they are listed. Diagrams and math work without them.
#
# StrictDocStarter never overwrites a config you wrote yourself. It offers to update this
# one only while it is still byte-for-byte what the launcher generated; edit anything here
# and it becomes yours, and the launcher will only ever print suggestions from then on.
#
# Docs: https://strictdoc.readthedocs.io/
from strictdoc.core.project_config import ProjectConfig


def create_config() -> ProjectConfig:
    return ProjectConfig(
        # The name of this folder. Change it to whatever you want the project to
        # be called; it is the heading on the project index and the browser tab
        # title. StrictDoc can also change it for you: open the project index and
        # use the title's edit button.
        project_title="spec",
        # Appearance. StrictDoc has no dark mode of its own, so StrictDocStarter
        # supplies one as an extra stylesheet. The file next to this one is
        # rewritten every time the project is opened, following the color_mode
        # setting in server.config.json -- use change-color-mode.bat to change it.
        # The path must stay relative: strictdoc asserts on an absolute one.
        custom_css_path="strictdoc-theme.css",
        project_features=[
            "TABLE_SCREEN",
            "TRACEABILITY_SCREEN",
            "DEEP_TRACEABILITY_SCREEN",
            "SEARCH",
            # The three below are what put icons in the left toolbar; the four
            # above do not. TABLE / TRACEABILITY / DEEP_TRACEABILITY only add
            # entries to a document's VIEWS dropdown, and SEARCH's icon needs a
            # running server (nav.jinja.html and is_activated_search() both
            # require is_running_on_server) -- which is exactly how this
            # launcher runs, so SEARCH does show here even though a static
            # export never shows it.
            #
            # DIFF is deliberately NOT listed even though it, too, would get an
            # icon under the server. Its screen resolves the two Git revisions
            # in the server process's CURRENT WORKING DIRECTORY, not in the
            # served project folder, and this launcher starts strictdoc from the
            # StrictDocStarter folder. Measured on 0.27.1: from a non-Git
            # directory every revision comes back HTTP 422, and from a Git one
            # the screen quietly diffs THAT repository. If you want it, run
            # `strictdoc server .` yourself from inside your Git project.
            #
            # Cost of the three screens is small: about +0.5 s of export time.
            # TREE_MAP_SCREEN is the one that grows the output folder (it
            # bundles plotly.js -- a few MB on a large project).
            "PROJECT_STATISTICS_SCREEN",
            "TRACEABILITY_MATRIX_SCREEN",
            "TREE_MAP_SCREEN",
        ],
    )