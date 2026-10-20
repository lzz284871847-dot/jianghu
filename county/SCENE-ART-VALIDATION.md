# 场景美术验收 v5.37.0

范围：四幅统一色调的区域共用背景覆盖16地点；无玩法或存档格式变更。画稿与生成提示规范见 art/README.md，映射见 scene-art.js。

本地验收：
- 全量 npm test；npm run check 与变更文件语法检查。
- scripts/qinghe-local-map-review.mjs：320/390/430/560宽度、16地点背景实际解码、NPC点击/真实买料/上课、离岗、图片请求失败回退，共492项检查。
- scripts/qinghe-mobile-review.mjs：原手机布局与存档导入导出102项检查。
- scripts/qinghe-scene-art-offline-review.mjs：75个资源实际预缓存，断网后16地点背景实际解码、设施点击。
- 已人工查看四幅原图与390像素截图；图片合计551636字节（约539 KiB）。背景装饰不阻挡点击，人物文字有浅色底衬。

以上浏览器检查使用隔离Chromium，不等同于真实iPhone或Safari验收。两组GitHub CI及上线结果在发布时另外核实。
