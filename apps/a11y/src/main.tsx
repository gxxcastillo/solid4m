import { render } from 'solid-js/web';

import 'solid-formation/styles.css';
import 'solid-formation/themes/minimal.css';
import 'solid-formation/themes/midnight.css';
import 'solid-formation/themes/neobrutalist.css';

import App from './App';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root was not found.');
}

render(() => <App />, root);
