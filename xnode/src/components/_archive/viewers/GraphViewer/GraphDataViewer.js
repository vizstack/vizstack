import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';

import SequenceViz from '../../../layouts/SequenceLayout';

import Typography from '@material-ui/core/Typography';


/**
 * This dumb component renders a viewer for a `graphdata` object, showing its surfaced key-value pairs as a sequence.
 */
class GraphDataViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        /** The `data` sub-object as defined in `SYMBOL-TABLE-SCHEMA.md` for "graphdata". */
        data: PropTypes.object,

        /** Reference to the application symbol table. */
        symbolTable: PropTypes.object.isRequired,

        /**
         * Generates a sub-viewer for a particular item in the graphdata's surfaced properties.
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
     * Renders a `SequenceLayout` after making the appropriate data transformations.
     * TODO: Use selectors for transformation.
     */
    render() {
        const { classes, vizTable, expandSubviewer, data } = this.props;
        if (!data) return null;  // Empty component if no data yet
        const { hoveredIdx, selectedIdx } = this.state;

        const { kvpairs } = data;
        const model = Object.entries(kvpairs).map(([key, value], idx) => {
            return {
                text: key,
                isHovered: hoveredIdx === idx,
                isSelected: selectedIdx === idx,
                onClick: () => this.setState({selectedIdx: idx}),
                onDoubleClick: () => expandSubviewer(value),
                onMouseEnter: () => this.setState({hoveredIdx: idx}),
                onMouseLeave: () => this.setState({hoveredIdx: null}),
            }
        });

        return (
            <div className={classes.container}>
                <Typography className={classes.header}>Output properties: </Typography>
                <SequenceViz model={model}
                             showIndices={false}
                             startMotif={"["}
                             endMotif={"]"}
                             itemMaxWidth={75}/>
            </div>);
    }
}

/** CSS-in-JS styling function. */
const styles = theme => ({
    container: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    header: {
        color: '#ffffff',
        marginRight: 10,  // TODO: un-hardcode this
    }
});

export default withStyles(styles)(GraphDataViewer);
