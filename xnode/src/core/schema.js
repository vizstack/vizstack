// @flow

/** Normalized data structure produced by assembler, rehydrated from JSON. */
export type ViewSpec = {
    rootId: ViewId,
    models: {
        [ViewId]: ViewModel,
    },
};

/** Unique identifier of a view from a snapshot in time. */
export type ViewId = string;

/** Schema model for a single view. */
export type ViewModel = PrimitiveModel | LayoutModel;

// =================================================================================================
// Primitives (aka "visual building blocks").

/** Any primitive model. */
export type PrimitiveModel = TextPrimitiveModel | ImagePrimitiveModel;

/** Text primitive is a block of plain text (colored text on transparent background) or code
 *  text (text in colored block). */
export type TextPrimitiveModel = {
    type: 'TextPrimitive',
    contents: {
        text: string,
        color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',
        variant?: 'plain' | 'token',
    },
};
// TODO: Break into PlainTextPrimitive vs CodeTextPrimitive?

/** Image primitive is an web-compatible image. */
export type ImagePrimitiveModel = {
    type: 'ImagePrimitive',
    contents: {
        filePath: string,
    },
};
// TODO: Is this best? What about URL? Constructed plot/matrix?

// =================================================================================================
// Layouts (aka "configurations of building blocks").

/** Any layout model. */
export type LayoutModel = GridLayoutModel | SwitchLayoutModel | FlowLayoutModel | DagLayoutModel;

/** Grid layout arranges its elements in a grid, with elements potentially spanning multiple
 *  rows and/or columns. */
export type GridLayoutModel = {
    type: 'GridLayout',
    contents: {
        elements: {
            viewId: ViewId,
            col: number,
            row: number,
            width: number,
            height: number,
        }[],
    },
};

/** Flow layout arranges its element one after another, like in a word-document. */
export type FlowLayoutModel = {
    type: 'FlowLayout',
    contents: {
        elements: ViewId[],
    },
};

/** Switch layout allows switching between each of its elements. */
export type SwitchLayoutModel = {
    type: 'SwitchLayout',
    contents: {
        elements: ViewId[],
    },
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
    isExpanded?: boolean,
    isInteractive?: boolean,
    isVisible?: boolean,
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
    contents: {
        nodes: {
            [DagNodeId]: DagNodeModel,
        },
        edges: {
            [DagEdgeId]: DagEdgeModel,
        },
        alignments?: Array<Array<DagNodeId>>,
        flowDirection?: 'north' | 'south' | 'east' | 'west',
        flowSpacing?: number,
        alignChildren?: boolean,
    },
};
