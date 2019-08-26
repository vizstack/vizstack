import { configure, addDecorator } from '@storybook/react';
import { withInfo } from '@storybook/addon-info';

// Install addons.
addDecorator(withInfo); 

// Automatically import all files ending in *.stories.tsx
const req = require.context('../stories', true, /\.stories\.tsx$/);
function loadStories() {
  req.keys().forEach(req);
}
configure(loadStories, module);