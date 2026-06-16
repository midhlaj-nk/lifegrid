import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/models/finance/transaction.dart';
import '../../core/models/finance/account.dart';
import '../../core/models/finance/category.dart';
import '../../core/providers/finance_provider.dart';

class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  String _filter = 'all';
  final _currencyFmt = NumberFormat.currency(symbol: '₹', decimalDigits: 2);
  final _dateFmt = DateFormat.yMMMd();

  static const _filters = [
    ('all', 'All'),
    ('expense', 'Expenses'),
    ('income', 'Income'),
    ('transfer', 'Transfers'),
  ];

  @override
  Widget build(BuildContext context) {
    final txAsync = ref.watch(transactionsProvider);
    final accountsAsync = ref.watch(accountsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        leading: BackButton(onPressed: () => context.go('/finance')),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter',
            onPressed: () {
              // Future: advanced filter sheet
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/finance/add-transaction'),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          // Filter chips
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: _filters.map((f) {
                final selected = _filter == f.$1;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(f.$2),
                    selected: selected,
                    onSelected: (_) => setState(() => _filter = f.$1),
                  ),
                );
              }).toList(),
            ),
          ),
          // Transaction list
          Expanded(
            child: txAsync.when(
              data: (transactions) {
                final filtered = _filter == 'all'
                    ? transactions
                    : transactions.where((t) => t.type == _filter).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.receipt_long,
                            size: 64,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant
                                .withOpacity(0.4)),
                        const SizedBox(height: 16),
                        Text(
                          'No transactions found',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                              ),
                        ),
                      ],
                    ),
                  );
                }

                final accounts = accountsAsync.valueOrNull ?? [];
                final categories = categoriesAsync.valueOrNull ?? [];

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(transactionsProvider),
                  child: ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (context, i) {
                      final tx = filtered[i];
                      return _TransactionTile(
                        transaction: tx,
                        accounts: accounts,
                        categories: categories,
                        currencyFmt: _currencyFmt,
                        dateFmt: _dateFmt,
                        onDelete: () => _confirmDelete(tx),
                      );
                    },
                  ),
                );
              },
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.error_outline,
                          color:
                              Theme.of(context).colorScheme.error,
                          size: 48),
                      const SizedBox(height: 12),
                      Text('Failed to load transactions: $e'),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () =>
                            ref.invalidate(transactionsProvider),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(FinTransaction tx) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Transaction'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        await ref.read(financeApiProvider).deleteTransaction(tx.id);
        ref.invalidate(transactionsProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Transaction deleted')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Delete failed: $e')),
          );
        }
      }
    }
  }
}

class _TransactionTile extends StatelessWidget {
  final FinTransaction transaction;
  final List<FinAccount> accounts;
  final List<FinCategory> categories;
  final NumberFormat currencyFmt;
  final DateFormat dateFmt;
  final VoidCallback onDelete;

  const _TransactionTile({
    required this.transaction,
    required this.accounts,
    required this.categories,
    required this.currencyFmt,
    required this.dateFmt,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final account = accounts.where((a) => a.id == transaction.accountId).firstOrNull;
    final category = categories.where((c) => c.id == transaction.categoryId).firstOrNull;

    final isExpense = transaction.type == 'expense';
    final isIncome = transaction.type == 'income';

    final amountColor = isExpense
        ? Colors.red
        : isIncome
            ? Colors.green
            : Colors.blue;

    final amountPrefix = isExpense ? '-' : isIncome ? '+' : '';

    final categoryEmoji = category?.icon ?? _typeEmoji(transaction.type);
    final title = transaction.note?.isNotEmpty == true
        ? transaction.note!
        : category?.name ?? _typeLabel(transaction.type);

    final dateStr = _formatDate(transaction.date, dateFmt);
    final accountName = account?.name ?? 'Unknown Account';

    return Slidable(
      endActionPane: ActionPane(
        motion: const DrawerMotion(),
        children: [
          SlidableAction(
            onPressed: (_) => onDelete(),
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
            icon: Icons.delete,
            label: 'Delete',
            borderRadius: const BorderRadius.horizontal(right: Radius.circular(12)),
          ),
        ],
      ),
      child: ListTile(
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: amountColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              categoryEmoji,
              style: const TextStyle(fontSize: 20),
            ),
          ),
        ),
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
          '$dateStr · $accountName',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        trailing: Text(
          '$amountPrefix${currencyFmt.format(transaction.amount)}',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: amountColor,
                fontWeight: FontWeight.bold,
              ),
        ),
      ),
    );
  }

  String _typeEmoji(String type) {
    switch (type) {
      case 'income':
        return '💰';
      case 'transfer':
        return '↔️';
      default:
        return '💸';
    }
  }

  String _typeLabel(String type) {
    switch (type) {
      case 'income':
        return 'Income';
      case 'transfer':
        return 'Transfer';
      default:
        return 'Expense';
    }
  }

  String _formatDate(String date, DateFormat fmt) {
    try {
      return fmt.format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }
}
