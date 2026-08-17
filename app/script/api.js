import { supabaseClient } from "./supabase.js";
import { state, moneyForm } from './state.js';
import { updateHistoryDisplay, updateCategoryMenu, renderCategorySettingsDOM, renderFilterCategoryDOM, renderSubscriptionsDOM } from './ui.js';
import { showToast, showConfirm } from './toast.js';

export async function fetchTransactions() {
    // ⭕️ 1. まずSupabaseからカテゴリーを取得し、画面の初期描画をすべて行う
    await fetchCategories();
    renderCategorySettingsDOM(); // 管理リストを描画
    renderFilterCategoryDOM();   // 履歴のフィルターを描画
    // 初期表示として、ひとまず「支出（expense）」の登録プルダウンを作っておく
    updateCategoryMenu('expense', 'category');

    // 2. そのあと、既存の家計簿データを取得して履歴テーブルを描画する
    const { data, error } = await supabaseClient.from('transactions').select('*');
    if (data) {
        state.transactions = data;
    }
    if (error) {
        console.error("読み込みエラー:", error);
    } else {
        state.history = data || [];
        updateHistoryDisplay();
    }
};

//ヒストリー：項目削除
export async function deleteTransaction(id) {
    const isConfirmed = await showConfirm(`#${id} を本当に削除しますか？`, "確認", "キャンセル", "削除する", true);
    if (!isConfirmed) return;
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
    if (error) showToast(`#${id} の削除に失敗しました:\n${error}`, "error");
    else fetchTransactions();
    showToast(`#${id} を削除しました`,"success");
}

//==========================================================================
//編集モーダル
//==========================================================================
export async function openEditModal(id){ 
    // 1. 全データの中から、クリックされたIDと一致するものを1件探す
    const target = state.transactions.find(item => item.id == id);
    // if (!target) return;
    if (!target) {
        return;
    }
    // 2. stateに記録
    state.editingId = id;

    const registerIdElement = document.getElementById('register-id');
    if (registerIdElement) {
        registerIdElement.textContent = `#${state.editingId}`;
    }

    // 3. モーダル内の入力欄に、現在の値をセットする

    // ラジオボタン
    if (target.type === 'income') {
        document.getElementById('edit_type-income').checked = true;
    } else if (target.type === 'expense') {
        document.getElementById('edit_type-expense').checked = true;
    }

    // 共通関数で編集用のドロップダウン（edit_category）を作り直す
    updateCategoryMenu(target.type, 'edit_category');


    document.getElementById('edit_date').value = target.date;
    document.getElementById('edit_category').value = target.category;
    document.getElementById('edit_amount').value = target.amount;
    document.getElementById('edit_memo').value = target.memo;
    // 4. モーダルを表示する
    document.getElementById('edit-modal').classList.add('active');
    document.body.classList.add('no-scroll');
}

// 項目の更新
export async function updateTransaction(id, updatedData) {
    // 指定したIDのデータを更新する
    const { data, error } = await supabaseClient
        .from('transactions')
        .update(updatedData)
        .eq('id', id)
        .select();

    if (error) {
        console.error('Supabaseの更新でエラー発生:', error);
        throw error;
    }
    return data;
}

// Supabaseからカテゴリー一覧を取得
export async function fetchCategories() {
    // 1. categoriesテーブルからデータを全件取得
    const { data, error } = await supabaseClient
        .from('categories')
        .select('*');

    if (error) {
        console.error("カテゴリーの読み込みエラー:", error);
        return;
    }

    // 2. state のカテゴリー情報を初期化
    state.categories = {
        expense: [],
        income: []
    };

    // 3. 取ってきたデータをvalue と labelに変換
    data.forEach(item => {
        const formatted = {
            value: String(item.id), // IDを value にする
            label: item.name,       // カテゴリー名を label にする
            isCarryOver: Boolean(item.is_carry_over)
        };

        if (item.type === 'expense') {
            state.categories.expense.push(formatted);
        } else if (item.type === 'income') {
            state.categories.income.push(formatted);
        }
    });

}


///


// 🔄 カテゴリーが更新されたら、アプリ内のすべてのセレクトボックスやリストを一斉更新するヘルパー
async function refreshCategories_kanpa() {
    // 1. Supabaseから最新のカテゴリーを再取得して state.categories を更新（既存の関数を呼ぶ）
    await fetchCategories();
    // 2. 関連するすべてのUIを一斉リフレッシュ
    renderCategorySettingsDOM(); // 今回の管理リスト    
    // 現在フォームで選ばれている収支タイプ（支出 or 収入）のプルダウンを更新する
    const currentType = document.querySelector('input[name="transaction-type"]:checked')?.value || 'expense';
    updateCategoryMenu(currentType, 'category');
    updateCategoryMenu('expense', 'edit_category'); // 編集用モーダルも一応更新
    renderFilterCategoryDOM();   // 履歴テーブルのフィルター
}

