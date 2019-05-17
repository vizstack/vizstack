import createMuiTheme from '@material-ui/core/styles/createMuiTheme';
import DefaultColor from '@material-ui/core/colors/blueGrey';
import PrimaryColor from '@material-ui/core/colors/indigo';
import SecondaryColor from '@material-ui/core/colors/pink';
import ErrorColor from '@material-ui/core/colors/red';

/** CSS-in-JS custom theme object to set visual properties (fonts, colors, spacing, etc.) of Material UI components.
 *  For in-depth description, go to: https://material-ui-next.com/customization/themes/.
 *  For list of all default keys, go to: https://material-ui-next.com/customization/default-theme/*/
export default createMuiTheme({
    typography: {
        fontSize: {
            emphasis: 15,
            primary: 11,
            secondary: 9,
            caption: 6,
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
            },
            medium: {
                width: 150,
            },
            large: {
                width: 300,
            },
        },
    },
    palette: {
        // TODO: Integrate with LESS styles from Atom
        atom: {
            background: '#282c34',
            border: '#181a1f',
            text: '#9da5b4',
        },
        default: {
            main: '#353b45',
            light: '#3a3f4b',
        },
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
    color: {
        primary: {
            darkest: '#194971',  // headings
            dark: '#2368A2',     // text
            base: '#3183C8',     // icons, buttons
            light: '#AAD4F6',    // outlines
            lightest: '#EFF8FF', // boxes
        },
        grey: {
            darkest: '#212933',
            darker: '#5F6B7A',
            dark: '#8895A7',
            base: '#B8C4CF',
            light: '#CFD6DE',
            lighter: '#E1E7EC',
            lightest: '#F8F9FA',
        },
        teal: {
            darkest: '#1B655E',
            dark: '#2A9187',
            base: '#3CAEA3',
            light: '#A8EEEC',
            lightest: '#E7FFFE',
        },
        red: {
            darkest: '#881B1B',
            dark: '#B82020',
            base: '#DC3030',
            light: '#F4AAAA',
            lightest: '#FCE8E8',
        },
        yellow: {
            darkest: '#8C6D1F',
            dark: '#CAA53D',
            base: '#F4CA64',
            light: '#FDF3D7',
            lightest: '#FFFCF4',
        },
        green: {
            darkest: '#187741',
            dark: '#249D57',
            base: '#38C172',
            light: '#A8EEC1',
            lightest: '#E3FCEC',
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
