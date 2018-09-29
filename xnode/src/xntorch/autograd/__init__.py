"""
Replacement for `torch.autograd` that tracks any declared `Variable` objects in the computation graph.
"""

# Anything from autograd not overwritten will be pulled through
from torch.autograd import *

import torch.autograd as ag
import graphtracker as gt


class Variable(ag.Variable):
    """
    A thin extension of `torch.autograd.Variable` that tracks the object in the computation graph when created.
    """
    def __init__(self, tensor):
        ag.Variable.__init__(self, tensor)
        gt.track_data(self, {'self': None})
