import * as React from 'react';

import { InteractionManager, ViewerId, ViewerHandle } from './manager';

/** React context which allows all `Viewer`s nested within it to emit and respond to events. */
type InteractionContextValue = {
    registerViewer: InteractionManager['registerViewer'];
    unregisterViewer: InteractionManager['unregisterViewer'];
    emit: InteractionManager['emit'];
};

export const InteractionContext = React.createContext<InteractionContextValue>({
    registerViewer: () => {},
    unregisterViewer: () => {},
    emit: () => {},
});


type InteractionProviderProps = {
    manager: InteractionManager,
    children?: React.ReactNode,
};

export class InteractionProvider extends React.PureComponent<InteractionProviderProps> {
    render() {
        const { children, manager } = this.props;
        const { registerViewer, unregisterViewer, emit } = manager;
        return (
            <InteractionContext.Provider value={{ registerViewer, unregisterViewer, emit }}>
                {children}
            </InteractionContext.Provider>
        );
    }
}