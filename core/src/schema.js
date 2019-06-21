// @flow

/** Normalized data structure produced by assembler, rehydrated from JSON. */
export type View = {
    rootId: ViewId,
    models: {
        [ViewId]: ViewModel,
    },
};

/** Unique identifier of a `View`. */
export type ViewId = string;

/** Assembled "building blocks" of a `View`. */
export type ViewModel = PrimitiveModel | LayoutModel;
export type ViewMeta = { [string]: any };

// =================================================================================================
// Primitives (aka "visual building blocks").

/** Any primitive model. */
export type PrimitiveModel = TextPrimitiveModel | ImagePrimitiveModel;

/** Text primitive is a block of plain text (colored text on transparent background) or code
 *  text (text in colored block). */
export type TextPrimitiveModel = {
    type: 'TextPrimitive',
    contents: {|
        text: string,
        color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',
        variant?: 'plain' | 'token',
    |},
    meta: ViewMeta,
};
// TODO: Break into PlainTextPrimitive vs CodeTextPrimitive?

/** Image primitive is an web-compatible image. */
export type ImagePrimitiveModel = {
    type: 'ImagePrimitive',
    contents: {|
        filePath: string,
    |},
    meta: ViewMeta,
};
// TODO: Is this best? What about URL? Constructed plot/matrix?

// =================================================================================================
// Layouts (aka "configurations of building blocks").

/** Any layout model. */
export type LayoutModel = GridLayoutModel | FlowLayoutModel | SwitchLayoutModel | DagLayoutModel;

/** Grid layout arranges its elements in a container, with elements potentially spanning multiple
 *  rows and/or columns. */
export type GridLayoutModel = {
    type: 'GridLayout',
    contents: {|
        elements: {
            viewId: ViewId,
            col: number,
            row: number,
            width: number,
            height: number,
        }[],
    |},
    meta: ViewMeta,
};

/** Flow layout arranges its element one after another, like in a word-document. */
export type FlowLayoutModel = {
    type: 'FlowLayout',
    contents: {|
        elements: ViewId[],
    |},
    meta: ViewMeta,
};

/** Switch layout allows switching between each of its elements. */
export type SwitchLayoutModel = {
    type: 'SwitchLayout',
    contents: {|
        elements: ViewId[],
    |},
    meta: ViewMeta,
};

/** Dag layout arranges its elements in a directed acyclic graph. */
export type DagNodeId = string;
export type DagNodeModel = {
    viewId: ViewId,
    children: DagNodeId[],
    flowDirection?: 'north' | 'south' | 'east' | 'west',
    alignChildren?: boolean,
    ports?: {
        [string]: {
            side?: 'north' | 'south' | 'east' | 'west',
            order?: number,
        },
    },
    isExpanded?: boolean,  // Node container (group) is expanded or collapsed.
    isInteractive?: boolean,  // TODO: Is this needed?
    isVisible?: boolean,  // Node container (group) boundaries is visible.
};
export type DagEdgeId = string;
export type DagEdgeModel = {
    startId: DagNodeId,
    endId: DagNodeId,
    startPort?: string,
    endPort?: string,
};
export type DagLayoutModel = {
    type: 'DagLayout',
    contents: {|
        nodes: {
            [DagNodeId]: DagNodeModel,
        },
        edges: {
            [DagEdgeId]: DagEdgeModel,
        },
        alignments?: Array<Array<DagNodeId>>,
        flowDirection?: 'north' | 'south' | 'east' | 'west',
        alignChildren?: boolean,
    |},
    meta: ViewMeta,
};
