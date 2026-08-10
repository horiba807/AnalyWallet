import { createClient } from '@supabase/supabase-js';
import { supabaseClient } from './supabase.js';
import { categoryOptions } from './constant.js';
import { updateHistoryDisplay, updateCategoryMenu, calculateStats, renderFilterCategoryDOM, renderCategorySettingsDOM } from './ui.js';
import { fetchTransactions, deleteTransaction, openEditModal, updateTransaction, fetchCategories, setupCategorySettingsEvents,
        setupSubscriptionEvents, fetchSubscriptions, checkAndProcessSubscriptions, enrollMFA, challengeAndVerifyMFA,
    getMFAStatus, unenrollMFA, updateUserEmail, updateUserPassword, deleteAccount, createAndSaveBackupCodes, getUnusedBackupCodesCount, setupBackupAccordion, showGeneratedBackupCodes, updateBackupCount } from './api.js';
window.deleteTransaction = deleteTransaction; // グローバルスコープをモジュールスコープに変更
window.openEditModal = openEditModal;
import { state, moneyForm } from './state.js';
import { showToast, showConfirm } from './toast.js';

//■■■■■■■■■■■■■■■■■■ ログアウト処理 ■■■■■■■■■■■■■■■■■■
async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout Error:", error.message);
        showToast(`ログアウトに失敗しました:\n${error.message}`, error);
        return false;
    }

    console.log("ログアウト成功");
    return true;
}
function setupLogoutEvent() {
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            // 自作モーダル
            const isConfirmed = await showConfirm("ログアウトしますか？", "ログアウト", "キャンセル", "ログアウトする", true);
            // キャンセルされたら処理を抜ける
            if (!isConfirmed) return;

            // api.js のログアウト処理を実行
            const success = await logoutUser();

            if (success) {
                // ログイン画面へジャンプ
                window.location.href = './login/index.html';
            }
        });
    }
}
//■■■■■■■■■■■■■■■■■■ 初期化処理 ■■■■■■■■■■■■■■■■■■
const initialBtn = document.querySelector(`.month_btn[data-month="${state.currentMonth}"]`);
if (initialBtn) initialBtn.classList.add('active');

async function checkLoginAndInit() {
    // =============================================================
    // 認証チェック（最優先・2つの通信を並列実行）
    // =============================================================
    const [{ data: { user } }, { data: mfaData }] = await Promise.all([
        supabaseClient.auth.getUser(),
        supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel()
    ]);

    // 未ログインチェック
    if (!user) {
        window.location.href = './login/index.html';
        return;
    }

    // MFAチェック
    const isBackupPassed = sessionStorage.getItem('mfa_verified_by_backup') === 'true';
    if (mfaData?.currentLevel === 'aal1' && mfaData?.nextLevel === 'aal2' && !isBackupPassed) {
        window.location.href = './login/index.html';
        return;
    }

    // =============================================================
    // UI読み込み
    // =============================================================
    renderStaticUserInfo(user);
    bindStaticEvents();

    // =============================================================
    // データ取得（Promise.allで同時並列実行）
    // =============================================================
    // カテゴリと取引履歴を同時に取得開始する
    await Promise.all([
        loadCategoryData(),
        fetchTransactions()
    ]);

    // =============================================================
    // バックグラウンド処理（画面表示を邪魔しない）
    // =============================================================
    // サブスク関連は画面表示後に非同期で回す (awaitしない)
    runSubscriptionTasks();

    showToast(`${user.email} でログインしました`, 'success');
}

// -----------------------------------------------------------------
// 補助関数：Static UIの描画
// -----------------------------------------------------------------
function renderStaticUserInfo(user) {
    const emailSpan = document.getElementById('current-email');
    if (emailSpan) emailSpan.textContent = user.email;

    const createDateSpan = document.getElementById('created-at');
    if (createDateSpan && user.created_at) {
        createDateSpan.textContent = new Date(user.created_at).toLocaleString('ja-JP');
    }

    const lastLoginDate = document.getElementById('last-login');
    if (lastLoginDate && user.last_sign_in_at) {
        lastLoginDate.textContent = new Date(user.last_sign_in_at).toLocaleString('ja-JP');
    }

    const userIdSpan = document.getElementById('userID');
    if (userIdSpan) userIdSpan.textContent = user.id;
}

