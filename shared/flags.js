// Small inline SVG flags (emoji flags don't show on every system, e.g. Windows).
export const FLAGS = {
  en: `<svg viewBox="0 0 60 30" width="36" height="18" aria-hidden="true">
    <clipPath id="uk-clip"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
    <clipPath id="uk-diag"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
    <g clip-path="url(#uk-clip)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#uk-diag)" stroke="#C8102E" stroke-width="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/>
    </g></svg>`,
  sv: `<svg viewBox="0 0 16 10" width="29" height="18" aria-hidden="true">
    <rect width="16" height="10" fill="#006AA7"/>
    <rect x="5" width="2" height="10" fill="#FECC02"/>
    <rect y="4" width="16" height="2" fill="#FECC02"/></svg>`,
};
