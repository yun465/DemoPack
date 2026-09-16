export function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
export function markdown(s: string) {
  return escapeHtml(s)
    .replace(/[\\`*_{}\[\]()#!|]/g, '\\$&')
    .replace(/[\r\n]+/g, ' ');
}
