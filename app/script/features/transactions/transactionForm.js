import { state, moneyForm } from '@/common/state/state.js';

//==========================================================================
// 登録したカテゴリーをフォーム内の<select>タグで表示
//==========================================================================
export function updateCategoryMenu(type, targetId = 'category') {
    const selectEl = document.getElementById(targetId);
    if (!selectEl) return;

    //一度空に
    selectEl.innerHTML = '';

    //state.categories（Supabaseから取ってきたデータ）
    const options = state.categories[type] || [];

    //選択肢を量産する
    options.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;       //supabaseのID
        option.textContent = cat.label; //画面に表示
        selectEl.appendChild(option);
    });
}

export function renderFilterCategoryDOM() {
    const filterSelect = document.getElementById('filter-category');
    if (!filterSelect) return;

    //一度「カテゴリー（すべて）」だけの状態にリセット
    filterSelect.innerHTML = '<option value="all">カテゴリー</option>';

    //支出グループの動的生成
    if (state.categories.expense && state.categories.expense.length > 0) {
        const expenseGroup = document.createElement('optgroup');
        expenseGroup.label = '支出';

        state.categories.expense.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.value; // Supabaseの数字ID
            option.textContent = cat.label; // 「食費」などの日本語名
            expenseGroup.appendChild(option);
        });

        filterSelect.appendChild(expenseGroup);
    }

    //収入グループの動的生成
    if (state.categories.income && state.categories.income.length > 0) {
        const incomeGroup = document.createElement('optgroup');
        incomeGroup.label = '収入';

        state.categories.income.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.value; // Supabaseの数字ID
            option.textContent = cat.label; // 「給与」などの日本語名
            incomeGroup.appendChild(option);
        });

        filterSelect.appendChild(incomeGroup);
    }
}