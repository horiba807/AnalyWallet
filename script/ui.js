import { categoryOptions } from "./constant.js";
import { fetchTransactions } from './api.js';
import { state, moneyForm } from './state.js';
import { renderCircleChart, renderLineChart } from './chart.js';
import pkg from '../package.json';


export function updateHistoryDisplay() {
    updateText('display-year', state.currentYear);

    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    // 1. 画面のラベル表示を切り替える
    updateDiffLabels();

    // 2. データを並び替えて、必要な分だけ抜き出す
    const filteredHistory = getFilteredHistory();

    // 3. お金の計算（集計）を行う
    const stats = calculateStats(filteredHistory);

    // 4. 計算結果を画面のテキストに反映する
    renderSummaryDOM(stats);

    // 5. 明細テーブルを描画する
    renderTableDOM(historyList, filteredHistory);

    // 6. 前月比の計算とグラフの更新
    calculatePrevMonthDiff(stats.monthlyIncome, stats.monthlyExpense);

    if (state.currentMonth === 'annual') {
        document.getElementById('annual-chart-container').style.display = 'block';
        document.getElementById('expense-chart-container').style.display = 'none'; // 円グラフの親
        renderLineChart();
    } else {
        document.getElementById('annual-chart-container').style.display = 'none';
        document.getElementById('expense-chart-container').style.display = 'block';
        renderCircleChart(stats.catTotals); //円グラフ
    }
}

// ダッシュボードの前月日・前年比を切り替え
function updateDiffLabels() {
    const diffLabels = document.querySelectorAll('.js-diff-label');
    const labelText = (state.currentMonth === 'annual') ? '前年比' : '前月比';
    diffLabels.forEach(label => {
        label.innerText = labelText;
    });
}

// (選択されている月・年のみに）データのソート & 抽出を行う関数
function getFilteredHistory() {
    // 日付の新しい順にソート
    state.history.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 条件に合うデータをフィルター
    return state.history.filter(item => {
        const D = new Date(item.date);
        const isYearMatch = D.getFullYear() === state.currentYear;
        const isMonthMatch = (state.currentMonth === 'annual') || ((D.getMonth() + 1) === state.currentMonth);
        const isCategoryMatch = (state.currentCategory === 'all') || (item.category === state.currentCategory);

        return isYearMatch && isMonthMatch && isCategoryMatch;
    });
}

// ③ 集計処理（計算だけを行う関数  HTMLの操作はしない）
// 🔄 ui.js の「calculateStats」をこれに丸ごと差し替え
export function calculateStats(filteredHistory) {
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let carryOverAmount = 0;

    // 💡 1. 取ってきたすべてのカテゴリーIDをキーにした、空のバケツ（オブジェクト）を自動で作る
    let catTotals = {};
    (state.categories.expense || []).forEach(cat => catTotals[cat.value] = 0);
    (state.categories.income || []).forEach(cat => catTotals[cat.value] = 0);

    // 💡 「繰越金」のIDを動的に特定しておく（コンソールの '9' や、万が一の 'carry_over' に対応）
    const carryOverCat = (state.categories.income || []).find(c => c.label === '繰越金');

    // 今月・今年の分を集計
    filteredHistory.forEach(item => {
        const catValue = String(item.category);

        if (item.type === 'income') {
            // 繰越金かどうかの判定
            if (item.category === 'carry_over' || (carryOverCat && catValue === carryOverCat.value)) {
                carryOverAmount += item.amount;
            } else {
                monthlyIncome += item.amount;
            }
        } else {
            monthlyExpense += item.amount;
        }

        // 💡 2. 該当するカテゴリーのバケツに金額を全自動で加算！
        if (catTotals[catValue] !== undefined) {
            catTotals[catValue] += item.amount;
        } else {
            // 万が一、古い平文データ（'food'など）が残っていた場合の救済処置
            catTotals[catValue] = item.amount;
        }
    });

    // 選択された月の末日時点での総残高（累積和）を計算（ここは元のまま）
    const lastDayOfMonth = new Date(state.currentYear, state.currentMonth === 'annual' ? 12 : state.currentMonth, 0);
    const historyUpToNow = state.history.filter(item => new Date(item.date) <= lastDayOfMonth);
    const currentBalance = historyUpToNow.reduce((acc, item) => {
        return item.type === 'income' ? acc + item.amount : acc - item.amount;
    }, 0);

    return { monthlyIncome, monthlyExpense, carryOverAmount, catTotals, currentBalance };
}

