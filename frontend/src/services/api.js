// Generate a Wowhead model-viewer preview URL for a transmog set.
//
// This is the only function actually consumed across the app — list and
// detail data flow through TanStack Query in the page components, and auth
// flows through Supabase. Previously this file also exported wrappers like
// `getTransmogs`, `getTransmogSet`, `getItem`, `getItemMedia`,
// `clearCache`, and `testConnection` — none of them were imported anywhere.
export const generatePreviewUrl = (setId) => {
  const bucket = setId % 256;
  return `https://wow.zamimg.com/modelviewer/live/webthumbs/transmog/1/1/${bucket}/${setId}.jpg`;
};
