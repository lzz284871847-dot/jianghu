export const CIVIC_TEACHERS={literacy:'scribe',accounting:'bookkeeper'};
export const ARTISANS={
 carpenter:{skill:'woodwork',input:{wood:1},lesson:'量料与榫接练习',item:'rod',quantity:1,reward:9,order:'梁木匠的钓竿小单'},
 tailor:{skill:'tailor',input:{cloth:1},lesson:'裁布与缝线练习',item:'cord',quantity:2,reward:6,order:'沈裁缝的绳线小单'},
 tanner:{skill:'leatherwork',input:{hide:1,wood:1},lesson:'试皮与鞣制练习',item:'leather',quantity:1,reward:9,order:'韩皮匠的熟皮小单'}
};
export const PROFESSIONAL_IDS=[...Object.values(CIVIC_TEACHERS),...Object.keys(ARTISANS),'chessfriend','musician'];
