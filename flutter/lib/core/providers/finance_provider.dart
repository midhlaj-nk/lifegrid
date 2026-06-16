import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../models/finance/account.dart';
import '../models/finance/category.dart';
import '../models/finance/transaction.dart';
import '../models/finance/budget.dart';
import '../models/finance/subscription.dart';

// ---------------------------------------------------------------------------
// FinanceApi
// ---------------------------------------------------------------------------

class FinanceApi {
  final ApiClient _client;

  FinanceApi(this._client);

  // Accounts ----------------------------------------------------------------

  Future<List<FinAccount>> getAccounts() async {
    try {
      final response = await _client.get('/finance/accounts');
      final data = response.data as Map<String, dynamic>;
      final list = data['accounts'] as List<dynamic>? ?? [];
      return list
          .map((a) => FinAccount.fromJson(a as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createAccount(Map<String, dynamic> body) async {
    try {
      final response = await _client.post('/finance/accounts', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateAccount(String id, Map<String, dynamic> body) async {
    try {
      await _client.put('/finance/accounts/$id', data: body);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteAccount(String id) async {
    try {
      await _client.delete('/finance/accounts/$id');
    } catch (e) {
      rethrow;
    }
  }

  // Categories --------------------------------------------------------------

  Future<List<FinCategory>> getCategories() async {
    try {
      final response = await _client.get('/finance/categories');
      final data = response.data as Map<String, dynamic>;
      final list = data['categories'] as List<dynamic>? ?? [];
      return list
          .map((c) => FinCategory.fromJson(c as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  // Transactions ------------------------------------------------------------

  Future<List<FinTransaction>> getTransactions({
    String? accountId,
    String? type,
    String? startDate,
    String? endDate,
    int limit = 100,
  }) async {
    try {
      final query = <String, dynamic>{'limit': limit};
      if (accountId != null) query['accountId'] = accountId;
      if (type != null) query['type'] = type;
      if (startDate != null) query['startDate'] = startDate;
      if (endDate != null) query['endDate'] = endDate;

      final response = await _client.get(
        '/finance/transactions',
        queryParameters: query,
      );
      final data = response.data as Map<String, dynamic>;
      final list = data['transactions'] as List<dynamic>? ?? [];
      return list
          .map((t) => FinTransaction.fromJson(t as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createTransaction(Map<String, dynamic> body) async {
    try {
      final response =
          await _client.post('/finance/transactions', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteTransaction(String id) async {
    try {
      await _client.delete('/finance/transactions/$id');
    } catch (e) {
      rethrow;
    }
  }

  // Budgets -----------------------------------------------------------------

  Future<List<FinBudget>> getBudgets() async {
    try {
      final response = await _client.get('/finance/budgets');
      final data = response.data as Map<String, dynamic>;
      final list = data['budgets'] as List<dynamic>? ?? [];
      return list
          .map((b) => FinBudget.fromJson(b as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> upsertBudget(String categoryId, int monthlyLimitMinor) async {
    try {
      await _client.post('/finance/budgets', data: {
        'categoryId': categoryId,
        'monthlyLimitMinor': monthlyLimitMinor,
      });
    } catch (e) {
      rethrow;
    }
  }

  // Subscriptions -----------------------------------------------------------

  Future<List<FinSubscription>> getSubscriptions() async {
    try {
      final response = await _client.get('/finance/subscriptions');
      final data = response.data as Map<String, dynamic>;
      final list = data['subscriptions'] as List<dynamic>? ?? [];
      return list
          .map((s) => FinSubscription.fromJson(s as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createSubscription(Map<String, dynamic> body) async {
    try {
      final response =
          await _client.post('/finance/subscriptions', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteSubscription(String id) async {
    try {
      await _client.delete('/finance/subscriptions/$id');
    } catch (e) {
      rethrow;
    }
  }

  // Summary -----------------------------------------------------------------

  Future<Map<String, dynamic>> getSummary({String? month}) async {
    try {
      final query = <String, dynamic>{};
      if (month != null) query['month'] = month;

      final response = await _client.get(
        '/finance/summary',
        queryParameters: query.isEmpty ? null : query,
      );
      return response.data as Map<String, dynamic>;
    } catch (e) {
      rethrow;
    }
  }
}

// ---------------------------------------------------------------------------
// API provider
// ---------------------------------------------------------------------------

final financeApiProvider = Provider<FinanceApi>((ref) {
  return FinanceApi(ApiClient());
});

// ---------------------------------------------------------------------------
// FutureProviders
// ---------------------------------------------------------------------------

final accountsProvider = FutureProvider<List<FinAccount>>((ref) async {
  return ref.read(financeApiProvider).getAccounts();
});

final categoriesProvider = FutureProvider<List<FinCategory>>((ref) async {
  return ref.read(financeApiProvider).getCategories();
});

final transactionsProvider =
    FutureProvider<List<FinTransaction>>((ref) async {
  return ref.read(financeApiProvider).getTransactions();
});

final budgetsProvider = FutureProvider<List<FinBudget>>((ref) async {
  return ref.read(financeApiProvider).getBudgets();
});

final subscriptionsProvider =
    FutureProvider<List<FinSubscription>>((ref) async {
  return ref.read(financeApiProvider).getSubscriptions();
});

final financeSummaryProvider =
    FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.read(financeApiProvider).getSummary();
});
