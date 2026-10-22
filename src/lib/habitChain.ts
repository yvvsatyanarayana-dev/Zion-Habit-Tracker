import type { Habit, HabitDependency, DependencyType, ChainValidationResult, RescheduleResult } from './types';

/**
 * Validates habit dependency graph for cycles
 * Returns validation result with any cycles found
 */
export function validateHabitChains(habits: Habit[], dependencies: HabitDependency[]): ChainValidationResult {
  const habitIds = new Set(habits.map(h => h.id));
  const adjList = new Map<string, Set<string>>();
  const reverseAdjList = new Map<string, Set<string>>();

  // Build adjacency lists
  for (const dep of dependencies) {
    if (!habitIds.has(dep.habit_id) || !habitIds.has(dep.depends_on_id)) {
      continue; // Skip dependencies to/from non-existent habits
    }

    if (!adjList.has(dep.depends_on_id)) {
      adjList.set(dep.depends_on_id, new Set());
    }
    adjList.get(dep.depends_on_id)!.add(dep.habit_id);

    if (!reverseAdjList.has(dep.habit_id)) {
      reverseAdjList.set(dep.habit_id, new Set());
    }
    reverseAdjList.get(dep.habit_id)!.add(dep.depends_on_id);
  }

  // Detect cycles using DFS
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];
  const path: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adjList.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        // Found a cycle - extract it
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart).concat(neighbor));
        return true;
      }
    }

    recStack.delete(node);
    path.pop();
    return false;
  }

  for (const habitId of habitIds) {
    if (!visited.has(habitId)) {
      dfs(habitId);
    }
  }

  const errors: string[] = [];
  if (cycles.length > 0) {
    errors.push(`Found ${cycles.length} circular dependenc${cycles.length === 1 ? 'y' : 'ies'}`);
    for (const cycle of cycles) {
      errors.push(`Cycle: ${cycle.join(' → ')}`);
    }
  }

  return {
    valid: cycles.length === 0,
    cycles,
    errors,
  };
}

/**
 * Gets all prerequisites for a habit (transitive closure)
 */
export function getAllPrerequisites(habitId: string, dependencies: HabitDependency[]): Set<string> {
  const prereqs = new Set<string>();
  const visited = new Set<string>();

  function collect(hId: string) {
    if (visited.has(hId)) return;
    visited.add(hId);

    for (const dep of dependencies) {
      if (dep.habit_id === hId && dep.type === 'prerequisite') {
        prereqs.add(dep.depends_on_id);
        collect(dep.depends_on_id);
      }
    }
  }

  collect(habitId);
  return prereqs;
}

/**
 * Gets all dependents for a habit (transitive closure)
 */
export function getAllDependents(habitId: string, dependencies: HabitDependency[]): Set<string> {
  const dependents = new Set<string>();
  const visited = new Set<string>();

  function collect(hId: string) {
    if (visited.has(hId)) return;
    visited.add(hId);

    for (const dep of dependencies) {
      if (dep.depends_on_id === hId && dep.type === 'prerequisite') {
        dependents.add(dep.habit_id);
        collect(dep.habit_id);
      }
    }
  }

  collect(habitId);
  return dependents;
}

/**
 * Checks if a habit can be completed on a given date based on prerequisites
 */
export function canCompleteHabit(
  habitId: string,
  date: string,
  dependencies: HabitDependency[],
  checkins: Record<string, { habit_id: string; date: string; completed: boolean }>
): { allowed: boolean; missingPrereqs: string[] } {
  const prereqs = getAllPrerequisites(habitId, dependencies);
  const missing: string[] = [];

  for (const prereqId of prereqs) {
    const key = `${prereqId}_${date}`;
    const checkin = checkins[key];
    if (!checkin || !checkin.completed) {
      missing.push(prereqId);
    }
  }

  return {
    allowed: missing.length === 0,
    missingPrereqs: missing,
  };
}

/**
 * Checks if completing a habit would violate any anti-chains
 */
