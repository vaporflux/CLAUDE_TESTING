import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# Data reconstruction from the user's P&L
months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
beer_sales = [31731, 35780, 35023, 33884, 33112, 29684, 31344, 30530, 29941, 34885, 32792, 29908]
food_sales = [8455, 8977, 10578, 9119, 8382, 8674, 9016, 8340, 8618, 8555, 8243, 7888]
total_income = [38199, 42589, 43393, 41178, 39596, 36605, 38334, 37406, 36690, 41458, 39440, 35823]
net_income = [-11166, -878, 6319, -3055, 124, 832, -4125, -2906, -5730, -6432, 7172, 1845]

# Annual Totals for Pie Chart
expenses = {
    'COGS': 180891,
    'Labor': 90115,
    'Rent': 87759,
    'Royalties': 29011,
    'Bank Charges': 22270,
    'Utilities': 16253,
    'Comp/Internet': 13922,
    'Other': 48496 # Remaining balance
}

# Setup the Dashboard
fig, axes = plt.subplots(2, 2, figsize=(18, 12))
fig.suptitle('Casual Pint (Phoenix) - 2025 Financial Dashboard', fontsize=20, weight='bold')

# Chart 1: Revenue Composition (Stacked Bar)
axes[0, 0].bar(months, beer_sales, label='Beer Sales', color='#F5A623')
axes[0, 0].bar(months, food_sales, bottom=beer_sales, label='Food Sales', color='#4A90E2')
axes[0, 0].set_title('Monthly Revenue Composition', fontsize=14)
axes[0, 0].set_ylabel('Revenue ($)')
axes[0, 0].legend()
axes[0, 0].grid(axis='y', linestyle='--', alpha=0.5)

# Chart 2: Where is the Money Going? (Donut Chart)
# Explode Rent to highlight it
labels = expenses.keys()
sizes = expenses.values()
explode = (0, 0, 0.1, 0, 0, 0, 0, 0)  # only "explode" the 3rd slice (Rent)
colors = ['#E74C3C', '#3498DB', '#8E44AD', '#95A5A6', '#E67E22', '#2ECC71', '#F1C40F', '#BDC3C7']

axes[0, 1].pie(sizes, explode=explode, labels=labels, autopct='%1.1f%%',
        shadow=False, startangle=90, colors=colors, pctdistance=0.85)
centre_circle = plt.Circle((0,0),0.70,fc='white')
axes[0, 1].add_artist(centre_circle)
axes[0, 1].set_title('Expense Allocation (Year Total)', fontsize=14)

# Chart 3: Net Income Volatility
colors_net = ['red' if x < 0 else 'green' for x in net_income]
axes[1, 0].bar(months, net_income, color=colors_net)
axes[1, 0].axhline(0, color='black', linewidth=1)
axes[1, 0].set_title('Net Income by Month', fontsize=14)
axes[1, 0].set_ylabel('Profit/Loss ($)')
axes[1, 0].grid(axis='y', linestyle='--', alpha=0.5)

# Chart 4: KPI Gauges (Text Representation in Plot)
axes[1, 1].axis('off')
axes[1, 1].text(0.1, 0.8, "CRITICAL ALERT: RENT", fontsize=18, color='red', weight='bold')
axes[1, 1].text(0.1, 0.7, "Rent is 18.6% of Sales (Target: <10%)", fontsize=12)

axes[1, 1].text(0.1, 0.5, "ALERT: BANK FEES", fontsize=18, color='#E67E22', weight='bold')
axes[1, 1].text(0.1, 0.4, "Fees are 4.7% of Sales (Target: <3%)", fontsize=12)

axes[1, 1].text(0.55, 0.8, "GOOD: LABOR COST", fontsize=18, color='green', weight='bold')
axes[1, 1].text(0.55, 0.7, "Labor is 19.1% (Target: <25%)", fontsize=12)

axes[1, 1].text(0.55, 0.5, "OPPORTUNITY: COGS", fontsize=18, color='#3498DB', weight='bold')
axes[1, 1].text(0.55, 0.4, "Beer COGS is 32.5% (Target: 25%)", fontsize=12)

plt.tight_layout(rect=[0, 0.03, 1, 0.95])
plt.savefig('/home/user/CLAUDE_TESTING/dashboard.png', dpi=150, bbox_inches='tight')
print("Dashboard saved to dashboard.png")
