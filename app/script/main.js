//supabase
import { supabaseClient } from "@/common/config/supabase.js";

//トースト・モーダル・UI関連
import { showToast } from '@/common/ui/toast.js';
import { initPasswordResetModal } from '@/common/auth/resetPassModal.js';
import { setupHeaderMenu, setupTabNavigation } from '@/common/ui/navigation.js';
import { renderAppVersion } from '@/common/ui/renderAppVersion.js';

//ダッシュボード
import { setupDashboardEvents } from '@/features/dashboard/dashboardEvents.js';
import { getFilteredHistory } from '@/features/dashboard/dashboardUi.js';

//データ登録・明細テーブル
import { updateCategoryMenu, renderFilterCategoryDOM } from '@/features/transactions/transactionForm.js';
import { renderTableDOM } from '@/features/transactions/transactionUi.js';
import { setupTransactionEvents } from '@/features/transactions/transactionEvents.js';
import { fetchTransactions } from '@/features/transactions/transactionApi.js';

//=======ドロワーメニュー========

//カテゴリー設定
import { renderCategorySettingsDOM } from '@/features/categories/categoryUi.js';
import { fetchCategories, setupCategorySettingsEvents } from '@/features/categories/categoryApi.js';

//サブスク設定
import { fetchSubscriptions, setupSubscriptionEvents, checkAndProcessSubscriptions } from '@/features/subscriptions/subscriptionApi.js';

//アカウント設定
import { renderStaticUserInfo, setupLogoutEvent, setupAccountUpdateEvents, setupDeleteAccountEvent } from '@/features/accountSettings/settingsUi.js';

//==============================

//mfa
import { checkAndRenderMFA } from '@/common/auth/mfaUi.js';

// ■■■■■■■■■■■■■■■■■■ 初期化処理 ■■■■■■■■■■■■■■■■■■
async function checkLoginAndInit() {
    // 1. 認証チェック（並列実行）
    const [{ data: { user } }, { data: mfaData }] = await Promise.all([
        supabaseClient.auth.getUser(),
        supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel()
    ]);

    if (!user) {
        window.location.href = './login/index.html';
        return;
    }

    const isBackupPassed = sessionStorage.getItem('mfa_verified_by_backup') === 'true';
    if (mfaData?.currentLevel === 'aal1' && mfaData?.nextLevel === 'aal2' && !isBackupPassed) {
        window.location.href = './login/index.html';
        return;
    }

    // 2. UI初期描画 & イベントの初期バインド
    renderStaticUserInfo(user);
    bindStaticEvents();

    // 3. データ取得（並列実行）
    await Promise.all([
        loadCategoryData(),
        fetchTransactions()
    ]);

    // 4. メイン表示の初期化
    const data = getFilteredHistory();
    renderTableDOM(data);

    initPasswordResetModal();
    runSubscriptionTasks(); // バックグラウンドで非同期実行

    showToast(`${user.email} でログインしました`, 'success');
}

// 静的UIイベントの一括バインド
function bindStaticEvents() {
    setupHeaderMenu();
    setupTabNavigation();
    renderAppVersion();
    setupDashboardEvents();
    setupTransactionEvents();
    setupLogoutEvent();
    setupAccountUpdateEvents();
    setupDeleteAccountEvent();
    setupSubscriptionEvents();
    setupCategorySettingsEvents();
    checkAndRenderMFA();
}

// カテゴリデータの読み込みとDOM構築
async function loadCategoryData() {
    await fetchCategories();
    renderCategorySettingsDOM();
    updateCategoryMenu('expense', 'category');      // 登録用
    updateCategoryMenu('expense', 'edit_category'); // 編集用
    renderFilterCategoryDOM();                      // フィルター用
}

// サブスク処理（バックグラウンド実行）
async function runSubscriptionTasks() {
    fetchSubscriptions();
    const processed = await checkAndProcessSubscriptions();
    if (processed) {
        await fetchTransactions();
    }
}

// ■■■■■■■■■■■■■■■■■■ アプリケーション起動 ■■■■■■■■■■■■■■■■■■
checkLoginAndInit();