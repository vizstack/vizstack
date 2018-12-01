from xn.computation_graph import TrackedFunction
import xn


def child_fn(in1):
    return in1 + 1


def parent_fn(in1):
    x = child_fn(in1)
    x = child_fn(x)
    x = child_fn(x)
    return x


def grandparent_fn(in1, in2):
    out1 = parent_fn(in1)
    out2 = parent_fn(in2)
    return out1 + out2


# TODO: make these annotations
child_fn = TrackedFunction(child_fn)
# TODO: item alignment?
parent_fn = TrackedFunction(parent_fn)
grandparent_fn = TrackedFunction(grandparent_fn)

# TODO: handle args to containers -- ignore?
x = grandparent_fn(0, 1)
xn.view(x)
