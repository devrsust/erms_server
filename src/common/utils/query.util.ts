// src/common/utils/query.util.ts

export function paginate(page = 1, limit = 10) {
  const take = Number(limit);
  const skip = (Number(page) - 1) * take;
  return { skip, take };
}

export function searchQuery(keyword?: string, fields: string[] = []) {
  if (!keyword) return undefined;

  return {
    OR: fields.map((field) => ({
      [field]: { contains: keyword, mode: 'insensitive' },
    })),
  };
}