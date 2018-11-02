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
     * Builds the data model for a key or value in the KeyValueViz.
     * @param {*} elem
     *      The string value of the key or value, either a symbol ID or a primitive value.
     * @param {string} idx
     *      The index of the element.
     * @returns {object}
     *      The data model for the key or value.
     */
    buildTokenModel(elem, idx) {
        const { vizTable, expandSubviewer } = this.props;
        const { hoveredIdx, selectedIdx } = this.state;
        if (elem in symbolTable) {
            return {
                text: symbolTable[elem].str,
                isHovered: idx === hoveredIdx,
                isSelected: idx === selectedIdx,
                onClick: () => this.setState({selectedIdx: idx}),
                onDoubleClick: () => expandSubviewer(elem),
                onMouseEnter: () => this.setState({hoveredIdx: idx}),
                onMouseLeave: () => this.setState({hoveredIdx: null}),
            }
        }
        else {
            return {
                text: elem,
                isHovered: false,
                isSelected: false,
            }
        }
    }

    /**
     * Renders a KeyValueViz after making the appropriate data transformations.
     * TODO: Use selectors for transformation.
     * TODO: Rather than recreating separate list elements viz, refactor so that list displays the compact form of
     *     real viewers. (This also allows factoring out the "dispatch on element type" logic.)
     */
    render() {
        const { data } = this.props;
        if (!data) return null;  // Empty component if no data yet

        const { contents } = data;
        const model = Object.entries(contents).map(([k, v], idx) => {
            return [this.buildTokenModel(k, `k${idx}`), this.buildTokenModel(v, `v${idx}`)];
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
