'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';

import SequenceViz from '../../viz/SequenceViz';
import KeyValueViz from '../../viz/KeyValueViz';
import TokenViz from '../../viz/TokenViz';

import Typography from '@material-ui/core/Typography';


/**
 * This dumb component renders a viewer for a Python sequence variable (list, tuple, set). It converts between the
 * Canvas data structures to the explicit data model expected by `SequenceViz`.
 */
class GraphOpViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

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

    /** Constructor. */
    constructor(props) {
        super(props);
        this.state = {
            hoveredIdx: null,
            selectedIdx: null,
        };
    }

    buildArgModel(argList, startIdx) {
        const { symbolTable, expandSubviewer } = this.props;
        const { hoveredIdx, selectedIdx } = this.state;

        const model = [];
        argList.forEach(([argName, arg], listIdx) => {
            let isArgArray = true;
            if (!Array.isArray(arg)) {
                arg = [arg];
                isArgArray = false;
            }
            arg.forEach((argSymbolId, argIdx) => {
                const idx = startIdx + listIdx + argIdx;
                model.push([
                    {
                        text: isArgArray ? `${argName}[${argIdx}]`: argName,
                        isHovered: false,
                        isSelected: false,
                    },
                    {
                        text: symbolTable[argSymbolId].str,
                        isHovered: idx === hoveredIdx,
                        isSelected: idx === selectedIdx,
                        onClick: () => this.setState({selectedIdx: idx}),
                        onDoubleClick: () => expandSubviewer(argSymbolId),
                        onMouseEnter: () => this.setState({hoveredIdx: idx}),
                        onMouseLeave: () => this.setState({hoveredIdx: null}),
                    },
                ]);
            });
        });
        return model;
    }

    /**
     * Renders a SequenceViz after making the appropriate data transformations.
     * TODO: Use selectors for transformation.
     * TODO: Rather than recreating separate list elements viz, refactor so that list displays the compact form of
     *     real viewers. (This also allows factoring out the "dispatch on element type" logic.)
     */
    render() {
        const { classes, symbolTable, expandSubviewer, data } = this.props;
        if (!data) return null;  // Empty component if no data yet
        const { hoveredIdx, selectedIdx } = this.state;

        const { args, kwargs, outputs, functionname } = data;
        // TODO: for iterable argument values, show just "argName": <SequenceViz />, instead of separating them
        // TODO: update `graphtracker` so that non-graphdata values can be sent over
        const argsModel = this.buildArgModel(args, 0);
        const kwargsModel = this.buildArgModel(kwargs, argsModel.length);
        const outputsModel = outputs.map((elem, outputIdx) => {
            const idx = outputIdx + argsModel.length + kwargsModel.length;
            return {
                text: symbolTable[elem].str,
                isHovered: idx === hoveredIdx,
                isSelected: idx === selectedIdx,
                onClick: () => this.setState({selectedIdx: idx}),
                onDoubleClick: () => expandSubviewer(elem),
                onMouseEnter: () => this.setState({hoveredIdx: idx}),
                onMouseLeave: () => this.setState({hoveredIdx: null}),
            };
        });
        const functionTokenIdx = argsModel.length + kwargsModel.length + outputsModel.length;

        return (
            <div className={classes.container}>
                <div className={classes.func}>
                    <Typography className={classes.vizHeader}>Function: </Typography>
                    <TokenViz model={functionname}
                              shouldTextWrap={false}
                              isHovered={functionTokenIdx === hoveredIdx}
                              isSelected={functionTokenIdx === selectedIdx}
                              onClick={() => this.setState({selectedIdx: functionTokenIdx})}
                              onDoubleClick={() => expandSubviewer(data['function'])}
                              onMouseEnter={() => this.setState({hoveredIdx: functionTokenIdx})}
                              onMouseLeave={() => this.setState({hoveredIdx: null})} />
                </div>
                <div className={classes.viz}>
                    <Typography className={classes.vizHeader}>Positional Arguments</Typography>
                    <KeyValueViz model={argsModel}
                                 startMotif={"["}
                                 endMotif={"]"}
                                 keyMaxWidth={75}
                                 keyMinWidth={75}
                                 valueMaxWidth={75}
                                 valueMinWidth={75} />
                </div>
                <div className={classes.viz}>
                    <Typography className={classes.vizHeader}>Keyword Arguments</Typography>
                    <KeyValueViz model={kwargsModel}
                                 startMotif={"{"}
                                 endMotif={"}"}
                                 keyMaxWidth={75}
                                 keyMinWidth={75}
                                 valueMaxWidth={75}
                                 valueMinWidth={75} />
                </div>
                <div className={classes.viz}>
                    <Typography className={classes.vizHeader}>Outputs</Typography>
                    <SequenceViz model={outputsModel}
                                 startMotif="["
                                 endMotif="]"
                                 itemMaxWidth={75} />
                </div>
            </div>
        );
    }
}

/** CSS-in-JS styling function. */
const styles = theme => ({
    container: {
        display: 'block',
    },
    func: {
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
    },
    viz: {
        width: '100%',
    },
    vizHeader: {
        color: '#ffffff',
        marginRight: 10,  // TODO: un-hardcode this
    }
});

// TODO: determine if viewers can have styling at all
export default withStyles(styles)(GraphOpViewer);
