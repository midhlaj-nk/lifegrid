import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/models/finance/subscription.dart';
import '../../core/models/finance/account.dart';
import '../../core/models/finance/category.dart';
import '../../core/providers/finance_provider.dart';

class SubscriptionsScreen extends ConsumerStatefulWidget {
  const SubscriptionsScreen({super.key});

  @override
  ConsumerState<SubscriptionsScreen> createState() =>
      _SubscriptionsScreenState();
}

class _SubscriptionsScreenState extends ConsumerState<SubscriptionsScreen> {
  final _currencyFmt = NumberFormat.currency(symbol: '₹', decimalDigits: 2);
  final _dateFmt = DateFormat.yMMMd();

  @override
  Widget build(BuildContext context) {
    final subscriptionsAsync = ref.watch(subscriptionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscriptions'),
        leading: BackButton(onPressed: () => context.go('/finance')),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddSheet,
        child: const Icon(Icons.add),
      ),
      body: subscriptionsAsync.when(
        data: (subscriptions) {
          if (subscriptions.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.subscriptions,
                    size: 64,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurfaceVariant
                        .withOpacity(0.4),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No subscriptions tracked',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: _showAddSheet,
                    icon: const Icon(Icons.add),
                    label: const Text('Add Subscription'),
                  ),
                ],
              ),
            );
          }

          final active = subscriptions.where((s) => s.active).toList();
          final inactive = subscriptions.where((s) => !s.active).toList();

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(subscriptionsProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              children: [
                if (active.isNotEmpty) ...[
                  _SectionHeader(
                    label: 'Active',
                    count: active.length,
                    trailing: _totalText(active),
                  ),
                  const SizedBox(height: 8),
                  ...active.map((s) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _SubscriptionCard(
                          subscription: s,
                          currencyFmt: _currencyFmt,
                          dateFmt: _dateFmt,
                          onDelete: () => _confirmDelete(s),
                        ),
                      )),
                ],
                if (inactive.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _SectionHeader(
                    label: 'Inactive',
                    count: inactive.length,
                    trailing: '',
                  ),
                  const SizedBox(height: 8),
                  ...inactive.map((s) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _SubscriptionCard(
                          subscription: s,
                          currencyFmt: _currencyFmt,
                          dateFmt: _dateFmt,
                          onDelete: () => _confirmDelete(s),
                        ),
                      )),
                ],
              ],
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
                onPressed: () => ref.invalidate(subscriptionsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _totalText(List<FinSubscription> subs) {
    final total = subs.fold<double>(0, (sum, s) => sum + s.amount);
    return '₹${total.toStringAsFixed(0)}/mo';
  }

  void _showAddSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _AddSubscriptionSheet(
        onSaved: () {
          ref.invalidate(subscriptionsProvider);
          Navigator.pop(ctx);
        },
      ),
    );
  }

  Future<void> _confirmDelete(FinSubscription sub) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Subscription'),
        content: Text('Remove "${sub.name}"?'),
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
        await ref.read(financeApiProvider).deleteSubscription(sub.id);
        ref.invalidate(subscriptionsProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('"${sub.name}" deleted')),
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

class _SectionHeader extends StatelessWidget {
  final String label;
  final int count;
  final String trailing;

