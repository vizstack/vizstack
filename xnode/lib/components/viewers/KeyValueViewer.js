'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import KeyValueViz from '../viz/KeyValueViz';
import { isAnySymbolId } from '../../services/symbol-utils';


/**
 * This dumb component renders a viewer for a Python key-value variable (dict, class, module, object). It converts
 * between the Canvas data structures to the explicit data model expected by `KeyValueViz`.
 */
class KeyValueViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** The `data` sub-object as defined in `SYMBOL-TABLE-SCHEMA.md` for "dict/class/module/object". */
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
        const model = Object.entries(contents).map(([k, v], idx) => {
            return [{
                text: isAnySymbolId(k) ? symbolTable[k].str : k,
                isHovered: `k${idx}` === hoveredIdx,
                isSelected: `k${idx}` === selectedIdx,
                onClick: () => this.setState({selectedIdx: `k${idx}`}),
                onDoubleClick: () => isAnySymbolId(k) ? expandSubviewer(k) : undefined,
                onMouseEnter: () => this.setState({hoveredIdx: `k${idx}`}),
                onMouseLeave: () => this.setState({hoveredIdx: null}),
            }, {
                text: symbolTable[v].str,
                isHovered: `v${idx}` === hoveredIdx,
                isSelected: `v${idx}` === selectedIdx,
                onClick: () => this.setState({selectedIdx: `v${idx}`}),
                onDoubleClick: () => expandSubviewer(v),
                onMouseEnter: () => this.setState({hoveredIdx: `v${idx}`}),
                onMouseLeave: () => this.setState({hoveredIdx: null}),
            }]
        });

        return (
            <KeyValueViz model={model}
                        startMotif="{"
                        endMotif="}"
                        keyMaxWidth={75}
                        keyMinWidth={75}
                        valueMaxWidth={75}
                        valueMinWidth={75} />
        );
    }
}

export default KeyValueViewer;
