import { hydrate } from 'solid-js/web';
import 'solid-formation/styles.css';
import { App } from '../App';

const root = document.getElementById('app');
if (!root) throw new Error('missing #app root');

hydrate(() => <App />, root);