// カテゴリーの追加処理
async function handleAddCategory(type) {
    const inputId = type === 'expense' ? 'new-expense-name' : 'new-income-name';
    const inputElement = document.getElementById(inputId);
    const name = inputElement.value.trim();

    if (!name) {
        showToast('カテゴリー名を入力してください', 'error');
        return;
    }

    // ⭕️ 【追加1】収入カテゴリーの場合、調整用チェックボックスの状態を取得
    const carryoverCheckbox = document.getElementById('new-income-carryover');
    const isCarryOver = (type === 'income' && carryoverCheckbox) ? carryoverCheckbox.checked : false;

    // 重複チェック
    const isDuplicate = state.categories[type].some(cat => cat.label === name);
    if (isDuplicate) {
        alert('すでに同じ名前のカテゴリーが存在します。');
        return;
    }

    // 1. 現在ログインしているユーザーの情報をSupabaseから取得する
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert('ユーザー情報の取得に失敗したか、ログインセッションが切れています。');
        return;
    }

    // Supabaseへデータを挿入
    const { error } = await supabaseClient
        .from('categories')
        .insert([{
            name: name,
            type: type,
            is_carry_over: isCarryOver, // ⭕️ 【追加2】調整用フラグを保存
            user_id: user.id
        }]);

    if (error) {
        console.error('error:', error);
        showToast(`カテゴリーの追加に失敗しました\n${error.message || error}`, 'error');
        return;
    }

    showToast(`カテゴリー「${name}」を追加しました`, "success");

    // 入力フォームのリセット
    inputElement.value = '';
    if (carryoverCheckbox) carryoverCheckbox.checked = false; // ⭕️ 【追加3】チェックボックスを未チェックに戻す

    await refreshCategories_kanpa(); // UI更新
}

// 🗑️ カテゴリーの削除処理（対策A）
async function handleDeleteCategory(id, label) {
    const isUsed = state.history.some(item => String(item.category) === String(id));

    if (isUsed) {
        showToast(`カテゴリー「${label}」はすでに家計簿データで使用されているため、削除できません。`, "error");
        return;
    }

    // 確認アラート
    const isConfirmed = await showConfirm(`カテゴリー「${label}」を削除しますか？`, "確認", "キャンセル", "削除する", true);
    if (!isConfirmed) return;

    // Supabaseから削除
    const { error } = await supabaseClient
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('削除失敗:', error);
        showToast(`削除に失敗しました\n${error}`, error);
        return;
    }

    await refreshCategories_kanpa(); // UI更新
    showToast(`カテゴリー「${label}」を削除しました`, "success");
}

// 🔌 イベントリスナーを一括設定する関数（アプリ起動時に1回呼ぶ）
export function setupCategorySettingsEvents() {
    // 追加ボタンのイベント紐付け
    document.getElementById('add-expense-btn')?.addEventListener('click', () => handleAddCategory('expense'));
    document.getElementById('add-income-btn')?.addEventListener('click', () => handleAddCategory('income'));

    // ゴミ箱ボタンのイベント紐付け（イベントデリゲーションという賢い手法を使います）
    const handleListClick = (e) => {
        const deleteBtn = e.target.closest('.category-settings__delete-btn');
        if (!deleteBtn) return; // ゴミ箱以外がクリックされたら無視

        const id = deleteBtn.dataset.id;
        const label = deleteBtn.dataset.label;
        handleDeleteCategory(id, label);
    };

    document.getElementById('expense-category-list')?.addEventListener('click', handleListClick);
    document.getElementById('income-category-list')?.addEventListener('click', handleListClick);
}


//サブスク管理

// 1. Supabaseからサブスク一覧を取得して画面に描画
export async function fetchSubscriptions() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

    if (error) {
        console.error("サブスク読み込みエラー:", error);
        return;
    }

    state.subscriptions = data || [];
    renderSubscriptionsDOM(); // 👈 ステップ3で作るUI描画関数
}

