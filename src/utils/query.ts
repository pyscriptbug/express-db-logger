const _sanitizeSingleQuotes = (data: string) => data.replace(/'/g, "''");

export const sanitizeData = (data: any) => {
  if (!data || !Object.keys(data).length) return null;

  if (typeof data === 'object') {
    return _sanitizeSingleQuotes(JSON.stringify(data));
  }

  return _sanitizeSingleQuotes(data);
};
