// 12ヶ月分の残高、収入、支出の配列を生成
function getMonthlyStatsData() {
    const monthlyBalances = [];
    const monthlyIncomes = [];
    const monthlyExpenses = [];

    for (let m = 1; m <= 12; m++) {
        // その月の開始日と末日
        const startOfMonth = new Date(currentYear, m - 1, 1);
        const endOfMonth = new Date(currentYear, m, 0);

        // その月だけの集計
        const currentMonthData = history.filter(item => {
            const d = new Date(item.date);
            return d >= startOfMonth && d <= endOfMonth;
        });

        const inc = currentMonthData
            .filter(item => item.type === 'income' && item.category !== 'carry_over')
            .reduce((acc, item) => acc + item.amount, 0);

        const exp = currentMonthData
            .filter(item => item.type === 'expense')
            .reduce((acc, item) => acc + item.amount, 0);

        // 月末時点での総残高（累積）
        const balance = history
            .filter(item => new Date(item.date) <= endOfMonth)
            .reduce((acc, item) => item.type === 'income' ? acc + item.amount : acc - item.amount, 0);

        monthlyIncomes.push(inc);
        monthlyExpenses.push(exp);
        monthlyBalances.push(balance);
    }

    return { monthlyBalances, monthlyIncomes, monthlyExpenses };
}

export function renderCircleChart(catTotals) {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    // グラフに表示するデータ
    const data = {
        labels: ['食費', '交通費', '交際費', '趣味・嗜好', 'サブスク', 'その他'],
        datasets: [{
            data: [
                catTotals.food,
                catTotals.transport,
                catTotals.entertainment,
                catTotals.hobby,
                catTotals.subsc,
                catTotals.otherExp
            ],
            backgroundColor: [
                '#FF6384', // 食費
                '#36A2EB', // 交通費
                '#FFCE56', // 交際費
                '#9966ff',  // 趣味嗜好
                '#87aa66',  // サブスク
                '#4BC0C0'  // その他
            ],
            hoverOffset: 4
        }]
    };

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    left: 30,
                    right: 30,
                    top: 30,
                    bottom: 30
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
}

export function renderLineChart() {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;
    if (lineChart) lineChart.destroy();

    const stats = getMonthlyStatsData();

    lineChart = new Chart(ctx, {
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
                x: {
                    grid: { display: false }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: false, text: '総資産' },
                    beginAtZero: false,
                    grace: '5%',
                    ticks: {
                        // ラベルの表示形式をカスタマイズ
                        callback: function (value, index, values) {
                            if (Math.abs(value) >= 1000) {
                                return (value / 10000) + '万';
                            }
                            return value;
                        },
                        // フォントサイズ
                        font: {
                            size: 10
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: false, text: '月間収支' },
                    ticks: {
                        // ラベルの表示形式をカスタマイズ
                        callback: function (value, index, values) {
                            if (Math.abs(value) >= 1000) {
                                return (value / 10000) + '万';
                            }
                            return value;
                        },
                        // フォントサイズ
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

