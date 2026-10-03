type Operation = 'tasks.read' | 'tasks.save' | 'applications.read' | 'applications.save' | 'workspace.read' | 'workspace.save' | 'planning.save' | 'motivation.read' | 'motivation.save' | 'opportunities.import' | 'requested.import' | 'history.read';

// Never log caught exceptions: database errors can contain notes, SQL or identities.
export function logFailure(operation: Operation) {
  console.error(JSON.stringify({event: 'steady.operation_failed', operation}));
}
