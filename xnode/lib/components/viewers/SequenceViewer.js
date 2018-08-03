'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import SequenceViz from '../viz/SequenceViz';
import { isAnySymbolId } from '../../services/symbol-utils';


/**
 * This dumb component renders a viewer for a Python sequence variable (list, tuple, set). It converts between the
 * Canvas data structures to the explicit data model expected by `SequenceViz`.
 */
class SequenceViewer extends Component {

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

    /**
     * Renders a SequenceViz after making the appropriate data transformations.
     * TODO: Use selectors for transformation.
     * TODO: Rather than recreating separate list elements viz, refactor so that list displays the compact form of
     *     real viewers. (This also allows factoring out the "dispatch on element type" logic.)
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
            } else if (isAnySymbolId(elem)) {  // symbolId reference
                ref = elem;
                text = symbolTable[elem].str;
            } else {  // string
                text = `"${elem}"`;
            }

            return { text, ref };
        });

        const inspectElement = (ref) => {
            if(isAnySymbolId(ref)) {
                console.log("has ref", ref);
            } else {
                console.log("no ref", ref);
                expandSubviewer(ref);
            }
        }

        return (
            <SequenceViz model={model} onDoubleClick={inspectElement} startMotif="[" endMotif="]" itemMaxWidth={75} />
        );
    }
}

export default SequenceViewer;