// -----------------------------------------------------------------
// 補助関数：イベント登録の一括セットアップ
// -----------------------------------------------------------------
function bindStaticEvents() {
    setupLogoutEvent();
    checkAndRenderMFA();
    setupAccountUpdateEvents();
    setupDeleteAccountEvent();
    setupSubscriptionEvents();
    setupCategorySettingsEvents();
}

// -----------------------------------------------------------------
// 補助関数：カテゴリデータの読み込みとDOM構築
// -----------------------------------------------------------------
async function loadCategoryData() {
    await fetchCategories();
    renderCategorySettingsDOM();
    updateCategoryMenu('expense', 'category');      // 登録用
    updateCategoryMenu('expense', 'edit_category'); // 編集用
    renderFilterCategoryDOM();                     // フィルター用
}

// -----------------------------------------------------------------
// 補助関数：サブスク処理（バックグラウンド実行）
// -----------------------------------------------------------------
async function runSubscriptionTasks() {
    fetchSubscriptions();
    // サブスク自動登録を実行し、もし新しく登録されたら履歴を再読み込みする
    const processed = await checkAndProcessSubscriptions();
    if (processed) {
        await fetchTransactions(); // 自動追加があった場合のみ履歴更新
    }
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
    const icon = document.getElementById('menuIcon');
    const headerNav = document.getElementById('sm_navlist');
    const headerLogo = document.getElementById('header-logo');
    const headerNavList = document.getElementById('header-nav');

    headerMenu.classList.toggle('active');
    headerNav.classList.toggle('remove');

    if (headerMenu.classList.contains('active')) {
        // メニューが開いたとき
        icon.textContent = "close";                  
        document.body.classList.add('no-scroll');// 背景をロック
        headerLogo.classList.add('no-display');
        headerNavList.classList.add('no-display');

    } else {
        // メニューが閉じたとき
        icon.textContent = "menu";                   
        document.body.classList.remove('no-scroll'); 
        headerLogo.classList.remove('no-display');
        headerNavList.classList.remove('no-display');


    }
});

// 1. 画面内にあるすべてのメニューボタン（.menu-btn）を取得する
const menuButtons = document.querySelectorAll('.drawer-menu__tab.btn');

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

    if (error) showToast(`保存に失敗しました\n\n${error.message}`, 'error');

    else {
        showToast('データを保存しました', 'success'); 
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

        showToast('変更を保存しました', 'success');


    } catch (error) {
        showToast(`変更の保存に失敗しました\n${error.message}`, 'error');
     } 
     finally {
        // ボタンを元に戻す
        saveBtn.disabled = false;
    }
});


