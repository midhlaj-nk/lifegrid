import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class BottomNav extends StatelessWidget {
  final GoRouterState state;

  const BottomNav({super.key, required this.state});

  static const _destinations = [
    _NavDestination(path: '/today', label: 'Today', icon: Icons.today),
    _NavDestination(path: '/tasks', label: 'Tasks', icon: Icons.check_box),
    _NavDestination(path: '/notes', label: 'Notes', icon: Icons.article),
    _NavDestination(
      path: '/finance',
      label: 'Finance',
      icon: Icons.account_balance_wallet,
    ),
    _NavDestination(path: '/habits', label: 'Habits', icon: Icons.repeat),
    _NavDestination(path: '/goals', label: 'Goals', icon: Icons.flag),
    _NavDestination(path: '/events', label: 'Events', icon: Icons.event),
    _NavDestination(
      path: '/assistant',
      label: 'Assistant',
      icon: Icons.smart_toy,
    ),
  ];

  int _selectedIndex(String location) {
    for (int i = 0; i < _destinations.length; i++) {
      if (location.startsWith(_destinations[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = state.matchedLocation;
    final selectedIndex = _selectedIndex(location);

    return NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: (index) {
        context.go(_destinations[index].path);
      },
      destinations: _destinations
          .map(
            (d) => NavigationDestination(
              icon: Icon(d.icon),
              label: d.label,
            ),
          )
          .toList(),
    );
  }
}

class _NavDestination {
  final String path;
  final String label;
  final IconData icon;

  const _NavDestination({
    required this.path,
    required this.label,
    required this.icon,
  });
}
