module.exports = async ({github, repository, head}) => {
  const [owner, repo] = repository.split('/');
  const [, version] = head.split('/');
  const commits = await getCommit(github, {owner, repo, head});
  const pullList = await getPullList(github, {owner, repo, head});

  const body = createPullRequestBody(pullList, commits);

  await createPullRequest(github, {
    owner,
    repo,
    head,
    body,
    version,
  });
};

// masterとheadの差分となるcommitを取得 (ページングしない場合はレスポンスは最大250件)
const getCommit = async (github, {owner, repo, head}) => {
  const result = await github.repos.compareCommits({
    owner,
    repo,
    head,
    base: 'master',
    state: 'closed',
  });
  // 取得した差分からshaだけの配列を作成
  const commits = result.data.commits.map(commit => ({
    sha: commit.sha,
  }));

  return commits;
};

const getPullList = async (github, {owner, repo, head}) => {
  // headをベースに作成されたPR一覧を取得 (1ページあたりの結果（最大100）)
  const result = await github.pulls.list({
    owner,
    repo,
    base: head,
    state: 'closed',
  });
  // 取得したPR一覧を必要な値のみの配列に変換
  const pullList = result.data.map(d => {
    return {
      title: d.title,
      number: d.number,
      merge_commit_sha: d.merge_commit_sha,
      head: d.head,
    };
  });

  return pullList;
};

// 差分コミットのshaと一致するPRに絞り込み、リリースPRで使用するマージされたPR一覧のテキストを作成する
const createPullRequestBody = (pullsList, commits) => {
  // 注) release, hotfix からのPRは取り除く
  const ignoreBranches = ['release', 'hotfix'];
  // リリースPRで使用するマージされたPR一覧のテキストを整形
  const format = pr => {
    const prHashNumber = `#${pr.number}`;
    const regrex = /[0-9A-Za-z]+-[0-9]+/g;
    const title = pr.title.replace(
      regrex,
      '[$&](https://www.google.com/search?q=$&)',
    );

    return `- ${prHashNumber} ${title}`;
  };

  console.log(
    pullsList.filter(
      pr => !ignoreBranches.some(branch => pr.head.ref.includes(branch)),
    ),
  );
  console.log(
    pullsList
      .filter(
        pr => !ignoreBranches.some(branch => pr.head.ref.includes(branch)),
      )
      .filter(pr => commits.some(commit => commit.sha === pr.merge_commit_sha)),
  );

  const content = pullsList
    .filter(pr => !ignoreBranches.some(branch => pr.head.ref.includes(branch)))
    .filter(pr => commits.some(commit => commit.sha === pr.merge_commit_sha))
    .map(pr => format(pr));

  content.unshift(`## Changes`);
  const body = content.join('\n');

  return body;
};

// PRをmaster, developに出す
const createPullRequest = async (github, {owner, repo, head, body, version}) => {
  // to master
  const resultPullsCreateToMaster = await github.pulls.create({
    owner,
    repo,
    head,
    base: 'master',
    title: `Merge release branch ${version} to master`,
    body,
    draft: true,
  });
  // to develop
  await github.pulls.create({
    owner,
    repo,
    head,
    base: 'develop',
    title: `Merge release branch ${version} to develop`,
    body: `## Relation\n#${resultPullsCreateToMaster.data.number}\n${body}`,
    draft: true,
  });
};
