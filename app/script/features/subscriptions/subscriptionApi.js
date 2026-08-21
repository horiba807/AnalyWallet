import { supabaseClient } from "@/common/config/supabase.js";
import { state, moneyForm } from '@/common/state/state.js';
import { showToast } from '@/common/ui/toast.js';
import { showConfirm } from "@/common/ui/confirmModal.js";

import { renderSubscriptionsDOM } from '@/features/subscriptions/subscriptionUi.js'

//==========================================================================
// サブスクリプション管理
//==========================================================================

// Supabaseからサブスク一覧を取得して画面に描画
export async function fetchSubscriptions() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

    if (error) {
        console.error("サブスク読み込みエラー:", error);
        return;
    }

    state.subscriptions = data || [];
    renderSubscriptionsDOM();
}

// 新しいサブスクを登録する
async function handleAddSubscription(e) {
    e.preventDefault();

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const nameInput = document.getElementById('subsc-name');
    const amountInput = document.getElementById('subsc-amount');
    const daySelect = document.getElementById('subsc-day');

    const newSubsc = {
        user_id: user.id,
        name: nameInput.value.trim(),
        amount: Number(amountInput.value),
        billing_day: Number(daySelect.value),
        last_charged_month: ""
    };

    const { error } = await supabaseClient
        .from('subscriptions')
        .insert([newSubsc]);

    if (error) {
        console.error("サブスク登録失敗:", error);
        showToast(`登録に失敗しました\n${error.message || error}`, "error");
        return;
    }

    showToast(`「${newSubsc.name}」を登録しました`, "success");

    document.getElementById('subsc-form').reset();
    await fetchSubscriptions();
}

// サブスクを削除する
async function handleDeleteSubscription(id, name) {
    const isConfirmed = await showConfirm(`「${name}」のサブスク登録を解除しますか？\n（※これまでの家計簿データは消えません）`, "確認", "キャンセル", "削除する", true);
    if (!isConfirmed) return;

    const { error } = await supabaseClient
        .from('subscriptions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("サブスク削除失敗:", error);
        alert("削除に失敗しました。");
        return;
    }

    await fetchSubscriptions();
    showToast(`「${name}」を削除しました`, "success");
}

// サブスク画面のイベントリスナーを一括設定
export function setupSubscriptionEvents() {
    document.getElementById('subsc-form')?.addEventListener('submit', handleAddSubscription);

    document.getElementById('subsc-list')?.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.subsc-settings__delete-btn');
        if (!deleteBtn) return;

        const id = deleteBtn.dataset.id;
        const name = deleteBtn.dataset.name;
        handleDeleteSubscription(id, name);
    });
}

// サブスクの月次自動判定 & 家計簿への追加処理
export async function checkAndProcessSubscriptions() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: subs, error } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

    if (error || !subs || subs.length === 0) return;

    // 「サブスク」カテゴリーの重複チェック＆自動作成
    const { data: existingCat, error: findError } = await supabaseClient
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', 'サブスク')
        .eq('type', 'expense')
        .maybeSingle();

    if (findError) {
        console.error("カテゴリーの重複チェックに失敗しました:", findError);
        return;
    }

    let categoryId;

    if (!existingCat) {
        console.log("サブスクカテゴリを自動生成します");

        const { data: newCat, error: catError } = await supabaseClient
            .from('categories')
            .insert([{
                user_id: user.id,
                name: 'サブスク',
                type: 'expense'
            }])
            .select()
            .single();

        if (catError) {
            console.error("サブスクカテゴリーの自動作成に失敗しました:", catError);
            return;
        }

        categoryId = newCat.id;
        console.log(`サブスクカテゴリーを新規作成しました(ID: ${categoryId})`);

        if (typeof fetchCategories === 'function') await fetchCategories();

    } else {
        categoryId = existingCat.id;
        console.log(`既存のサブスクカテゴリー(ID: ${categoryId})を使用します。`);
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentDay = today.getDate();
    const currentYearMonth = `${currentYear}-${currentMonth}`;

    let hasAddedNewTransaction = false;

    for (const sub of subs) {
        if (currentDay >= sub.billing_day && sub.last_charged_month !== currentYearMonth) {

            const { error: insertError } = await supabaseClient
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: 'expense',
                    category: categoryId,
                    amount: sub.amount,
                    memo: `${sub.name}（自動追加）`,
                    date: `${currentYear}-${currentMonth}-${String(sub.billing_day).padStart(2, '0')}`
                }]);

            if (insertError) {
                console.error(`${sub.name} の自動追加に失敗:`, insertError);
                continue;
            }

            await supabaseClient
                .from('subscriptions')
                .update({ last_charged_month: currentYearMonth })
                .eq('id', sub.id);

            hasAddedNewTransaction = true;
        }
    }

    if (hasAddedNewTransaction && typeof fetchTransactions === 'function') {
        await fetchTransactions();
    }
}