import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import TokenViz from '../../primitives/TokenPrimitive';

/**
 * This dumb component renders a viewer for a Python primitive (none, float, int, complex, bool). A string is the
 * explicit data model expected by `TokenPrimitive`.
 */
class PrimitiveViewer extends Component {
    /** Prop expected types object. */
    static propTypes = {
        /** The `str` field as defined in `SYMBOL-TABLE-SCHEMA.md`. */
        str: PropTypes.string.isRequired,
    };

    /** Constructor. */
    constructor(props) {
        super(props);
        this.state = {
            isHovered: false,
        };
    }

    /**
     * Renders a TokenPrimitive with the given string.
     */
    render() {
        const { str } = this.props;
        const { isHovered } = this.state;
        return (
            <TokenViz
                model={str}
                shouldTextWrap={true}
                isHovered={isHovered}
                onMouseEnter={() => this.setState({ isHovered: true })}
                onMouseLeave={() => this.setState({ isHovered: false })}
            />
        );
    }
}

export default PrimitiveViewer;
