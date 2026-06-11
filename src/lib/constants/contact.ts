export const SUPPORT_EMAIL = "support@the-sfm.com";
export const SUPPORT_EMAIL_MAILTO = "mailto:support@the-sfm.com";
export const SUPPORT_EMAIL_SUPPORT_MAILTO = `${SUPPORT_EMAIL_MAILTO}?subject=THE%20SFM%20Support`;
export const SUPPORT_EMAIL_ARIA_LABEL = "Email THE SFM support";
const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/the_sfm/";
const configuredInstagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();
export const INSTAGRAM_URL = (configuredInstagramUrl || DEFAULT_INSTAGRAM_URL).replace(/the\.sfm\/?$/i, "the_sfm/");
export const INSTAGRAM_ARIA_LABEL = "Open THE SFM Instagram";
