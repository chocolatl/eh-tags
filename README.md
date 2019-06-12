收集E站标签数据

## 数据来源

- 英文标签数据来源为：<https://e-hentai.org/tools.php?act=taggroup>
- 英文标签描述来源为：<https://ehwiki.org/wiki/{tag}>
- 不收集下级标签，如`yandere`的下级标签为：<https://e-hentai.org/tools.php?act=taggroup&mastertag=4892>，基本是对拼写错误的纠正

## 数据格式

```js
{
  female: {               // 命名空间，分别为：misc、reclass、language、parody、character、group、artist、male、female
    lolicon: {            // 标签名
      description: 'Underage girls in sexual situations or being nude. Not to be confused with young girls in general; should have undeveloped bodies.',    // 对应EHWiki中的Description，不存在时为空字符串，如果有多行用\n分隔
      note: 'Only appearance should be taken into account when tagging this.\nIs required for the oppai loli and low lolicon tags.',                        // 对应EHWiki中的Note，不存在时为空字符串，如果有多行用\n分隔
      japanese: 'ロリ',   // 对应EHWiki中的Japanese，不存在时为空字符串
      related: ['oppai loli', 'low lolicon']      // Description和Note中提及到的标签
    },
    // ...
  },
  misc: {
    ahiru: null,          // 如果一个标签没有词条，或者Description、Note、Japanese字段都不存在，则为null
    //...
  },
  // ...
}
```

## 注意

- 内容为纯文本，使用`Node.textContent`获取，不包含HTML标签等信息
- 两个命名空间下可能有相同标签，比如`male`和`female`下都有`x-ray`标签