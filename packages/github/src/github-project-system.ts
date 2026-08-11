import type { ProjectSystem, WorkItem } from '@thoughtrouter/domain';

export interface GitHubProjectSystemConfig {
  token: string;
  owner: string;
  projectNumber: string;
  repository: string;
}

const githubFetch = async <T>(token: string, body: Record<string, unknown>) => {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: ['Bearer', token].join(' ')
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  const json = (await res.json()) as T & { errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json;
};

export class GitHubProjectSystem implements ProjectSystem {
  provider = 'github';

  constructor(private readonly config: GitHubProjectSystemConfig) {}

  async syncWorkItem(item: WorkItem) {
    await githubFetch(this.config.token, {
      query: 'query { viewer { login } }'
    }).catch(() => null);

    return {
      externalProjectId: this.config.projectNumber,
      externalItemId: `pending-${item.id}`,
      externalIssueId: null,
      externalUrl: null
    };
  }
}
