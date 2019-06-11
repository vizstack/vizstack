import xnode
import xnode.view as view
import visual_debugger

# TODO: Does not work for just 2-3 nodes.
# TODO: Make everything ports

# def compile(x):
#     xnode.show(xnode.view.get_viz(x).compile_full())

# =====================================
# 1 group, 1 direction.

def single_group(num=3, direction="south", links=False, container=True):
    g = view.DagLayout(flow_direction=direction)
    if container: cont = g.create_node("container", flow_direction=direction)
    if links:
        root = g.create_node("root")
        if container: cont.add_child(root)
    for n in range(num):
        node = g.create_node("n{}".format(n))
        if container: cont.add_child(node)
        if links: g.create_edge(root, node)
    print("num={}, direction={}, links={}, container={}".format(num, direction, links, container))
    # compile(g)
    visual_debugger.view(g)

# When there are no edges, there is no flow.
# single_group(direction="south")
# single_group(direction="east")
# single_group(direction="north")
# single_group(direction="west")

# When there are edges, there is flow.
# single_group(direction="south", links=True)
# single_group(direction="east", links=True)
# single_group(direction="north", links=True)
# single_group(direction="west", links=True)

# single_group(direction="south", links=True, container=False)
# single_group(direction="east", links=True, container=False)

def crash():
    g = view.DagLayout()
    g.node("container", item="container")
    g.node('n1', item='n1', parent='container')
    g.node('root', item='root')
    g.node('n2', item='n2', parent='container')
    g.edge('root', 'n1')
    visual_debugger.view(g)

# crash()

# =====================
# 1 group with children.

def single_group_2_directions():
    g = (
    view.DagLayout(flow_direction="east")
        .node("n0", item="n0")
        .node("n1", item="n1")
        .node("n2", item="n2")
        .edge("n0", "n2")
        .edge("n1", "n2")
        .node("n6", item="n6", flow_direction="south")
        .port("n6", "herro", "east")
        .node("n0", parent="n6")
        .node("n1", parent="n6")
        .node("n2", parent="n6")
        .node("n3", item="n3")
        .node("n4", item="n4")
        .node("n5", item="n5")
        .node("n7", item="n7")
        .edge("n6", "n3")
        .edge("n3", "n4")
        .edge("n3", "n5")
        .edge("n3", "n7")

    )

    visual_debugger.view(g)

single_group_2_directions()

# =====================

def nested_groups():
    g = view.DagLayout(flow_direction="east")

    n6 = g.create_node("n6", flow_direction="south")
    n0 = g.create_node("n0")
    n1 = g.create_node("n1")
    n2 = g.create_node("n2")
    g.create_edge(n0, n2)
    g.create_edge(n1, n2)
    n6.add_child(n0)
    n6.add_child(n1)
    n6.add_child(n2)

    n8 = g.create_node("n8", flow_direction="east")
    n7 = g.create_node("n7", flow_direction="north")
    n3 = g.create_node("n3")
    n4 = g.create_node("n4")
    n5 = g.create_node("n5")

    g.create_edge(n3, n4)
    g.create_edge(n4, n5)
    n7.add_child(n3)
    n7.add_child(n4)
    n8.add_child(n7)
    n8.add_child(n5)

    g.create_edge(n6, n8)
    g.create_edge(n2, n3)

    visual_debugger.view(g)

# nested_groups()

# =====================

def parent_to_descendant():
    g = view.DagLayout()

    n0 = g.create_node("n0")
    n1 = g.create_node("n1")
    n1.add_child(n0)
    g.create_edge(n1, n0)

    visual_debugger.view(g)

# parent_to_descendant()

# =====================

def ports1():
    g = (
    view.DagLayout()
        .node("n0", item="n0")
        .node("n1", item="n1")
        .node("n2", item="n2")
        .edge("n0", "n1")
        .edge("n0", "n2")
    )
    visual_debugger.view(g)

ports1()

def ports2():
    g = (
    view.DagLayout()
        .node("n0", item="n0")
        .node("n1", item="n1")
        .node("n2", item="n2")
        .port("n0", 'left', 'west')
        .port("n2", 'right', 'east')
        .edge("n0", "n1")
        .edge("n0", "n2", start_port='left', end_port='right')
    )
    visual_debugger.view(g)

ports2()
