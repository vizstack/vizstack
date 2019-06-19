import xnode_old
import random
import string

length = 5
strings = 30

strings = [''.join(random.choice(string.ascii_lowercase) for _ in range(length)) for _ in range(strings)]
xnode_old.show(strings)
tree = dict()
for s in strings:
    t = tree
    for c in s:
        if c not in t:
            t[c] = dict()
        t = t[c]

    xnode_old.show(tree)
