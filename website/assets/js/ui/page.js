import { html } from '../lib/html.js';

export function PageHead({ title, sub, crumb, actions }) {
  return html`<header class="page-head">
    <div>${crumb && html`<div class="crumb">${crumb}</div>`}<h1>${title}</h1>${sub && html`<p>${sub}</p>`}</div>
    ${actions && html`<div class="row row-wrap">${actions}</div>`}
  </header>`;
}
