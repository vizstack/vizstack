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

export type ViewType = "DagLayout" | "GridLayout" | "FlowLayout" | "TextPrimitive" | "ImagePrimitive" | "SwitchLayout"

export type ViewMeta = {
    [string]: any,
}

export type ViewContents = PrimitiveContents | LayoutContents;

// =================================================================================================
// Primitives (aka "visual building blocks").

/** Any primitive model. */
export type PrimitiveModel = TextPrimitiveModel | ImagePrimitiveModel;

export type PrimitiveContents = TextPrimitiveContents | ImagePrimitiveContents;

/** Text primitive is a block of plain text (colored text on transparent background) or code
 *  text (text in colored block). */
export type TextPrimitiveContents = {
    text: string,
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',
    variant?: 'plain' | 'token',
};

export type TextPrimitiveModel = {
    type: 'TextPrimitive',
    contents: TextPrimitiveContents,
    meta: ViewMeta,
};
// TODO: Break into PlainTextPrimitive vs CodeTextPrimitive?

/** Image primitive is an web-compatible image. */
export type ImagePrimitiveContents = {
    filePath: string,
};

export type ImagePrimitiveModel = {
    type: 'ImagePrimitive',
    contents: ImagePrimitiveContents,
    meta: ViewMeta,
};
// TODO: Is this best? What about URL? Constructed plot/matrix?

// =================================================================================================
// Layouts (aka "configurations of building blocks").

/** Any layout model. */
export type LayoutModel = GridLayoutModel | DagLayoutModel | FlowLayoutModel | SwitchLayoutModel;

export type LayoutContents = GridLayoutContents | DagLayoutContents | FlowLayoutContents | SwitchLayoutContents;

/** Grid layout arranges its elements in a grid, with elements potentially spanning multiple
 *  rows and/or columns. */
export type GridLayoutContents = {
    elements: {
        viewId: ViewId,
        col: number,
        row: number,
        width: number,
        height: number,
    }[],
};

export type GridLayoutModel = {
    type: 'GridLayout',
    contents: GridLayoutContents,
    meta: ViewMeta,
};

/** Flow layout arranges its element one after another, like in a word-document. */
export type FlowLayoutContents = {
    elements: ViewId[],
}

export type FlowLayoutModel = {
    type: 'FlowLayout',
    contents: FlowLayoutContents,
    meta: ViewMeta,
};

/** Switch layout allows switching between each of its elements. */
export type SwitchLayoutContents = {
    elements: ViewId[],
};

export type SwitchLayoutModel = {
    type: 'SwitchLayout',
    contents: SwitchLayoutContents,
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

export type DagLayoutContents = {
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
}

export type DagLayoutModel = {
    type: 'DagLayout',
    contents: DagLayoutContents,
    meta: ViewMeta,
};
