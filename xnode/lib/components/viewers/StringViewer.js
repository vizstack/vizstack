'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import ArrayViz from '../viz/ArrayViz';


/**
 * This dumb component renders a viewer for a Python string (list, tuple, set). It converts the string into a
 * character sequence in the format of the explicit data model expected by `ArrayViz`.
 */
class StringViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** The `data` sub-object as defined in `SYMBOL-TABLE-SCHEMA.md`. */
        data: PropTypes.object,
    };

    /**
     * Renders a ArrayViz after making the appropriate data transformations.
     */
    render() {
        const { data } = this.props;

        if(!data) return null;  // Empty component if no data yet

        const { contents } = data;
        const model = contents.split("").map((char) => ({ text: char, ref: null }));

        return (
            <ArrayViz model={model} startMotif='"' endMotif='"' itemWidth={20} />
        );
    }
}

export default StringViewer;