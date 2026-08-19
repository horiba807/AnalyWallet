//dashboardUi.js
//集計・サマリーの描画

import { state, moneyForm } from '@/common/state/state.js';
import { supabaseClient } from "@/common/config/supabase.js";
import { renderCircleChart, renderLineChart } from './chart.js';
import { fetchCategories } from '@/features/categories/categoryApi.js';
import { renderTableDOM } from '@/features/transactions/transactionUi.js';

//==========================================================================
// ダッシュボードの更新
//==========================================================================
export function updateHistoryDisplay() {
    updateText('display-year', state.currentYear);

    //画面のラベル表示を切り替える
    updateDiffLabels();

    //データを並び替えて、必要な分だけ抜き出す
    const filteredHistory = getFilteredHistory();

    //お金の計算（集計）を行う
    const stats = calculateStats(filteredHistory);

    //計算結果を画面のテキストに反映する
    renderSummaryDOM(stats);

    //フィルター済みのデータを使って明細テーブルを再描画
    renderTableDOM(filteredHistory);

    //前月比の計算とグラフの更新
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

//ダッシュボードの前月日・前年比を切り替え
function updateDiffLabels() {
    const diffLabels = document.querySelectorAll('.js-diff-label');
    const labelText = (state.currentMonth === 'annual') ? '前年比' : '前月比';
    diffLabels.forEach(label => {
        label.innerText = labelText;
    });
}

//データのソート・抽出を行う関数
export function getFilteredHistory() {
    // 参照するデータを state.transactions (または state.history) に統一
    const sourceData = state.transactions || state.history || [];

    // 日付の新しい順にソート
    sourceData.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 条件に合うデータをフィルター
    return sourceData.filter(item => {
        if (!item.date) return false;

        // "2026-08-15" を ["2026", "08", "15"] に分解して数値化
        const [yearStr, monthStr] = item.date.split('-');
        const itemYear = Number(yearStr);
        const itemMonth = Number(monthStr);

        // 1. 年判定（数値に変換して比較）
        const isYearMatch = itemYear === Number(state.currentYear);

        // 2. 月判定（'annual' の場合は全月ヒット、数値の場合は一致判定）
        const isMonthMatch = (state.currentMonth === 'annual') ||
            (itemMonth === Number(state.currentMonth));

        // 3. カテゴリ判定（文字列に揃えて比較）
        const isCategoryMatch = (state.currentCategory === 'all') ||
            (String(item.category) === String(state.currentCategory));

        return isYearMatch && isMonthMatch && isCategoryMatch;
    });
}

//==========================================================================
// 集計処理
//==========================================================================
export function calculateStats(filteredHistory) {
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let carryOverAmount = 0;

    //全カテゴリーをマップ化（IDで高速検索できるようにする）
    const allCategories = [
        ...(state.categories.expense || []),
        ...(state.categories.income || [])
    ];
    const categoryMap = new Map(allCategories.map(cat => [String(cat.value), cat]));

    //カテゴリーIDをキーにした集計用オブジェクトを初期化
    let catTotals = {};
    allCategories.forEach(cat => catTotals[cat.value] = 0);

    //今月・今年の分を集計
    filteredHistory.forEach(item => {
        const catValue = String(item.category);
        const catObj = categoryMap.get(catValue);

        const isCarryOver = catObj
            ? Boolean(catObj.isCarryOver ?? catObj.is_carry_over)
            : (item.category === 'carry_over');

        if (isCarryOver) {
            //繰越金の場合：月間の収入/支出には加算せず、繰越金に振分
            carryOverAmount += item.amount;
        } else if (item.type === 'income') {
            monthlyIncome += item.amount;
        } else {
            monthlyExpense += item.amount;
        }

        //該当するカテゴリーに加算
        if (catTotals[catValue] !== undefined) {
            catTotals[catValue] += item.amount;
        } else {
            //古い平文データ用
            catTotals[catValue] = item.amount;
        }
    });

    // 選択された月の末日時点での累積和を計算
    const lastDayOfMonth = new Date(state.currentYear, state.currentMonth === 'annual' ? 12 : state.currentMonth, 0);
    const historyUpToNow = state.history.filter(item => new Date(item.date) <= lastDayOfMonth);
    const currentBalance = historyUpToNow.reduce((acc, item) => {
        return item.type === 'income' ? acc + item.amount : acc - item.amount;
    }, 0);

    return { monthlyIncome, monthlyExpense, carryOverAmount, catTotals, currentBalance };
}
//==========================================================================
// ダッシュボードのDOM描画
//==========================================================================
function renderSummaryDOM(stats) {
    updateText('display-income', `${stats.monthlyIncome.toLocaleString()}`);
    updateText('display-expense', `${stats.monthlyExpense.toLocaleString()}`);
    updateText('display-total', `${stats.currentBalance.toLocaleString()}`);

    // 収入ー支出
    const diffAmount = stats.monthlyIncome - stats.monthlyExpense;
    const diffEl = document.getElementById('display-diff');
    if (diffEl) {
        diffEl.innerText = `${diffAmount.toLocaleString()}`;
        diffEl.style.color = diffAmount < 0 ? "#d95252" : "#000";
    }

    // 調整用の表示
    if (state.currentMonth === 'annual') {
        updateText('carry-over-display', `調整用: ¥ ${stats.carryOverAmount.toLocaleString()}`);
    } else {
        updateText('carry-over-display', `¥ 0`);
    }

    //支出内訳のループ生成
    const expenseContainer = document.getElementById('expense-categories-list');
    if (expenseContainer) {
        expenseContainer.innerHTML = ''; // 一度リセット
        (state.categories.expense || []).forEach(cat => {
            const amount = stats.catTotals[cat.value] || 0;

            const wrapper = document.createElement('div');
            wrapper.className = 'grid_inner-flex_wrapper';
            wrapper.innerHTML = `
                <div class="grid_inner-flex_wrapper label">${cat.label}</div>
                <div class="grid_inner-flex_wrapper">
                    <p>¥ ${amount.toLocaleString()}</p>
                </div>
            `;
            expenseContainer.appendChild(wrapper);
        });
    }

    //収入内訳のループ生成
    const incomeContainer = document.getElementById('income-categories-list');
    if (incomeContainer) {
        incomeContainer.innerHTML = ''; //一度リセット
        (state.categories.income || []).forEach(cat => {
            if (cat.isCarryOver) return; //調整用を除外

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

//==========================================================================
// グラフの描画切り替え（円グラフと折れ線グラフ）
//==========================================================================
function updateChartVisibility(catTotals) {
    const annualChartContainer = document.getElementById('annual-chart-container');
    const expenseChartContainer = document.getElementById('expense-chart-container');

    if (!annualChartContainer || !expenseChartContainer) return;

    if (state.currentMonth === 'annual') {
        annualChartContainer.style.display = 'block';
        expenseChartContainer.style.display = 'none';
        renderLineChart(); //折れ線グラフ
    } else {
        annualChartContainer.style.display = 'none';
        expenseChartContainer.style.display = 'block';
        updateChart(catTotals); //円グラフ
    }
}

function updateText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
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
        //年間サマリーモード：前年（去年1年間）のデータを抽出
        const prevYearData = state.history.filter(item => {
            const d = new Date(item.date);
            return d.getFullYear() === state.currentYear - 1; //去年のデータ
        });

        prevYearData.forEach(item => {
            if (item.category !== 'carry_over') {
                if (item.type === 'income') prevInc += item.amount;
                else prevExp += item.amount;
            }
        });
    } else {
        //通常モード：前月のデータを抽出
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

    //画面への反映はそのまま
    setDiffText('prev-diff-income', currInc - prevInc, false);
    setDiffText('prev-diff-expense', currExp - prevExp, true);
    setDiffText('prev-diff-net', (currInc - currExp) - (prevInc - prevExp), false);
}