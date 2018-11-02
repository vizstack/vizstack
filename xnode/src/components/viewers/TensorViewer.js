import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import MatrixViz from '../viz/MatrixViz';
import { fixedWidthNumber } from '../../services/format-utils';

/**
 * This dumb component renders a viewer for a tensor variable. It converts between the Canvas data structures
 * to the explicit data model expected by `MatrixViz`.
 * TODO: Handle different precision data for contents.
 */
class TensorViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** The `data` sub-object as defined in `SYMBOL-TABLE-SCHEMA.md` for "tensor". */
        data: PropTypes.shape({
            contents: PropTypes.array,
            size:     PropTypes.arrayOf(PropTypes.number),
            type:     PropTypes.oneOf(['float16', 'float32', 'float64', 'uint8', 'int8', 'int16', 'int32', 'int64']),
        }),
    };

    /** Constructor. */
    constructor(props) {
        super(props);
        this.state = {
            hoveredIdx: null,
            selectedIdx: null,
        };
    }

    buildVal(val, idxs) {
        const { hoveredIdx, selectedIdx } = this.state;
        const idx = `${idxs.join(',')}`;
        return {
            text: fixedWidthNumber(val),
            isHovered: idx === hoveredIdx,
            isSelected: idx === selectedIdx,
            onClick: () => this.setState({selectedIdx: idx}),
            onMouseEnter: () => this.setState({hoveredIdx: idx}),
            onMouseLeave: () => this.setState({hoveredIdx: null}),
        };
    }

    buildSlices(contents, dim, idxs = []) {

        // Base cases
        if (dim === 2) {  // 2D matrix
            const model = contents.map((arr, r) => arr.map((val, c) => this.buildVal(val, [...idxs, r, c])));
            return (
                <div key={idxs.join(',')}>
                    {idxs.length > 0 ? <div>{`[${idxs.join(', ')}, :, :] =`}</div> : null}
                    <MatrixViz model={model} />
                </div>
            );
        } else if (dim === 1) {  // 1D array (only possible from top-level call)
            const model = contents.map((val, i) => [this.buildVal(val, [i])]);
            return (
                <MatrixViz model={model}
                           showHorizontalIndices={false} />
            );
        }

        return contents.map((arr, i) => this.buildSlices(arr, dim-1, [...idxs, i]));
    }

    /**
     * Renders a MatrixViz after making the appropriate data transformations.
     */
    render() {
        const { data } = this.props;
        if (!data) return null;  // Empty component if no data yet
        const { contents, size, type } = data;

        return (
            <div>
                <p>{`${type}[${size.join(', ')}]`}</p>
                {this.buildSlices(contents, size.length)}
            </div>
        );
    }
}

export default TensorViewer;
