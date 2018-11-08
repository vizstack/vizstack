import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';

import SequenceViz from '../layouts/SequenceLayout';
import KeyValueViz from '../viz/KeyValueViz';

import Typography from '@material-ui/core/Typography';


/**
 * This dumb component renders a viewer for a class, showing its static values and functions.
 */
class ClassViewer extends Component {

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
     * Builds the data model for a key or value in the KeyValueViz.
     * TODO: this is exactly the same as the one in KeyValueViewer
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
     * Renders a two `KeyValueViz` after making the appropriate data transformations.
     * TODO: Use selectors for transformation.
     */
    render() {
        const { classes, data } = this.props;
        if (!data) return null;  // Empty component if no data yet

        const { functions, staticfields, } = data;
        const functionsModel = Object.entries(functions).map(([fnName, fnSymbol], idx) => {
           return [this.buildTokenModel(fnName, `fn${idx}`), this.buildTokenModel(fnSymbol, `fs${idx}`)]
        });
        const fieldsModel = Object.entries(staticfields).map(([fieldName, fieldSymbol], idx) => {
            return [this.buildTokenModel(fieldName, `sn${idx}`), this.buildTokenModel(fieldSymbol, `ss${idx}`)]
        });

        return (
            <div className={classes.container}>
                <div className={classes.viz}>
                    <Typography className={classes.vizHeader}>Static Fields</Typography>
                    <KeyValueViz model={fieldsModel}
                                 startMotif="{"
                                 endMotif="}"
                                 keyMaxWidth={75}
                                 keyMinWidth={75}
                                 valueMaxWidth={75}
                                 valueMinWidth={75}/>
                </div>
                <div className={classes.viz}>
                    <Typography className={classes.vizHeader}>Functions</Typography>
                    <KeyValueViz model={functionsModel}
                                 startMotif="{"
                                 endMotif="}"
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

export default withStyles(styles)(ClassViewer);
