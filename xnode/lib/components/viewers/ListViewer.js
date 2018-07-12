'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import ArrayViz from '../viz/ArrayViz';
import { isSymbolId } from '../../services/symbol-utils';


/**
 * This dumb component renders a viewer for a Python sequence variable (list, tuple, set). It converts between the
 * Canvas data structures to the explicit data model expected by `ArrayViz`.
 */
class ListViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** The `data` sub-object as defined in `SYMBOL-TABLE-SCHEMA.md`. */
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

    /**
     * Renders a ArrayViz after making the appropriate data transformations.
     * TODO: Use selectors for transformation.
     */
    render() {
        const { symbolTable, expandSubviewer, data } = this.props;

        if(!data) return null;  // Empty component if no data yet

        const { contents } = data;
        const model = contents.map((elem) => {
            let text = '';
            let ref = null;

            if (elem === null) {  // none
                text = 'None';
            } else if (typeof elem === 'number') {  // number
                text = `${elem}`;
            } else if (typeof elem === 'boolean') {  // boolean
                text = elem ? 'True' : 'False';
            } else if (isSymbolId(elem)) {  // symbolId reference
                ref = elem;
                text = symbolTable[elem].str;
            } else {  // string
                text = `"${elem}"`;
            }

            return { text, ref };
        });

        return (
            <ArrayViz model={model} onDoubleClick={expandSubviewer} startMotif="[" endMotif="]"/>
        );
    }
}

export default ListViewer;
