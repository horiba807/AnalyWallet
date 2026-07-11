import { createClient } from '@supabase/supabase-js';
import { supabaseClient } from './supabase.js';
import { categoryOptions } from './constant.js';
import { updateHistoryDisplay, toggleView, updateCategoryMenu, calculateStats, renderFilterCategoryDOM, renderCategorySettingsDOM } from './ui.js';
import { fetchTransactions, deleteTransaction, openEditModal, updateTransaction, fetchCategories, signUp, signIn, signOut, setupCategorySettingsEvents,
        setupSubscriptionEvents, fetchSubscriptions, checkAndProcessSubscriptions, enrollMFA, challengeAndVerifyMFA,
        getMFAStatus, unenrollMFA, } from './api.js';
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
    if (!user) {
        window.location.href = './login/index.html';
        return;
    }

    // URLから直接アクセスした場合
    const { data: mfaData } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
    if (mfaData.currentLevel === 'aal1' && mfaData.nextLevel === 'aal2') {
        //MFAを通過してないのでログイン画面に強制遷移
        window.location.href = './login/index.html';
        return;
    }

    //ログアウト処理
    setupLogoutEvent();

    //初期化処理
    console.log("ログイン確認OK:", user.email);

    //MFA
    checkAndRenderMFA();

    await fetchCategories();
    renderCategorySettingsDOM();
    setupCategorySettingsEvents();
    setupSubscriptionEvents();

    //画面のドロップダウンを生成
    updateCategoryMenu('expense', 'category');      //登録用フォーム
    updateCategoryMenu('expense', 'edit_category'); //編集用モーダル

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
    const headerNav = document.getElementById('sm_navlist');

    headerMenu.classList.toggle('active');
    headerNav.classList.toggle('remove');

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

        // すべてのボタンと設定画面からactiveを消す
        menuButtons.forEach(b => {
            b.classList.remove('active');

            const targetId = b.dataset.target;
            document.getElementById(targetId)?.classList.remove('active'); // 画面を非表示にする
        });

        this.classList.add('active');

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

//■■■■■■■■■■■■■■■■■■編集モーダル表示■■■■■■■■■■■■■■■■■■
//ﾊﾞﾂボダン
document.getElementById('close_editform_btn').addEventListener("click", () => {
    document.getElementById('edit-modal').classList.remove('active');
    document.body.classList.remove('no-scroll');
    return;
});

// 収入ラジオボタンが選ばれたら、編集用カテゴリーを「income」に書き換える
document.getElementById('edit_type-income').addEventListener('change', (e) => {
    if (e.target.checked) {
        updateCategoryMenu('income', 'edit_category');
    }
});

// 支出ラジオボタンが選ばれたら、編集用カテゴリーを「expense」に書き換える
document.getElementById('edit_type-expense').addEventListener('change', (e) => {
        if (e.target.checked) {
        updateCategoryMenu('expense', 'edit_category');
    }
});

// モーダルの保存
const saveBtn = document.getElementById('edit_btn');

saveBtn.addEventListener('click', async () => {

    // チェック（編集中のIDが空なら処理しない）
    if (!state.editingId) return;

    // 選択されているラジオボタンのvalueを取得
    const selectedType = document.querySelector('input[name="edit_transactions-type"]:checked').value;

    // フォームに入力された最新の値を取得する
    const updatedData = {
        type: selectedType, // income or expence
        date: document.getElementById('edit_date').value,
        amount: Number(document.getElementById('edit_amount').value),
        category: document.getElementById('edit_category').value,
        memo: document.getElementById('edit_memo').value
    };
    
    try {
        // ボタンを無効化
        saveBtn.disabled = true;

        // api.jsの関数を呼び出してSupabaseのデータを更新
        await updateTransaction(state.editingId, updatedData);

        // 成功したらモーダルを閉じる
        document.getElementById('edit-modal').classList.remove('active');
        document.body.classList.remove('no-scroll');

        // 編集中のIDをリセットする
        state.editingId = null;

        // データを再取得して再描画
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



//==========================================================================
//MFA
//==========================================================================
function setupMFAEvent() {
    const enrollBtn = document.getElementById('btn-mfa-enroll');
    const setupArea = document.getElementById('mfa-setup-area');
    const secretKeyElement = document.getElementById('mfa-secret-key');
    const verifyBtn = document.getElementById('btn-mfa-verify');
    const registeredArea = document.getElementById('mfa-registered-area');
    const unregisteredArea = document.getElementById('mfa-unregistered-area');



    let currentFactorId = null; // 発行されたMFAのIDを一時的に保存する変数

    if (enrollBtn) {
        enrollBtn.onclick = async () => {
            // SupabaseにMFAの秘密鍵を発行してもらう
            const mfaData = await enrollMFA();

            if (mfaData) {
                currentFactorId = mfaData.id;
                // 画面にシークレットキーを表示・入力エリアをオープン
                secretKeyElement.textContent = mfaData.totp.secret;
                setupArea.classList.add('active');
                enrollBtn.disabled = true; // 二重押し防止
            }
        };
    }

    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            const codeInput = document.getElementById('mfa-code-input').value;

            if (codeInput.length !== 6) {
                alert("6桁の数字を入力してください。");
                return;
            }

            // 6桁のコードを検証しに行く
            const success = await challengeAndVerifyMFA(currentFactorId, codeInput);

            if (success) {
                alert("🎉 二段階認証の設定が完全に完了しました！次回ログイン時からコードが必要になります。");
                unregisteredArea.classList.remove('active');
                registeredArea.classList.add('active');
            }
        });
    }
}

//mfaの登録状況をチェック
async function checkAndRenderMFA() {
    const unregisteredArea = document.getElementById('mfa-unregistered-area');
    const registeredArea = document.getElementById('mfa-registered-area');
    const activatedAtSpan = document.getElementById('mfa-activated-at');
    const unenrollBtn = document.getElementById('btn-mfa-unenroll');
    const setupArea = document.getElementById('mfa-setup-area');

    // Supabaseから現在のMFA登録状況をゲット
    const activeFactor = await getMFAStatus();

    if (activeFactor) {
        // すでに登録済みのパターン
        unregisteredArea?.classList.remove('active');
        registeredArea?.classList.add('active');
        

        // 登録日時を日本時間に変換して表示
        const enrollDate = new Date(activeFactor.created_at);
        if (activatedAtSpan) {
            activatedAtSpan.textContent = enrollDate.toLocaleString('ja-JP');
        }

        // 解除ボタンのイベント
        if (unenrollBtn) {
            unenrollBtn.onclick = async () => {
                if (!confirm("本当に二段階認証を解除しますか？\nアカウントのセキュリティ強度が低下します。")) return;

                const success = await unenrollMFA(activeFactor.id);
                if (success) {
                    alert("二段階認証を解除しました。");
                    // 画面を最新の状態にリフレッシュ
                    checkAndRenderMFA();
                }
            };
        }
    } else {
        // まだ未登録のパターン
        unregisteredArea?.classList.add('active');
        registeredArea?.classList.remove('active');
        //セットアップ関数を呼び出す（上にあり）
        setupMFAEvent();
    }
    
}