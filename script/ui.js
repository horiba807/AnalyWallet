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
