import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/models/finance/budget.dart';
import '../../core/models/finance/category.dart';
import '../../core/providers/finance_provider.dart';

class BudgetsScreen extends ConsumerStatefulWidget {
  const BudgetsScreen({super.key});

  @override
  ConsumerState<BudgetsScreen> createState() => _BudgetsScreenState();
}

class _BudgetsScreenState extends ConsumerState<BudgetsScreen> {
  final _currencyFmt = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    final budgetsAsync = ref.watch(budgetsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final transactionsAsync = ref.watch(transactionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Budgets'),
        leading: BackButton(onPressed: () => context.go('/finance')),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Add Budget',
            onPressed: () => _showBudgetSheet(null, categoriesAsync.valueOrNull ?? []),
          ),
        ],
      ),
      body: budgetsAsync.when(
        data: (budgets) {
          if (budgets.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.pie_chart,
                    size: 64,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurfaceVariant
                        .withOpacity(0.4),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No budgets set',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: () => _showBudgetSheet(
                        null, categoriesAsync.valueOrNull ?? []),
                    icon: const Icon(Icons.add),
                    label: const Text('Set Budget'),
                  ),
                ],
              ),
            );
          }

          final transactions = transactionsAsync.valueOrNull ?? [];
          final now = DateTime.now();
          final monthStart = DateTime(now.year, now.month, 1);

          // Compute this month's expenses per category
          final spendingByCategory = <String, int>{};
          for (final tx in transactions) {
            if (tx.type != 'expense') continue;
            try {
              final date = DateTime.parse(tx.date);
              if (date.isBefore(monthStart)) continue;
            } catch (_) {
              continue;
            }
            if (tx.categoryId != null) {
              spendingByCategory[tx.categoryId!] =
                  (spendingByCategory[tx.categoryId!] ?? 0) + tx.amountMinor;
            }
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(budgetsProvider);
              ref.invalidate(transactionsProvider);
            },
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: budgets.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final budget = budgets[i];
                final spentMinor =
                    spendingByCategory[budget.categoryId] ?? 0;
                return _BudgetCard(
                  budget: budget,
                  spentMinor: spentMinor,
                  currencyFmt: _currencyFmt,
                  onEdit: () => _showBudgetSheet(
                      budget, categoriesAsync.valueOrNull ?? []),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text('$e'),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => ref.invalidate(budgetsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showBudgetSheet(FinBudget? existing, List<FinCategory> categories) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _BudgetFormSheet(
        existing: existing,
        categories: categories,
        onSaved: () {
          ref.invalidate(budgetsProvider);
          Navigator.pop(ctx);
        },
      ),
    );
  }
}

class _BudgetCard extends StatelessWidget {
  final FinBudget budget;
  final int spentMinor;
  final NumberFormat currencyFmt;
  final VoidCallback onEdit;

  const _BudgetCard({
    required this.budget,
    required this.spentMinor,
    required this.currencyFmt,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final limitMinor = budget.monthlyLimitMinor;
    final ratio = limitMinor > 0 ? spentMinor / limitMinor : 0.0;
    final clampedRatio = ratio.clamp(0.0, 1.0);

    final progressColor = ratio < 0.7
        ? Colors.green
        : ratio < 0.9
            ? Colors.amber
            : Colors.red;

    final spent = spentMinor / 100.0;
    final limit = budget.monthlyLimit;
    final remaining = limit - spent;

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  budget.categoryIcon ?? '📂',
                  style: const TextStyle(fontSize: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        budget.categoryName ?? 'Category',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      Text(
                        'Budget: ${currencyFmt.format(limit)} / month',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: onEdit,
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: clampedRatio,
                minHeight: 10,
                backgroundColor:
                    Theme.of(context).colorScheme.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation<Color>(progressColor),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Spent: ${currencyFmt.format(spent)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: progressColor,
                        fontWeight: FontWeight.w500,
                      ),
                ),
                Text(
                  remaining >= 0
                      ? 'Remaining: ${currencyFmt.format(remaining)}'
                      : 'Over by: ${currencyFmt.format(-remaining)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: remaining >= 0
                            ? Theme.of(context).colorScheme.onSurfaceVariant
                            : Colors.red,
                        fontWeight: FontWeight.w500,
                      ),
                ),
                Text(
                  '${(clampedRatio * 100).toInt()}%',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: progressColor,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _BudgetFormSheet extends ConsumerStatefulWidget {
  final FinBudget? existing;
  final List<FinCategory> categories;
  final VoidCallback onSaved;

  const _BudgetFormSheet({
    required this.existing,
    required this.categories,
    required this.onSaved,
  });

  @override
  ConsumerState<_BudgetFormSheet> createState() => _BudgetFormSheetState();
}

class _BudgetFormSheetState extends ConsumerState<_BudgetFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _limitController;
  FinCategory? _selectedCategory;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _limitController = TextEditingController(
      text: widget.existing != null
          ? widget.existing!.monthlyLimit.toStringAsFixed(2)
          : '',
    );
    if (widget.existing != null) {
      _selectedCategory = widget.categories
          .where((c) => c.id == widget.existing!.categoryId)
          .firstOrNull;
    }
  }

  @override
  void dispose() {
    _limitController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final expenseCategories =
        widget.categories.where((c) => c.kind == 'expense').toList();

    return Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        16,
        16,
        MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              widget.existing == null ? 'Set Budget' : 'Edit Budget',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<FinCategory>(
              value: _selectedCategory,
              isExpanded: true,
              hint: const Text('Select category'),
              decoration: const InputDecoration(
                labelText: 'Category',
                border: OutlineInputBorder(),
              ),
              items: expenseCategories
                  .map((c) => DropdownMenuItem(
                        value: c,
                        child: Row(
                          children: [
                            Text(c.icon ?? '📂',
                                style: const TextStyle(fontSize: 18)),
                            const SizedBox(width: 8),
                            Expanded(
                                child: Text(c.name,
                                    overflow: TextOverflow.ellipsis)),
                          ],
                        ),
                      ))
                  .toList(),
              onChanged: widget.existing != null
                  ? null
                  : (v) => setState(() => _selectedCategory = v),
              validator: (v) => v == null ? 'Select a category' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _limitController,
              autofocus: widget.existing != null,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(
                    RegExp(r'^\d+\.?\d{0,2}')),
              ],
              decoration: const InputDecoration(
                labelText: 'Monthly Limit',
                prefixText: '₹ ',
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Enter a limit';
                final parsed = double.tryParse(v);
                if (parsed == null || parsed <= 0) {
                  return 'Enter a valid amount';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _isSaving ? null : _save,
              icon: _isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save),
              label: Text(_isSaving ? 'Saving...' : 'Save Budget'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final categoryId = widget.existing?.categoryId ?? _selectedCategory!.id;
    final limit = double.parse(_limitController.text);
    final limitMinor = (limit * 100).round();

    setState(() => _isSaving = true);
    try {
      await ref.read(financeApiProvider).upsertBudget(categoryId, limitMinor);
      widget.onSaved();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Save failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }
}