// 2. 新しいサブスクを登録する
async function handleAddSubscription(e) {
    e.preventDefault(); // リロード防止

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const nameInput = document.getElementById('subsc-name');
    const amountInput = document.getElementById('subsc-amount');
    const daySelect = document.getElementById('subsc-day');

    const newSubsc = {
        user_id: user.id,
        name: nameInput.value.trim(),
        amount: Number(amountInput.value),
        billing_day: Number(daySelect.value),
        last_charged_month: "" // 初期状態は空文字
    };

    const { error } = await supabaseClient
        .from('subscriptions')
        .insert([newSubsc]);

    if (error) {
        console.error("サブスク登録失敗:", error);
        showToast(`登録に失敗しました\n${error}`, error);
        return;
    }

    showToast(`「${newSubsc.name}」を登録しました`, "success");

    // フォームをリセットして最新一覧を再取得
    document.getElementById('subsc-form').reset();
    await fetchSubscriptions();
}

// 3. サブスクを削除する
async function handleDeleteSubscription(id, name) {
    const isConfirmed = await showConfirm(`「${name}」のサブスク登録を解除しますか？\n（※これまでの家計簿データは消えません）`, "確認", "キャンセル", "削除する", true);
    if (!isConfirmed) return;

    const { error } = await supabaseClient
        .from('subscriptions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("サブスク削除失敗:", error);
        alert("削除に失敗しました。");
        return;
    }

    await fetchSubscriptions(); // 最新一覧に更新
    showToast(`「${name}」を削除しました`, "success");
}

// 4. サブスク画面のイベントリスナーを一括設定する
export function setupSubscriptionEvents() {
    // フォームの送信（登録ボタン）
    document.getElementById('subsc-form')?.addEventListener('submit', handleAddSubscription);

    // ゴミ箱ボタンのクリック（イベントデリゲーション）
    document.getElementById('subsc-list')?.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.subsc-settings__delete-btn');
        if (!deleteBtn) return;

        const id = deleteBtn.dataset.id;
        const name = deleteBtn.dataset.name;
        handleDeleteSubscription(id, name);
    });
}


//サブスクを追加する
export async function checkAndProcessSubscriptions() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // 1. 登録されているサブスク一覧をSupabaseから取得
    const { data: subs, error } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

    if (error || !subs || subs.length === 0) return;

    // ==========================================================
    // 2. ⭕️「サブスク」カテゴリーを自動チェック＆作成（DB直接確認方式）
    // ==========================================================
    // 💡 stateから探すのをやめて、Supabaseに直接「すでにあるか」を問い合わせる
    const { data: existingCat, error: findError } = await supabaseClient
        .from('categories') // ◀ お使いのカテゴリーテーブル名
        .select('*')
        .eq('user_id', user.id)
        .eq('name', 'サブスク') // ◀「サブスク」という名前の
        .eq('type', 'expense') // ◀ 支出カテゴリーがあるか？
        .maybeSingle(); // あれば1件取得、なければ null が返ってくる

    if (findError) {
        console.error("カテゴリーの重複チェックに失敗しました:", findError);
        return;
    }

    let categoryId;

    // データベースにまだ「サブスク」が無かった場合だけ、新しく作る
    if (!existingCat) {
        console.log("「サブスク」カテゴリーがデータベースに無いため、1回目のみ自動作成します...");

        const { data: newCat, error: catError } = await supabaseClient
            .from('categories')
            .insert([{
                user_id: user.id,
                name: 'サブスク',
                type: 'expense'
            }])
            .select()
            .single();

        if (catError) {
            console.error("サブスクカテゴリーの自動作成に失敗しました:", catError);
            return;
        }

        // 新しく作られた通し番号をセット
        categoryId = newCat.id;
        console.log(`「サブスク」カテゴリーを新規作成しました。ID: ${categoryId}`);

        // アプリ全体のカテゴリー情報を最新にする（関数があれば実行）
        if (typeof fetchCategories === 'function') await fetchCategories();

    } else {
        //すでにデータベースにあれば、その通し番号をそのまま使い回す！
        categoryId = existingCat.id;
        console.log(`既存の「サブスク」カテゴリー（ID: ${categoryId}）を使用します。`);
    }
    // ==========================================================

    // 3. 今日の日付情報を取得
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentDay = today.getDate();
    const currentYearMonth = `${currentYear}-${currentMonth}`;

    let hasAddedNewTransaction = false;

    // 4. サブスクを1件ずつチェック
    for (const sub of subs) {
        if (currentDay >= sub.billing_day && sub.last_charged_month !== currentYearMonth) {

            // A. transactions（家計簿）テーブルに支出として自動挿入
            const { error: insertError } = await supabaseClient
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: 'expense',
                    category: categoryId, // ◀ 1回目でも2回目でも、正しいIDがここに入ります
                    amount: sub.amount,
                    memo: `${sub.name}（自動追加）`,
                    date: `${currentYear}-${currentMonth}-${String(sub.billing_day).padStart(2, '0')}`
                }]);

            if (insertError) {
                console.error(`${sub.name} の自動追加に失敗:`, insertError);
                continue;
            }

            // B. 二重登録を防ぐため更新
            await supabaseClient
                .from('subscriptions')
                .update({ last_charged_month: currentYearMonth })
                .eq('id', sub.id);

            hasAddedNewTransaction = true;
        }
    }

    if (hasAddedNewTransaction && typeof fetchTransactions === 'function') {
        await fetchTransactions();
    }
}

