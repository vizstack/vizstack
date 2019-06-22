"""
This file exports all of the `assemble()` function (defined in `assembler`) and the `View` objects (defined in `view`).
"""

# Export the `assemble()` function
from vizstack.assembler import assemble

# Export all public-facing `View` objects
from vizstack.view import EXPORTED_VIEWS
for view_name, view_class in EXPORTED_VIEWS.items():
    globals()[view_name] = view_class
    del view_name
    del view_class

# Clear the module's namespace of anything we don't want to export
del EXPORTED_VIEWS
del view
del assembler


