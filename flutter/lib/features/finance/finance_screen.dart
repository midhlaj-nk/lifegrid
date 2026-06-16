import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/providers/finance_provider.dart';

class FinanceScreen extends ConsumerStatefulWidget {
  const FinanceScreen({super.key});

  @override
  ConsumerState<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends ConsumerState<FinanceScreen> {
  final _currencyFmt = NumberFormat.currency(symbol: '₹', decimalDigits: 2);

  @override
  Widget build(BuildContext context) {
    final summaryAsync = ref.watch(financeSummaryProvider);
    final now = DateTime.now();
    final monthName = DateFormat.MMMM().format(now);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Finance'),
        centerTitle: false,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/finance/add-transaction'),
        icon: const Icon(Icons.add),
        label: const Text('Add Transaction'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(financeSummaryProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
          children: [
            // Summary card
            summaryAsync.when(
              data: (summary) => _SummaryCard(
                summary: summary,
                monthName: monthName,
                currencyFmt: _currencyFmt,
              ),
              loading: () => const Card(
                child: SizedBox(
                  height: 130,
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
              error: (e, _) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Could not load summary: $e',
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Quick Access',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.3,
              children: [
                _NavTile(
                  icon: Icons.account_balance,
                  label: 'Accounts',
                  color: Colors.blue,
                  onTap: () => context.go('/finance/accounts'),
                ),
                _NavTile(
                  icon: Icons.receipt_long,
                  label: 'Transactions',
                  color: Colors.orange,
                  onTap: () => context.go('/finance/transactions'),
                ),
                _NavTile(
                  icon: Icons.pie_chart,
                  label: 'Budgets',
                  color: Colors.green,
                  onTap: () => context.go('/finance/budgets'),
                ),
                _NavTile(
                  icon: Icons.subscriptions,
                  label: 'Subscriptions',
                  color: Colors.purple,
                  onTap: () => context.go('/finance/subscriptions'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final Map<String, dynamic> summary;
  final String monthName;
  final NumberFormat currencyFmt;

  const _SummaryCard({
    required this.summary,
    required this.monthName,
    required this.currencyFmt,
  });

  @override
  Widget build(BuildContext context) {
    final incomeMinor = (summary['incomeMinor'] as num?)?.toInt() ?? 0;
    final expenseMinor = (summary['expenseMinor'] as num?)?.toInt() ?? 0;
    final netMinor = incomeMinor - expenseMinor;

    final income = incomeMinor / 100.0;
    final expense = expenseMinor / 100.0;
    final net = netMinor / 100.0;

    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Month: $monthName',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _SummaryItem(
                  label: 'Income',
                  value: currencyFmt.format(income),
                  color: Colors.green,
                  icon: Icons.arrow_downward,
                ),
                Container(width: 1, height: 40, color: colorScheme.outlineVariant),
                _SummaryItem(
                  label: 'Expenses',
                  value: currencyFmt.format(expense),
                  color: Colors.red,
                  icon: Icons.arrow_upward,
                ),
                Container(width: 1, height: 40, color: colorScheme.outlineVariant),
                _SummaryItem(
                  label: 'Net',
                  value: currencyFmt.format(net),
                  color: net >= 0 ? Colors.blue : Colors.red,
                  icon: net >= 0 ? Icons.trending_up : Icons.trending_down,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  const _SummaryItem({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: color,
                fontWeight: FontWeight.bold,
              ),
        ),
      ],
    );
  }
}

class _NavTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _NavTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(height: 12),
              Text(
                label,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
