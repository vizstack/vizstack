# Package Structure
**This document provides an overview of how the Xnode package for Atom is structured.**

The overall structure is standard for an Atom package. For detailed information about each file/directory, refer to
[Atom Flight Manual: Hacking Atom](https://flight-manual.atom.io/hacking-atom/sections/package-word-count/)

- `package.json`: Metadata about the package, such as the path to its "main" module, library dependencies, and
manifests specifying the order in which its resources should be loaded.
- `lib/`: Main source code providing the package functionality. Exports a single top-level module object
(in `main.js`), which manages the lifecycle of the package when activated by Atom, including the usage of other
services, creation/destruction of the views, and state serialization. For more details, refer to `LIBRARY-STRUCTURE.md`
in the directory.
- `keymaps/`: Keyboard shortcuts for common actions.
- `menus/`: Application menu extensions (`menu`; invoked at top of application window). Context menu extensions (`context-menu`; invoked by right-clicking in an editor window).
- `resources/`: Icons, images, and other miscellaneous files.
- `spec/`: Unit tests (executed using Jasmine under-the-hood).
- `styles/`: CSS stylesheets. Xnode uses the CSS-in-JS paradigm, so global stylesheets are used infrequently.
