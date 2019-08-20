import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, WithStyles } from '@material-ui//styles';
// import defaultTheme from './theme';

class Hello extends React.PureComponent<InternalProps> {
    render() {
        return (
            <div>
                Hello
            </div>
        );
    }
}

const styles = createStyles({
    container: {}
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(Hello) as React.ComponentClass<{}>;

// export default Hello;

// export default function Hello() {
//     React.useState(null);
//     return (<div>Hedddllofff</div>);
// }
