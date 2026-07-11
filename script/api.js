import { supabaseClient } from "./supabase.js";
import { state, moneyForm } from './state.js';
import { updateHistoryDisplay, toggleView, updateCategoryMenu, renderCategorySettingsDOM, renderFilterCategoryDOM, renderSubscriptionsDOM } from './ui.js';

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
    if (!confirm("本当に削除しますか？")) return;
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
    if (error) alert("削除失敗");
    else fetchTransactions();
}
//ヒストリー：項目編集
export async function openEditModal(id){ 
    // 1. 全データの中から、クリックされたIDと一致するものを1件探す
    const target = state.transactions.find(item => item.id == id);
    // if (!target) return;
    if (!target) {
        return;
    }
    // 2. stateに記録
    state.editingId = id;

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
        .from('transactions') // テーブル名
        .update(updatedData)
        .eq('id', id)
        .select();

    if (error) {
        console.error('Supabaseの更新でエラー発生:', error);
        throw error;
    }
    return data;
}


// サインアップ（新規登録）
export async function signUp(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });
    if (error) alert("登録エラー: " + error.message);
    else alert("確認メールを送信しました！");
}

// ログイン
export async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) alert("ログインエラー: " + error.message);
    else {
        alert("ログイン成功！");
        fetchTransactions(); // 自分のデータを取得
    }
}

// ログアウト
export async function signOut() {
    await supabaseClient.auth.signOut();
    history = []; // データを空にする
    updateHistoryDisplay();
}

// Supabaseからカテゴリー一覧を取得
export async function fetchCategories() {
    // 1. categoriesテーブルからデータを全件取得
    const { data, error } = await supabaseClient
        .from('categories')
        .select('*');

    console.log("【調査1】Supabaseから届いた生のデータ:", data);
    console.log("【調査2】エラーが起きている場合:", error);

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
            label: item.name       // カテゴリー名を label にする
        };

        if (item.type === 'expense') {
            state.categories.expense.push(formatted);
        } else if (item.type === 'income') {
            state.categories.income.push(formatted);
        }
    });

    console.log("【デバッグ】新しく読み込んだカテゴリー:", state.categories);
}


///


// 🔄 カテゴリーが更新されたら、アプリ内のすべてのセレクトボックスやリストを一斉更新するヘルパー
async function refreshCategories_kanpa() {
    console.log("【調査】1. refreshCategories_kanpa が動き出しました！");
    // 1. Supabaseから最新のカテゴリーを再取得して state.categories を更新（既存の関数を呼ぶ）
    await fetchCategories();
    console.log("【調査】2. Supabaseからの再取得が完了！現在のデータ数:", state.categories.expense.length);

    // 2. 関連するすべてのUIを一斉リフレッシュ
    renderCategorySettingsDOM(); // 今回の管理リスト
    console.log("【調査】3. renderCategorySettingsDOM() の実行を通過しました！");
    
    // 現在フォームで選ばれている収支タイプ（支出 or 収入）のプルダウンを更新する
    const currentType = document.querySelector('input[name="transaction-type"]:checked')?.value || 'expense';
    updateCategoryMenu(currentType, 'category');
    updateCategoryMenu('expense', 'edit_category'); // 編集用モーダルも一応更新
    renderFilterCategoryDOM();   // 履歴テーブルのフィルター
    console.log("【調査】4. すべてのUIリフレッシュがエラーなく終了しました！");
}

// ➕ カテゴリーの追加処理
async function handleAddCategory(type) {
    const inputId = type === 'expense' ? 'new-expense-name' : 'new-income-name';
    const inputElement = document.getElementById(inputId);
    const name = inputElement.value.trim();

    if (!name) {
        alert('カテゴリー名を入力してください。');
        return;
    }

    // 重複チェック
    const isDuplicate = state.categories[type].some(cat => cat.label === name);
    if (isDuplicate) {
        alert('すでに同じ名前のカテゴリーが存在します。');
        return;
    }

    // ⭕️ 1. 現在ログインしているユーザーの情報をSupabaseから取得する
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert('ユーザー情報の取得に失敗したか、ログインセッションが切れています。');
        return;
    }

    // Supabaseへデータを挿入
    // ⚠️ カラム名（name や type）はご自身のSupabaseのテーブル定義に合わせて調整してください
    const { error } = await supabaseClient
        .from('categories')
        .insert([{ 
            name: name, 
            type: type,
            user_id: user.id // 👈 ここを追加！
        }]);

    if (error) {
        console.error('追加失敗:', error);
        alert('カテゴリーの追加に失敗しました。');
        return;
    }

    alert('カテゴリーを追加しました。');
    inputElement.value = ''; // 入力欄をクリア
    await refreshCategories_kanpa(); // UI更新
    
}

