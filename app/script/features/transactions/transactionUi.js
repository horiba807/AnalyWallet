import { state, moneyForm } from '@/common/state/state.js';

// ==========================================================================
// 明細テーブルのDOM描画
// ==========================================================================
export function renderTableDOM(filteredHistory = []) {
    //DOM要素を関数内で取得（呼び出し側で要素を探して渡す手間をなくす）
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    //配列でないデータ（undefined や null）が渡されたら処理を中断（安全ガード）
    if (!Array.isArray(filteredHistory)) {
        console.warn('renderTableDOM: 渡されたデータが配列ではありません', filteredHistory);
        return;
    }

    historyList.innerHTML = '';
    let dayTotal = 0;

    //データが空（0件）の場合はメッセージを表示して抜ける
    if (filteredHistory.length === 0) {
        historyList.innerHTML = `<tr><td colspan="5" style="color: #888; padding: 20px;">該当するデータがありません</td></tr>`;
        return;
    }

    filteredHistory.forEach((item, index) => {
        const amount = item.type === 'expense' ? -item.amount : item.amount;
        dayTotal += amount;

        //通常の明細行を作成
        const tr = document.createElement('tr');
        const amountClass = item.type === 'expense' ? 'is-expense' : 'is-income';
        const sign = item.type === 'expense' ? '-' : '+';

        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${getCategoryLabel(item.category)}</td>
            <td class="${amountClass}">${sign} ¥${item.amount.toLocaleString()}</td>
            <td>${item.memo || '-'}</td>
            <td class="btn_wrapper">
                <button class="column-btn delete" onclick="deleteTransaction('${item.id}')">削除する</button>
                <button class="column-btn edit" onclick="openEditModal('${item.id}')">編集する</button>
            </td>
        `;
        historyList.appendChild(tr);

        //次のデータの日付が違う　または　これが最後のデータなら合計行を出す
        const nextItem = filteredHistory[index + 1];
        const isLastItem = index === filteredHistory.length - 1;

        if (isLastItem || (nextItem && nextItem.date !== item.date)) {
            const totalTr = document.createElement('tr');
            totalTr.className = 'daily-total-row';

            const totalSign = dayTotal >= 0 ? "+" : "";
            const totalColor = dayTotal >= 0 ? "#3d9b3d" : "#d95252";

            totalTr.innerHTML = `
                <td colspan="2" style="font-weight: 600;">この日の合計:</td>
                <td colspan="3" style="font-weight: bold; color: ${totalColor}; text-align: left;">
                    ${totalSign} ¥${dayTotal.toLocaleString()}
                </td>
            `;
            historyList.appendChild(totalTr);

            //日毎の合計をリセット
            dayTotal = 0;
        }
    });
}

//supabaseのデータからnameを検索
function getCategoryLabel(val) {
    //state.categories の支出と収入を1つの配列に
    const allOpts = [
        ...(state.categories.expense || []),
        ...(state.categories.income || [])
    ];

    //送られてきた数字と一致するカテゴリーを探す
    const opt = allOpts.find(o => o.value === String(val));

    //見つかったら「給与」などの名前（label）を返し、なければそのままの値を出す
    return opt ? opt.label : val;
}