import { state } from '@/common/state/state.js';
import { isCarryOverItem } from '@/common/utils/transactionUtils.js';

// 12ヶ月分の残高、収入、支出の配列を生成（全明細を1回だけ走査する）
export function getMonthlyStatsData() {
    const year = Number(state.currentYear);
    const yearPrefix = `${year}-`;

    const monthlyIncomes = Array(12).fill(0);
    const monthlyExpenses = Array(12).fill(0);
    const monthlyNet = Array(12).fill(0); // 各月の増減（残高計算用）
    let balanceBeforeYear = 0;            // 前年末までの累積残高

    state.history.forEach(item => {
        if (typeof item.date !== 'string') return;
        const signed = item.type === 'income' ? item.amount : -item.amount;

        // 前年以前 → 期首残高に加算
        if (item.date < yearPrefix) {
            balanceBeforeYear += signed;
            return;
        }
        // 翌年以降 → 対象外
        if (!item.date.startsWith(yearPrefix)) return;

        const m = Number(item.date.slice(5, 7)) - 1; // 0〜11
        monthlyNet[m] += signed;

        if (item.type === 'expense') {
            monthlyExpenses[m] += item.amount;
        } else if (item.type === 'income' && !isCarryOverItem(item)) {
            monthlyIncomes[m] += item.amount;
        }
    });

    // 月末時点の総残高（累積）
    const monthlyBalances = [];
    let running = balanceBeforeYear;
    for (let m = 0; m < 12; m++) {
        running += monthlyNet[m];
        monthlyBalances.push(running);
    }

    return { monthlyBalances, monthlyIncomes, monthlyExpenses };
}
 
export function renderCircleChart(catTotals) {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    //前のページのグラフを消去
    if (state.myChart) {
        state.myChart.destroy();
    }

    // 1. グラフ用の空の配列を用意する
    const chartLabels = [];
    const chartData = [];
    const chartColors = [];

    // カラーパレット（カテゴリーが将来増えてもいいように多めに用意）
    const colorPalette = [
        '#FF6384', '#36A2EB', '#FFCE56', '#9966ff',
        '#87aa66', '#4BC0C0', '#ff9f40', '#ff6384',
        '#c9cbcf', '#4bc0c0', '#36a2eb', '#ffcd56'
    ];

    // 2. 支出カテゴリーの配列をループして、金額があるものだけをグラフに詰める
    (state.categories.expense || []).forEach((cat, index) => {
        const amount = catTotals[cat.value] || 0;

        // グラフがゴチャつかないよう、0円より大きいカテゴリーだけ表示
        if (amount > 0) {
            chartLabels.push(cat.label); // 「食費」などの日本語名
            chartData.push(amount);      // そのカテゴリーの合計金額
            // 色を順番に割り当て（足りなくなったら最初に戻るように % を使用）
            chartColors.push(colorPalette[index % colorPalette.length]);
        }
    });

    // グラフに表示するデータ構造を組み立て
    const data = {
        labels: chartLabels, // 動的配列
        datasets: [{
            data: chartData, // 動的配列
            backgroundColor: chartColors, // 動的配列
            hoverOffset: 4
        }]
    };

    // グラフの作成
    state.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { left: 30, right: 30, top: 30, bottom: 30 }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

export function renderLineChart() {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;
    if (state.lineChart) state.lineChart.destroy();

    const stats = getMonthlyStatsData();

    state.lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            datasets: [
                {
                    label: '総資産',
                    data: stats.monthlyBalances,
                    borderColor: '#102C57',
                    backgroundColor: 'rgba(16, 44, 87, 0.1)',
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y',
                },
                {
                    label: '月間収入',
                    data: stats.monthlyIncomes,
                    borderColor: '#3d9b3d',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    yAxisID: 'y1',
                },
                {
                    label: '月間支出',
                    data: stats.monthlyExpenses,
                    borderColor: '#d95252',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    yAxisID: 'y1',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: false,
                    grace: '5%',
                    ticks: {
                        callback: function (value) {
                            if (Math.abs(value) >= 1000) {
                                return (value / 10000) + '万';
                            }
                            return value;
                        },
                        font: { size: 10 }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        callback: function (value) {
                            if (Math.abs(value) >= 1000) {
                                return (value / 10000) + '万';
                            }
                            return value;
                        },
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