//==========================================================================
//メアド変更
//==========================================================================
// 📧 メールアドレスの変更をリクエストする
export async function updateUserEmail(newEmail) {
    const { data, error } = await supabaseClient.auth.updateUser({
        email: newEmail
    });

    if (error) {
        alert(`メールアドレスの変更に失敗しました: ${error.message}`);
        return false;
    }
    return true;
}

//==========================================================================
//パスワード変更
//==========================================================================
// 🔑 パスワードを変更する
export async function updateUserPassword(currentEmail, currentPassword, newPassword) {
    // 🛡️ 第1関門：現在のパスワードが正しいか、裏でログインを試みて検証する
    const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
    });

    // パスワードが間違っている場合は、ここで即終了
    if (verifyError) {
        alert("現在のパスワードが正しくありません。");
        return false;
    }

    // 🚀 第2関門：検証が通ったので、新しいパスワードを適用する
    const { error: updateError } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (updateError) {
        alert(`パスワードの変更に失敗しました: ${updateError.message}`);
        return false;
    }

    return true;
}

//==========================================================================
//MFA認証
//==========================================================================

//==========================================================================
// Web Crypto API による暗号化・復号化ヘパー関数
//==========================================================================

// 暗号化に使用する秘密鍵（※運用時は環境変数等から取得することを推奨）
const ENCRYPTION_SECRET = "Your-App-Secret-Key-2026";

async function getCryptoKey() {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(ENCRYPTION_SECRET),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("mfa-backup-salt"),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// 生コードを暗号化
async function encryptText(text) {
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoded
    );

    return {
        encryptedCode: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
        iv: btoa(String.fromCharCode(...iv))
    };
}

// 暗号化データを復号化して元の文字列に戻す
export async function decryptText(encryptedBase64, ivBase64) {
    try {
        const key = await getCryptoKey();
        const ciphertext = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error("復号化失敗:", e);
        return null;
    }
}

// ランダムな8桁コード生成ユーティリティ
function generateBackupCodes(count = 10) {
    const codes = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < count; i++) {
        let code = '';
        for (let j = 0; j < 8; j++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
}

//==========================================================================
// MFA基本機能
//==========================================================================

// MFAキーの発行
export async function enrollMFA() {
    const { data, error } = await supabaseClient.auth.mfa.enroll({
        factorType: 'totp'
    });

    if (error) {
        showToast(`エラーが発生しました。時間を空けて再度お試しください。:\n${error.message}`, 'error');
        return null;
    }

    return data;
}

// MFAの有効化
export async function challengeAndVerifyMFA(factorId, code) {
    const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
        factorId: factorId
    });

    if (challengeError) {
        showToast(`エラーが発生しました\n${challengeError.message}`, 'error');
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

//==========================================================================
// バックアップコード
//==========================================================================

// 💡 【更新】バックアップコードを発行して「可逆暗号化」でDB保存する
export async function createAndSaveBackupCodes() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const rawCodes = generateBackupCodes(10);

    // 暗号化処理
    const insertData = await Promise.all(
        rawCodes.map(async (code) => {
            const { encryptedCode, iv } = await encryptText(code);
            return {
                user_id: user.id,
                encrypted_code: encryptedCode,
                iv: iv
            };
        })
    );

    // 古いコードをクリアして新規保存
    await supabaseClient.from('mfa_backup_codes').delete().eq('user_id', user.id);
    const { error } = await supabaseClient.from('mfa_backup_codes').insert(insertData);

    if (error) {
        console.error("バックアップコード保存エラー:", error.message);
        showToast(`バックアップコードの生成に失敗しました:\n  ${error.message}`, "error");
        return null;
    }

    return rawCodes;
}

// 💡 【新規追加】DBから暗号化コードを取得し、復号して画面表示用データを返す
export async function fetchAndDecryptBackupCodes() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
        .from('mfa_backup_codes')
        .select('encrypted_code, iv, used_at')
        .eq('user_id', user.id);

    if (error || !data) return [];

    // 暗号化データを復号
    const decryptedList = await Promise.all(
        data.map(async (item) => {
            const rawCode = await decryptText(item.encrypted_code, item.iv);
            return {
                code: rawCode,
                isUsed: !!item.used_at // used_at に日付があれば使用済み
            };
        })
    );

    return decryptedList;
}

