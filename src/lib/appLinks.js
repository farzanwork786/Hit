// Canonical link to include in every "share the app" message, so a recipient
// can actually install Hit instead of just reading text about it.
//
// This is the App Store Connect app id (appstoreconnect.apple.com/apps/…),
// which resolves once the app is live on the App Store. Update this if the
// app is ever moved to a different App Store listing.
export const APP_STORE_URL = 'https://apps.apple.com/app/id6794190639';

// Appends the install link to a share message body. iOS also gets a separate
// `url` field passed to Share.share (used for the link preview card); Android
// ignores that field, so the link must additionally be in the text itself for
// the message to be useful cross-platform.
export function withAppLink(message) {
  return `${message}\n\n${APP_STORE_URL}`;
}

export default { APP_STORE_URL, withAppLink };
