import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/task.dart';
import '../../core/providers/tasks_provider.dart';
import 'add_task_modal.dart';
import 'widgets/task_item.dart';

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) {
        setState(() {
          _searchQuery = _searchController.text.trim().toLowerCase();
        });
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _searchDebounce?.cancel();
    super.dispose();
  }

  void _showAddTaskModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddTaskModal(),
    );
  }

  List<Task> _applySearch(List<Task> tasks) {
    if (_searchQuery.isEmpty) return tasks;
    return tasks
        .where((t) => t.title.toLowerCase().contains(_searchQuery))
        .toList();
  }

  List<Task> _filterAll(List<Task> tasks) =>
      _applySearch(tasks.where((t) => !t.isDone).toList());

  List<Task> _filterToday(List<Task> tasks) {
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    return _applySearch(
      tasks.where((t) => !t.isDone && t.dueDate == today).toList(),
    );
  }

  List<Task> _filterOverdue(List<Task> tasks) =>
      _applySearch(tasks.where((t) => t.isOverdue).toList());

  List<Task> _filterDone(List<Task> tasks) =>
      _applySearch(tasks.where((t) => t.isDone).toList());

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final tasksAsync = ref.watch(tasksProvider);

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        surfaceTintColor: Colors.transparent,
        title: Text(
          'Tasks',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            tooltip: 'Refresh',
            onPressed: () {
              ref.read(tasksProvider.notifier).refresh();
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(96),
          child: Column(
            children: [
              // Search bar
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search tasks...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                            },
                          )
                        : null,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                      vertical: 10,
                      horizontal: 12,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                    filled: true,
                    fillColor: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  ),
                ),
              ),
              // Tabs
              TabBar(
                controller: _tabController,
                tabs: const [
                  Tab(text: 'All'),
                  Tab(text: 'Today'),
                  Tab(text: 'Overdue'),
                  Tab(text: 'Done'),
                ],
                labelStyle: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
                unselectedLabelStyle: const TextStyle(
                  fontWeight: FontWeight.w400,
                  fontSize: 13,
                ),
                indicatorSize: TabBarIndicatorSize.label,
              ),
            ],
          ),
        ),
      ),
      body: tasksAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline,
                  size: 48, color: colorScheme.error),
              const SizedBox(height: 12),
              Text(
                'Failed to load tasks',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () =>
                    ref.read(tasksProvider.notifier).refresh(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (tasks) => TabBarView(
          controller: _tabController,
          children: [
            _TaskList(
              tasks: _filterAll(tasks),
              emptyMessage: 'No active tasks',
              emptyIcon: Icons.check_circle_outline,
            ),
            _TaskList(
              tasks: _filterToday(tasks),
              emptyMessage: 'No tasks for today',
              emptyIcon: Icons.today_outlined,
            ),
            _TaskList(
              tasks: _filterOverdue(tasks),
              emptyMessage: 'No overdue tasks',
              emptyIcon: Icons.schedule_outlined,
              emptyColor: Colors.green,
            ),
            _TaskList(
              tasks: _filterDone(tasks),
              emptyMessage: 'No completed tasks',
              emptyIcon: Icons.task_alt_outlined,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddTaskModal,
        tooltip: 'Add task',
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _TaskList extends ConsumerWidget {
  final List<Task> tasks;
  final String emptyMessage;
  final IconData emptyIcon;
  final Color? emptyColor;

  const _TaskList({
    required this.tasks,
    required this.emptyMessage,
    required this.emptyIcon,
    this.emptyColor,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (tasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              emptyIcon,
              size: 56,
              color: (emptyColor ?? colorScheme.onSurface).withValues(alpha: 0.3),
            ),
            const SizedBox(height: 12),
            Text(
              emptyMessage,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.4),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(tasksProvider.notifier).refresh(),
      child: ListView.separated(
        padding: const EdgeInsets.only(top: 8, bottom: 80),
        itemCount: tasks.length,
        separatorBuilder: (_, __) => Divider(
          height: 1,
          indent: 52,
          color: colorScheme.outlineVariant.withValues(alpha: 0.4),
        ),
        itemBuilder: (context, index) {
          final task = tasks[index];
          return TaskItemWidget(
            task: task,
            onTap: () {
              context.push('/tasks/${task.id}');
            },
          );
        },
      ),
    );
  }
}
