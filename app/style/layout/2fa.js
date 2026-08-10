import { showToast, showConfirm } from './toast.js';
import { supabaseClient } from "./supabase.js";
import pkg from '../../package.json';

//==========================================================================
// バックアップコード生成
//==========================================================================

// 2. 簡易ハッシュ化（SHA-256）
async function hashCode(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 3. 2FAセットアップ完了時に実行する処理
export async function saveAndShowBackupCodes() {
    const rawCodes = generateBackupCodes(10);
    const { data: { user } } = await supabase.auth.getUser();

    // データベースにハッシュ化したコードを保存
    const insertData = await Promise.all(
        rawCodes.map(async (code) => ({
            user_id: user.id,
            code_hash: await hashCode(code)
        }))
    );

    const { error } = await supabase.from('mfa_backup_codes').insert(insertData);

    if (!error) {
        // 💡 画面上に平文の rawCodes を1回だけ表示し、ダウンロードや手書き保存を促す
        console.log("生成されたバックアップコード（保管用）:", rawCodes);
        // モーダルや画面上に rawCodes を表示する処理を記述
    }
}
//==========================================================================
// バックアップコード認証
//==========================================================================
// バックアップコードでの認証実行処理
async function verifyBackupCode(inputCode) {
    const inputHash = await hashCode(inputCode.trim().toUpperCase());

    const { data: isValid, error } = await supabase.rpc('verify_and_use_backup_code', {
        p_code_hash: inputHash
    });

    if (isValid) {
        alert('バックアップコードによる認証に成功しました');
        // ログイン後の画面へ遷移
    } else {
        alert('コードが無効か、すでに使用されています');
    }
}