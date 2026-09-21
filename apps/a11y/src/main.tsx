import { render } from 'solid-js/web';

import 'solid4m/styles.css';
import 'solid4m/themes/minimal.css';
import 'solid4m/themes/midnight.css';
import 'solid4m/themes/neobrutalist.css';

import App from './App';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root was not found.');
}

render(() => <App />, root);
