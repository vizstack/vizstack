import 'typeface-roboto-mono';
import 'typeface-ubuntu-mono';

const fonts = {
    RobotoMono: '"Roboto Mono", monospace',
    UbuntuMono: '"Ubuntu Mono", monospace',
};

const colors = {
    highlight: 'rgb(214, 238, 249)',
    lowlight: 'rgb(237, 237, 236)',
    selected: 'rgb(30, 167, 253)',
};

export default {
    framed: {
        normal: {
            backgroundColor: 'transparent',
            border: '1px solid rgb(237, 237, 236)',
            borderLeftWidth: '2px',
            borderRadius: '4px',
            padding: 2,
        },
        lowlight: {},
        highlight: {
            backgroundColor: 'rgba(30, 167, 253, 0.2)',
            borderLeftColor: 'rgba(30, 167, 253, 0.5)',
        },
        selected: {
            borderLeftColor: 'rgba(2, 122, 197, 0.5)',
        },
    },
    unframed: {
        normal: {
            backgroundColor: 'transparent',
            // borderLeftStyle: 'solid' as any,
            // borderLeftWidth: '2px',
            // borderLeftColor: 'transparent',
            borderRadius: '4px 0px',
            padding: 2,
        },
        lowlight: {},
        highlight: {
            backgroundColor: 'rgba(30, 167, 253, 0.2)',
            // borderLeftColor: 'rgba(30, 167, 253, 0.5)',
        },
        selected: {
            backgroundColor: 'rgba(2, 122, 197, 0.4)',
            // borderLeftColor: 'rgba(2, 122, 197, 0.5)',
        },
    },
    slot: {
        borderStyle: 'solid' as any,
        borderWidth: 1,
        borderColor: 'rgb(237, 237, 236)',
        padding: 2,
        spacing: 8,
    },
    emphasis: {
        normal: 'rgb(55, 53, 47)',
        less: 'rgb(153, 153, 153)',
        more: 'rgb(6, 156, 205)',
    },
    fills: {
        gray: 'rgb(230,230,228)',
        brown: 'rgb(232,213,205)',
        purple: 'rgb(225,213,249)',
        blue: 'rgb(207,229,249)',
        green: 'rgb(206,231,225)',
        yellow: 'rgb(250,237,211)',
        orange: 'rgb(254,223,209)',
        red: 'rgb(255,207,212)',
        pink: 'rgb(249,207,230)',
    },
    text: {
        caption: {
            fontFamily: fonts.UbuntuMono,
            fontSize: 11,
            fontWeight: 300,
        },
        body: {
            fontFamily: fonts.UbuntuMono,
            fontSize: 14,
            fontWeight: 300,
        },
        subheading: {
            fontFamily: fonts.UbuntuMono,
            fontSize: 14,
            fontWeight: 600,
        },
        heading: {
            fontFamily: fonts.UbuntuMono,
            fontSize: 20,
            fontWeight: 600,
        },
    },
    icon: {
        fontSize: 16,
    },
    code: {
        body: {
            fontFamily: fonts.RobotoMono,
            fontSize: 12,
        },
    },
};
