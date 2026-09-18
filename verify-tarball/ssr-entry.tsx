import { generateHydrationScript, renderToString } from 'solid-js/web';
import { App } from './App';

export function renderPage(): { hydrationScript: string; appHtml: string } {
  const appHtml = renderToString(() => <App />);
  const hydrationScript = generateHydrationScript();
  return { hydrationScript, appHtml };
}
