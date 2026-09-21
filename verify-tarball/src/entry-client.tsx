import { hydrate } from 'solid-js/web';
import 'solid4m/styles.css';
import { App } from '../App';

const root = document.getElementById('app');
if (!root) throw new Error('missing #app root');

hydrate(() => <App />, root);
