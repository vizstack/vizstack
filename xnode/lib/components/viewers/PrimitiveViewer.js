'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import TokenViz from '../viz/TokenViz';


/**
 * This dumb component renders a viewer for a Python primitive (none, float, int, complex, bool). A string is the
 * explicit data model expected by `TokenViz`.
 */
class PrimitiveViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** The `str` field as defined in `SYMBOL-TABLE-SCHEMA.md`. */
        str: PropTypes.string.isRequired,
    };

    /**
     * Renders a TokenViz with the given string.
     */
    render() {
        const { str } = this.props;
        return (
            <TokenViz model={str} shouldTextWrap={true} />
        );
    }
}

export default PrimitiveViewer;