// 基本収支やカテゴリ内訳のDOM（画面）描画を行う関数
function renderSummaryDOM(stats) {
    updateText('display-income', `${stats.monthlyIncome.toLocaleString()}`);
    updateText('display-expense', `${stats.monthlyExpense.toLocaleString()}`);
    updateText('display-total', `${stats.currentBalance.toLocaleString()}`);

    // 収入 - 支出 の差額
    const diffAmount = stats.monthlyIncome - stats.monthlyExpense;
    const diffEl = document.getElementById('display-diff');
    if (diffEl) {
        diffEl.innerText = `${diffAmount.toLocaleString()}`;
        diffEl.style.color = diffAmount < 0 ? "#d95252" : "#000";
    }

    // 繰越金表示
    if (state.currentMonth === 'annual') {
        updateText('carry-over-display', `前年からの繰越: ¥ ${stats.carryOverAmount.toLocaleString()}`);
    } else {
        updateText('carry-over-display', `¥ 0`);
    }

    // 💡 【超重要】ここからカテゴリー内訳の動的HTML生成！

    // 🔴 支出内訳のループ生成
    const expenseContainer = document.getElementById('expense-categories-list');
    if (expenseContainer) {
        expenseContainer.innerHTML = ''; // 一度リセット
        (state.categories.expense || []).forEach(cat => {
            const amount = stats.catTotals[cat.value] || 0;

            // 元々のHTML構造をそのままJavaScriptで再現して量産する
            const wrapper = document.createElement('div');
            wrapper.className = 'grid_inner-flex_wrapper';
            wrapper.innerHTML = `
                <div class="grid_inner-flex_wrapper">${cat.label}</div>
                <div class="grid_inner-flex_wrapper">
                    <p>¥ ${amount.toLocaleString()}</p>
                </div>
            `;
            expenseContainer.appendChild(wrapper);
        });
    }

    // 🔵 収入内訳のループ生成
    const incomeContainer = document.getElementById('income-categories-list');
    if (incomeContainer) {
        incomeContainer.innerHTML = ''; // 一度リセット
        (state.categories.income || []).forEach(cat => {
            // ※ 繰越金は下部の「現在の残高」エリアで別枠表示するため、一覧からは除外します
            if (cat.label === '繰越金' || cat.value === 'carry_over') return;

            const amount = stats.catTotals[cat.value] || 0;

            const wrapper = document.createElement('div');
            wrapper.className = 'grid_inner-flex_wrapper';
            wrapper.innerHTML = `
                <div class="grid_inner-flex_wrapper">${cat.label}</div>
                <div class="grid_inner-flex_wrapper">
                    <p>¥ ${amount.toLocaleString()}</p>
                </div>
            `;
            incomeContainer.appendChild(wrapper);
        });
    }
}

