import { supabaseClient } from "./supabase.js";
import { state, moneyForm } from './state.js';
import { updateHistoryDisplay, toggleView, updateCategoryMenu } from './ui.js';

export async function fetchTransactions() {
    const { data, error } = await supabaseClient.from('transactions').select('*');
    if(data){
        state.transactions = data;
    }
    if (error) {
        console.error("読み込みエラー:", error);
    } else {
        state.history = data || [];
        updateHistoryDisplay();
    }
};

//ヒストリー：項目削除
export async function deleteTransaction(id) {
    if (!confirm("本当に削除しますか？")) return;
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
    if (error) alert("削除失敗");
    else fetchTransactions();
}
//ヒストリー：項目編集
export async function openEditModal(id){ 
    // 1. 全データの中から、クリックされたIDと一致するものを1件探す
    const target = state.transactions.find(item => item.id == id);
    // if (!target) return;
    if (!target) {
        return;
    }
    // 2. stateに記録
    state.editingId = id;

    // 3. モーダル内の入力欄に、現在の値をセットする

    // ラジオボタン
    if (target.type === 'income') {
        document.getElementById('edit_type-income').checked = true;
    } else if (target.type === 'expense') {
        document.getElementById('edit_type-expense').checked = true;
    }

    // 共通関数で編集用のドロップダウン（edit_category）を作り直す
    updateCategoryMenu(target.type, 'edit_category');


    document.getElementById('edit_date').value = target.date;
    document.getElementById('edit_category').value = target.category;
    document.getElementById('edit_amount').value = target.amount;
    document.getElementById('edit_memo').value = target.memo;
    // 4. モーダルを表示する
    document.getElementById('edit-modal').classList.add('active');
    document.body.classList.add('no-scroll');
}

// 項目の更新
export async function updateTransaction(id, updatedData) {
    // 指定したIDのデータを更新する
    const { data, error } = await supabaseClient
        .from('transactions') // テーブル名
        .update(updatedData)
        .eq('id', id)
        .select();

    if (error) {
        console.error('Supabaseの更新でエラー発生:', error);
        throw error;
    }
    return data;
}


// サインアップ（新規登録）
export async function signUp(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });
    if (error) alert("登録エラー: " + error.message);
    else alert("確認メールを送信しました！");
}

// ログイン
export async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) alert("ログインエラー: " + error.message);
    else {
        alert("ログイン成功！");
        fetchTransactions(); // 自分のデータを取得
    }
}

// ログアウト
export async function signOut() {
    await supabaseClient.auth.signOut();
    history = []; // データを空にする
    updateHistoryDisplay();
}