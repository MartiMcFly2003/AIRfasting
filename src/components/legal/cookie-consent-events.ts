/** Event name the footer's "Cookie Settings" link dispatches to reopen the preference panel
 *  inside CookieConsentBanner — kept in its own module so both sides can import the same
 *  constant without a circular import between the two components. */
export const OPEN_COOKIE_PREFERENCES_EVENT = "airfasting:open-cookie-preferences";
