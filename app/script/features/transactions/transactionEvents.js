import { state, moneyForm } from '@/common/state/state.js';
import { supabaseClient } from "@/common/config/supabase.js";
import { showToast } from '@/common/ui/toast.js';
import { updateCategoryMenu } from '@/features/transactions/transactionForm.js';
import { fetchTransactions, updateTransaction, deleteTransaction, openEditModal } from '@/features/transactions/transactionApi.js';

// グローバル展開
window.deleteTransaction = deleteTransaction;
window.openEditModal = openEditModal;

export function setupTransactionEvents() {
    setDefaultDate();

    // 収支タイプの切り替え
    document.querySelectorAll('input[name="transaction-type"]').forEach(r => {
        r.addEventListener('change', (e) => updateCategoryMenu(e.target.value));
    });

    // フォーム送信（新規登録）
    moneyForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(moneyForm);
        const type = fd.get('transaction-type');
        const cat = fd.get('category');

        const { error } = await supabaseClient.from('transactions').insert([{
            type: type, date: fd.get('date'), amount: Number(fd.get('amount')),
            category: cat, memo: fd.get('memo')
        }]);

        if (error) {
            showToast(`保存に失敗しました\n\n${error.message}`, 'error');
        } else {
            showToast('データを保存しました', 'success');
            moneyForm.reset();
            setDefaultDate();
            updateCategoryMenu('expense');
            fetchTransactions();
        }
    });

    // 編集モーダル関連
    document.getElementById('close_editform_btn')?.addEventListener("click", () => {
        document.getElementById('edit-modal').classList.remove('active');
        document.body.classList.remove('no-scroll');
    });

    document.getElementById('edit_type-income')?.addEventListener('change', (e) => {
        if (e.target.checked) updateCategoryMenu('income', 'edit_category');
    });

    document.getElementById('edit_type-expense')?.addEventListener('change', (e) => {
        if (e.target.checked) updateCategoryMenu('expense', 'edit_category');
    });

    // 編集保存
    const saveBtn = document.getElementById('edit_btn');
    saveBtn?.addEventListener('click', async () => {
        if (!state.editingId) return;

        const selectedType = document.querySelector('input[name="edit_transactions-type"]:checked').value;
        const updatedData = {
            type: selectedType,
            date: document.getElementById('edit_date').value,
            amount: Number(document.getElementById('edit_amount').value),
            category: document.getElementById('edit_category').value,
            memo: document.getElementById('edit_memo').value
        };

        try {
            saveBtn.disabled = true;
            await updateTransaction(state.editingId, updatedData);
            document.getElementById('edit-modal').classList.remove('active');
            document.body.classList.remove('no-scroll');
            state.editingId = null;
            await fetchTransactions();
            showToast('変更を保存しました', 'success');
        } catch (error) {
            showToast(`変更の保存に失敗しました\n${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
        }
    });
}

function setDefaultDate() {
    const dateInput = document.querySelector('input[name="date"]');
    if (!dateInput) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
}