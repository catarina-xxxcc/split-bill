export const CATEGORIES = ['餐饮', '交通', '住宿', '门票', '购物', '娱乐', '其他'] as const;

export type Category = (typeof CATEGORIES)[number];
