// const simpleGit = require('simple-git');

module.exports = async ({github, headBranch}) => {
  console.log(headBranch);
  //   const git = simpleGit(path);
  //   const logs = await git.tags({'--sort': '-v:refname'}).then(t => {
  //     const lastTag = t.all[(t, all.length)];
  //     return git.log({from: lastTag});
  //   });

  //   console.log(logs);

  const {data} = await github.pulls.list({
    owner: 'sumashin',
    repo: 'tsukuyomi',
    base: 'master',
    head: headBranch,
    state: 'closed',
  });

  console.log(data);

  //   const res = data.map(d => {
  //     return {
  //       title: d.title,
  //       url: d.html_url,
  //       number: d.number,
  //       merge_commit_sha: d.merge_commit_sha,
  //     };
  //   });

  //   console.log(res);

  //   return res
  //     .filter(d => logs.all.some(l => l.hash === d.merge_commit_sha))
  //     .map(pr => `- [#${pr.number}](${pr.url}) ${pr.title}`)
  //     .join('\n');
};
