import { state, moneyForm } from '@/common/state/state.js';

//==========================================================================
// 登録サブスクの表示DOM
//==========================================================================
export function renderSubscriptionsDOM() {
    const subscListElement = document.getElementById('subsc-list');
    if (!subscListElement) return;

    // 一旦中身を空っぽにする
    subscListElement.innerHTML = '';

    if (state.subscriptions.length === 0) {
        subscListElement.innerHTML = '<li class="empty-message">登録されているサブスクはありません。</li>';
        return;
    }

    // データがある分だけ li を作成して追加
    state.subscriptions.forEach(sub => {
        const tr = document.createElement('tr');
        tr.className = 'subsc-item';
        tr.innerHTML = `
            <td class="subsc-settings__td">${sub.name}</td>
            <td class="subsc-settings__td">${sub.billing_day}日</td>
            <td class="subsc-settings__td">¥${sub.amount.toLocaleString()}</td>
            <td class="subsc-settings__td">
                <button type="button" class="subsc-settings__delete-btn"  data-id="${sub.id}" data-name="${sub.name}">
                    削除する
                </button>
            </td>
        `;
        subscListElement.appendChild(tr);
    });
}