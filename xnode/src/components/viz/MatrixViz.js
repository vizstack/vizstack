import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import TokenViz from './TokenViz';

/**
 * This dumb component renders visualization for a 2D matrix of elements.
 * TODO: Allow element-type-specific background coloring.
 */
class SequenceViz extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        /** Data model rendered by this viz: 2D array of elements. */
        model: PropTypes.arrayOf(
            PropTypes.arrayOf(
                PropTypes.shape({
                    text:           PropTypes.string.isRequired,
                    isHovered:      PropTypes.bool,
                    isSelected:     PropTypes.bool,
                    onClick:        PropTypes.func,
                    onDoubleClick:  PropTypes.func,
                    onMouseEnter:   PropTypes.func,
                    onMouseLeave:   PropTypes.func,
                })
            )
        ),

        /** Whether to display element index labels. */
        showHorizontalIndices: PropTypes.bool,
        showVerticalIndices:   PropTypes.bool,

        /** Individual list item dimension constraints (in px or '%'). */
        itemMinWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        itemMaxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        itemHeight:   PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    };

    /** Prop default values object. */
    static defaultProps = {
        showHorizontalIndices: true,
        showVerticalIndices: true,
    };

    /**
     * Renders a matrix of TokenViz elements, optionally with the left/bottom edges numbered with indices.
     */
    render() {
        const { classes, model, showHorizontalIndices, showVerticalIndices,
            itemMinWidth, itemMaxWidth, itemHeight } = this.props;

        const items = model.map((arr) => arr.map((elem) => {
            const { text, isHovered, isSelected, onClick, onDoubleClick, onMouseEnter, onMouseLeave } = elem;
            return (
                <TokenViz model={text}
                          minWidth={itemMinWidth}
                          maxWidth={itemMaxWidth}
                          minHeight={itemHeight}
                          maxHeight={itemHeight}
                          shouldTextWrap={false}
                          shouldTextEllipsis={true}
                          isHovered={isHovered}
                          isSelected={isSelected}
                          onClick={onClick}
                          onDoubleClick={onDoubleClick}
                          onMouseEnter={onMouseEnter}
                          onMouseLeave={onMouseLeave}/>
            );
        }));

        const vidxs = items.map((_, idx) => {
            return showVerticalIndices ? <span className={classes.indexText}>{idx}</span> : null;
        });

        const hidxs = items[0].map((_, idx) => {
            return showHorizontalIndices ? <span className={classes.indexText}>{idx}</span> : null;
        });

        return (
            <table className={classes.grid}>
                <tbody>
                    {items.map((arr, i) => (
                        <tr key={i}>
                            <td>{vidxs[i]}</td>
                            {arr.map((item, i) => <td key={i}>{item}</td>)}
                        </tr>
                    ))}
                    <tr>
                        <td>{/* vertical idx */}</td>
                        {hidxs.map((idx, i) => <td key={i}>{idx}</td>)}
                    </tr>
                </tbody>
            </table>
        );
    }
}


// To inject styles into component
// -------------------------------


/** CSS-in-JS styling function. */
const styles = theme => ({
    grid: {
        "& td": {
            paddingLeft:     2,  // TODO: Dehardcode this
            paddingRight:    2,  // TODO: Dehardcode this
            paddingTop:     2,  // TODO: Dehardcode this
            paddingBottom:    2,  // TODO: Dehardcode this
            textAlign:      'center',
            verticalAlign:  'middle',
        }
    },
    indexText: {
        textAlign:      'center',
        fontSize:       '8pt',  // TODO: Dehardcode this
        userSelect:     'none',
        cursor:         'default',
    }
});

export default withStyles(styles)(SequenceViz);