export function checkAntiChains(
  habitId: string,
  date: string,
  dependencies: HabitDependency[],
  checkins: Record<string, { habit_id: string; date: string; completed: boolean }>
): { allowed: boolean; conflicts: string[] } {
  const conflicts: string[] = [];

  for (const dep of dependencies) {
    if (dep.type === 'anti') {
      // If this habit is the anti-dependency target
      if (dep.depends_on_id === habitId) {
        const key = `${dep.habit_id}_${date}`;
        const checkin = checkins[key];
        if (checkin && checkin.completed) {
          conflicts.push(dep.habit_id);
        }
      }
      // If this habit has an anti-dependency
      if (dep.habit_id === habitId) {
        const key = `${dep.depends_on_id}_${date}`;
        const checkin = checkins[key];
        if (checkin && checkin.completed) {
          conflicts.push(dep.depends_on_id);
        }
      }
    }
  }

  return {
    allowed: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Smart reschedule - moves a habit and cascades to dependents
 */
export function smartReschedule(
  habitId: string,
  fromDate: string,
  toDate: string,
  habits: Habit[],
  dependencies: HabitDependency[],
  checkins: Record<string, { habit_id: string; date: string; completed: boolean }>
): RescheduleResult {
  const moved: RescheduleResult['moved'] = [];
  const blocked: RescheduleResult['blocked'] = [];

  // Get all dependents that need to move
  const dependents = getAllDependents(habitId, dependencies);
  const allToMove = [habitId, ...dependents];

  // Check if target date is valid for each habit
  for (const hId of allToMove) {
    const habit = habits.find(h => h.id === hId);
    if (!habit) continue;

    // Check if habit is scheduled on target day
    const toDayOfWeek = new Date(toDate).getDay();
    if (!habit.schedule_days.includes(toDayOfWeek)) {
      blocked.push({ habitId: hId, reason: `Not scheduled on ${toDate}` });
      continue;
    }

    // Check if already completed on target date
    const key = `${hId}_${toDate}`;
    if (checkins[key]?.completed) {
      blocked.push({ habitId: hId, reason: `Already completed on ${toDate}` });
      continue;
    }

    // Check prerequisites on target date
    const prereqCheck = canCompleteHabit(hId, toDate, dependencies, checkins);
    if (!prereqCheck.allowed) {
      blocked.push({ habitId: hId, reason: `Prerequisites not met: ${prereqCheck.missingPrereqs.join(', ')}` });
      continue;
    }

    // Check anti-chains on target date
    const antiCheck = checkAntiChains(hId, toDate, dependencies, checkins);
    if (!antiCheck.allowed) {
      blocked.push({ habitId: hId, reason: `Anti-chain conflict with: ${antiCheck.conflicts.join(', ')}` });
      continue;
    }

    moved.push({ habitId: hId, fromDate, toDate });
  }

  return { moved, blocked };
}

/**
 * Gets the visual chain data for rendering
 */
export interface ChainNode {
  habitId: string;
  name: string;
  emoji: string;
  color: string;
  prerequisites: string[];
  dependents: string[];
  antiChains: string[];
}

export function getChainVisualization(habits: Habit[], dependencies: HabitDependency[]): ChainNode[] {
  const nodes: ChainNode[] = [];

  for (const habit of habits) {
    if (habit.archived) continue;

    const prereqs: string[] = [];
    const dependents: string[] = [];
    const antiChains: string[] = [];

    for (const dep of dependencies) {
      if (dep.habit_id === habit.id) {
        if (dep.type === 'prerequisite') {
          prereqs.push(dep.depends_on_id);
        } else {
          antiChains.push(dep.depends_on_id);
        }
      }
      if (dep.depends_on_id === habit.id && dep.type === 'prerequisite') {
        dependents.push(dep.habit_id);
      }
    }

    nodes.push({
      habitId: habit.id,
      name: habit.name,
      emoji: habit.emoji,
      color: habit.color,
      prerequisites: prereqs,
      dependents,
      antiChains,
    });
  }

  return nodes;
}

/**
 * Topological sort of habits based on prerequisites
 * Returns habits in order they should be completed
 */
export function topologicalSort(habits: Habit[], dependencies: HabitDependency[]): Habit[] {
  const habitMap = new Map(habits.map(h => [h.id, h]));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, Set<string>>();

  // Initialize
  for (const habit of habits) {
    inDegree.set(habit.id, 0);
    adjList.set(habit.id, new Set());
  }

  // Build graph (only prerequisite edges)
  for (const dep of dependencies) {
    if (dep.type === 'prerequisite' && habitMap.has(dep.habit_id) && habitMap.has(dep.depends_on_id)) {
      adjList.get(dep.depends_on_id)!.add(dep.habit_id);
      inDegree.set(dep.habit_id, (inDegree.get(dep.habit_id) || 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: Habit[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const habit = habitMap.get(id);
    if (habit) sorted.push(habit);

    for (const neighbor of adjList.get(id) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  // If there are remaining habits (cycles), append them
  if (sorted.length < habits.length) {
    const remaining = habits.filter(h => !sorted.includes(h));
    sorted.push(...remaining);
  }

  return sorted;
}

/**
 * Validates a new dependency before adding
 */
export function validateNewDependency(
  habitId: string,
  dependsOnId: string,
  type: DependencyType,
  existingDependencies: HabitDependency[],
  habits: Habit[]
): { valid: boolean; error?: string } {
  if (habitId === dependsOnId) {
    return { valid: false, error: 'A habit cannot depend on itself' };
  }

  // Check if habits exist
  if (!habits.find(h => h.id === habitId)) {
    return { valid: false, error: 'Source habit not found' };
  }
  if (!habits.find(h => h.id === dependsOnId)) {
    return { valid: false, error: 'Target habit not found' };
  }

  // Check if dependency already exists
  const exists = existingDependencies.some(
    d => d.habit_id === habitId && d.depends_on_id === dependsOnId
  );
  if (exists) {
    return { valid: false, error: 'This dependency already exists' };
  }

  // Temporarily add and check for cycles
  const testDeps = [...existingDependencies, { habit_id: habitId, depends_on_id: dependsOnId, type, created_at: new Date().toISOString() }];
  const validation = validateHabitChains(habits, testDeps);

  if (!validation.valid) {
    return { valid: false, error: 'Adding this dependency would create a circular dependency' };
  }

  return { valid: true };
}