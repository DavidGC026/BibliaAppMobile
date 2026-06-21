/**
 * ponytail: self-check offline helpers — run: npx tsx lib/offline/__check__.ts
 */
function isPresetCover(cover?: string | null) {
  return !!cover && cover.startsWith('grad-');
}

function resolveCoverForSave(presetId: string, customUrl: string) {
  const url = customUrl.trim();
  if (url) return url;
  return presetId;
}

function check(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

check(isPresetCover('grad-purple') === true, 'preset cover');
check(isPresetCover('https://x.com') === false, 'url cover');
check(resolveCoverForSave('grad-blue', '') === 'grad-blue', 'resolve preset');
check(
  resolveCoverForSave('grad-blue', 'https://images.unsplash.com/x') === 'https://images.unsplash.com/x',
  'resolve url',
);

console.log('offline __check__: ok');
