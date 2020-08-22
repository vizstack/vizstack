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

/** Data structure representing a "View" as a combination of "Fragments". It is often produced with
 * the aid of an "Assembler" and is ultimately used for rendering by a "Viewer". */
export type View = {
    rootId: FragmentId;
    fragments: {
        [fragmentId: string]: Fragment; // fragmentId: FragmentId
    };
};

/** A small, composable visual element that can either be a "Primitive" or "Layout". */
export type Fragment = PrimitiveFragment | LayoutFragment;

/** Unique identifier of a particular `Fragment`.
 * TODO: Clarify the scope of uniqueness. Is it like React key? What is identity?
 * Github #123: Change ViewIds to use hash (top-down, position-based key). */
export type FragmentId = string & { readonly brand?: unique symbol };

/** Metadata of arbitrary values attached to a particular `Fragment`. */
export type FragmentMeta = Record<string, any>;

// =================================================================================================
// Primitives (i.e. irreducible elements).

/** A `Fragment` that is an irreducible element, e.g. Text, Token, Icon, and Image. */
export type PrimitiveFragment =
    | TextPrimitiveFragment
    | TokenPrimitiveFragment
    | IconPrimitiveFragment
    | ImagePrimitiveFragment;

/** `TextPrimitive` is a single line or multiple lines of plain text. */
export type TextPrimitiveFragment = {
    type: 'TextPrimitive';
    contents: {
        text: string;
        variant?: 'caption' | 'body' | 'subheading' | 'heading';
        emphasis?: 'normal' | 'less' | 'more';
    };
    meta: FragmentMeta;
};

/** `TokenPrimitive` is a text label within a colored box. */
export type TokenPrimitiveFragment = {
    type: 'TokenPrimitive';
    contents: {
        text: string;
        color?:
            | 'gray'
            | 'brown'
            | 'purple'
            | 'blue'
            | 'green'
            | 'yellow'
            | 'orange'
            | 'red'
            | 'pink';
    };
    meta: FragmentMeta;
};

/** `IconPrimitive` is an icon from the Material UI collection (listed at https://material.io/resources/icons/?style=outline). Icons should be referenced like "add_circle" and "arrow_forward", and suffixes are not allowed (no "outlined", "rounded", etc).  */
export type IconPrimitiveFragment = {
    type: 'IconPrimitive';
    contents: {
        name: string;
        emphasis?: 'normal' | 'less' | 'more';
    };
    meta: FragmentMeta;
};

/** `ImagePrimitive` is an web-compatible image. Can be specified with location: (1) a URL like `https://example.com/myimage.jpg` or (2) an absolute file path on the local device like `~/myimage.jpg`. Can be specified with bytes: (3) a base64 string. */
export type ImagePrimitiveFragment = {
    type: 'ImagePrimitive';
    contents: {
        image: string;
    };
    meta: FragmentMeta;
};
// TODO: Is this best? What about URL? Constructed plot/matrix?

// =================================================================================================
// Layouts (i.e. configurations with slots).

/** A `Fragment` that is an configuration for other `Fragment`s, e.g. Grid and Sequence. Each
 * `Layout` has "slots" in which other `Fragment`s (`Layout`s or `Primitive`s) can fit. */
export type LayoutFragment =
    | FlowLayoutFragment
    | SwitchLayoutFragment
    | GridLayoutFragment
    | SequenceLayoutFragment
    | KeyValueLayoutFragment
    | DagLayoutFragment;

/** `FlowLayout` arranges its elements one after another, as in a word document. */
export type FlowLayoutFragment = {
    type: 'FlowLayout';
    contents: {
        elements: FragmentId[];
    };
    meta: FragmentMeta;
};

/** `SwitchLayout` allows toggling through its elements one-by-one. */
export type SwitchLayoutFragment = {
    type: 'SwitchLayout';
    contents: {
        modes: FragmentId[];
        showLabels?: boolean;
    };
    meta: FragmentMeta;
};

/** `GridLayout` arranges its elements on a grid, with cells potentially spanning multiple
 * rows and columns. */
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
        rowHeight?: 'fit' | 'equal';
        colWidth?: 'fit' | 'equal';
        showLabels?: boolean;
    };
    meta: FragmentMeta;
};

/** `SequenceLayout` arranges its elements in a single row, like a list. */
export type SequenceLayoutFragment = {
    type: 'SequenceLayout';
    contents: {
        elements: FragmentId[];
        orientation?: 'horizontal' | 'vertical';
        startMotif?: string;
        endMotif?: string;
        showLabels?: boolean;
    };
    meta: FragmentMeta;
};

/** `KeyValueLayout` shows an ordered sequence of key-value pairs. */
export type KeyValueLayoutFragment = {
    type: 'KeyValueLayout';
    contents: {
        entries: { key: FragmentId; value: FragmentId }[];
        separator?: string;
        startMotif?: string;
        endMotif?: string;
        alignSeparators?: boolean;
        showLabels?: boolean;
    };
    meta: FragmentMeta;
};

/** `DagLayout` arranges its elements in a directed acyclic graph. */
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
            label?: string;
        };
    };
    isExpanded?: boolean; // Node container (group) is expanded or collapsed.
    isInteractive?: boolean; // TODO: Is this needed?
    isVisible?: boolean; // Node container (group) boundaries is visible.
};
export type DagEdgeId = string & { readonly brand?: unique symbol };
export type DagEdge = {
    source: { id: DagNodeId, port?: string, label?: string, isPersistent?: boolean };
    target: { id: DagNodeId, port?: string, label?: string, isPersistent?: boolean };
    label?: string;
};
export type DagNodeAlignment =
    | { axis: 'x', nodes: DagNodeId[], justify?: 'north' | 'south' | 'center' } 
    | { axis: 'y', nodes: DagNodeId[], justify?: 'east' | 'west' | 'center' };
export type DagLayoutFragment = {
    type: 'DagLayout';
    contents: {
        nodes: {
            [nodeId: string]: DagNode; // nodeId: DagNodeId
        };
        edges: {
            [edgeId: string]: DagEdge; // edgeId: DagEdgeId
        };
        alignments?: Array<DagNodeAlignment>;
        flowDirection?: 'north' | 'south' | 'east' | 'west';
        alignChildren?: boolean;
    };
    meta: FragmentMeta;
};
