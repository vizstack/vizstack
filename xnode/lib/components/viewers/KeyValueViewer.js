'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import KeyValueViz from '../viz/KeyValueViz';


/**
 * This dumb component renders a viewer for a Python key-value variable (dict, class, module, object). It converts
 * between the Canvas data structures to the explicit data model expected by `KeyValueViz`.
 */
class KeyValueViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** The `data` sub-object as defined in `SYMBOL-TABLE-SCHEMA.md` for "list/tuple/set". */
        data: PropTypes.object,

        /** Reference to the application symbol table. */
        symbolTable: PropTypes.object.isRequired,

        /**
         * Generates a sub-viewer for a particular element of the list.
         *
         * @param symbolId
         *     Symbol ID of the element for which to create a new viewer.
         */
        expandSubviewer: PropTypes.func.isRequired,
    };

    /** Constructor. */
    constructor(props) {
        super(props);
        this.state = {
            hoveredIdx: null,
            selectedIdx: null,
        };
    }

    /**
     * Renders a SequenceViz after making the appropriate data transformations.
     * TODO: Use selectors for transformation.
     * TODO: Rather than recreating separate list elements viz, refactor so that list displays the compact form of
     *     real viewers. (This also allows factoring out the "dispatch on element type" logic.)
     */
    render() {
        const { symbolTable, expandSubviewer, data } = this.props;
        if (!data) return null;  // Empty component if no data yet
        const { hoveredIdx, selectedIdx } = this.state;

        const { contents } = data;
        const model = contents.map((elem, idx) => {
            return {
                text: symbolTable[elem].str,
                isHovered: idx === hoveredIdx,
                isSelected: idx === selectedIdx,
                onClick: () => this.setState({selectedIdx: idx}),
                onDoubleClick: () => expandSubviewer(elem),
                onMouseEnter: () => this.setState({hoveredIdx: idx}),
                onMouseLeave: () => this.setState({hoveredIdx: null}),
            };
        });

        return (
            <KeyValueViz model={model}
                         startMotif="["
                         endMotif="]"
                         itemMaxWidth={75} />
        );
    }
}

export default KeyValueViewer;