// 明細テーブル（履歴一覧）のDOM描画を行う関数
function renderTableDOM(historyList, filteredHistory) {
    historyList.innerHTML = '';
    let dayTotal = 0;

    filteredHistory.forEach((item, index) => {
        const amount = item.type === 'expense' ? -item.amount : item.amount;
        dayTotal += amount;

        // 通常の明細行を作成
        const tr = document.createElement('tr');
        const amountClass = item.type === 'expense' ? 'is-expense' : 'is-income';
        const sign = item.type === 'expense' ? '-' : '+';

        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${getCategoryLabel(item.category)}</td>
            <td class="${amountClass}">${sign} ¥${item.amount.toLocaleString()}</td>
            <td>${item.memo || '-'}</td>
            <td class="btn_wrapper">
                <button class="column-btn delete" onclick="deleteTransaction('${item.id}')">削除する</button>
                <button class="column-btn edit" onclick="openEditModal('${item.id}')">編集する</button>

            </td>
        `;
        historyList.appendChild(tr);

        // 「次のデータの日付が違う」または「これが最後のデータ」なら合計行を出す
        const nextItem = filteredHistory[index + 1];
        const isLastItem = index === filteredHistory.length - 1;

        if (isLastItem || nextItem.date !== item.date) {
            const totalTr = document.createElement('tr');
            totalTr.className = 'daily-total-row';

            const totalSign = dayTotal >= 0 ? "+" : "";
            const totalColor = dayTotal >= 0 ? "#3d9b3d" : "#d95252";

            totalTr.innerHTML = `
                <td colspan="2" style="font-weight: 600;">この日の合計:</td>
                <td colspan="3" style="font-weight: bold; color: ${totalColor}; text-align: left;">
                    ${totalSign} ¥${dayTotal.toLocaleString()}
                </td>
            `;
            historyList.appendChild(totalTr);

            // 日毎の合計をリセット
            dayTotal = 0;
        }
    });
}

// グラフの表示・非表示と描画を切り替える関数
function updateChartVisibility(catTotals) {
    const annualChartContainer = document.getElementById('annual-chart-container');
    const expenseChartContainer = document.getElementById('expense-chart-container');

    if (!annualChartContainer || !expenseChartContainer) return;

    if (state.currentMonth === 'annual') {
        annualChartContainer.style.display = 'block';
        expenseChartContainer.style.display = 'none';
        renderLineChart(); // 折れ線グラフ（年間）
    } else {
        annualChartContainer.style.display = 'none';
        expenseChartContainer.style.display = 'block';
        updateChart(catTotals); // 円グラフ（月間）
    }
}

// 画面切り替え(ログイン画面と通常画面)
export function toggleView(user) {
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

function updateText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

//supabaseのデータからnameを検索
function getCategoryLabel(val) {
    // state.categories の支出と収入を1つの配列に
    const allOpts = [
        ...(state.categories.expense || []),
        ...(state.categories.income || [])
    ];

    // 送られてきた数字（"7" など）と一致するカテゴリーを探す
    const opt = allOpts.find(o => o.value === String(val));

    // 見つかったら「給与」などの名前（label）を返し、なければそのままの値を出す
    return opt ? opt.label : val;
}

function setDiffText(id, val, isExp) {
    const el = document.getElementById(id);
    if (!el) return;
    const sign = val > 0 ? "+" : "";
    el.innerText = `¥ ${sign}${val.toLocaleString()}`;
    if (isExp) el.style.color = val > 0 ? "#d95252" : "#3d9b3d";
    else el.style.color = val > 0 ? "#3d9b3d" : "#d95252";
}


function calculatePrevMonthDiff(currInc, currExp) {
    let prevInc = 0;
    let prevExp = 0;

    if (state.currentMonth === 'annual') {
        // --- 年間サマリーモード：前年（去年1年間）のデータを抽出 ---
        const prevYearData = state.history.filter(item => {
            const d = new Date(item.date);
            return d.getFullYear() === state.currentYear - 1; // 去年のデータ
        });

        prevYearData.forEach(item => {
            if (item.category !== 'carry_over') {
                if (item.type === 'income') prevInc += item.amount;
                else prevExp += item.amount;
            }
        });
    } else {
        // --- 通常モード：前月のデータを抽出 ---
        const pm = state.currentMonth === 1 ? 12 : state.currentMonth - 1;
        const py = state.currentMonth === 1 ? state.currentYear - 1 : state.currentYear;

        const prevMonthData = state.history.filter(item => {
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

// カテゴリーのドロップダウンを動的に書き換え
export function updateCategoryMenu(type, targetId = 'category') {
    const selectEl = document.getElementById(targetId);
    if (!selectEl) return;

    // 1. 一度空っぽにする
    selectEl.innerHTML = '';

    // 2. state.categories（Supabaseから取ってきたデータ）を使う！
    const options = state.categories[type] || [];

    // 3. 選択肢を量産する
    options.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;       // 👈 ここにSupabaseの「ID（7など）」が入る
        option.textContent = cat.label;  // 👈 画面表示（給与など）
        selectEl.appendChild(option);
    });
}
// 画面の要素にバージョンを代入する
document.getElementById('app-version').textContent = `Ver. ${pkg.version}`;

export function renderFilterCategoryDOM() {
    const filterSelect = document.getElementById('filter-category');
    if (!filterSelect) return;

    // 💡 1. 一度「カテゴリー（すべて）」だけの状態にリセット
    filterSelect.innerHTML = '<option value="all">カテゴリー</option>';

    // 💡 2. 支出グループの動的生成
    if (state.categories.expense && state.categories.expense.length > 0) {
        const expenseGroup = document.createElement('optgroup');
        expenseGroup.label = '支出';

        state.categories.expense.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.value; // Supabaseの数字ID
            option.textContent = cat.label; // 「食費」などの日本語名
            expenseGroup.appendChild(option);
        });

        filterSelect.appendChild(expenseGroup);
    }

    // 💡 3. 収入グループの動的生成
    if (state.categories.income && state.categories.income.length > 0) {
        const incomeGroup = document.createElement('optgroup');
        incomeGroup.label = '収入';

        state.categories.income.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.value; // Supabaseの数字ID
            option.textContent = cat.label; // 「給与」などの日本語名
            incomeGroup.appendChild(option);
        });

        filterSelect.appendChild(incomeGroup);
    }
}


export function renderCategorySettingsDOM() {
    const expenseList = document.getElementById('expense-category-list');
    const incomeList = document.getElementById('income-category-list');

    // 画面に要素がないページ（別タブなど）の場合はスキップ
    if (!expenseList || !incomeList) return;

    // 一度リストを空にする
    expenseList.innerHTML = '';
    incomeList.innerHTML = '';

    // 💡 支出リストの生成
    (state.categories.expense || []).forEach(cat => {
        expenseList.appendChild(createCategoryRow(cat));
    });

    // 💡 収入リストの生成
    (state.categories.income || []).forEach(cat => {
        incomeList.appendChild(createCategoryRow(cat));
    });
}

// 補助関数：リストの1行（li）を組み立てる
function createCategoryRow(cat) {
    const li = document.createElement('li');
    li.classList.add("category_item");

    // ゴミ箱ボタンに data-id と data-label を仕込んでおくのがポイントです
    li.innerHTML = `
        <span>${cat.label}</span>
        <button class="btn-delete" data-id="${cat.value}" data-label="${cat.label}">
            削除する
        </button>
    `;
    return li;
}

// サブスク表示

// サブスク一覧を HTML にレンダリングする
export function renderSubscriptionsDOM() {
    const subscListElement = document.getElementById('subsc-list');
    if (!subscListElement) return;

    // 一旦中身を空っぽにする
    subscListElement.innerHTML = '';

    if (state.subscriptions.length === 0) {
        subscListElement.innerHTML = '<li class="empty-message">登録されているサブスクはありません。</li>';
        return;
    }

    // データがある分だけ li を作成して追加
    state.subscriptions.forEach(sub => {
        const tr = document.createElement('tr');
        tr.className = 'subsc-item';
        tr.innerHTML = `
                <td class="subsc-item-name">${sub.name}</td>
                <td class="subsc-item-details">${sub.billing_day}日</td>
                <td class="subsc-item-amount">¥${sub.amount.toLocaleString()}</td>
                <td>
                    <button class="btn-subsc-delete" data-id="${sub.id}" data-name="${sub.name}">
                        削除する
                    </button>
                </td>
        `;
        subscListElement.appendChild(tr);
    });
}