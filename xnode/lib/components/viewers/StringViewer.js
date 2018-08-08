'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import SequenceViz from '../viz/SequenceViz';


/**
 * This dumb component renders a viewer for a Python string (list, tuple, set). It converts the string into a
 * character sequence in the format of the explicit data model expected by `SequenceViz`.
 * TODO: Make robust to weird characters (e.g. newlines, non-renderable, Unicode, emoji, etc)
 */
class StringViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** The `data` sub-object as defined in `SYMBOL-TABLE-SCHEMA.md` for "string". */
        data: PropTypes.object,
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
     */
    render() {
        const { data } = this.props;
        if(!data) return null;  // Empty component if no data yet
        const { hoveredIdx, selectedIdx } = this.state;
        const { contents } = data;
        const model = contents.split("").map((char, idx) => ({
            text: char,
            isHovered: idx === hoveredIdx,
            isSelected: idx === selectedIdx,
            onClick: () => this.setState({selectedIdx: idx}),
            onMouseEnter: () => this.setState({hoveredIdx: idx}),
            onMouseLeave: () => this.setState({hoveredIdx: null}),
        }));

        return (
            <SequenceViz model={model}
                         startMotif='"'
                         endMotif='"'
                         itemMinWidth={20}
                         itemMaxWidth={20} />
        );
    }
}

export default StringViewer;