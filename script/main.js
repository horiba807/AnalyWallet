import { createClient } from '@supabase/supabase-js';
import { supabaseClient } from './supabase.js';
import { categoryOptions } from './constant.js';
import { updateHistoryDisplay, toggleView, updateCategoryMenu, calculateStats } from './ui.js';
import { fetchTransactions, deleteTransaction, openEditModal, updateTransaction,  signUp, signIn, signOut } from './api.js';
window.deleteTransaction = deleteTransaction; // グローバルスコープをモジュールスコープに変更
window.openEditModal = openEditModal;
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

//■■■■■■■■■■■■■■■■■■メニューボタン■■■■■■■■■■■■■■■■■■
document.getElementById('header_menu_icon').addEventListener("click", () => {
    const headerMenu = document.getElementById('header_menu');
    const icon = document.getElementById('icon');

    headerMenu.classList.toggle('active');

    if (headerMenu.classList.contains('active')) {
        // メニューが開いたとき
        icon.textContent = "close";                  
        document.body.classList.add('no-scroll');// 背景をロック
    } else {
        // メニューが閉じたとき
        icon.textContent = "menu";                   
        document.body.classList.remove('no-scroll'); 
    }
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
    else { alert("保存しました"); 
        moneyForm.reset(); 
        updateCategoryMenu('expense'); 
        fetchTransactions(); }
});

// 初期実行に加える
setDefaultDate();

//■■■■■■■■■■■■■■■■■■モーダル表示■■■■■■■■■■■■■■■■■■
//ﾊﾞﾂボタンでモーダル削除
document.getElementById('close_editform_btn').addEventListener("click", () => {
    document.getElementById('edit-modal').classList.remove('active');
    document.body.classList.remove('no-scroll');
    return;
});

//カテゴリーの選択し書き換え

// ①「収入」ラジオボタンが選ばれたら、編集用カテゴリーを「income」に書き換える
document.getElementById('edit_type-income').addEventListener('change', (e) => {
    if (e.target.checked) {
        updateCategoryMenu('income', 'edit_category');
    }
});

// ②「支出」ラジオボタンが選ばれたら、編集用カテゴリーを「expense」に書き換える
document.getElementById('edit_type-expense').addEventListener('change', (e) => {
        if (e.target.checked) {
        updateCategoryMenu('expense', 'edit_category');
    }
});

// モーダルの保存ボタン
const saveBtn = document.getElementById('edit_btn');

saveBtn.addEventListener('click', async () => {

    // チェック（編集中のIDが空なら処理しない）
    if (!state.editingId) return;

    // 選択されているラジオボタンの value を取得する
    const selectedType = document.querySelector('input[name="edit_transactions-type"]:checked').value;

    // 2. フォームに入力された最新の値を取得する
    const updatedData = {
        type: selectedType, // income or expence
        date: document.getElementById('edit_date').value,
        amount: Number(document.getElementById('edit_amount').value),
        category: document.getElementById('edit_category').value,
        memo: document.getElementById('edit_memo').value
    };
    
    try {
        // 3. 読み込み中などを表すためにボタンを無効化（任意）
        saveBtn.disabled = true;

        // 4. api.jsの関数を呼び出して、Supabaseのデータを更新する
        await updateTransaction(state.editingId, updatedData);

        // 5. 成功したらモーダルを閉じる
        document.getElementById('edit-modal').classList.remove('active');
        document.body.classList.remove('no-scroll');

        // 6. 編集中のIDをリセットする
        state.editingId = null;

        // 7. 【超重要】画面を最新の状態にする
        // すでに実装されている、データを再取得して再描画する関数を呼び出します
        await fetchTransactions();

        alert('変更を保存しました！');

    } catch (error) {
        alert('保存に失敗しました。もう一度お試しください。');
     } 
     finally {
        // ボタンを元に戻す
        saveBtn.disabled = false;
    }
});