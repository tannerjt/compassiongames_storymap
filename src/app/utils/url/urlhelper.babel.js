const _getUrlVar = (name) => {
  let hash;
  const vars = [];

  if (window.location.href.indexOf('?') === -1) {
    return null;
  }

  const hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');

  for (let i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    hash[0] = hash[0].split('#')[0];
    vars.push(hash[0]);
    vars[hash[0]] = (hash[1] === undefined) ? true : hash[1];
  }

  return vars[name];
};

export { _getUrlVar };
