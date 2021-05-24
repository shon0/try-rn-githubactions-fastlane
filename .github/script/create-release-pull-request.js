module.exports = async ({github, repository, head}) => {
  const [owner, repo] = repository.split('/');
  const [, version] = head.split('/');

  // masterとheadの差分となるcommitを取得 (ページングしない場合はレスポンスは最大250件)
  const compareCommitsResult = await github.repos.compareCommits({
    owner,
    repo,
    head,
    base: 'master',
    state: 'closed',
  });

  // 取得した差分からshaだけの配列を作成
  const commits = compareCommitsResult.data.commits.map(commit => ({
    sha: commit.sha,
  }));

  // headをベースに作成されたPR一覧を取得 (1ページあたりの結果（最大100）)
  const pullsListResult = await github.pulls.list({
    owner,
    repo,
    base: head,
    state: 'closed',
  });

  // 取得したPR一覧を必要な値のみの配列に変換
  const pullsList = pullsListResult.data.map(d => {
    return {
      title: d.title,
      number: d.number,
      merge_commit_sha: d.merge_commit_sha,
      head: d.head,
    };
  });

  // 差分コミットのshaと一致するPRに絞り込み、リリースPRで使用するマージされたPR一覧のテキストを作成する
  // 注) release, hotfix からのPRは取り除く
  const ignoreBranches = ['release', 'hotfix'];
  const content = pullsList
    .filter(pr => !ignoreBranches.some(branch => pr.head.ref.includes(branch)))
    .filter(pr => commits.some(commit => commit.sha === pr.merge_commit_sha))
    .map(pr => format(pr));

  content.unshift(`## Changes`);
  const body = content.join('\n');

  // PRをmaster, developに出す
  // to master
  const { number } = await github.pulls.create({
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
    body: `##Relation\n#${number}\n${body}`,
    draft: true,
  });
};

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
