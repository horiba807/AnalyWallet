import { createClient } from '@supabase/supabase-js';
import { supabaseClient } from './supabase.js';
import { categoryOptions } from './constant.js';
import { updateHistoryDisplay, toggleView, updateCategoryMenu, calculateStats, renderFilterCategoryDOM, renderCategorySettingsDOM } from './ui.js';
import { fetchTransactions, deleteTransaction, openEditModal, updateTransaction, fetchCategories, signUp, signIn, signOut, setupCategorySettingsEvents, setupSubscriptionEvents, fetchSubscriptions, checkAndProcessSubscriptions } from './api.js';
window.deleteTransaction = deleteTransaction; // グローバルスコープをモジュールスコープに変更
window.openEditModal = openEditModal;
import { state, moneyForm } from './state.js';

//■■■■■■■■■■■■■■■■■■ ログアウト処理 ■■■■■■■■■■■■■■■■■■
async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("ログアウト時にエラーが発生しました:", error.message);
        alert("ログアウトに失敗しました。");
        return false;
    }

    console.log("ログアウト成功");
    return true;
}
function setupLogoutEvent() {
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            // 確認ダイアログ
            if (!confirm("ログアウトしますか？")) return;

            // api.js のログアウト処理を実行
            const success = await logoutUser();

            if (success) {
                // ログアウトが成功したら、ログイン画面へジャンプ！
                window.location.href = './login/index.html';
            }
        });
    }
}
//■■■■■■■■■■■■■■■■■■ 初期化処理 ■■■■■■■■■■■■■■■■■■
const initialBtn = document.querySelector(`.month_btn[data-month="${state.currentMonth}"]`);
if (initialBtn) initialBtn.classList.add('active');

async function checkLoginAndInit() {
    // 現在のログイン状況をチェック
    const { data: { user } } = await supabaseClient.auth.getUser();

    // ログインしていなければ、即座にログイン画面へ強制リダイレクト
    if (!user) {
        window.location.href = './login/index.html';
        return;
    }

    //ログアウト処理
    setupLogoutEvent();

    // 初期化処理
    console.log("ログイン確認OK:", user.email);

    await fetchCategories();
    renderCategorySettingsDOM();
    setupCategorySettingsEvents();
    setupSubscriptionEvents();

    //画面のドロップダウンを生成
    updateCategoryMenu('expense', 'category');      // 登録用フォーム
    updateCategoryMenu('expense', 'edit_category'); // 編集用モーダル

    renderFilterCategoryDOM(); // フィルターの選択肢を生成

    //サブスクテーブルからデータを取得
    fetchSubscriptions();

    //サブスクを自動登録（該当するものがあった場合）
    await checkAndProcessSubscriptions();

    // 履歴を読み込む
    fetchTransactions();

    console.log("現在のstate内のカテゴリー:", state.categories);
}
//■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

checkLoginAndInit() // 関数呼び出し

//==========================================================================
// ダッシュボード
//==========================================================================

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

// 1. 画面内にあるすべてのメニューボタン（.menu-btn）を取得する
const menuButtons = document.querySelectorAll('.menu_btn_wrapper.btn');

menuButtons.forEach(btn => {
    btn.addEventListener("click", function () {

        // 2. すべてのボタンと設定画面から 'active' を消す
        menuButtons.forEach(b => {
            b.classList.remove('active'); // ボタンの光を消す

            const targetId = b.dataset.target;
            document.getElementById(targetId)?.classList.remove('active'); // 画面を非表示にする
        });

        // 3. 今クリックされたボタンと画面だけに 'active' をつける
        this.classList.add('active'); // クリックされたボタンを光らせる

        const currentTargetId = this.dataset.target;
        document.getElementById(currentTargetId)?.classList.add('active'); // 対応する画面を表示する
    });
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