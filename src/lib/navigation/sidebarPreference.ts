export const SIDEBAR_PREFERENCE_KEY = 'sfm.sidebar.collapsed.v1';
export const SIDEBAR_PREFERENCE_ATTRIBUTE = 'data-sfm-sidebar-collapsed';

// A device presentation preference only. Never contains identity/session data.
// Executed before body markup so the initial desktop grid reserves the right width.
export const SIDEBAR_BOOTSTRAP = `try{document.documentElement.setAttribute('${SIDEBAR_PREFERENCE_ATTRIBUTE}',localStorage.getItem('${SIDEBAR_PREFERENCE_KEY}')==='1'?'true':'false')}catch{}`;

export function parseSidebarPreference(value: string | null) { return value === '1'; }
