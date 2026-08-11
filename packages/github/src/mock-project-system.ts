import type { ProjectSystem, WorkItem } from '@thoughtrouter/domain';

export class MockProjectSystem implements ProjectSystem {
  provider = 'mock-github';

  async syncWorkItem(item: WorkItem) {
    return {
      externalProjectId: 'mock-project',
      externalItemId: `item-${item.id}`,
      externalIssueId: item.type === 'Task' ? `issue-${item.id}` : null,
      externalUrl: `https://example.local/${item.id}`
    };
  }
}
