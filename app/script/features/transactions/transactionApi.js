import { supabaseClient } from "@/common/config/supabase.js";
import { state, moneyForm } from '@/common/state/state.js';
import { showToast } from '@/common/ui/toast.js';
import { showConfirm } from "@/common/ui/confirmModal.js";
import { renderCategorySettingsDOM } from '@/features/categories/categoryUi.js';
import { updateCategoryMenu, renderFilterCategoryDOM } from "@/features/transactions/transactionForm.js";
import { updateHistoryDisplay } from '@/features/dashboard/dashboardUi.js'
import { fetchCategories } from '@/features/categories/categoryApi.js';



//==========================================================================
// 取引データ（家計簿明細・履歴）操作
//==========================================================================

// 取引データの全件取得 & UI更新
export async function fetchTransactions() {
    //まずSupabaseからカテゴリーを取得し、画面の初期描画をすべて行う
    await fetchCategories();
    renderCategorySettingsDOM(); // 管理リストを描画
    renderFilterCategoryDOM();   // 履歴のフィルターを描画
    // 初期表示として、ひとまず「支出（expense）」の登録プルダウンを作っておく
    updateCategoryMenu('expense', 'category');

    //そのあと、既存の家計簿データを取得して履歴テーブルを描画する
    const { data, error } = await supabaseClient.from('transactions').select('*');
    if (data) {
        state.transactions = data;
    }
    if (error) {
        console.error("読み込みエラー:", error);
    } else {
        state.history = data || [];
        updateHistoryDisplay();
    }
};

//履歴：項目削除
export async function deleteTransaction(id) {
    const isConfirmed = await showConfirm(`#${id} を本当に削除しますか？`, "確認", "キャンセル", "削除する", true);
    if (!isConfirmed) return;
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
    if (error) showToast(`#${id} の削除に失敗しました:\n${error}`, "error");
    else fetchTransactions();
    showToast(`#${id} を削除しました`, "success");
}

//編集モーダルのデータセット & 表示制御
export async function openEditModal(id) {
    //全データの中から、クリックされたIDと一致するものを1件探す
    const target = state.transactions.find(item => item.id == id);
    if (!target) return;

    //stateに記録
    state.editingId = id;

    const registerIdElement = document.getElementById('register-id');
    if (registerIdElement) {
        registerIdElement.textContent = `#${state.editingId}`;
    }

    //モーダル内の入力欄に、現在の値をセットする
    if (target.type === 'income') {
        document.getElementById('edit_type-income').checked = true;
    } else if (target.type === 'expense') {
        document.getElementById('edit_type-expense').checked = true;
    }

    //共通関数で編集用のドロップダウン（edit_category）を作り直す
    updateCategoryMenu(target.type, 'edit_category');

    document.getElementById('edit_date').value = target.date;
    document.getElementById('edit_category').value = target.category;
    document.getElementById('edit_amount').value = target.amount;
    document.getElementById('edit_memo').value = target.memo;

    //モーダルを表示する
    document.getElementById('edit-modal').classList.add('active');
    document.body.classList.add('no-scroll');
}

//項目の更新（DB更新）
export async function updateTransaction(id, updatedData) {
    const { data, error } = await supabaseClient
        .from('transactions')
        .update(updatedData)
        .eq('id', id)
        .select();

    if (error) {
        console.error('Supabaseの更新でエラー発生:', error);
        throw error;
    }
    return data;
}