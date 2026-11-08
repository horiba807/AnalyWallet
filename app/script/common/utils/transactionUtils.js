import { state } from '@/common/state/state.js';

//==========================================================================
// 明細まわりの共通ヘルパー
//==========================================================================

// "YYYY-MM" 形式のキーを作る（例: 2026, 1 → "2026-01"）
export function toYearMonth(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

// 指定月の月末までに入るか（DBの date は "YYYY-MM-DD" なので文字列比較で正確に判定できる）
// ※ new Date("YYYY-MM-DD") はUTC扱いになり、日本時間だと月末日が漏れるため使わない
export function isOnOrBeforeMonthEnd(dateStr, yearMonth) {
    return typeof dateStr === 'string' && dateStr <= `${yearMonth}-31`;
}

// 繰越金（調整用）の明細かどうか（判定をここに一本化）
//  - カテゴリーの「調整用」フラグ
//  - 「繰越金」という名前のカテゴリー（フラグ導入前のデータ用）
//  - 古い平文データの 'carry_over'
export function isCarryOverItem(item) {
    if (item.category === 'carry_over') return true;

    const catValue = String(item.category);
    const cat = (state.categories.income || []).find(c => c.value === catValue);
    if (!cat) return false;

    return Boolean(cat.isCarryOver) || cat.label === '繰越金';
}
