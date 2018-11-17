import createMuiTheme from '@material-ui/core/styles/createMuiTheme';

/** CSS-in-JS custom theme object to set visual properties (fonts, colors, spacing, etc.) of Material UI components.
 *  For in-depth description, go to: https://material-ui-next.com/customization/themes/.
 *  For list of all default keys, go to: https://material-ui-next.com/customization/default-theme/*/
export default createMuiTheme({
    typography: {
        htmlFontSize: 10,
        monospace: {
            fontFamily: '"Roboto Mono", "Courier", monospace',
        },
    },
    shape: {
        borderRadius: {
            regular: 4,
            small: 2,
        },
    },
    spacing: {
        unit: 5,
    },
    overrides: {
        MuiIconButton: {
            root: {
                height: 25,
                width: 25,
                color: 'inherit',
            },
        },
        MuiSvgIcon: {
            root: {
                fontSize: 18,
            },
        },
    },
});
