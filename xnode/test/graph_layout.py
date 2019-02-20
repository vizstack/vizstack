import xnode
import xnode.viz as viz


# =====================
# 1 group with children.

g = viz.DagLayout(flow_direction="east")

n1 = g.create_node("n1")
n2 = g.create_node("n2")
n3 = g.create_node("n3")
g.create_edge(n1, n3)
g.create_edge(n2, n3)

n4 = g.create_node("n4")  # flow_direction = "south"
n4.add_child(n1)
n4.add_child(n2)
n4.add_child(n3)

xnode.show(g)

# =====================
# 1 group with children.

g = viz.DagLayout(flow_direction="east")

n1 = g.create_node("n1")
n2 = g.create_node("n2")
n3 = g.create_node("n3")
g.create_edge(n1, n3)
g.create_edge(n2, n3)

n4 = g.create_node("n4")  # flow_direction = "south"
n4.add_child(n1)
n4.add_child(n2)
n4.add_child(n3)

n5 = g.create_node("n5", flow_direction="east")
g.create_edge(n4, n5)


xnode.show(g)

# =====================

g = viz.DagLayout(flow_direction="east")

n1 = g.create_node("n1")
n2 = g.create_node("n2")
n3 = g.create_node("n3")
g.create_edge(n1, n3)
g.create_edge(n2, n3)

n4 = g.create_node("n4")  # flow_direction = "south"
n4.add_child(n1)
n4.add_child(n2)
n4.add_child(n3)

n5 = g.create_node("n5", flow_direction="east")
g.create_edge(n4, n5)

n6 = g.create_node("n6", flow_direction="north")
n7 = g.create_node("n7")
n8 = g.create_node("n8")
n6.add_child(n7)
n6.add_child(n8)
g.create_edge(n7, n8)

n9 = g.create_node("n9")
g.create_edge(n8, n9)
n5.add_child(n9)

xnode.show(g)