//==========================================================================
//メアド変更・パスワード変更
//==========================================================================
function setupAccountUpdateEvents() {
    const updateEmailForm = document.getElementById('form-update-email');
    const updatePasswordForm = document.getElementById('form-update-password');

    // 1. メールアドレス変更の送信
    if (updateEmailForm) {
        updateEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newEmail = document.getElementById('input-new-email').value;

            // 自作モーダル
            const isConfirmed = await showConfirm(`メールアドレスを ${newEmail} に変更しますか？`, "確認", "キャンセル", "変更する", false);
            if (!isConfirmed) return;

            const success = await updateUserEmail(newEmail);
            if (success) {
                // 💡 注意：デフォルト設定では即座に変更されません（後述の注意点参照）
                showToast(`${newEmail} に確認メールを送信しました。メールをご確認ください。`, success);
                updateEmailForm.reset();
            }
        });
    }

    // 2. パスワード変更の送信
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. 現在ログインしているユーザー情報を取得（メールアドレスが必要なため）
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;

            const currentPassword = document.getElementById('input-current-password').value;
            const newPassword = document.getElementById('input-new-password').value;

            // 2. バリデーション（入力チェック）
            if (newPassword.length < 12) {
                showToast('新しいパスワードは、12文字以上で入力してください', "error");
                return;
            }

            if (currentPassword === newPassword) {
                showToast('新しいパスワードは、現在のパスワードと異なるものを入力してください', "error");
                return;
            }

            const isConfirmed = await showConfirm(`パスワードを変更しますか？`, "確認", "キャンセル", "変更する", false);
            if (!isConfirmed) return;

            // 3. 検証＆変更処理の実行
            const success = await updateUserPassword(user.email, currentPassword, newPassword);

            if (success) {
                showToast('パスワードを変更しました', "success");
                updatePasswordForm.reset(); // 入力欄をきれいに掃除
            }
        });
    }
}
//==========================================================================
//MFA認証
//==========================================================================
// MFA新規登録のイベント設定
function setupMFAEvent() {
    const enrollBtn = document.getElementById('btn-mfa-enroll');
    const setupArea = document.getElementById('mfa-setup-area');
    const secretKeyElement = document.getElementById('mfa-secret-key');
    const verifyBtn = document.getElementById('btn-mfa-verify');
    const registeredArea = document.getElementById('mfa-registered-area');
    const unregisteredArea = document.getElementById('mfa-unregistered-area');

    let currentFactorId = null;

    if (enrollBtn) {
        enrollBtn.onclick = async () => {
            const mfaData = await enrollMFA();

            if (mfaData) {
                currentFactorId = mfaData.id;
                if (secretKeyElement) secretKeyElement.textContent = mfaData.totp.secret;
                if (setupArea) setupArea.classList.add('active');
                enrollBtn.disabled = true;
            }
        };
    }

    if (verifyBtn) {
        verifyBtn.onclick = async () => {
            const codeInput = document.getElementById('mfa-code-input').value;

            if (codeInput.length !== 6) {
                showToast('6桁の数字を入力してください', 'error'); // 💡 文字列に修正
                return;
            }

            // 6桁コードの検証
            const success = await challengeAndVerifyMFA(currentFactorId, codeInput);

            if (success) {
                showToast('二段階認証を設定しました', "success");

                // 画面切り替え
                unregisteredArea?.classList.remove('active');
                registeredArea?.classList.add('active');

                // アコーディオンのイベントを初期設定
                setupBackupAccordion();

                // バックアップコードを生成・保存して画面表示
                const backupCodes = await createAndSaveBackupCodes();
                if (backupCodes) {
                    showGeneratedBackupCodes(backupCodes);
                    await updateBackupCount();
                }
            }
        };
    }
}

// MFAの登録状況をチェックして画面を描画
async function checkAndRenderMFA() {
    const unregisteredArea = document.getElementById('mfa-unregistered-area');
    const registeredArea = document.getElementById('mfa-registered-area');
    const activatedAtSpan = document.getElementById('mfa-activated-at');
    const unenrollBtn = document.getElementById('btn-mfa-unenroll');

    const activeFactor = await getMFAStatus();

    if (activeFactor) {
        // 【パターンA：すでに登録済みの場合】
        unregisteredArea?.classList.remove('active');
        registeredArea?.classList.add('active');

        // 登録日時の表示
        const enrollDate = new Date(activeFactor.created_at);
        if (activatedAtSpan) {
            activatedAtSpan.textContent = enrollDate.toLocaleString('ja-JP');
        }

        // アコーディオンのイベント登録 ＆ 残数表示
        setupBackupAccordion();
        await updateBackupCount();

        // 解除ボタンのイベント
        if (unenrollBtn) {
            unenrollBtn.onclick = async () => {
                const isConfirmed = await showConfirm(
                    `本当に二段階認証を解除しますか？\nアカウントのセキュリティ強度が低下します。`,
                    "確認", "キャンセル", "解除する", true
                );
                if (!isConfirmed) return;

                const success = await unenrollMFA(activeFactor.id);
                if (success) {
                    showToast('二段階認証を解除しました', "success");
                    checkAndRenderMFA();
                }
            };
        }
    } else {
        // 【パターンB：まだ未登録の場合】
        unregisteredArea?.classList.add('active');
        registeredArea?.classList.remove('active');
        setupMFAEvent();
    }
}

//==========================================================================
//アカウント削除
//==========================================================================
function setupDeleteAccountEvent() {
    const deleteBtn = document.getElementById('btn-delete-account');

    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            // 🛑 誤操作防止の2段階チェック
            const isConfirmed = await showConfirm(`本当にアカウントを削除しますか？\nこの操作は取り消せません。`, "警告", "キャンセル", "アカウントを削除する", true);
            if (!isConfirmed) return;

            // 処理を実行
            const success = await deleteAccount();

            if (success) {
                showToast('アカウント削除しました。\nご利用ありがとうございました。', "success");
                // すでにアカウントは存在しない（ログアウト状態）ので、ログイン画面へジャンプ
                window.location.href = './login/index.html';
            }
        };
    }
}