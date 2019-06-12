function getTagDefinitionFromDocument(document, targetField) {
  const definition = Object.create(null);
  targetField.forEach(k => definition[k] = []);

  /**
   * 词条的字段与定义都在#mw-content-text > ul和#mw-content-text > dl中
   * 所以仅获取ul与dl中的内容，跳过无关的文本，如：<https://ehwiki.org/wiki/abortion>中的红字警告
   */
  const listElements = Array.from(document.querySelectorAll('#mw-content-text > ul, #mw-content-text > dl'));
  const textContent = listElements.map(e => e.textContent).join('\n').trim();

  /**
   * 收集`description`、`note`、`japanese`字段
   * 处理了字段可能拥有多行文字的情况，如：<https://ehwiki.org/wiki/futanari>的Note字段
   */
  const regexp = /^(?:(.+?):)?\s*(.+)$/gm;
  for (let result, lastField; result = regexp.exec(textContent); ) {
    if (result[1]) {
      /**
       * 处理字段第一行的文本
       */
      const field = result[1].toLowerCase();
      definition[field] && definition[field].push(result[2]);
      lastField = field;
    } else {
      /**
       * 处理字段第一行之外的文本
       * 限制了文本最小长度，防止如<https://ehwiki.org/wiki/fate_zero>：
       * ```
       * Type: Anime, Visual Novel
       * Japanese: フェイト/ゼロ
       * Slave Tags
       * ```
       * `Slave Tags`被判断为`Japanese`的第二行文本的情况
       */
      lastField &&
      result[2].length > 20 &&
      definition[lastField] &&
      definition[lastField].push(result[2]);
    }
  }

  const purify = text => text.replace(/\u200E/g, '');   // 有几个词条混入了`&lrm;`字符，如<https://ehwiki.org/wiki/eye_penetration>中的`cum in eye‎`后面，需要去掉
  targetField.forEach(k => definition[k] = purify(definition[k].join('\n')));

  /**
   * 生成relatedTags字段
   */
  definition.relatedTags = 
    Array.from(document.querySelectorAll('#mw-content-text a'))
         .filter(e => !e.className)                   // 标签相关的链接没有className
         .map(e => e.textContent.split(':').pop())    // 取出标签链接元素的文本，有命名空间的去除命名空间，如`misc:group`只取`group`
         .filter(tag => targetField.some(k => definition[k].includes(tag)))   // 标签在targetField指定的字段中出现
  ;
  definition.relatedTags = [...new Set(definition.relatedTags)];    // 去重

  return definition;
}

module.exports = getTagDefinitionFromDocument;