#!/usr/bin/env python3
"""Repo-local project tracker (project-kit). Stdlib only; the code lives in trackerlib/ next to this file.

Run `tracker.py --help` for the commands.
"""
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ in .project/bin or the plugin
sys.path.insert(0, str(Path(__file__).resolve().parent))

from trackerlib.cli import main  # noqa: E402  (needs the sys.path entry above)

if __name__ == "__main__":
    main()
