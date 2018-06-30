"""
Replacement for `torch.nn` that treats module calls as graph ops, tracking them in the computation graph.
"""

# Anything that we don't redefine will be pulled directly from torch.nn
from torch.nn import *

import torch.nn as nn
import graphtracker as gt

# Modules in `torch.nn` that should not be treated as graph ops
# TODO: exclude nn modules that shouldn't be ops
__IGNORE_LIST = ['Module', 'Sequential']


def add_wrapped_module():
    """Replaces a `nn.Module` in the global namespace with one where `forward()` is tracked as a graph op.

    This must be a separate function from the main loop over `dir(nn)`, or `getattr()` will not work properly.
    """
    module = getattr(nn, module_name)

    def _new_init_(self, *args, **kwargs):
        module.__init__(self, *args, **kwargs)
        self.forward = gt.OpGenerator(self.forward,
                                      output_props_to_surface=[{'self': None, 'data': 'data', 'grad': 'grad'},
                                                               {'self': None, 'data': 'data', 'grad': 'grad'}])

    globals()[module_name] = type(module_name, (module,), {'__init__': _new_init_})

for module_name in dir(nn):
    if module_name.startswith('_') or not module_name[0].isupper() or module_name in __IGNORE_LIST:
        continue
    add_wrapped_module()
