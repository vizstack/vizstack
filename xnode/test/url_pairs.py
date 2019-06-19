import xnode_old

urls = ['https://www.google.com/hello/world', 'https://www.google.com/goodbye/world', 'https://www.google.com/goodbye/moon']
xnode_old.show(urls)
params = [url.split('/')[3:] for url in urls]
xnode_old.show(params)
pairs = set()
for i, param_list in enumerate(params):
    xnode_old.show(param_list)
    for t, other_param_list in enumerate(params[i+1:]):
        xnode_old.show(other_param_list)
        differences = 0
        for param1, param2 in zip(param_list, other_param_list):
            if param1 != param2:
                differences += 1
                if differences > 1:
                    break
        xnode_old.show(differences)
        if differences == 1:
            pairs.add((urls[i], urls[t]))
xnode_old.show(pairs)
