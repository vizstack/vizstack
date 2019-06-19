from computation_graph import track_fn, track_class, get_graph
import visual_debugger
import xnode

@track_class
class ChildFn:
    def __init__(self):
        self.state = 0

    def __call__(self, in1):
        self.state += 1
        return in1 + self.state


@track_fn
def parent_fn(in1, child_fn):
    x = child_fn(in1)
    x = child_fn(x)
    x = child_fn(x)
    return x


@track_fn
def grandparent_fn(in1, in2):
    child_fn = ChildFn()
    out1 = parent_fn(in1, child_fn)
    out2 = parent_fn(in2, child_fn)
    return out1 + out2

# visual_debugger.view(ChildFn())
# x = grandparent_fn(0, 1)
# c = ChildFn()
# x = c(2)
# x = c(x)
visual_debugger.view(get_graph(grandparent_fn(2, 3)))
# visual_debugger.view(get_graph(x))
# graph = x.xn().compile_full()[0]
# print(graph)

# xnode_old.show(x)
