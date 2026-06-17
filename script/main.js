import { createClient } from '@supabase/supabase-js';
import { supabaseClient } from './supabase.js';
import { categoryOptions } from './constant.js';
import { updateHistoryDisplay, toggleView, updateCategoryMenu, calculateStats } from './ui.js';
import { fetchTransactions, deleteTransaction, signUp, signIn, signOut } from './api.js';
window.deleteTransaction = deleteTransaction; // グローバルスコープをモジュールスコープに変更
import { state, moneyForm } from './state.js';

//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ログイン画面■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
// 認証状態を監視（リロードしてもログインを維持するための重要コード）
supabaseClient.auth.onAuthStateChange((event, session) => {
    toggleView(session?.user);
});

// ログインフォーム
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (state.isLoginMode) {
        // ログイン
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert("ログイン失敗: " + error.message);
    } else {
        // 新規登録
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) alert("登録エラー: " + error.message);
        else alert("確認メールを送信しました！メール内のリンクをクリックしてください。");
    }
});
// ログイン/新規登録のモード切替
document.getElementById('auth-toggle').addEventListener('click', () => {
    state.isLoginMode = !state.isLoginMode;
    document.getElementById('auth-title').innerText = state.isLoginMode ? "AnalyWallet へようこそ！" : "新規登録";
    document.getElementById('auth-submit-btn').innerText = state.isLoginMode ? "ログイン" : "登録する";
    document.getElementById('auth-toggle').innerText = state.isLoginMode ? "新規登録はこちら" : "ログインはこちら";
});

// ログアウト処理
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});

//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■通常画面■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
// 初期起動
updateCategoryMenu('expense');
const initialBtn = document.querySelector(`.month_btn[data-month="${state.currentMonth}"]`);
if (initialBtn) initialBtn.classList.add('active');
fetchTransactions();

//■■■■■■■■■■■■■■■■■■ダッシュボード■■■■■■■■■■■■■■■■■■
// 年切り替え
document.getElementById('prev-year')?.addEventListener('click', () => { state.currentYear--; updateHistoryDisplay(); }
);
document.getElementById('next-year')?.addEventListener('click', () => { state.currentYear++; updateHistoryDisplay(); }
);
// 月切り替え
document.querySelectorAll('.month_btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.month_btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.month;
        state.currentMonth = val === 'annual' ? 'annual' : Number(val);
        updateHistoryDisplay();
    });
});

document.getElementById('filter-category')?.addEventListener('change', (e) => {
    state.currentCategory = e.target.value;
    updateHistoryDisplay(); // 選択が変わるたびに再描画
});
//■■■■■■■■■■■■■■■■■■フォーム■■■■■■■■■■■■■■■■■■
// フォームの日付を今日にする
function setDefaultDate() {
    const dateInput = document.querySelector('input[name="date"]');
    if (!dateInput) return;
    // YYYY-MM-DD形式に変換
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    dateInput.value = today;
}
// 収支切り替え
document.querySelectorAll('input[name="transaction-type"]').forEach(r => {
    r.addEventListener('change', (e) => updateCategoryMenu(e.target.value));
});
// フォーム送信
moneyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(moneyForm);
    const type = fd.get('transaction-type');
    const cat = fd.get('category');

    // バリデーション
    if (type === 'income' && ['food', 'transport', 'entertainment'].includes(cat)) {
        alert("収支とカテゴリーが矛盾しています"); return;
    }

    const { error } = await supabaseClient.from('transactions').insert([{
        type: type, date: fd.get('date'), amount: Number(fd.get('amount')),
        category: cat, memo: fd.get('memo')
    }]);

    if (error) alert("保存に失敗しました...");
    else { alert("保存しました"); moneyForm.reset(); updateCategoryMenu('expense'); fetchTransactions(); }
});

// 初期実行に加える
setDefaultDate();