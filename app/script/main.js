//supabase
import { supabaseClient } from "@/common/config/supabase.js";

//トースト・モーダル・UI関連
import { showToast } from '@/common/ui/toast.js';
import { initPasswordResetModal } from '@/common/auth/resetPassModal.js';
import { setupHeaderMenu, setupTabNavigation } from '@/common/ui/navigation.js';
import { renderAppVersion } from '@/common/ui/renderAppVersion.js';

//ダッシュボード
import { setupDashboardEvents } from '@/features/dashboard/dashboardEvents.js';

//データ登録・明細テーブル
import { updateCategoryMenu } from '@/features/transactions/transactionForm.js';
import { setupTransactionEvents } from '@/features/transactions/transactionEvents.js';
import { fetchTransactions } from '@/features/transactions/transactionApi.js';

//=======ドロワーメニュー========

//カテゴリー設定
import { setupCategorySettingsEvents } from '@/features/categories/categoryApi.js';

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

    // 3. データ取得 & 描画
    //    fetchTransactions の中でカテゴリー取得・各メニュー・ダッシュボード・明細表まで描画される
    await fetchTransactions();
    updateCategoryMenu('expense', 'edit_category'); // 編集モーダル用

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