import createMuiTheme from '@material-ui/core/styles/createMuiTheme';

/** CSS-in-JS custom theme object to set visual properties (fonts, colors, spacing, etc.) of Material UI components.
 *  For in-depth description, go to: https://material-ui-next.com/customization/themes/.
 *  For list of all default keys, go to: https://material-ui-next.com/customization/default-theme/*/
export default createMuiTheme({
    typography: {
        fontSize: {
            primary: 11,
            secondary: 10,
        },
        monospace: {
            fontFamily: '"Roboto Mono", "Courier", monospace',
        },
    },
    shape: {
        border: {
            style: 'solid',
            width: 1,
            radius: 4,
        },
    },
    palette: {
        primary: {
            // TODO: fix these colors
            light: "#7986cb",
            main: "#3f51b5",
            dark: "#303f9f",
            contrastText: "#fff",
        },
        secondary: {
            light: "#7986cb",
            main: "#3f51b5",
            dark: "#303f9f",
            contrastText: "#fff",
        },
        emphasis: {
            light: "#7986cb",
            main: "#3f51b5",
            dark: "#303f9f",
            contrastText: "#fff",
        },
        error: {
            light: "#7986cb",
            main: "#3f51b5",
            dark: "#303f9f",
            contrastText: "#fff",
        },
        text: {
            primary: 'rgba(255, 255, 255, 0.87)',
            secondary: 'rgba(255, 255, 255, 0.54)',
            disabled: 'rgba(255, 255, 255, 0.38)',
            hint: 'rgba(255, 255, 255, 0.38)',
        },
        background: {
            'default': '#fafafa'
        },
    },
    spacing: {
        tight: 0,
        unit: 4,
        separate: 10,
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
