import { supabaseClient } from "@/common/config/supabase.js";
import { state, moneyForm } from '@/common/state/state.js';
import { showToast } from '@/common/ui/toast.js';
import { showConfirm } from "@/common/ui/confirmModal.js";
import { renderCategorySettingsDOM } from '@/features/categories/categoryUi.js'
import { updateCategoryMenu, renderFilterCategoryDOM } from "@/features/transactions/transactionForm.js";

//==========================================================================
// カテゴリー管理
//==========================================================================

// Supabaseからカテゴリー一覧を取得
export async function fetchCategories() {
    const { data, error } = await supabaseClient
        .from('categories')
        .select('*');

    if (error) {
        console.error("カテゴリーの読み込みエラー:", error);
        return;
    }

    state.categories = {
        expense: [],
        income: []
    };

    data.forEach(item => {
        const formatted = {
            value: String(item.id),
            label: item.name,
            isCarryOver: Boolean(item.is_carry_over)
        };

        if (item.type === 'expense') {
            state.categories.expense.push(formatted);
        } else if (item.type === 'income') {
            state.categories.income.push(formatted);
        }
    });
}

// カテゴリー更新時の全UI一斉リフレッシュ（ヘルパー）
async function refreshCategories_kanpa() {
    await fetchCategories();
    renderCategorySettingsDOM();
    const currentType = document.querySelector('input[name="transaction-type"]:checked')?.value || 'expense';
    updateCategoryMenu(currentType, 'category');
    updateCategoryMenu('expense', 'edit_category');
    renderFilterCategoryDOM();
}

// カテゴリーの追加処理
async function handleAddCategory(type) {
    const inputId = type === 'expense' ? 'new-expense-name' : 'new-income-name';
    const inputElement = document.getElementById(inputId);
    const name = inputElement.value.trim();

    if (!name) {
        showToast('カテゴリー名を入力してください', 'error');
        return;
    }

    const carryoverCheckbox = document.getElementById('new-income-carryover');
    const isCarryOver = (type === 'income' && carryoverCheckbox) ? carryoverCheckbox.checked : false;

    const isDuplicate = state.categories[type].some(cat => cat.label === name);
    if (isDuplicate) {
        alert('すでに同じ名前のカテゴリーが存在します。');
        return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert('ユーザー情報の取得に失敗したか、ログインセッションが切れています。');
        return;
    }

    const { error } = await supabaseClient
        .from('categories')
        .insert([{
            name: name,
            type: type,
            is_carry_over: isCarryOver,
            user_id: user.id
        }]);

    if (error) {
        console.error('error:', error);
        showToast(`カテゴリーの追加に失敗しました\n${error.message || error}`, 'error');
        return;
    }

    showToast(`カテゴリー「${name}」を追加しました`, "success");

    inputElement.value = '';
    if (carryoverCheckbox) carryoverCheckbox.checked = false;

    await refreshCategories_kanpa();
}

// カテゴリーの削除処理
async function handleDeleteCategory(id, label) {
    const isUsed = state.history.some(item => String(item.category) === String(id));

    if (isUsed) {
        showToast(`カテゴリー「${label}」はすでに家計簿データで使用されているため、削除できません。`, "error");
        return;
    }

    const isConfirmed = await showConfirm(`カテゴリー「${label}」を削除しますか？`, "確認", "キャンセル", "削除する", true);
    if (!isConfirmed) return;

    const { error } = await supabaseClient
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('削除失敗:', error);
        showToast(`削除に失敗しました\n${error}`, "error");
        return;
    }

    await refreshCategories_kanpa();
    showToast(`カテゴリー「${label}」を削除しました`, "success");
}

// カテゴリー設定画面のイベントリスナーを一括設定
export function setupCategorySettingsEvents() {
    document.getElementById('add-expense-btn')?.addEventListener('click', () => handleAddCategory('expense'));
    document.getElementById('add-income-btn')?.addEventListener('click', () => handleAddCategory('income'));

    const handleListClick = (e) => {
        const deleteBtn = e.target.closest('.category-settings__delete-btn');
        if (!deleteBtn) return;

        const id = deleteBtn.dataset.id;
        const label = deleteBtn.dataset.label;
        handleDeleteCategory(id, label);
    };

    document.getElementById('expense-category-list')?.addEventListener('click', handleListClick);
    document.getElementById('income-category-list')?.addEventListener('click', handleListClick);
}