// 未使用のバックアップコード件数を取得する
export async function getUnusedBackupCodesCount() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabaseClient
        .from('mfa_backup_codes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('used_at', null);

    if (error) return 0;
    return count || 0;
}

// 💡 【更新】コード一覧を画面に描画（使用済みは打消し線を表示）
export function showGeneratedBackupCodes(codesData) {
    const displayArea = document.getElementById('backup-display-area');
    const codesList = document.getElementById('backup-codes-list');
    const copyBtn = document.getElementById('btn-copy-backup-codes');
    const downloadBtn = document.getElementById('btn-download-backup-codes');

    if (!codesList) return;

    // 単純な文字列配列の場合と、{ code, isUsed } オブジェクト配列の両方に対応
    const normalizedData = codesData.map(item =>
        typeof item === 'string' ? { code: item, isUsed: false } : item
    );

    codesList.innerHTML = normalizedData.map(item => {
        if (item.isUsed) {
            return `<div style="text-decoration: line-through; opacity: 0.5;">${item.code}</div>`;
        }
        return `<div>${item.code}</div>`;
    }).join('');

    displayArea.style.display = 'block';

    // 未使用のコードのみ抽出してコピー・ダウンロード対象にする
    const activeCodes = normalizedData.filter(i => !i.isUsed).map(i => i.code);

    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(activeCodes.join('\n'));
            showToast('未使用のコードをクリップボードにコピーしました', 'success');
        }; 
    }

    if (downloadBtn) {
        downloadBtn.onclick = () => {
            const blob = new Blob([activeCodes.join('\n')], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `AnalyWallet-backup-codes-${Date.now()}.txt`;
            a.click();
        };
    }
}

// 残数を更新する処理
export async function updateBackupCount() {
    const countSpan = document.getElementById('backup-remaining-count');
    if (countSpan) {
        const count = await getUnusedBackupCodesCount();
        countSpan.textContent = count;
    }
}

// 💡 【更新】アコーディオンの開閉とイベント設定（開いた時に既存コードを復号して表示）
export function setupBackupAccordion() {
    const toggleBtn = document.getElementById('btn-toggle-backup');
    const accordionBody = document.getElementById('backup-accordion-body');
    const arrow = document.getElementById('accordion-arrow');
    const regenerateBtn = document.getElementById('btn-regenerate-backup');

    if (toggleBtn && accordionBody) {
        toggleBtn.onclick = async () => {
            const isOpen = accordionBody.classList.toggle('open');
            if (arrow) arrow.textContent = isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down';

            // 開いたタイミングでDBからコードを読み込んで復号表示する
            if (isOpen) {
                const decryptedCodes = await fetchAndDecryptBackupCodes();
                if (decryptedCodes.length > 0) {
                    showGeneratedBackupCodes(decryptedCodes);
                }
            }
        };
    }

    if (regenerateBtn) {
        regenerateBtn.onclick = async () => {
            const isConfirmed = await showConfirm(
                "新しいバックアップコードを発行しますか？\n※古いバックアップコードはすべて使えなくなります。",
                "再発行の確認", "キャンセル", "再発行する", true
            );
            if (!isConfirmed) return;

            const newCodes = await createAndSaveBackupCodes();
            if (newCodes) {
                showGeneratedBackupCodes(newCodes);
                updateBackupCount();
                showToast("新しいバックアップコードを発行しました", "success");
            }
        };
    }
}

//==========================================================================
//アカウント削除
//==========================================================================
// 🚨 アカウントを完全に削除する（パスワード検証付き）
export async function deleteAccount(password) {
    try {
        // 1. 現在ログイン中のユーザー情報を取得
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            showToast('ユーザー情報の取得に失敗しました。再ログインしてください。', 'error');
            return false;
        }

        // 2. パスワードの再検証（ログイン試行）
        const { error: authError } = await supabaseClient.auth.signInWithPassword({
            email: user.email,
            password: password
        });

        if (authError) {
            showToast('パスワードが正しくありません。', 'error');
            return false;
        }

        // 3. パスワード確認成功 ➔ RPC実行でアカウント削除
        const { error: rpcError } = await supabaseClient.rpc('delete_user_account');

        if (rpcError) {
            showToast(`アカウントの削除に失敗しました:\n${rpcError.message}`, 'error');
            return false;
        }

        return true;

    } catch (err) {
        console.error(err);
        showToast('処理中にエラーが発生しました。', 'error');
        return false;
    }
}