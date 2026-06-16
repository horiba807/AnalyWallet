function updateHistoryDisplay() {
    updateText('display-year', currentYear);

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
}

// ダッシュボードの前月日・前年比を切り替え
function updateDiffLabels() {
    const diffLabels = document.querySelectorAll('.js-diff-label');
    const labelText = (currentMonth === 'annual') ? '前年比' : '前月比';
    diffLabels.forEach(label => {
        label.innerText = labelText;
    });
}

// (選択されている月・年のみに）データのソート & 抽出を行う関数
function getFilteredHistory() {
    // 日付の新しい順にソート
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 条件に合うデータをフィルター
    return history.filter(item => {
        const D = new Date(item.date);
        const isYearMatch = D.getFullYear() === currentYear;
        const isMonthMatch = (currentMonth === 'annual') || ((D.getMonth() + 1) === currentMonth);
        const isCategoryMatch = (currentCategory === 'all') || (item.category === currentCategory);

        return isYearMatch && isMonthMatch && isCategoryMatch;
    });
}

// ③ 集計処理（計算だけを行う関数  HTMLの操作はしない）
function calculateStats(filteredHistory) {
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let carryOverAmount = 0;
    let catTotals = {
        food: 0,
        transport: 0,
        entertainment: 0,
        hobby: 0,
        subsc: 0,
        otherExp: 0,
        //収入
        salary: 0,
        pocketMoney: 0,
        otherInc: 0
    };

    // 今月・今年の分（月別・カテゴリー別）を集計
    filteredHistory.forEach(item => {
        if (item.type === 'income') {
            if (item.category === 'carry_over') {
                carryOverAmount += item.amount; // 持ち越しのお金
            } else {
                monthlyIncome += item.amount;
            }

            if (item.category === 'salary') catTotals.salary += item.amount;
            else if (item.category === 'income') catTotals.pocketMoney += item.amount;
            else if (item.category !== 'carry_over') catTotals.otherInc += item.amount;
        } else {
            monthlyExpense += item.amount;
            if (item.category === 'food') catTotals.food += item.amount;
            else if (item.category === 'transport') catTotals.transport += item.amount;
            else if (item.category === 'entertainment') catTotals.entertainment += item.amount;
            else if (item.category === 'hobby') catTotals.hobby += item.amount;
            else if (item.category === 'subsc') catTotals.subsc += item.amount;
            else catTotals.otherExp += item.amount;
        }
    });

    // 選択された月の末日時点での総残高（累積和）を計算
    const lastDayOfMonth = new Date(currentYear, currentMonth === 'annual' ? 12 : currentMonth, 0);
    const historyUpToNow = history.filter(item => new Date(item.date) <= lastDayOfMonth);
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
    if (currentMonth === 'annual') {
        updateText('carry-over-display', `前年からの繰越: ¥ ${stats.carryOverAmount.toLocaleString()}`);
    }

    // カテゴリー内訳の更新
    updateText('cat-food', `¥ ${stats.catTotals.food.toLocaleString()}`);
    updateText('cat-transport', `¥ ${stats.catTotals.transport.toLocaleString()}`);
    updateText('cat-entertainment', `¥ ${stats.catTotals.entertainment.toLocaleString()}`);
    updateText('cat-hobby', `¥ ${stats.catTotals.hobby.toLocaleString()}`);
    updateText('cat-subsc', `¥ ${stats.catTotals.subsc.toLocaleString()}`);
    updateText('cat-other-exp', `¥ ${stats.catTotals.otherExp.toLocaleString()}`);
    updateText('cat-salary', `¥ ${stats.catTotals.salary.toLocaleString()}`);
    updateText('cat-pocket-money', `¥ ${stats.catTotals.pocketMoney.toLocaleString()}`);
    updateText('cat-other-inc', `¥ ${stats.catTotals.otherInc.toLocaleString()}`);
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
            <td class="btn_wrapper"><button class="delete-btn" onclick="deleteTransaction('${item.id}')">削除</button></td>
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

    if (currentMonth === 'annual') {
        annualChartContainer.style.display = 'block';
        expenseChartContainer.style.display = 'none';
        renderLineChart(); // 折れ線グラフ（年間）
    } else {
        annualChartContainer.style.display = 'none';
        expenseChartContainer.style.display = 'block';
        updateChart(catTotals); // 円グラフ（月間）
    }
}

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
