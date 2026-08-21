import { supabaseClient } from "@/common/config/supabase.js";
import { showToast } from '@/common/ui/toast.js';
import { showConfirm } from "@/common/ui/confirmModal.js";

//==========================================================================
// MFA（二要素認証）基本機能
//==========================================================================

// MFAキーの発行
export async function enrollMFA() {
    const { data, error } = await supabaseClient.auth.mfa.enroll({
        factorType: 'totp'
    });

    if (error) {
        showToast(`エラーが発生しました:\n${error.message}`, 'error');
        return null;
    }

    return data;
}

// MFAの有効化・検証
export async function challengeAndVerifyMFA(factorId, code) {
    const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
        factorId: factorId
    });

    if (challengeError) {
        showToast(`エラーが発生しました:\n${challengeError.message}`, 'error');
        return false;
    }

    const { error: verifyError } = await supabaseClient.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: code
    });

    if (verifyError) {
        showToast(`コードが正しくありません:\n${verifyError.message}`, "error");
        return false;
    }

    return true;
}

// MFAの登録状況を取得
export async function getMFAStatus() {
    const { data, error } = await supabaseClient.auth.mfa.listFactors();

    if (error) {
        showToast(`エラーが発生しました:\n${error.message}`, "error");
        return null;
    }

    const activeFactor = data.all.find(
        factor => factor.factor_type === 'totp' && factor.status === 'verified'
    );

    return activeFactor;
}

// MFAを解除する
export async function unenrollMFA(factorId) {
    const { error } = await supabaseClient.auth.mfa.unenroll({
        factorId: factorId
    });

    if (error) {
        console.error("MFA解除エラー:", error.message);
        showToast(`二段階認証の解除に失敗しました:\n${error.message}`, "error");
        return false;
    }

    // バックアップコードの削除
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        await supabaseClient.from('mfa_backup_codes').delete().eq('user_id', user.id);
    }

    return true;
}