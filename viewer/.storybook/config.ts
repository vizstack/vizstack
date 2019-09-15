import { configure, addDecorator } from '@storybook/react';
import { withKnobs } from '@storybook/addon-knobs';

// Install addons.
addDecorator(withKnobs);

// Automatically import all files ending in *.stories.tsx
const req = require.context('../stories', true, /\.stories\.tsx$/);
function loadStories() {
  req.keys().sort().forEach(req);
}
configure(loadStories, module);