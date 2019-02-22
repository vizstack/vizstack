import createMuiTheme from '@material-ui/core/styles/createMuiTheme';
import PrimaryColor from '@material-ui/core/colors/indigo';
import SecondaryColor from '@material-ui/core/colors/pink';
import ErrorColor from '@material-ui/core/colors/red';

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
        sansSerif: {
            fontFamily: '"Roboto", "Helvetica Neue", sans-serif',
        },
    },
    shape: {
        border: {
            style: 'solid',
            width: 1,
            radius: 2,
        },
        image: {
            small: {
                width: 75,
            }
        }
    },
    palette: {
        primary: PrimaryColor,
        secondary: SecondaryColor,
        error: ErrorColor,
        text: {
            primary: 'rgba(255, 255, 255, 0.87)',
            secondary: 'rgba(255, 255, 255, 0.54)',
            disabled: 'rgba(255, 255, 255, 0.38)',
            hint: 'rgba(255, 255, 255, 0.38)',
        },
    },
    spacing: {
        smallest: 1,
        small: 2,
        unit: 4,
        large: 8,
        largest: 16,
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