  const _SectionHeader({
    required this.label,
    required this.count,
    required this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          '$label ($count)',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const Spacer(),
        if (trailing.isNotEmpty)
          Text(
            trailing,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
          ),
      ],
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  final FinSubscription subscription;
  final NumberFormat currencyFmt;
  final DateFormat dateFmt;
  final VoidCallback onDelete;

  const _SubscriptionCard({
    required this.subscription,
    required this.currencyFmt,
    required this.dateFmt,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final dueDate = _parseDate(subscription.nextDueDate);
    final isOverdue = dueDate != null && dueDate.isBefore(DateTime.now());
    final dueDateStr = dueDate != null ? dateFmt.format(dueDate) : subscription.nextDueDate;
    final cadenceLabel = _cadenceLabel(subscription.cadence);

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
            borderRadius: const BorderRadius.horizontal(
                right: Radius.circular(16)),
          ),
        ],
      ),
      child: Card(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: subscription.active
                      ? Theme.of(context).colorScheme.primaryContainer
                      : Theme.of(context)
                          .colorScheme
                          .surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  Icons.repeat,
                  color: subscription.active
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      subscription.name,
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.calendar_today,
                            size: 12,
                            color: isOverdue
                                ? Colors.red
                                : Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant),
                        const SizedBox(width: 4),
                        Text(
                          isOverdue ? 'Overdue · $dueDateStr' : 'Due $dueDateStr',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(
                                color: isOverdue
                                    ? Colors.red
                                    : Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                              ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Theme.of(context)
                                .colorScheme
                                .surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            cadenceLabel,
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    currencyFmt.format(subscription.amount),
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: subscription.active
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: subscription.active
                          ? Colors.green.withOpacity(0.15)
                          : Colors.grey.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      subscription.active ? 'Active' : 'Paused',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: subscription.active
                                ? Colors.green
                                : Colors.grey,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  DateTime? _parseDate(String date) {
    try {
      return DateTime.parse(date);
    } catch (_) {
      return null;
    }
  }

  String _cadenceLabel(String cadence) {
    switch (cadence) {
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      default:
        return cadence;
    }
  }
}

class _AddSubscriptionSheet extends ConsumerStatefulWidget {
  final VoidCallback onSaved;

  const _AddSubscriptionSheet({required this.onSaved});

  @override
  ConsumerState<_AddSubscriptionSheet> createState() =>
      _AddSubscriptionSheetState();
}

class _AddSubscriptionSheetState
    extends ConsumerState<_AddSubscriptionSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();

  String _cadence = 'monthly';
  FinAccount? _selectedAccount;
  FinCategory? _selectedCategory;
  DateTime _nextDueDate = DateTime.now().add(const Duration(days: 30));
  bool _active = true;
  bool _autoLog = false;
  bool _isSaving = false;

  final _dateFmt = DateFormat.yMMMd();

  static const _cadences = [
    ('weekly', 'Weekly'),
    ('monthly', 'Monthly'),
    ('quarterly', 'Quarterly'),
    ('yearly', 'Yearly'),
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final accountsAsync = ref.watch(accountsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final accounts = accountsAsync.valueOrNull ?? [];
    final categories = categoriesAsync.valueOrNull ?? [];

    return Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        16,
        16,
        MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Form(
        key: _formKey,
        child: ListView(
          shrinkWrap: true,
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
              'New Subscription',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              autofocus: true,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Name',
                hintText: 'e.g. Netflix, Spotify...',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.subscriptions_outlined),
              ),
              validator: (v) =>
                  v == null || v.isEmpty ? 'Enter a name' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _amountController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(
                    RegExp(r'^\d+\.?\d{0,2}')),
              ],
              decoration: const InputDecoration(
                labelText: 'Amount',
                prefixText: '₹ ',
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Enter amount';
                final p = double.tryParse(v);
                if (p == null || p <= 0) return 'Invalid amount';
                return null;
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<FinAccount>(
              value: _selectedAccount,
              isExpanded: true,
              hint: const Text('Select account'),
              decoration: const InputDecoration(
                labelText: 'Account',
                border: OutlineInputBorder(),
              ),
              items: accounts
                  .map((a) => DropdownMenuItem(
                        value: a,
                        child: Text(a.name),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _selectedAccount = v),
              validator: (v) => v == null ? 'Select an account' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<FinCategory>(
              value: _selectedCategory,
              isExpanded: true,
              hint: const Text('Category (optional)'),
              decoration: const InputDecoration(
                labelText: 'Category',
                border: OutlineInputBorder(),
              ),
              items: categories
                  .map((c) => DropdownMenuItem(
                        value: c,
                        child: Row(
                          children: [
                            Text(c.icon ?? '📂',
                                style: const TextStyle(fontSize: 16)),
                            const SizedBox(width: 8),
                            Expanded(
                                child: Text(c.name,
                                    overflow: TextOverflow.ellipsis)),
                          ],
                        ),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _selectedCategory = v),
            ),
            const SizedBox(height: 12),
            // Cadence
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Billing Cycle',
                    style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: _cadences.map((c) {
                    return ChoiceChip(
                      label: Text(c.$2),
                      selected: _cadence == c.$1,
                      onSelected: (_) => setState(() => _cadence = c.$1),
                    );
                  }).toList(),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Next due date
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.calendar_today),
              title: const Text('Next Due Date'),
              subtitle: Text(_dateFmt.format(_nextDueDate)),
              trailing: const Icon(Icons.chevron_right),
              onTap: _pickDueDate,
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Active'),
              subtitle: const Text('Track this subscription'),
              value: _active,
              onChanged: (v) => setState(() => _active = v),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Auto-log'),
              subtitle: const Text('Automatically create a transaction on due date'),
              value: _autoLog,
              onChanged: (v) => setState(() => _autoLog = v),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: _isSaving ? null : _save,
              icon: _isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save),
              label: Text(_isSaving ? 'Saving...' : 'Save Subscription'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _nextDueDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );
    if (picked != null) setState(() => _nextDueDate = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final amount = double.parse(_amountController.text);
    setState(() => _isSaving = true);
    try {
      await ref.read(financeApiProvider).createSubscription({
        'name': _nameController.text.trim(),
        'amountMinor': (amount * 100).round(),
        'accountId': _selectedAccount!.id,
        if (_selectedCategory != null) 'categoryId': _selectedCategory!.id,
        'cadence': _cadence,
        'nextDueDate': _nextDueDate.toIso8601String().split('T').first,
        'active': _active,
        'autoLog': _autoLog,
      });
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
