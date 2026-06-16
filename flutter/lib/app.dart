import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/today/today_screen.dart';
import 'features/tasks/tasks_screen.dart';
import 'features/tasks/task_detail_screen.dart';
import 'screens/notes/notes_screen.dart';
import 'screens/notes/note_detail_screen.dart';
import 'screens/finance/finance_screen.dart';
import 'screens/finance/accounts_screen.dart';
import 'screens/finance/transactions_screen.dart';
import 'screens/finance/add_transaction_screen.dart';
import 'screens/finance/budgets_screen.dart';
import 'screens/finance/subscriptions_screen.dart';
import 'screens/habits/habits_screen.dart';
import 'screens/goals/goals_screen.dart';
import 'screens/events/events_screen.dart';
import 'screens/assistant/assistant_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'widgets/bottom_nav.dart';

final isAuthenticatedProvider = Provider<bool>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.valueOrNull != null;
});

final _routerProvider = Provider<GoRouter>((ref) {
  final isAuthenticated = ref.watch(isAuthenticatedProvider);

  return GoRouter(
    initialLocation: '/today',
    redirect: (context, state) {
      final authRoutes = ['/login', '/register'];
      final isAuthRoute = authRoutes.contains(state.matchedLocation);
      if (!isAuthenticated && !isAuthRoute) return '/login';
      if (isAuthenticated && isAuthRoute) return '/today';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => _AppShell(state: state, child: child),
        routes: [
          GoRoute(
            path: '/today',
            builder: (context, state) => const TodayScreen(),
          ),
          GoRoute(
            path: '/tasks',
            builder: (context, state) => const TasksScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => TaskDetailScreen(
                  taskId: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/notes',
            builder: (context, state) => const NotesScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => NoteDetailScreen(
                  id: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/finance',
            builder: (context, state) => const FinanceScreen(),
            routes: [
              GoRoute(
                path: 'accounts',
                builder: (context, state) => const AccountsScreen(),
              ),
              GoRoute(
                path: 'transactions',
                builder: (context, state) => const TransactionsScreen(),
              ),
              GoRoute(
                path: 'add-transaction',
                builder: (context, state) => const AddTransactionScreen(),
              ),
              GoRoute(
                path: 'budgets',
                builder: (context, state) => const BudgetsScreen(),
              ),
              GoRoute(
                path: 'subscriptions',
                builder: (context, state) => const SubscriptionsScreen(),
              ),
            ],
          ),
          GoRoute(
            path: '/habits',
            builder: (context, state) => const HabitsScreen(),
          ),
          GoRoute(
            path: '/goals',
            builder: (context, state) => const GoalsScreen(),
          ),
          GoRoute(
            path: '/events',
            builder: (context, state) => const EventsScreen(),
          ),
          GoRoute(
            path: '/assistant',
            builder: (context, state) => const AssistantScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),
    ],
  );
});

class LifeOsApp extends ConsumerWidget {
  const LifeOsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);

    return MaterialApp.router(
      title: 'Life OS',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}

class _AppShell extends StatelessWidget {
  final GoRouterState state;
  final Widget child;

  const _AppShell({required this.state, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNav(state: state),
    );
  }
}
