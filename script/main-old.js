// 状態管理用変数
let history = [];
let myChart = null; // グラフのインスタンスを保持する変数
let lineChart = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
const moneyForm = document.getElementById('money-form');
let currentCategory = 'all';


// ==========================================
// 2. 表示更新メイン関数 (updateHistoryDisplay)
// ==========================================


// ==========================================
// 6. chart.js
// ==========================================


// ==========================================
// 3. データ操作関数 (Supabase通信)
// ==========================================

async function deleteTransaction(id) {
    if (!confirm("本当に削除しますか？")) return;
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
    if (error) alert("削除失敗");
    else fetchTransactions();
}

let isLoginMode = true; // ログインか新規登録かのフラグ

// 画面切り替え
function toggleView(user) {
    const authView = document.getElementById('auth-container');
    const appView = document.getElementById('app-container');

    if (user) {
        authView.style.display = 'none';
        appView.style.display = 'block';
        fetchTransactions(); // ログインしたらデータを取得
    } else {
        authView.style.display = 'flex';
        appView.style.display = 'none';
    }
}

// フォーム送信時の処理
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (isLoginMode) {
        // ログイン
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert("ログイン失敗: " + error.message);
    } else {
        // 新規登録
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) alert("登録エラー: " + error.message);
        else alert("確認メールを送信しました！メール内のリンクをクリックしてください。");
    }
});

// ログイン/新規登録のモード切替
document.getElementById('auth-toggle').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "AnalyWallet へようこそ！" : "新規登録";
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? "ログイン" : "登録する";
    document.getElementById('auth-toggle').innerText = isLoginMode ? "新規登録はこちら" : "ログインはこちら";
});

// ログアウト処理
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});

// 認証状態を監視（リロードしてもログインを維持するための重要コード）
supabaseClient.auth.onAuthStateChange((event, session) => {
    toggleView(session?.user);
});

// ==========================================
// 4. ヘルパー関数 & UIイベント
// ==========================================
function updateText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

function getCategoryLabel(val) {
    const allOpts = [...categoryOptions.expense, ...categoryOptions.income];
    const opt = allOpts.find(o => o.value === val);
    return opt ? opt.label : val;
}

function updateCategoryMenu(type) {
    const sel = document.getElementById('category');
    if (!sel) return;
    sel.innerHTML = '';
    categoryOptions[type].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        sel.appendChild(o);
    });
}

function calculatePrevMonthDiff(currInc, currExp) {
    let prevInc = 0;
    let prevExp = 0;

    if (currentMonth === 'annual') {
        // --- 年間サマリーモード：前年（去年1年間）のデータを抽出 ---
        const prevYearData = history.filter(item => {
            const d = new Date(item.date);
            return d.getFullYear() === currentYear - 1; // 去年のデータ
        });

        prevYearData.forEach(item => {
            if (item.category !== 'carry_over') {
                if (item.type === 'income') prevInc += item.amount;
                else prevExp += item.amount;
            }
        });
    } else {
        // --- 通常モード：前月のデータを抽出（既存のロジック） ---
        const pm = currentMonth === 1 ? 12 : currentMonth - 1;
        const py = currentMonth === 1 ? currentYear - 1 : currentYear;

        const prevMonthData = history.filter(item => {
            const d = new Date(item.date);
            return d.getFullYear() === py && (d.getMonth() + 1) === pm;
        });

        prevMonthData.forEach(item => {
            if (item.category !== 'carry_over') {
                if (item.type === 'income') prevInc += item.amount;
                else prevExp += item.amount;
            }
        });
    }

    // 画面への反映はそのまま
    setDiffText('prev-diff-income', currInc - prevInc, false);
    setDiffText('prev-diff-expense', currExp - prevExp, true);
    setDiffText('prev-diff-net', (currInc - currExp) - (prevInc - prevExp), false);
}

function setDiffText(id, val, isExp) {
    const el = document.getElementById(id);
    if (!el) return;
    const sign = val > 0 ? "+" : "";
    el.innerText = `¥ ${sign}${val.toLocaleString()}`;
    if (isExp) el.style.color = val > 0 ? "#d95252" : "#3d9b3d";
    else el.style.color = val > 0 ? "#3d9b3d" : "#d95252";
}

// ==========================================
// 5. イベントリスナー
// ==========================================

// 年切り替え
document.getElementById('prev-year')?.addEventListener('click', () => { currentYear--; updateHistoryDisplay(); });
document.getElementById('next-year')?.addEventListener('click', () => { currentYear++; updateHistoryDisplay(); });

// 月ボタンのクリックイベント
document.querySelectorAll('.month_btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.month_btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const val = btn.dataset.month;
        currentMonth = val === 'annual' ? 'annual' : Number(val);

        updateHistoryDisplay();
    });
});

// 収支切り替え
document.querySelectorAll('input[name="transaction-type"]').forEach(r => {
    r.addEventListener('change', (e) => updateCategoryMenu(e.target.value));
});

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

// 初期実行に加える
setDefaultDate();

// フォーム送信
moneyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(moneyForm);
    const type = fd.get('transaction-type');
    const cat = fd.get('category');

    // バリデーション
    if (type === 'income' && ['food', 'transport', 'entertainment'].includes(cat)) {
        alert("収支とカテゴリーが矛盾しています"); return;
    }

    const { error } = await supabaseClient.from('transactions').insert([{
        type: type, date: fd.get('date'), amount: Number(fd.get('amount')),
        category: cat, memo: fd.get('memo')
    }]);

    if (error) alert("保存に失敗しました...");
    else { alert("保存しました"); moneyForm.reset(); updateCategoryMenu('expense'); fetchTransactions(); }
});

document.getElementById('filter-category')?.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    updateHistoryDisplay(); // 選択が変わるたびに再描画
});

// 初期起動
updateCategoryMenu('expense');
const initialBtn = document.querySelector(`.month_btn[data-month="${currentMonth}"]`);
if (initialBtn) initialBtn.classList.add('active');
fetchTransactions();


// サインアップ（新規登録）
async function signUp(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });
    if (error) alert("登録エラー: " + error.message);
    else alert("確認メールを送信しました！");
}

// ログイン
async function signIn(email, password) {
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
async function signOut() {
    await supabaseClient.auth.signOut();
    history = []; // データを空にする
    updateHistoryDisplay();
}