// 🗑️ カテゴリーの削除処理（対策A）
async function handleDeleteCategory(id, label) {
    // 💡 【対策A】過去の家計簿データ（state.history）でこのIDが使われているかチェック
    const isUsed = state.history.some(item => String(item.category) === String(id));

    if (isUsed) {
        alert(`「${label}」はすでに家計簿データで使用されているため、削除できません。`);
        return;
    }

    // 確認アラート
    if (!confirm(`「${label}」カテゴリーを削除しますか？`)) {
        return;
    }

    // Supabaseから削除
    const { error } = await supabaseClient
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('削除失敗:', error);
        alert('カテゴリーの削除に失敗しました。');
        return;
    }

    await refreshCategories_kanpa(); // UI更新
}

// 🔌 イベントリスナーを一括設定する関数（アプリ起動時に1回呼ぶ）
export function setupCategorySettingsEvents() {
    // 追加ボタンのイベント紐付け
    document.getElementById('add-expense-btn')?.addEventListener('click', () => handleAddCategory('expense'));
    document.getElementById('add-income-btn')?.addEventListener('click', () => handleAddCategory('income'));

    // ゴミ箱ボタンのイベント紐付け（イベントデリゲーションという賢い手法を使います）
    const handleListClick = (e) => {
        const deleteBtn = e.target.closest('.btn-delete');
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
        alert("登録に失敗しました。");
        return;
    }

    console.log("登録に成功しました。");

    // フォームをリセットして最新一覧を再取得
    document.getElementById('subsc-form').reset();
    await fetchSubscriptions();
}

// 3. サブスクを削除する
async function handleDeleteSubscription(id, name) {
    if (!confirm(`「${name}」のサブスク登録を解除しますか？\n（※これまでの家計簿データは消えません）`)) return;

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
}

// 4. サブスク画面のイベントリスナーを一括設定する
export function setupSubscriptionEvents() {
    // フォームの送信（登録ボタン）
    document.getElementById('subsc-form')?.addEventListener('submit', handleAddSubscription);

    // ゴミ箱ボタンのクリック（イベントデリゲーション）
    document.getElementById('subsc-list')?.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-subsc-delete');
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
        // 💡 2回目以降：すでにデータベースにあれば、その通し番号をそのまま使い回す！
        categoryId = existingCat.id;
        console.log(`既存の「サブスク」カテゴリー（ID: ${categoryId}）を使用します。`);
    }
    // ==========================================================

    // 3. 今日の日付情報を取得（※ここから下は前のコードと同じでOKです！）
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


// 🔐 MFAの登録準備（シークレットキーを発行する）
export async function enrollMFA() {
    const { data, error } = await supabaseClient.auth.mfa.enroll({
        factorType: 'totp' // Time-based One-Time Password（認証アプリ方式）
    });

    if (error) {
        console.error("MFA登録開始エラー:", error.message);
        return null;
    }

    // dataの中には、登録用のID（factorId）やシークレットキー（secret）が入っています
    return data;
}

// 🔐 MFAの有効化（最初の6桁コードを検証して、正式に有効にする）
export async function challengeAndVerifyMFA(factorId, code) {
    // 1. まずチャレンジ（検証の準備）を行う
    const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
        factorId: factorId
    });

    if (challengeError) {
        console.error("MFAチャレンジエラー:", challengeError.message);
        return false;
    }

    // 2. ユーザーが入力した6桁のコード（code）を検証する
    const { error: verifyError } = await supabaseClient.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: code
    });

    if (verifyError) {
        alert(`コードが正しくありません: ${verifyError.message}`);
        return false;
    }

    return true;
}

// 🔐 MFAの登録状況（ステータス）を取得する
export async function getMFAStatus() {
    const { data, error } = await supabaseClient.auth.mfa.listFactors();

    if (error) {
        console.error("MFAステータス取得エラー:", error.message);
        return null;
    }

    // data.all の中に登録された認証方式のリストが入っています
    // その中から「検証が完了している（verified）」TOTP設定を探して返します
    const activeFactor = data.all.find(
        factor => factor.factor_type === 'totp' && factor.status === 'verified'
    );

    return activeFactor; // 登録されていればそのデータオブジェクト、なければ undefined が返ります
}

// 🔐 MFAを解除（削除）する
export async function unenrollMFA(factorId) {
    const { error } = await supabaseClient.auth.mfa.unenroll({
        factorId: factorId
    });

    if (error) {
        console.error("MFA解除エラー:", error.message);
        alert("解除できませんでした");
        return false;
    }

    return true;
}