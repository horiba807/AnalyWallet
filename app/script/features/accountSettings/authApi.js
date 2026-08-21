import { supabaseClient } from "@/common/config/supabase.js";
import { state, moneyForm } from '@/common/state/state.js';
import { showToast } from '@/common/ui/toast.js';
import { showConfirm } from "@/common/ui/confirmModal.js";

//==========================================================================
// アカウント設定（メールアドレス・パスワード変更）
//==========================================================================

// メールアドレスの変更リクエスト
export async function updateUserEmail(newEmail) {
    const { data, error } = await supabaseClient.auth.updateUser({
        email: newEmail
    },
    {
        emailRedirectTo: 'https://analywallet.com/app/index.html'
    });

    if (error) {
        showToast(`メールアドレスの変更に失敗しました:\n${error.message}`, 'error');
        return false;
    }
    return true;
}

// パスワードの変更
export async function updateUserPassword(currentEmail, currentPassword, newPassword) {
    // 1. 現在のパスワードが正しいか検証（ログイン試行）
    const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
    });

    if (verifyError) {
        showToast("現在のパスワードが正しくありません。", 'error');
        return false;
    }

    // 2. 新しいパスワードを適用
    const { error: updateError } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (updateError) {
        showToast(`パスワードの変更に失敗しました:\n${updateError.message}`, 'error');
        return false;
    }

    return true;
}