import * as cola from 'webcola';
import { NodeId, findLowestCommonAncestor } from './layout';

test('findLowestCommonAncestor() finds lca if it exists, or returns null', () => {
    /** Parents lookup table for the following tree structure:
     *  a0
     *     \
     *       b0
     *     /    \
     *  a1        c0 - d0
     *          /
     *       b1
     *
     *  a2 - b2 - c1 - d1
     */
    let parents: { [nodeId: string]: NodeId } = {
        a0: 'b0',
        a1: 'b0',
        b0: 'c0',
        b1: 'c0',
        c0: 'd0',
        a2: 'b2',
        b2: 'c1',
        c1: 'd1',
    };

    expect(findLowestCommonAncestor(parents, 'a0', 'b1')).toEqual('c0'); // Different branch
    expect(findLowestCommonAncestor(parents, 'a0', 'a0')).toEqual('a0'); // Identity
    expect(findLowestCommonAncestor(parents, 'a0', 'b0')).toEqual('b0'); // Left-to-right chain
    expect(findLowestCommonAncestor(parents, 'b0', 'a0')).toEqual('b0'); // Right-to-left chain
    expect(findLowestCommonAncestor(parents, 'a0', 'a2')).toBeNull(); // Disconnected
});

test('layout()', () => {
    // const nodes = [
    //     { width: 50, height: 30, id: null, },
    //     { width: 50, height: 30, id: null, },
    //     { width: 50, height: 30, id: null, },
    // ];
    //
    // const links = [
    //     { source: 0, target: 1 },
    //     { source: 0, target: 2 },
    // ];
    let graph = {
        nodes: [
            { name: '0', width: 50, height: 50 },
            { name: '1', width: 50, height: 50 },
            { name: '2', width: 50, height: 50 },
            { name: '3', width: 50, height: 50 },
            { name: '4', width: 50, height: 50 },
            { name: '5', width: 50, height: 50 },
            { name: '6', width: 50, height: 50 },
        ],
        links: [
            { source: 0, target: 1 },
            { source: 0, target: 3 },
            { source: 0, target: 4 },
            { source: 0, target: 5 },
            { source: 0, target: 6 },
            { source: 1, target: 6 },
            { source: 2, target: 0 },
            { source: 2, target: 1 },
            { source: 2, target: 3 },
            { source: 2, target: 4 },
            { source: 2, target: 5 },
            { source: 2, target: 6 },
            { source: 3, target: 6 },
            { source: 4, target: 1 },
            { source: 4, target: 2 },
            { source: 4, target: 3 },
            { source: 4, target: 5 },
            { source: 4, target: 6 },
            { source: 5, target: 0 },
            { source: 5, target: 2 },
            { source: 5, target: 4 },
            { source: 6, target: 1 },
            { source: 6, target: 3 },
        ],
    };

    // let powerGraph;
    // let layout = new cola.Layout().nodes(graph.nodes).links(graph.links).powerGraphGroups(d => (
    //     powerGraph=d
    //     ).groups.forEach(v => v.padding = 10)
    // ).start(50, 0, 100, 0, false)
    //
    // console.log(layout._groups);
    // console.log(powerGraph.groups);

    // let pgLayout = powerGraphGridLayout(graph, [700, 700], 0.01);
    // console.log(pgLayout.cola._nodes);
    // console.log(pgLayout.cola._groups);
    // console.log(pgLayout.cola._links.length)
    // console.log(obj2obj(pgLayout.cola._links, (k, v) => [
    //
    // ]));

    // const nodeIdToIdx = arr2obj(nodes, (node, idx) => [node.id, idx]);
    //
    let layout = new cola.Layout()
        .avoidOverlaps(true)
        .nodes(graph.nodes)
        .links(graph.links)
        // .powerGraphGroups(2)
        // .groups(groups)
        // .constraints(constraints)
        .start();
    console.log(layout);
    // console.log(nodes, links);
});
