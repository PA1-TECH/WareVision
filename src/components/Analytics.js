import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics({ items, locations, dailyTakes }) {
  // Chart Colors (harmonious palette)
  const colors = {
    indigo: '#5856d6',
    indigoGlow: 'rgba(88, 86, 214, 0.2)',
    emerald: '#10b981',
    emeraldGlow: 'rgba(16, 185, 129, 0.2)',
    amber: '#f59e0b',
    amberGlow: 'rgba(245, 158, 11, 0.2)',
    rose: '#ef4444',
    roseGlow: 'rgba(239, 68, 68, 0.2)',
    blue: '#3b82f6',
    blueGlow: 'rgba(59, 130, 246, 0.2)',
    purple: '#8b5cf6',
    purpleGlow: 'rgba(139, 92, 246, 0.2)',
    slate: '#475569'
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e5e7eb',
          font: { family: 'Outfit, Inter, sans-serif', size: 11 }
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#ffffff',
        bodyColor: '#e5e7eb',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af', font: { family: 'Outfit, Inter, sans-serif', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af', font: { family: 'Outfit, Inter, sans-serif', size: 10 } }
      }
    }
  };

  // 1. Daily Consumption Trend (Line Chart)
  // Group daily takes by date (last 7 days)
  const getDailyTrendData = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const values = dates.map(date => {
      return dailyTakes
        .filter(t => t.date === date)
        .reduce((sum, t) => sum + t.quantityTaken, 0);
    });

    // Formatting date label to show e.g. Jun 02
    const formattedLabels = dates.map(date => {
      const [y, m, d] = date.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(m, 10) - 1]} ${d}`;
    });

    return {
      labels: formattedLabels,
      datasets: [
        {
          fill: true,
          label: 'Total Items Consumed',
          data: values,
          borderColor: colors.indigo,
          backgroundColor: colors.indigoGlow,
          tension: 0.4,
          pointBackgroundColor: colors.indigo,
          pointBorderColor: '#ffffff',
          pointHoverRadius: 6
        }
      ]
    };
  };

  // 2. Monthly Consumption Comparison (Bar Chart)
  const getMonthlyComparisonData = () => {
    // Let's group takes by month. Since data dates are in May and June:
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Group values by month index
    const monthlySum = Array(12).fill(0);
    dailyTakes.forEach(t => {
      const dateParts = t.date.split('-');
      const monthIndex = parseInt(dateParts[1], 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlySum[monthIndex] += t.quantityTaken;
      }
    });

    // Find active months (that have non-zero or are May/June)
    const activeIndices = [4, 5]; // May (4), June (5)
    const labels = activeIndices.map(idx => monthNames[idx]);
    const data = activeIndices.map(idx => monthlySum[idx]);

    return {
      labels,
      datasets: [
        {
          label: 'Monthly Consumption Volume',
          data,
          backgroundColor: [colors.purple, colors.blue],
          borderWidth: 0,
          borderRadius: 8
        }
      ]
    };
  };

  // 3. Category-wise Inventory Distribution (Doughnut Chart)
  const getCategoryDistributionData = () => {
    const categoriesMap = {};
    items.forEach(item => {
      categoriesMap[item.category] = (categoriesMap[item.category] || 0) + item.quantity;
    });

    const labels = Object.keys(categoriesMap);
    const data = Object.values(categoriesMap);

    return {
      labels,
      datasets: [
        {
          label: 'In-Stock Quantity',
          data,
          backgroundColor: [
            colors.indigo,
            colors.emerald,
            colors.amber,
            colors.rose,
            colors.blue,
            colors.purple
          ],
          borderColor: 'var(--bg-secondary)',
          borderWidth: 2
        }
      ]
    };
  };

  // 4. Storage Utilization by Location (Bar Chart)
  const getStorageUtilizationData = () => {
    const labels = locations.map(l => `Block ${l.id}`);
    const data = locations.map(l => {
      return l.capacity > 0 ? Math.round((l.currentUsage / l.capacity) * 100) : 0;
    });

    const backgroundColors = locations.map(l => {
      if (l.status !== 'Active') return colors.slate;
      const util = l.capacity > 0 ? (l.currentUsage / l.capacity) * 100 : 0;
      if (util > 90) return colors.rose;
      if (util > 70) return colors.amber;
      return colors.emerald;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Utilization %',
          data,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          borderRadius: 6
        }
      ]
    };
  };

  // 5. Top Consumed Items (Bar Chart)
  const getTopConsumedData = () => {
    const itemConsumptions = {};
    dailyTakes.forEach(t => {
      itemConsumptions[t.itemName] = (itemConsumptions[t.itemName] || 0) + t.quantityTaken;
    });

    // Sort and get top 5
    const sorted = Object.entries(itemConsumptions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const labels = sorted.map(entry => entry[0]);
    const data = sorted.map(entry => entry[1]);

    return {
      labels,
      datasets: [
        {
          label: 'Quantity Consumed (Units)',
          data,
          backgroundColor: colors.emerald,
          borderWidth: 0,
          borderRadius: 8
        }
      ]
    };
  };

  // 6. Remaining Stock Comparison (Bar Chart)
  const getRemainingStockData = () => {
    // Show remaining stock of top 8 items
    const sortedItems = [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 8);
    const labels = sortedItems.map(i => i.name);
    const data = sortedItems.map(i => i.quantity);

    return {
      labels,
      datasets: [
        {
          label: 'Remaining Stock',
          data,
          backgroundColor: colors.blue,
          borderWidth: 0,
          borderRadius: 8
        }
      ]
    };
  };

  return (
    <div className="charts-grid" style={{ animation: 'fadeIn 0.4s ease' }}>
      
      {/* 1. Daily Consumption Trend */}
      <div className="chart-card">
        <h3 className="chart-title">Daily Consumption Trend</h3>
        <div className="chart-container">
          <Line data={getDailyTrendData()} options={chartOptions} />
        </div>
      </div>

      {/* 2. Monthly Consumption Comparison */}
      <div className="chart-card">
        <h3 className="chart-title">Monthly Consumption Comparison</h3>
        <div className="chart-container">
          <Bar data={getMonthlyComparisonData()} options={chartOptions} />
        </div>
      </div>

      {/* 3. Category-wise Inventory Distribution */}
      <div className="chart-card">
        <h3 className="chart-title">Category-wise Inventory Distribution</h3>
        <div className="chart-container" style={{ maxHeight: '250px', marginTop: '20px' }}>
          <Doughnut 
            data={getCategoryDistributionData()} 
            options={{
              ...chartOptions,
              scales: { x: { display: false }, y: { display: false } }
            }} 
          />
        </div>
      </div>

      {/* 4. Storage Utilization by Location */}
      <div className="chart-card">
        <h3 className="chart-title">Storage Utilization by Location</h3>
        <div className="chart-container">
          <Bar 
            data={getStorageUtilizationData()} 
            options={{
              ...chartOptions,
              scales: {
                y: {
                  ...chartOptions.scales.y,
                  max: 100,
                  ticks: {
                    ...chartOptions.scales.y.ticks,
                    callback: (value) => `${value}%`
                  }
                }
              }
            }} 
          />
        </div>
      </div>

      {/* 5. Top Consumed Items */}
      <div className="chart-card">
        <h3 className="chart-title">Top Consumed Items</h3>
        <div className="chart-container">
          <Bar data={getTopConsumedData()} options={chartOptions} />
        </div>
      </div>

      {/* 6. Remaining Stock Comparison */}
      <div className="chart-card">
        <h3 className="chart-title">Top Available Stocks</h3>
        <div className="chart-container">
          <Bar data={getRemainingStockData()} options={chartOptions} />
        </div>
      </div>

    </div>
  );
}
