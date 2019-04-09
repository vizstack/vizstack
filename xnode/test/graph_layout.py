import xnode
import xnode.viz as viz

def compile(x):
    xnode.show(xnode.viz.get_viz(x).compile_full())

# =====================================
# 1 group, 1 direction.

def single_group(num=3, direction="south", links=False, container=True):
    g = viz.DagLayout(flow_direction=direction)
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
    xnode.show(g)

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

# =====================
# 1 group with children.

def single_group_2_directions():
    g = viz.DagLayout(flow_direction="east")

    n0 = g.create_node("n0")
    n1 = g.create_node("n1")
    n2 = g.create_node("n2")
    g.create_edge(n0, n2)
    g.create_edge(n1, n2)

    n6 = g.create_node("n6", flow_direction="south")
    n6.add_child(n0)
    n6.add_child(n1)
    n6.add_child(n2)

    n3 = g.create_node("n3")
    n4 = g.create_node("n4")
    n5 = g.create_node("n5")
    n7 = g.create_node("n7")
    g.create_edge(n6, n3)
    g.create_edge(n3, n4)
    g.create_edge(n3, n5)
    g.create_edge(n3, n7)

    xnode.show(g)

# single_group_2_directions()

# =====================

def nested_groups():
    g = viz.DagLayout(flow_direction="east")

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

    xnode.show(g)

nested_groups()

# =====================

def parent_to_descendant():
    g = viz.DagLayout()

    n0 = g.create_node("n0")
    n1 = g.create_node("n1")
    n1.add_child(n0)
    g.create_edge(n1, n0)

    xnode.show(g)

# parent_to_descendant()
