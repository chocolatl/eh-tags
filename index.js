const Agent = require('socks5-https-client/lib/Agent');
const got = require('got');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const getTagDefinitionFromDocument = require('./getTagDefinitionFromDocument');

/**
 * 运行前在此处填写E站Cookie
 */
const ehCookies = '';

/**
 * 运行前在此处填写Socks5代理配置，因为表站无法在国内访问
 * 如果不需要代理请删除agent字段
 */
const requestOptions = {
  agent: new Agent({
    socksHost: 'localhost',
    socksPort: 1080
  }),
  timeout: 30000
};

function start(ehCookies, requestOptions) {
  
  async function getNamespaces() {
    const url = 'https://e-hentai.org/tools.php?act=taggroup';
    const response = await got.get(url, {...requestOptions, headers: {'Cookie': ehCookies}});
    const document = new JSDOM(response.body).window.document;
    const elements = document.querySelectorAll('body > p:first-of-type > a');
    const namespaces = Array.from(elements).map(el => [el.querySelector('span').textContent, el.href]);
    return namespaces;
  }

  async function getNamespaceTags(url, namespace) {
    const response = await got.get(url, {...requestOptions, headers: {'Cookie': ehCookies}});
    const document = new JSDOM(response.body).window.document;
    const elements = document.querySelectorAll('tr > td:last-of-type');
    const tags = Array.from(elements).map(e => e.textContent.replace(new RegExp(`^${namespace}:`), ''));
    return tags;
  }

  async function getFetishTags() {
    const url = 'https://ehwiki.org/wiki/Fetish_Listing';
    const response = await got.get(url, requestOptions);
    const document = new JSDOM(response.body).window.document;
    const contentArea = document.querySelector('#mw-content-text');
    const purify = text => text.replace(/\u200E$/, '');   // <https://ehwiki.org/wiki/Fetish_Listing>中有几个标签末尾有一个`&lrm;`字符，需要去掉
    const tags = Array.from(contentArea.querySelectorAll('h2+p>a,h3+p>a,h4+p>a')).map(e => purify(e.textContent));
    return tags;
  }
  
  async function getTagDefinitionFromURL(url, tagSet) {
    try {
      const targetField = ['description', 'note', 'japanese'];
      const response = await got.get(url, requestOptions);
      const document = new JSDOM(response.body).window.document;
      const definition = getTagDefinitionFromDocument(document, targetField);
      if (targetField.every(k => !definition[k])) {
        return null;      // 所需的三个字段词条中都没出现时，返回null
      }
      definition.relatedTags = definition.relatedTags.filter(tag => tagSet.has(tag))  // 过滤不存在于tagSet的标签
      return definition;
    } catch (err) {
      if (err instanceof got.HTTPError && err.statusCode === 404) {
        return null;      // 404说明该标签词条未被创建，返回null
      }
      throw err;        // 其它情况抛出异常，可能是网络异常或解析失败
    }
  }

  (async () => {
    const tagSet = new Set();
    const classifiedTags = [];
    const tagDefinitions = {};

    const handleNamespaceTags = (namespace, tags) => {
      classifiedTags.push([namespace, tags]);
      tagDefinitions[namespace] = {};
      for (const tag of tags) {
        tagDefinitions[namespace][tag] = null;
        tagSet.add(tag);
      }
    }

    const namespaces = await getNamespaces();
    for (const [namespace, url] of namespaces) {
      const tags = await getNamespaceTags(url, namespace);
      handleNamespaceTags(namespace, tags);
    }

    const fetishTags = await getFetishTags();
    handleNamespaceTags('fetish', fetishTags);

    for (const [namespace, tags] of classifiedTags) {
      let count = 0;
      
      /**
       * 跳过reclass命名空间的采集
       * reclass中所有标签：doujinshi、manga、artistcg...都会跳转到<https://ehwiki.org/wiki/Gallery_Categories>页面
       */
      if (namespace === 'reclass') {
        console.log(`skip: [${namespace}] ${tags.length} / ${tags.length}`);
        continue;
      }

      for (const tag of tags) {
        ++count;
        try {
          try {
            const definition = await getTagDefinitionFromURL('https://ehwiki.org/wiki/' + tag, tagSet);
            tagDefinitions[namespace][tag] = definition;
          } catch (err) {
            await new Promise(f => setTimeout(f, 6000));
            const definition = await getTagDefinitionFromURL('https://ehwiki.org/wiki/' + tag, tagSet);
            tagDefinitions[namespace][tag] = definition;
          }
          if (count === tags.length || count % 100 === 0) {
            console.log(`progress: [${namespace}] ${count} / ${tags.length}`);
          }
        } catch (err) {
          console.error(`error: [${namespace}] ${tag}`);
          console.error(err);
          tagDefinitions[namespace][tag] = null;     // 搜集失败的标签请手动收集（
        }
      }
    }
  
    fs.writeFileSync('./data.json', JSON.stringify(tagDefinitions));
    console.log('EOF');
  })();
}

start(ehCookies, requestOptions);
