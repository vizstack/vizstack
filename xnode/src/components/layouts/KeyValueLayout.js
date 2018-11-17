import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import TokenViz from '../primitives/TokenPrimitive';

/**
 * This dumb component renders visualization for a sequence of arbitrary key-value pairs.
 */
class KeyValueLayout extends React.Component<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** Data model rendered by this viz (an array of length-2 arrays representing key value pairs). Uses an array
     *  instead of an object so that non-string keys can be used, and to maintain the order of key-value pairs
     *  between renderings. */
    elements: Array<{}>,

    /** Characters to place at start/end of the key-value sequence as decoration, e.g. "{" and "}" for dicts. */
    startMotif?: string,
    endMotif?: string,

    /** Individual key and value item dimension constraints (in px or '%'). */
    keyMinWidth?: number | string,
    keyMaxWidth?: number | string,
    valueMinWidth?: number | string,
    valueMaxWidth?: number | string,
    itemHeight?: number | string,
}> {
    /** Prop default values. */
    static defaultProps = {
        startMotif: '',
        endMotif: '',
    };

    /**
     * Renders a sequence of TokenPrimitive pairs. The sequence can have start/end motifs, which are large characters that can
     * be used to indicate a type of sequence (e.g. "{" for sets).
     */
    render() {
        const {
            classes,
            elements,
            startMotif,
            endMotif,
            keyMinWidth,
            keyMaxWidth,
            valueMinWidth,
            valueMaxWidth,
            itemHeight,
        } = this.props;

        const kvPairs = elements.map(([key, value], idx) => {
            let keyComponent;
            {
                const {
                    text,
                    isHovered,
                    isSelected,
                    onClick,
                    onDoubleClick,
                    onMouseEnter,
                    onMouseLeave,
                } = key;
                keyComponent = (
                    <TokenViz
                        model={text}
                        minWidth={keyMinWidth}
                        maxWidth={keyMaxWidth}
                        minHeight={itemHeight}
                        maxHeight={itemHeight}
                        shouldTextWrap={false}
                        shouldTextEllipsis={true}
                        isHovered={isHovered}
                        isSelected={isSelected}
                        onClick={onClick}
                        onDoubleClick={onDoubleClick}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    />
                );
            }

            let valueComponent;
            {
                const {
                    text,
                    isHovered,
                    isSelected,
                    onClick,
                    onDoubleClick,
                    onMouseEnter,
                    onMouseLeave,
                } = value;
                valueComponent = (
                    <TokenViz
                        model={text}
                        minWidth={valueMinWidth}
                        maxWidth={valueMaxWidth}
                        minHeight={itemHeight}
                        maxHeight={itemHeight}
                        shouldTextWrap={false}
                        shouldTextEllipsis={true}
                        isHovered={isHovered}
                        isSelected={isSelected}
                        onClick={onClick}
                        onDoubleClick={onDoubleClick}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    />
                );
            }

            return (
                <div key={idx} className={classes.keyValuePair}>
                    <span className={classes.keyValueItem}>{keyComponent}</span>
                    <span>:</span>
                    <span className={classes.keyValueItem}>{valueComponent}</span>
                </div>
            );
        });

        const motifStyle = { height: itemHeight };

        return (
            <div className={classes.keyValuePairList}>
                <div className={classes.motifText} style={motifStyle} key='startMotif'>
                    {startMotif}
                </div>
                {kvPairs}
                <div className={classes.motifText} style={motifStyle} key='endMotif'>
                    {endMotif}
                </div>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    keyValuePairList: {},
    keyValuePair: {
        marginTop: 2, // TODO: Dehardcode this
        marginBottom: 2, // TODO: Dehardcode this

        // Layout child components horizontally
        display: 'flex',
        flexDirection: 'row',

        color: '#fff',
        fontFamily: theme.typography.monospace.fontFamily,
        fontSize: '14pt', // TODO: de-hardcode this
    },
    keyValueItem: {
        marginLeft: 2, // TODO: Dehardcode this
        marginRight: 2, // TODO: Dehardcode this
    },
    motifText: {
        fontFamily: theme.typography.monospace.fontFamily,
        fontSize: '14pt', // TODO: Dehardcode this

        // Vertically center text
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',

        // No text selection
        userSelect: 'none',
        cursor: 'default',
    },
    indexText: {
        textAlign: 'center',
        fontSize: '8pt', // TODO: Dehardcode this
        userSelect: 'none',
        cursor: 'default',
    },
});

export default withStyles(styles)(KeyValueLayout);
