import { supabaseClient } from "./supabase.js";
import { state, moneyForm } from './state.js';
import { updateHistoryDisplay, toggleView, updateCategoryMenu } from './ui.js';

export async function fetchTransactions() {
    const { data, error } = await supabaseClient
        .from('transactions')
        .select('*');

    if (error) {
        console.error("読み込みエラー:", error);
    } else {
        state.history = data || [];
        updateHistoryDisplay();
    }
}

export async function deleteTransaction(id) {
    if (!confirm("本当に削除しますか？")) return;
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
    if (error) alert("削除失敗");
    else fetchTransactions();
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