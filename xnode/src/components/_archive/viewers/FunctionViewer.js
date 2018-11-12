import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';

import SequenceViz from '../../layouts/SequenceLayout';
import KeyValueViz from '../viz/KeyValueViz';

import Typography from '@material-ui/core/Typography';


/**
 * This dumb component renders a viewer for a function, showing its arguments and other properties.
 */
class FunctionViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        /** The `data` sub-object as defined in `SYMBOL-TABLE-SCHEMA.md` for "function". */
        data: PropTypes.object,

        /** Reference to the application symbol table. */
        symbolTable: PropTypes.object.isRequired,

        /**
         * Generates a sub-viewer for a particular symbol in the function's arguments list.
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
     * Renders a `SequenceLayout` and `KeyValueViz` after making the appropriate data transformations.
     * TODO: Use selectors for transformation.
     */
    render() {
        const { classes, vizTable, expandSubviewer, data } = this.props;
        if (!data) return null;  // Empty component if no data yet
        const { hoveredIdx, selectedIdx } = this.state;

        // TODO: figure out how to use filename and lineno
        const { args, kwargs} = data;
        const argsModel = args.map((argName) => {
           return {
               text: argName,
               isHovered: false,
               isSelected: false,
           }
        });
        const kwargsModel = Object.entries(kwargs).map(([argName, defaultValue], idx) => {
            return [
                {
                    text: argName,
                    isHovered: false,
                    isSelected: false,
                },
                {
                    text: symbolTable[defaultValue].str,
                    isHovered: hoveredIdx === idx,
                    isSelected: selectedIdx === idx,
                    onClick: () => this.setState({selectedIdx: idx}),
                    onDoubleClick: () => expandSubviewer(defaultValue),
                    onMouseEnter: () => this.setState({hoveredIdx: idx}),
                    onMouseLeave: () => this.setState({hoveredIdx: null}),
                }
            ]
        });

        return (
            <div className={classes.container}>
                <div className={classes.viz}>
                    <Typography className={classes.vizHeader}>Positional Arguments</Typography>
                    <SequenceViz model={argsModel}
                                 showIndices={true}
                                 startMotif={"["}
                                 endMotif={"]"}
                                 itemMaxWidth={75}/>
                </div>
                <div className={classes.viz}>
                    <Typography className={classes.vizHeader}>Keyword Arguments</Typography>
                    <KeyValueViz model={kwargsModel}
                                 startMotif={"{"}
                                 endMotif={"}"}
                                 keyMaxWidth={75}
                                 keyMinWidth={75}
                                 valueMaxWidth={75}
                                 valueMinWidth={75}/>
                </div>
            </div>);
    }
}

/** CSS-in-JS styling function. */
const styles = theme => ({
    container: {
        display: 'block',
    },
    viz: {
        width: '100%',
    },
    vizHeader: {
        color: '#ffffff',
        marginRight: 10,  // TODO: un-hardcode this
    }
});

export default withStyles(styles)(FunctionViewer);
