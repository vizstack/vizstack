import { FragmentId, DagLayoutFragment, DagNode, DagEdge, DagNodeAlignment } from '@vizstack/schema';
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
    private _parents: Record<string, string> = {}; // Maps children -> parents.
    private _alignments: DagNodeAlignment[] = [];
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
            parent?: string | null;
            alignWith?: DagNodeAlignment | DagNodeAlignment[];
        } = {},
        item: any = kNoneSpecified,
    ) {
        if (!this._nodes[name]) this._nodes[name] = {};
        const { parent, alignWith } = config;
        if (parent !== undefined) {
            // If the node already had a parent, remove it from its list of children
            if (this._parents[name]) {
                const idx = this._children[this._parents[name]].indexOf(name);
                this._children[this._parents[name]].splice(idx);
            }
            if (parent === null) {
                delete this._parents[name];
            } else {
                this._parents[name] = parent;
                if (!this._children[parent]) this._children[parent] = [];
                this._children[parent].push(name);
            }
        }
        if (alignWith) {
            if (Array.isArray(alignWith)) {
                this._alignments.push(...alignWith.map((alignment) => ({...alignment, nodes: [name, ...alignment.nodes]})));
            } else if (alignWith !== undefined) {
                this._alignments.push({...alignWith, nodes: [name, ...alignWith.nodes]});
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

    public edge(
        source: string | DagEdgeConfig['source'],
        target: string | DagEdgeConfig['target'],
        label?: string,
    ) {
        const edge: DagEdgeConfig = {
            source: typeof source === 'string' ? { id: source } : source,
            target: typeof target === 'string' ? { id: target } : target,
            ...(label && { label }),
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
        this._edges.forEach(({ source, target, label }, idx) => {
            const { id: sourceId, port: sourcePort  } = source;
            const { id: targetId, port: targetPort  } = target;
            if (!(sourceId in this._nodes)) {
                throw new Error(`Edge starts at unknown node: ${sourceId}`);
            } else if (sourcePort) {
                const sourcePorts = this._nodes[sourceId].ports;
                if (!sourcePorts || !(sourcePort in sourcePorts)) {
                    throw new Error(`Edge starts at unknown port: ${sourcePort} (node ${sourceId})`);
                }
            }
            if (!(targetId in this._nodes)) {
                throw new Error(`Edge ends at unknown node: ${targetId}`);
            } else if (targetPort) {
                const targetPorts = this._nodes[targetId].ports;
                if (!targetPorts || !(targetPort in targetPorts)) {
                    throw new Error(`Edge ends at unknown port: ${targetPort} (node ${targetId})`);
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
            Object.keys(this._nodes).map((name) => this._items[name]),
        ];
    }
}

export function Dag(flowDirection?: 'north' | 'south' | 'east' | 'west', alignChildren?: boolean) {
    return new DagLayoutFragmentAssembler(flowDirection, alignChildren);
}

export interface Dag extends ReturnType<typeof Dag> {}
