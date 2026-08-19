import { state, moneyForm } from '@/common/state/state.js';

//==========================================================================
// 登録カテゴリーの表示DOM
//==========================================================================
export function renderCategorySettingsDOM() {
    const expenseList = document.getElementById('expense-category-list');
    const incomeList = document.getElementById('income-category-list');

    // 画面に要素がないページ（別タブなど）の場合はスキップ
    if (!expenseList || !incomeList) return;

    // 一度リストを空にする
    expenseList.innerHTML = '';
    incomeList.innerHTML = '';
    

    // 💡 支出リストの生成
    (state.categories.expense || []).forEach(cat => {
        expenseList.appendChild(createCategoryRow(cat));
    });

    // 💡 収入リストの生成
    (state.categories.income || []).forEach(cat => {
        incomeList.appendChild(createCategoryRow(cat));
    });
}

// 補助関数：リストの1行（li）を組み立てる
function createCategoryRow(cat) {
    const li = document.createElement('li');
    li.classList.add("category-settings__item");

    //isCarryOverでもis_carry_overでも対応できるように
    const isCarryOver = Boolean(cat.isCarryOver ?? cat.is_carry_over);

    //調整用カテゴリーのバッジ
    const badgeHtml = cat.isCarryOver
        ? `<span class="category-settings__badge">調整用</span>`
        : '';

    // ゴミ箱ボタンに data-id と data-label を仕込む
    li.innerHTML = `
        ${cat.label}
        <div class="category-settings__label-wrapper">
            ${badgeHtml}
        </div>
        <button type="button" class="category-settings__delete-btn"  data-id="${cat.value}" data-label="${cat.label}">
            削除する
        </button>
    `;
    return li;
}