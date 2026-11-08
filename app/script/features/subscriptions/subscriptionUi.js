import { state } from '@/common/state/state.js';
import { escapeHtml } from '@/common/utils/escapeHtml.js';

//==========================================================================
// 登録サブスクの表示DOM
//==========================================================================
export function renderSubscriptionsDOM() {
    const subscListElement = document.getElementById('subsc-list');
    if (!subscListElement) return;

    // 一旦中身を空っぽにする
    subscListElement.innerHTML = '';

    if (state.subscriptions.length === 0) {
        subscListElement.innerHTML = '<tr><td class="empty-message" colspan="4">登録されているサブスクはありません。</td></tr>';
        return;
    }

    // データがある分だけ li を作成して追加
    state.subscriptions.forEach(sub => {
        const tr = document.createElement('tr');
        tr.className = 'subsc-item';
        tr.innerHTML = `
            <td class="subsc-settings__td">${escapeHtml(sub.name)}</td>
            <td class="subsc-settings__td">${escapeHtml(sub.billing_day)}日</td>
            <td class="subsc-settings__td">¥${Number(sub.amount).toLocaleString()}</td>
            <td class="subsc-settings__td">
                <button type="button" class="subsc-settings__delete-btn"  data-id="${escapeHtml(sub.id)}" data-name="${escapeHtml(sub.name)}">
                    削除する
                </button>
            </td>
        `;
        subscListElement.appendChild(tr);
    });
}