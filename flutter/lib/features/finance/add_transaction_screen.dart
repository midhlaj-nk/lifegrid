import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/models/finance/account.dart';
import '../../core/models/finance/category.dart';
import '../../core/providers/finance_provider.dart';

class AddTransactionScreen extends ConsumerStatefulWidget {
  const AddTransactionScreen({super.key});

  @override
  ConsumerState<AddTransactionScreen> createState() =>
      _AddTransactionScreenState();
}

class _AddTransactionScreenState extends ConsumerState<AddTransactionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();

  String _type = 'expense';
  FinAccount? _selectedAccount;
  FinAccount? _selectedToAccount;
  FinCategory? _selectedCategory;
  DateTime _selectedDate = DateTime.now();
  bool _isSaving = false;

  final _dateFmt = DateFormat.yMMMd();

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final accountsAsync = ref.watch(accountsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);

    final accounts = accountsAsync.valueOrNull ?? [];
    final allCategories = categoriesAsync.valueOrNull ?? [];
    final filteredCategories = allCategories
        .where((c) => _type == 'transfer' || c.kind == _type || c.kind == 'any')
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Transaction'),
        leading: BackButton(onPressed: () => context.go('/finance')),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Type selector
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Transaction Type',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 12),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'expense',
                          label: Text('Expense'),
                          icon: Icon(Icons.arrow_upward),
                        ),
                        ButtonSegment(
                          value: 'income',
                          label: Text('Income'),
                          icon: Icon(Icons.arrow_downward),
                        ),
                        ButtonSegment(
                          value: 'transfer',
                          label: Text('Transfer'),
                          icon: Icon(Icons.swap_horiz),
                        ),
                      ],
                      selected: {_type},
                      onSelectionChanged: (value) {
                        setState(() {
                          _type = value.first;
                          _selectedCategory = null;
                        });
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Amount
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: TextFormField(
                  controller: _amountController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'Amount',
                    prefixText: '₹ ',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Enter an amount';
                    final parsed = double.tryParse(v);
                    if (parsed == null || parsed <= 0) {
                      return 'Enter a valid amount';
                    }
                    return null;
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Account
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _type == 'transfer' ? 'From Account' : 'Account',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 8),
                    accountsAsync.when(
                      data: (_) => DropdownButtonFormField<FinAccount>(
                        value: _selectedAccount,
                        isExpanded: true,
                        hint: const Text('Select account'),
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(
                              horizontal: 12, vertical: 14),
                        ),
                        items: accounts
                            .map((a) => DropdownMenuItem(
                                  value: a,
                                  child: Row(
                                    children: [
                                      Icon(_accountIcon(a.type), size: 18),
                                      const SizedBox(width: 8),
                                      Expanded(
                                          child: Text(a.name,
                                              overflow:
                                                  TextOverflow.ellipsis)),
                                    ],
                                  ),
                                ))
                            .toList(),
                        onChanged: (v) =>
                            setState(() => _selectedAccount = v),
                        validator: (v) =>
                            v == null ? 'Select an account' : null,
                      ),
                      loading: () =>
                          const LinearProgressIndicator(),
                      error: (e, _) => Text('Error: $e'),
                    ),
                  ],
                ),
              ),
            ),
            if (_type == 'transfer') ...[
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'To Account',
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      const SizedBox(height: 8),
                      accountsAsync.when(
                        data: (_) => DropdownButtonFormField<FinAccount>(
                          value: _selectedToAccount,
                          isExpanded: true,
                          hint: const Text('Select destination account'),
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(
                                horizontal: 12, vertical: 14),
                          ),
                          items: accounts
                              .where((a) => a.id != _selectedAccount?.id)
                              .map((a) => DropdownMenuItem(
                                    value: a,
                                    child: Row(
                                      children: [
                                        Icon(_accountIcon(a.type), size: 18),
                                        const SizedBox(width: 8),
                                        Expanded(
                                            child: Text(a.name,
                                                overflow:
                                                    TextOverflow.ellipsis)),
                                      ],
                                    ),
                                  ))
                              .toList(),
                          onChanged: (v) =>
                              setState(() => _selectedToAccount = v),
                          validator: (v) =>
                              v == null ? 'Select destination account' : null,
                        ),
                        loading: () =>
                            const LinearProgressIndicator(),
                        error: (e, _) => Text('Error: $e'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (_type != 'transfer') ...[
              const SizedBox(height: 12),
              // Category
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Category',
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      const SizedBox(height: 8),
                      categoriesAsync.when(
                        data: (_) => DropdownButtonFormField<FinCategory>(
                          value: _selectedCategory,
                          isExpanded: true,
                          hint: const Text('Select category'),
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(
                                horizontal: 12, vertical: 14),
                          ),
                          items: filteredCategories
                              .map((c) => DropdownMenuItem(
                                    value: c,
                                    child: Row(
                                      children: [
                                        Text(c.icon ?? '📂',
                                            style: const TextStyle(
                                                fontSize: 18)),
                                        const SizedBox(width: 8),
                                        Expanded(
                                            child: Text(c.name,
                                                overflow:
                                                    TextOverflow.ellipsis)),
                                      ],
                                    ),
                                  ))
                              .toList(),
                          onChanged: (v) =>
                              setState(() => _selectedCategory = v),
                        ),
                        loading: () =>
                            const LinearProgressIndicator(),
                        error: (e, _) => Text('Error: $e'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 12),
            // Date
            Card(
              child: ListTile(
                leading: const Icon(Icons.calendar_today),
                title: const Text('Date'),
                subtitle: Text(_dateFmt.format(_selectedDate)),
                trailing: const Icon(Icons.chevron_right),
                onTap: _pickDate,
              ),
            ),
            const SizedBox(height: 12),
            // Note
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: TextFormField(
                  controller: _noteController,
                  decoration: const InputDecoration(
                    labelText: 'Note (optional)',
                    hintText: 'Add a note...',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.notes),
                  ),
                  maxLines: 2,
                  textCapitalization: TextCapitalization.sentences,
                ),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _isSaving ? null : _save,
              icon: _isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save),
              label: Text(_isSaving ? 'Saving...' : 'Save Transaction'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final amountDouble = double.parse(_amountController.text);
    final amountMinor = (amountDouble * 100).round();

    final body = <String, dynamic>{
      'type': _type,
      'amountMinor': amountMinor,
      'accountId': _selectedAccount!.id,
      'date': _selectedDate.toIso8601String().split('T').first,
      if (_noteController.text.isNotEmpty) 'note': _noteController.text,
      if (_selectedCategory != null) 'categoryId': _selectedCategory!.id,
      if (_type == 'transfer' && _selectedToAccount != null)
        'transferToAccountId': _selectedToAccount!.id,
    };

    setState(() => _isSaving = true);
    try {
      await ref.read(financeApiProvider).createTransaction(body);
      ref.invalidate(transactionsProvider);
      ref.invalidate(financeSummaryProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaction saved')),
        );
        context.go('/finance');
      }
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

  IconData _accountIcon(String type) {
    switch (type) {
      case 'bank':
        return Icons.account_balance;
      case 'cash':
        return Icons.money;
      case 'card':
        return Icons.credit_card;
      case 'upi':
        return Icons.phone_android;
      default:
        return Icons.account_balance_wallet;
    }
  }
}
