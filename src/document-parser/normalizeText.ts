export function normalizeText(input: string): string {
  if (!input) return "";

  const text = input.replace(/\r\n?/g, "\n");

  const lines = text
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter((line) => line.length > 0);

  // 简单页眉页脚清洗：移除重复出现 >=3 次的短行。
  const freq = new Map<string, number>();
  for (const line of lines) {
    if (line.length <= 60) {
      freq.set(line, (freq.get(line) ?? 0) + 1);
    }
  }

  const cleaned = lines.filter((line) => {
    const count = freq.get(line) ?? 0;
    return !(count >= 3 && line.length <= 60);
  });

  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
