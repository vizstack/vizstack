// Cross-platform way of calling 'npm run start' from 'tests' directory.
const args = [ 'start' ];
const opts = { stdio: 'inherit', cwd: 'tests', shell: true };
require('child_process').spawn('npm', args, opts);