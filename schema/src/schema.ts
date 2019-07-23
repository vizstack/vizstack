/**
 * Vizstack allows you to declaratively assemble data-driven software visualizations.
 *
 * A rich, interactive "View" can be built by combining "Fragments", which are small, composable
 * visual elements that come in 2 categories:
 *
 *     (1) "Primitives" are irreducible elements, e.g. Text, Image, and Icon.
 *     (2) "Layouts" are configurations with slots for other "Fragments", e.g. Grid and Sequence.
 *
 * This file defines the schema for the representation of a "View" as a combination of "Fragments".
 * It is often produced with the aid of an "Assembler" and is ultimately used for rendering by a
 * "Viewer".
 */

/* Data structure representing a "View" as a combination of "Fragments". It is often produced with
 * the aid of an "Assembler" and is ultimately used for rendering by a "Viewer". */
export type View = {
    rootId: FragmentId;
    fragments: {
        [fragmentId: string]: Fragment; // fragmentId: FragmentId
    };
};

/* A small, composable visual element that can either be a "Primitive" or "Layout". */
export type Fragment = PrimitiveFragment | LayoutFragment;

/* Unique identifier of a particular `Fragment`.
 * TODO: Clarify the scope of uniqueness. Is it like React key? What is identity?
 * Github #123: Change ViewIds to use hash (top-down, position-based key). */
export type FragmentId = string & { readonly brand?: unique symbol };

/* Metadata of arbitrary values attached to a particular `Fragment`. */
export type FragmentMeta = Record<string, any>;

// =================================================================================================
// Primitives (i.e. irreducible elements).

/* A "Fragment" that is an irreducible element, e.g. Text, Image, and Icon. */
export type PrimitiveFragment = TextPrimitiveFragment | ImagePrimitiveFragment;

/* Text primitive is a block of plain text (colored text on transparent background) or code
 * text (text in colored block). */
export type TextPrimitiveFragment = {
    type: 'TextPrimitive';
    contents: {
        text: string;
        color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible';
        variant?: 'plain' | 'token';
    };
    meta: FragmentMeta;
};
// TODO: Break into PlainTextPrimitive vs CodeTextPrimitive?

/* Image primitive is an web-compatible image. */
export type ImagePrimitiveFragment = {
    type: 'ImagePrimitive';
    contents: {
        filePath: string;
    };
    meta: FragmentMeta;
};
// TODO: Is this best? What about URL? Constructed plot/matrix?

// =================================================================================================
// Layouts (i.e. configurations with slots).

/* A "Fragment" that is an configuration for other elements, e.g. Grid, Sequence, and KeyValue. */
export type LayoutFragment =
    | FlowLayoutFragment
    | SwitchLayoutFragment
    | GridLayoutFragment
    | SequenceLayoutFragment
    | KeyValueLayoutFragment
    | DagLayoutFragment;

/* Flow layout arranges its element one after another, like in a word-document. */
export type FlowLayoutFragment = {
    type: 'FlowLayout';
    contents: {
        elements: FragmentId[];
    };
    meta: FragmentMeta;
};

/* Switch layout allows switching between each of its elements. */
export type SwitchLayoutFragment = {
    type: 'SwitchLayout';
    contents: {
        modes: FragmentId[];
    };
    meta: FragmentMeta;
};

/* Grid layout arranges its elements in a container, with elements potentially spanning multiple
 * rows and/or columns. */
export type GridLayoutFragment = {
    type: 'GridLayout';
    contents: {
        cells: {
            fragmentId: FragmentId;
            col: number;
            row: number;
            width: number;
            height: number;
        }[];
    };
    meta: FragmentMeta;
};

/* Sequence layout arranges its elements in a straight line, like a list. */
export type SequenceLayoutFragment = {
    type: 'SequenceLayout';
    contents: {
        elements: FragmentId[];
        orientation?: 'horizontal' | 'vertical';
        startMotif?: string;
        endMotif?: string;
    };
    meta: FragmentMeta;
};

/* KeyValue layout shows an ordered sequence of key-value pairs. */
export type KeyValueLayoutFragment = {
    type: 'KeyValueLayout';
    contents: {
        entries: { key: FragmentId; value: FragmentId }[];
        separator?: string;
        startMotif?: string;
        endMotif?: string;
    };
    meta: FragmentMeta;
};

/* Dag layout arranges its elements in a directed acyclic graph. */
export type DagNodeId = string & { readonly brand?: unique symbol };
export type DagNode = {
    fragmentId: FragmentId;
    children: DagNodeId[];
    flowDirection?: 'north' | 'south' | 'east' | 'west';
    alignChildren?: boolean;
    ports?: {
        [name: string]: {
            side?: 'north' | 'south' | 'east' | 'west';
            order?: number;
        };
    };
    isExpanded?: boolean; // Node container (group) is expanded or collapsed.
    isInteractive?: boolean; // TODO: Is this needed?
    isVisible?: boolean; // Node container (group) boundaries is visible.
};
export type DagEdgeId = string & { readonly brand?: unique symbol };
export type DagEdge = {
    startId: DagNodeId;
    endId: DagNodeId;
    startPort?: string;
    endPort?: string;
};
export type DagLayoutFragment = {
    type: 'DagLayout';
    contents: {
        nodes: {
            [nodeId: string]: DagNode; // nodeId: DagNodeId
        };
        edges: {
            [edgeId: string]: DagEdge; // edgeId: DagEdgeId
        };
        alignments?: Array<Array<DagNodeId>>;
        flowDirection?: 'north' | 'south' | 'east' | 'west';
        alignChildren?: boolean;
    };
    meta: FragmentMeta;
};
