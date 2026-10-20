# 青河县场景背景 v1

四幅区域共用画稿覆盖16个现有地点，不是16幅独立地点原画。由内置 image_gen 生成，检查后压为1024×683 WebP（quality 66），运行时不调用生成服务。

文件：town-v1.webp（县城、市集、客栈、作坊、武馆）；village-v1.webp（村庄、田地）；water-v1.webp（码头、渡口、柳溪集）；forest-v1.webp（官道、山脚、竹林、山坡、矿洞、旧道）。映射入口在 county/scene-art.js 与 local-map.js。

统一生成提示规范：historical-scene；ancient Chinese wuxia county；3:2 landscape full bleed；delicate hand drawn ink contours and soft gouache on warm ivory paper；muted sage foliage, charcoal gray tile roofs, beige plaster, aged brown timber, dusty warm stone paths, desaturated jade water；35 degree elevated isometric view；soft diffuse daylight, shallow contact shadows；broad pale uncluttered central courtyard/trail for game NPC overlays；scenery frame top and sides；no UI, no text, no labels, no border, no people, no saturated red, no fantasy grandeur, no photorealism。

各画补充主题：town — modest yamen gate, varied small shops, courtyard walls and potted tree；village — tiled cottages, vegetable terraces, well and winding hamlet path；water — willow bank, wooden pier, moored skiff and riverside houses；forest — bamboo and sage trees, pale distant hills, abandoned mine mouth and weathered ridge ruin。

画面是区域气氛背景，不表示建筑的精确位置或新增可探索对象；真实NPC、设施、相邻道路仍由游戏状态提供。图片失败保留CSS示意图；图片和映射模块均纳入离线缓存。
