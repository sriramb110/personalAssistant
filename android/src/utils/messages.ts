export function isImportantMessage(text: string): boolean {
    return /urgent|important|deadline|meeting|approval|call me|payment|அவசரம்|முக்கியம்|அழைக்க|கூட்டம்/i.test(text);
}
