import { FragmentId, DagLayoutFragment, DagNode, DagEdge } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';
import _ from 'lodash';

type DagNodeConfig = Omit<DagNode, 'fragmentId' | 'children'>;
type DagEdgeConfig = DagEdge;

const kNoneSpecified = Symbol();

class DagLayoutFragmentAssembler extends FragmentAssembler {
    private _flowDirection?: 'north' | 'south' | 'east' | 'west';
    private _alignChildren?: boolean;
    private _nodes: Record<string, DagNodeConfig> = {};
    private _children: Record<string, string[]> = {}; // Maps parent -> children.
    private _alignments: Array<string[]> = [];
    private _edges: Array<DagEdgeConfig> = [];
    private _items: Record<string, any> = {};

    constructor(flowDirection?: 'north' | 'south' | 'east' | 'west', alignChildren?: boolean) {
        super();
        this._flowDirection = flowDirection;
        this._alignChildren = alignChildren;
    }

    public node(
        name: string,
        config: DagNodeConfig & {
            parent?: string;
            alignWith?: string | string[];
        } = {},
        item: any = kNoneSpecified,
    ) {
        if (!this._nodes[name]) this._nodes[name] = {};
        const { parent, alignWith } = config;
        if (parent) {
            if (!this._children[parent]) this._children[parent] = [];
            this._children[parent].push(name);
        }
        if (alignWith) {
            if (typeof alignWith === 'string') {
                this._alignments.push([name, alignWith]);
            } else if (Array.isArray) {
                this._alignments.push([name, ...alignWith]);
            }
        }
        delete config.parent;
        delete config.alignWith;
        _.merge(this._nodes[name], config);
        if (item !== kNoneSpecified) this._items[name] = item;
        return this;
    }

    public port(
        nodeName: string,
        portName: string,
        side?: 'north' | 'south' | 'east' | 'west',
        order?: number,
    ) {
        const node: DagNodeConfig = this._nodes[nodeName];
        if (!node.ports) node.ports = {};
        node.ports[portName] = _.merge(node.ports[portName], {
            ...(side && { side }),
            ...(order && { order }),
        });
        return this;
    }

    public edge(startNode: string, endNode: string, startPort?: string, endPort?: string) {
        const edge: DagEdgeConfig = {
            startId: startNode,
            endId: endNode,
            ...(startPort && { startPort }),
            ...(endPort && { endPort }),
        };
        this._edges.push(edge);
        return this;
    }

    public item(nodeName: string, item: any = kNoneSpecified) {
        this._items[nodeName] = item;
        return this;
    }

    public assemble(getId: (obj: any, name: string) => FragmentId): [DagLayoutFragment, any[]] {
        // Ensure all nodes have an item.
        _.keys(this._nodes).forEach((name) => {
            if (!(name in this._items)) throw new Error(`Node with no item: ${name}`);
        });
        // Ensure all edge start/end nodes and ports are valid.
        this._edges.forEach(({ startId, endId, startPort, endPort }, idx) => {
            if (!(startId in this._nodes)) {
                throw new Error(`Edge starts at unknown node: ${startId}`);
            } else if (startPort) {
                const startPorts = this._nodes[startId].ports;
                if (!startPorts || !(startPort in startPorts)) {
                    throw new Error(`Edge starts at unknown port: ${startPort} (node ${startId})`);
                }
            }
            if (!(endId in this._nodes)) {
                throw new Error(`Edge ends at unknown node: ${endId}`);
            } else if (endPort) {
                const endPorts = this._nodes[endId].ports;
                if (!endPorts || !(endPort in endPorts)) {
                    throw new Error(`Edge ends at unknown port: ${endPort} (node ${endId})`);
                }
            }
        });
        return [
            {
                type: 'DagLayout',
                contents: {
                    nodes: _.mapValues(this._nodes, (node, name) => ({
                        fragmentId: getId(this._items[name], `n${name}`),
                        children: this._children[name] || [],
                        ...node,
                    })),
                    edges: _.mapKeys(this._edges, (edge, idx) => `e${idx}`),
                    alignments: this._alignments,
                    flowDirection: this._flowDirection,
                    alignChildren: this._alignChildren,
                },
                meta: this._meta,
            },
            _.values(this._items),
        ];
    }
}

export function Dag(flowDirection?: 'north' | 'south' | 'east' | 'west', alignChildren?: boolean) {
    return new DagLayoutFragmentAssembler(flowDirection, alignChildren);
}

export interface Dag extends ReturnType<typeof Dag> {}
