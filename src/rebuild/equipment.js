// 小范围兵器选择：不模拟品质、耐久或复杂距离。
export const weapons={
 unarmed:{name:'空手',skill:'fist',bonus:0,attack:'出拳'},
 staff:{name:'木棍',skill:'staff',bonus:1,attack:'挥棍'},
 sword:{name:'普通铁剑',skill:'sword',bonus:2,attack:'出剑'}
};
export function currentWeapon(s){return weapons[s.weapon||'unarmed']}
