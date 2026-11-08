//==========================================================================
// HTMLエスケープ（innerHTML にユーザー入力を埋め込むときは必ず通す）
//==========================================================================
const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}
